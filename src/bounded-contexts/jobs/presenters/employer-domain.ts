/** Use employer provenance only. An apply URL can belong to an unrelated job board. */
export function employerDomain(raw: Readonly<Record<string, unknown>>): string | null {
  const website = raw.employer_website;
  if (typeof website !== 'string' || !website.trim()) return null;
  const candidate = website.includes('://') ? website : `https://${website}`;
  if (!URL.canParse(candidate)) return null;
  const url = new URL(candidate);
  const host = url.hostname.toLowerCase().replace(/^www\./, '');
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) return null;
  return /^[a-z\d](?:[a-z\d.-]*[a-z\d])?\.[a-z]{2,}$/.test(host) ? host : null;
}
