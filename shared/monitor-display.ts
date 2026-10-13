export function deliveryLabel(loading: boolean, error: boolean, receivedAt: Date | string | null | undefined) {
  if (error) return "UNAVAILABLE";
  if (loading) return "LOADING";
  return receivedAt ? "RECEIVED" : "AWAITING";
}
export function displayCount(value: number | null | undefined) { return value == null ? "—" : String(value); }
export function displayReceivedAt(value: Date | string | null | undefined) {
  if (!value) return "No verified delivery yet";
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString().replace("T", " ").replace(/\.\d{3}Z$/, " UTC") : "Unknown";
}
