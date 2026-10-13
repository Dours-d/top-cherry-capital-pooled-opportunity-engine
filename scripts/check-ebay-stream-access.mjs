// Read-only capability check. Never prints credentials or access tokens.
const appId = process.env.EBAY_APP_ID;
const secret = process.env.EBAY_CLIENT_SECRET;
if (!appId || !secret) throw new Error('eBay credentials are not configured');
const scope = 'https://api.ebay.com/oauth/api_scope/buy.item.stream';
const response = await fetch('https://api.ebay.com/identity/v1/oauth2/token', {
  method: 'POST', signal: AbortSignal.timeout(20000),
  headers: { Authorization: `Basic ${Buffer.from(`${appId}:${secret}`).toString('base64')}`, 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ grant_type: 'client_credentials', scope }),
});
const result = await response.json();
console.log(JSON.stringify({ checkedAt: new Date().toISOString(), requestedScope: scope, httpStatus: response.status, granted: response.ok && Boolean(result.access_token), error: result.error ?? null, description: result.error_description ?? null }, null, 2));
if (!response.ok) process.exitCode = 2;
