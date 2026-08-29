export function normalizeDomain(value: string): string {
  const input = value.trim().toLowerCase();
  if (!input) return '';

  const withProtocol = /^[a-z][a-z\d+.-]*:\/\//i.test(input)
    ? input
    : `http://${input}`;

  try {
    return new URL(withProtocol).hostname
      .replace(/\.$/, '')
      .replace(/^www\./, '');
  } catch {
    return input
      .replace(/^[a-z][a-z\d+.-]*:\/\//i, '')
      .split('/')[0]
      .split(':')[0]
      .replace(/\.$/, '')
      .replace(/^www\./, '');
  }
}

export function normalizeDomains(
  primary: string,
  aliases: string[] = [],
): string[] {
  return [
    ...new Set([primary, ...aliases].map(normalizeDomain).filter(Boolean)),
  ];
}
