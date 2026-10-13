import { describe, expect, it } from "vitest";

describe("production eBay callback endpoint", () => {
  it("answers the eBay challenge on the configured persistent HTTPS endpoint", async () => {
    const endpoint = process.env.EBAY_NOTIFICATION_ENDPOINT;
    expect(endpoint).toMatch(/^https:\/\/.+\/api\/ebay\/notifications$/);

    const challengeCode = `vitest-${Date.now()}`;
    const response = await fetch(`${endpoint}?challenge_code=${encodeURIComponent(challengeCode)}`);
    expect(response.status).toBe(200);
    const payload = (await response.json()) as { challengeResponse?: string };
    expect(payload.challengeResponse).toMatch(/^[a-f0-9]{64}$/);
  }, 30_000);
});
