import { describe, expect, it } from 'vitest';
import { NBSP, formatNumber, formatStavka } from './format';

describe('formatNumber', () => {
  it("guruhlarni buzilmas bo'shliq (U+00A0) bilan ajratadi", () => {
    expect(formatNumber(12045)).toBe(`12${NBSP}045`);
    expect(formatNumber('2500000')).toBe(`2${NBSP}500${NBSP}000`);
    expect(formatNumber(999)).toBe('999');
    expect(formatNumber(1234567.6)).toBe(`1${NBSP}234${NBSP}568`);
  });

  it("bo'sh va yaroqsiz qiymatlarda bo'sh satr", () => {
    expect(formatNumber(null)).toBe('');
    expect(formatNumber(undefined)).toBe('');
    expect(formatNumber('')).toBe('');
    expect(formatNumber('abc')).toBe('');
  });
});

describe('formatStavka', () => {
  it('ortiqcha nollarsiz, vergul bilan', () => {
    expect(formatStavka(1)).toBe('1 stavka');
    expect(formatStavka('0.50')).toBe('0,5 stavka');
    expect(formatStavka(0.25)).toBe('0,25 stavka');
  });
});
