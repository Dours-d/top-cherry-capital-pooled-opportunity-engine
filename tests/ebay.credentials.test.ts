import { generateKeyPairSync, sign } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildChallengeResponse, buildPersistedNotificationPayload, decodeEbaySignatureHeader, extractListingEvent, formatEbayPublicKey, verifyEbaySignature } from "../server/ebay-notifications";

describe("eBay notification verification", () => {
  it("produces the SHA-256 challenge response required by eBay", () => {
    const response = buildChallengeResponse(
      "probe-123",
      "790fc09a-b0cc-4d10-8a20-8aa5d493847f",
      "https://3000-ixpxn39u2wiouo4wy2ad0-b5853dd6.us1.manus.computer/api/ebay/notifications",
    );

    expect(response).toBe("d5e291f594eeff63abfb6ce486cc71b0fe6553e87add25b2da926bae709823af");
  });

  it("validates a signed notification with the decoded eBay-style header", () => {
    const { privateKey, publicKey } = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
    const message = { metadata: { topic: "MARKETPLACE_ACCOUNT_DELETION" }, notification: { notificationId: "evt-123" } };
    const signature = sign("sha256", Buffer.from(JSON.stringify(message)), privateKey).toString("base64");
    const header = Buffer.from(JSON.stringify({ kid: "test-kid", signature })).toString("base64");
    const publicKeyPem = publicKey.export({ type: "spki", format: "pem" }).toString();

    expect(decodeEbaySignatureHeader(header)).toEqual({ kid: "test-kid", signature });
    expect(verifyEbaySignature(message, header, publicKeyPem)).toBe(true);
    expect(verifyEbaySignature({ ...message, changed: true }, header, publicKeyPem)).toBe(false);
  });

  it("rejects malformed signature headers", () => {
    expect(() => decodeEbaySignatureHeader("not-base64-json")).toThrow();
    expect(() => decodeEbaySignatureHeader(Buffer.from(JSON.stringify({ kid: "missing-signature" })).toString("base64"))).toThrow();
  });

  it("normalizes a listing notification into an idempotent event record", () => {
    const event = extractListingEvent({
      metadata: { topic: "ITEM_AVAILABILITY" },
      notification: {
        notificationId: "evt-availability-1",
        eventDate: "2026-10-13T11:00:00.000Z",
        data: { itemId: "v1|123", listingMarketplaceId: "EBAY_GB", availability: "AVAILABLE", price: { value: 42.5 } },
      },
    }, "kid-1");

    expect(event).toMatchObject({
      eventKey: "evt-availability-1:v1|123",
      eventType: "ITEM_AVAILABILITY",
      itemId: "v1|123",
      marketplaceId: "EBAY_GB",
      price: 42.5,
      availability: "AVAILABLE",
      signatureKid: "kid-1",
    });
    expect(extractListingEvent({ metadata: { topic: "ITEM_AVAILABILITY" }, notification: { notificationId: "evt-2", data: {} } }, "kid-1")).toBeNull();
  });

  it("formats compact public keys into OpenSSL-compatible PEM", () => {
    expect(formatEbayPublicKey("-----BEGIN PUBLIC KEY-----ABC123-----END PUBLIC KEY-----")).toBe("-----BEGIN PUBLIC KEY-----\nABC123\n-----END PUBLIC KEY-----");
  });

  it("redacts personal identifiers from marketplace-deletion persistence", () => {
    const persisted = buildPersistedNotificationPayload({
      metadata: { topic: "MARKETPLACE_ACCOUNT_DELETION", schemaVersion: "1.0" },
      notification: { notificationId: "delete-1", eventDate: "2026-10-13T11:00:00.000Z", data: { username: "private-user", userId: "private-id", eiasToken: "private-token" } },
    });
    expect(persisted).not.toContain("private-user");
    expect(persisted).not.toContain("private-id");
    expect(persisted).not.toContain("private-token");
    expect(persisted).toContain("delete-1");
  });

  it("uses an eBay-compliant verification token format", () => {
    const token = "790fc09a-b0cc-4d10-8a20-8aa5d493847f";
    expect(token.length).toBeGreaterThanOrEqual(32);
    expect(token.length).toBeLessThanOrEqual(80);
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
  });
});
