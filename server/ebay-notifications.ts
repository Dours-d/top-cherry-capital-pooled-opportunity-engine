import { createHash } from "node:crypto";
import type { Express, Request, Response } from "express";

export const EBAY_NOTIFICATION_PATH = "/api/ebay/notifications";

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

function getVerificationToken() {
  // The dedicated token is preferred. For the current prototype, fall back to
  // the configured eBay DevID so no second secret-setting workflow is required.
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

function acknowledgeNotification(req: Request, res: Response) {
  const notificationId = typeof req.body?.notification?.notificationId === "string" ? req.body.notification.notificationId : undefined;
  res.status(200).json({ ok: true, received: Boolean(notificationId) });
}

export function registerEbayNotificationRoutes(app: Express) {
  app.get(EBAY_NOTIFICATION_PATH, handleChallenge);
  app.post(EBAY_NOTIFICATION_PATH, acknowledgeNotification);
}
