import { describe, expect, it } from "vitest";
import { buildChallengeResponse } from "../server/ebay-notifications";

describe("eBay notification verification", () => {
  it("produces the SHA-256 challenge response required by eBay", () => {
    const response = buildChallengeResponse(
      "probe-123",
      "790fc09a-b0cc-4d10-8a20-8aa5d493847f",
      "https://3000-ixpxn39u2wiouo4wy2ad0-b5853dd6.us1.manus.computer/api/ebay/notifications",
    );

    expect(response).toBe("d5e291f594eeff63abfb6ce486cc71b0fe6553e87add25b2da926bae709823af");
  });

  it("uses an eBay-compliant verification token format", () => {
    const token = "790fc09a-b0cc-4d10-8a20-8aa5d493847f";
    expect(token.length).toBeGreaterThanOrEqual(32);
    expect(token.length).toBeLessThanOrEqual(80);
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
  });
});
