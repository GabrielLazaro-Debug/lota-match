function defaultOutboundDate(): string {
  const d = new Date(Date.now() + 30 * 86400000);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function buildSkyscannerDayViewUrl(
  originIata: string,
  destIata: string,
  outboundDate?: string,
): string {
  const origin = originIata.toLowerCase();
  const destination = destIata.toLowerCase();
  const date = outboundDate ?? defaultOutboundDate();
  const params = new URLSearchParams({
    origin,
    destination,
    outboundDate: date,
  });
  return `https://skyscanner.net/g/referrals/v1/flights/day-view/?${params.toString()}`;
}

export function buildGoogleFlightsUrl(): string {
  return "https://www.google.com/travel/flights";
}

export function buildSearchHintText(
  originIata: string,
  destIata: string,
  outboundDate?: string,
): string {
  const date = outboundDate ?? defaultOutboundDate();
  return `Voo ${originIata.toUpperCase()} → ${destIata.toUpperCase()} em ${date}`;
}
