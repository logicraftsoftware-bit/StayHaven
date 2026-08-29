import { normalizeDomain, normalizeDomains } from './normalize-domain';

describe('domain normalization', () => {
  it.each([
    ['HTTPS://GuwahatiHomestay.com/path?q=1', 'guwahatihomestay.com'],
    ['www.guwahatihomestay.com/', 'guwahatihomestay.com'],
    ['shillong.localhost:3000', 'shillong.localhost'],
  ])('normalizes %s', (input, expected) =>
    expect(normalizeDomain(input)).toBe(expected),
  );

  it('deduplicates the primary domain and aliases', () => {
    expect(
      normalizeDomains('EXAMPLE.com', ['example.com/', 'www.example.com']),
    ).toEqual(['example.com']);
  });
});
