import { createHash, createVerify } from "node:crypto";
import type { Express, Request, Response } from "express";
import { insertEbayNotificationEvent } from "./db";

export const EBAY_NOTIFICATION_PATH = "/api/ebay/notifications";
const EBAY_API_BASE = "https://api.ebay.com";
const keyCache = new Map<string, { key: string; expiresAt: number }>();
let applicationTokenCache: { token: string; expiresAt: number } | null = null;

export type EbaySignatureHeader = { kid: string; signature: string };

export function getNotificationEndpoint(req: Request) {
  const configured = process.env.EBAY_NOTIFICATION_ENDPOINT?.trim();
  if (configured) return configured.replace(/\/$/, "");
  const forwardedProto = String(req.headers["x-forwarded-proto"] ?? "").split(",")[0].trim();
  const protocol = forwardedProto || req.protocol || "https";
  return `${protocol}://${req.get("host")}${req.path}`.replace(/\/$/, "");
}

export function buildChallengeResponse(challengeCode: string, verificationToken: string, endpoint: string) {
  return createHash("sha256")
    .update(challengeCode, "utf8")
    .update(verificationToken, "utf8")
    .update(endpoint, "utf8")
    .digest("hex");
}

export function decodeEbaySignatureHeader(header: string): EbaySignatureHeader {
  const decoded = Buffer.from(header, "base64").toString("utf8");
  const parsed = JSON.parse(decoded) as Partial<EbaySignatureHeader>;
  if (!parsed.kid || !parsed.signature) throw new Error("Invalid X-EBAY-SIGNATURE header");
  return { kid: parsed.kid, signature: parsed.signature };
}

export function formatEbayPublicKey(key: string) {
  const normalized = key.trim();
  if (normalized.includes("BEGIN PUBLIC KEY")) return normalized;
  return normalized
    .replace(/-----BEGIN PUBLIC KEY-----/g, "-----BEGIN PUBLIC KEY-----\n")
    .replace(/-----END PUBLIC KEY-----/g, "\n-----END PUBLIC KEY-----");
}

export function verifyEbaySignature(message: unknown, signatureHeader: string, publicKey: string) {
  const signature = decodeEbaySignatureHeader(signatureHeader);
  const verifier = createVerify("SHA256");
  verifier.update(JSON.stringify(message), "utf8");
  verifier.end();
  return verifier.verify(formatEbayPublicKey(publicKey), signature.signature, "base64");
}

async function getEbayApplicationToken() {
  if (applicationTokenCache && applicationTokenCache.expiresAt > Date.now()) return applicationTokenCache.token;
  const appId = process.env.EBAY_APP_ID;
  const clientSecret = process.env.EBAY_CLIENT_SECRET;
  if (!appId || !clientSecret) throw new Error("eBay application credentials are not configured");
  const response = await fetch(`${EBAY_API_BASE}/identity/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${appId}:${clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials&scope=https%3A%2F%2Fapi.ebay.com%2Foauth%2Fapi_scope",
  });
  if (!response.ok) throw new Error(`eBay OAuth returned HTTP ${response.status}`);
  const payload = (await response.json()) as { access_token?: string; expires_in?: number };
  if (!payload.access_token) throw new Error("eBay OAuth response did not include an access token");
  applicationTokenCache = { token: payload.access_token, expiresAt: Date.now() + Math.max(60, (payload.expires_in ?? 7200) - 60) * 1000 };
  return payload.access_token;
}

async function getEbayPublicKey(kid: string) {
  const cached = keyCache.get(kid);
  if (cached && cached.expiresAt > Date.now()) return cached.key;
  const token = await getEbayApplicationToken();
  const response = await fetch(`${EBAY_API_BASE}/commerce/notification/v1/public_key/${encodeURIComponent(kid)}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error(`eBay public-key lookup returned HTTP ${response.status}`);
  const payload = (await response.json()) as { key?: string };
  if (!payload.key) throw new Error("eBay public-key response did not include a key");
  keyCache.set(kid, { key: payload.key, expiresAt: Date.now() + 60 * 60 * 1000 });
  return payload.key;
}

async function verifyIncomingNotification(message: unknown, signatureHeader: string) {
  const signature = decodeEbaySignatureHeader(signatureHeader);
  const publicKey = await getEbayPublicKey(signature.kid);
  return verifyEbaySignature(message, signatureHeader, publicKey);
}

function getVerificationToken() {
  const token = (process.env.EBAY_NOTIFICATION_VERIFICATION_TOKEN ?? process.env.EBAY_DEV_ID)?.trim();
  if (!token) throw new Error("EBAY_NOTIFICATION_VERIFICATION_TOKEN is not configured");
  return token;
}

function handleChallenge(req: Request, res: Response) {
  const challengeCode = typeof req.query.challenge_code === "string" ? req.query.challenge_code : "";
  if (!challengeCode) {
    res.status(400).json({ error: "challenge_code is required" });
    return;
  }
  try {
    const responseHash = buildChallengeResponse(challengeCode, getVerificationToken(), getNotificationEndpoint(req));
    res.type("application/json").status(200).json({ challengeResponse: responseHash });
  } catch (error) {
    console.error("[eBay notifications] challenge configuration error", error);
    res.status(503).json({ error: "notification endpoint is not configured" });
  }
}

async function acknowledgeNotification(req: Request, res: Response) {
  const signatureHeader = req.header("X-EBAY-SIGNATURE");
  const notification = req.body?.notification as { notificationId?: string; publishAttemptCount?: number; eventDate?: string; publishDate?: string } | undefined;
  const notificationId = notification?.notificationId;
  if (!signatureHeader || !notificationId) {
    res.status(412).json({ error: "signed notification and notificationId are required" });
    return;
  }

  try {
    const verified = await verifyIncomingNotification(req.body, signatureHeader);
    if (!verified) {
      res.status(412).json({ error: "notification signature failed" });
      return;
    }
    const signature = decodeEbaySignatureHeader(signatureHeader);
    await insertEbayNotificationEvent({
      notificationId,
      topic: typeof req.body?.metadata?.topic === "string" ? req.body.metadata.topic : "UNKNOWN",
      signatureKid: signature.kid,
      publishAttemptCount: notification.publishAttemptCount ?? 1,
      eventDate: notification.eventDate ? new Date(notification.eventDate) : null,
      publishDate: notification.publishDate ? new Date(notification.publishDate) : null,
      rawPayload: JSON.stringify(req.body),
    });
    res.status(200).json({ ok: true, received: true, verified: true });
  } catch (error) {
    console.error("[eBay notifications] signature or persistence error", error);
    res.status(503).json({ error: "notification verification temporarily unavailable" });
  }
}

export function registerEbayNotificationRoutes(app: Express) {
  app.get(EBAY_NOTIFICATION_PATH, handleChallenge);
  app.post(EBAY_NOTIFICATION_PATH, (req, res) => { void acknowledgeNotification(req, res); });
}
