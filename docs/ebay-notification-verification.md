# eBay notification verification

The callback implementation follows eBay's official Notification API guidance.

## Endpoint validation

For `GET /api/ebay/notifications?challenge_code=...`, eBay requires a JSON `200 OK` response with a `challengeResponse` equal to the SHA-256 digest of:

```text
challengeCode + verificationToken + endpoint
```

The endpoint must be public HTTPS, must not use localhost or an internal IP, and the verification token must be 32–80 characters containing only letters, digits, `_`, or `-`.

## Notification validation

For signed `POST` notifications, the backend decodes the Base64 `X-EBAY-SIGNATURE` header, extracts its key ID (`kid`) and signature, retrieves the corresponding public key from eBay's Notification API, caches that key for one hour, and verifies the parsed JSON notification with SHA-256/ECC. Invalid or unsigned payloads return HTTP 412. Verified payloads are stored in `ebay_notification_events` with a unique notification ID, so eBay retries remain idempotent.

The application access token used for public-key lookup is cached until shortly before expiry. The route returns HTTP 503 when eBay key lookup or database persistence is temporarily unavailable, allowing the sender to retry.

## Sources

- [eBay Marketplace User Account Deletion](https://developer.ebay.com/develop/guides/sell/marketplace-user-account-deletion)
- [eBay Sell Communications Guide](https://developer.ebay.com/develop/guides/sell/sell-communications-guide)
- [eBay Notification API](https://developer.ebay.com/develop/api/sell/notification_api)
- [eBay Event Notification Node.js SDK](https://github.com/eBay/event-notification-nodejs-sdk)
