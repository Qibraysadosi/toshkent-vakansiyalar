import { describe, expect, it } from 'vitest';
import {
  CITY_DISTRICTS,
  DISTRICTS,
  districtByDbName,
  districtBySlug,
  districtLabel,
  importScope,
  regionLabel,
  scopedBatch,
} from './districts';

describe('tumanlar ro\'yxati', () => {
  it('12 ta shahar tumani + Qibray', () => {
    expect(CITY_DISTRICTS).toHaveLength(12);
    expect(DISTRICTS).toHaveLength(13);
    expect(new Set(DISTRICTS.map((d) => d.slug)).size).toBe(DISTRICTS.length);
    expect(new Set(DISTRICTS.map((d) => d.db)).size).toBe(DISTRICTS.length);
  });

  it('Qibray fayldagi yozuv bilan topiladi', () => {
    const q = districtByDbName('Қибрай тумани');
    expect(q?.slug).toBe('qibray');
    expect(q?.region).toBe('viloyat');
    expect(districtBySlug('qibray')?.db).toBe('Қибрай тумани');
    expect(districtLabel('Қибрай тумани')).toBe('Qibray');
    expect(districtLabel('Қибрай тумани', 'cyr')).toBe('Қибрай');
  });

  it('hudud nomi', () => {
    expect(regionLabel('Чилонзор тумани')).toBe('Toshkent');
    expect(regionLabel('Қибрай тумани')).toBe('Toshkent viloyati');
    expect(regionLabel('Қибрай тумани', 'cyr')).toBe('Тошкент вилояти');
    expect(regionLabel("Noma'lum")).toBe('Toshkent');
  });

  it('xarita poligonlari viewBox ichida (0 0 1000 780)', () => {
    for (const d of DISTRICTS) {
      for (const p of d.points.split(/\s+/)) {
        const [x, y] = p.split(',').map(Number);
        expect(x).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThanOrEqual(1000);
        expect(y).toBeGreaterThanOrEqual(0);
        expect(y).toBeLessThanOrEqual(780);
      }
    }
  });
});

describe('importScope — import qaysi tumanlarni almashtiradi', () => {
  it('shahar tumani → butun shahar, Qibraysiz', () => {
    const scope = importScope(['Чилонзор тумани']);
    expect(scope).toHaveLength(12);
    expect(scope).toContain('Олмазор тумани');
    expect(scope).not.toContain('Қибрай тумани');
  });

  it('Qibray → faqat Qibray (Toshkentga tegilmaydi)', () => {
    expect(importScope(['Қибрай тумани'])).toEqual(['Қибрай тумани']);
  });

  it("aralash fayl va ro'yxatda yo'q tuman", () => {
    const scope = importScope(['Қибрай тумани', 'Миробод тумани', 'Зангиота тумани']);
    expect(scope).toHaveLength(14);
    expect(scope).toContain('Қибрай тумани');
    expect(scope).toContain('Зангиота тумани');
  });

  it("bo'sh fayl — bo'sh qamrov (hech narsa o'chmaydi)", () => {
    expect(importScope([])).toEqual([]);
  });
});

describe('scopedBatch', () => {
  it('faqat Qibray fayli → batch nomiga tuman qo\'shiladi', () => {
    expect(scopedBatch('2026-10', ['Қибрай тумани'])).toBe('2026-10-qibray');
    expect(scopedBatch('2026-10-qibray', ['Қибрай тумани'])).toBe('2026-10-qibray');
  });

  it("shahar, aralash va noma'lum fayllarda o'zgarmaydi", () => {
    expect(scopedBatch('2026-10', ['Чилонзор тумани', 'Миробод тумани'])).toBe('2026-10');
    expect(scopedBatch('2026-10', ['Қибрай тумани', 'Миробод тумани'])).toBe('2026-10');
    expect(scopedBatch('2026-10', ['Зангиота тумани'])).toBe('2026-10');
    expect(scopedBatch('2026-10', [])).toBe('2026-10');
  });
});
