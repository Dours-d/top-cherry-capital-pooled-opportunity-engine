import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";

const live = process.env.RUN_LIVE_EBAY_TESTS === "1";
describe.skipIf(!live)("production eBay callback endpoint", () => {
  it("answers the challenge with the exact configured token and endpoint", async () => {
    const endpoint = process.env.EBAY_NOTIFICATION_ENDPOINT?.trim().replace(/\/$/, "");
    const token = (process.env.EBAY_DEV_ID ?? process.env.EBAY_NOTIFICATION_VERIFICATION_TOKEN)?.trim();
    if (!endpoint || !/^https:\/\/.+\/api\/ebay\/notifications$/.test(endpoint)) throw new Error("Set EBAY_NOTIFICATION_ENDPOINT to the exact persistent HTTPS callback URL");
    if (!token || !/^[A-Za-z0-9_-]{32,80}$/.test(token)) throw new Error("Configure the active eBay verification token");
    const challengeCode = `vitest-${Date.now()}`;
    const response = await fetch(`${endpoint}?challenge_code=${encodeURIComponent(challengeCode)}`, { signal: AbortSignal.timeout(20000) });
    expect(response.status).toBe(200);
    const payload = (await response.json()) as { challengeResponse?: string };
    const expected = createHash("sha256").update(challengeCode).update(token).update(endpoint).digest("hex");
    expect(payload.challengeResponse === expected).toBe(true);
  }, 30_000);
});
