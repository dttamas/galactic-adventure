import { titleCase, validInt } from '../srv/lib/rules';

describe('validInt', () => {
  it('passes undefined', () => {
    expect(validInt(undefined, 1, 10)).toBe(true);
  });

  it('fails null', () => {
    expect(validInt(null, 1, 10)).toBe(false);
  });

  it('fails non-integers', () => {
    expect(validInt(5.5, 1, 10)).toBe(false);
  });

  it('includes both bounds', () => {
    expect(validInt(1, 1, 10)).toBe(true);
    expect(validInt(10, 1, 10)).toBe(true);
    expect(validInt(0, 1, 10)).toBe(false);
    expect(validInt(11, 1, 10)).toBe(false);
  });

  it('has no upper bound by default', () => {
    expect(validInt(Number.MAX_SAFE_INTEGER, 0)).toBe(true);
    expect(validInt(-1, 0)).toBe(false);
  });

  it('fails strings', () => {
    // @ts-expect-error runtime guard for non-number input
    expect(validInt('5', 1, 10)).toBe(false);
  });
});

describe('titleCase', () => {
  it('trims', () => {
    expect(titleCase('  red  ')).toBe('Red');
  });

  it('collapses multiple spaces', () => {
    expect(titleCase('deep   space  blue')).toBe('Deep Space Blue');
  });

  it('normalises mixed case', () => {
    expect(titleCase('nEoN gREEN')).toBe('Neon Green');
  });

  it('handles a single word', () => {
    expect(titleCase('silver')).toBe('Silver');
  });

  it('returns empty for an empty string', () => {
    expect(titleCase('')).toBe('');
  });
});
