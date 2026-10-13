import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

export function inspectSetup(env: Record<string, string | undefined>, nodeVersion = process.versions.node) {
  const callbackToken = env.EBAY_DEV_ID?.trim() || env.EBAY_NOTIFICATION_VERIFICATION_TOKEN?.trim();
  const endpoint = env.EBAY_NOTIFICATION_ENDPOINT?.trim();
  return [
    { name: "Node.js 22+", ready: Number(nodeVersion.split(".")[0]) >= 22, required: true, reason: "Use Node.js 22 or later." },
    { name: "Database", ready: Boolean(env.DATABASE_URL), required: false, reason: "Configure DATABASE_URL for saves, preferences, and durable webhook storage." },
    { name: "Manus authentication", ready: Boolean(env.JWT_SECRET && env.VITE_APP_ID && env.OAUTH_SERVER_URL), required: false, reason: "Configure JWT_SECRET, VITE_APP_ID, and OAUTH_SERVER_URL for accounts." },
    { name: "eBay application credentials", ready: Boolean(env.EBAY_APP_ID && env.EBAY_CLIENT_SECRET), required: false, reason: "Configure EBAY_APP_ID and EBAY_CLIENT_SECRET server-side." },
    { name: "eBay challenge token", ready: Boolean(callbackToken && /^[A-Za-z0-9_-]{32,80}$/.test(callbackToken)), required: false, reason: "Current callback prioritizes EBAY_DEV_ID, then EBAY_NOTIFICATION_VERIFICATION_TOKEN; match the active value in eBay." },
    { name: "Persistent callback endpoint", ready: Boolean(endpoint && /^https:\/\/[^\s]+\/api\/ebay\/notifications$/.test(endpoint)), required: false, reason: "Set EBAY_NOTIFICATION_ENDPOINT to the exact registered HTTPS URL." },
  ];
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const checks = inspectSetup(process.env);
  for (const check of checks) console.log(`${check.ready ? "READY" : "MISSING"} · ${check.name}${check.ready ? "" : ` — ${check.reason}`}`);
  console.log("Presence checks only: this does not prove API authorization, successful delivery, or deployment. No secret values are printed.");
  const strict = process.argv.includes("--strict");
  if (checks.some((check) => !check.ready && (strict || check.required))) process.exitCode = 1;
}
