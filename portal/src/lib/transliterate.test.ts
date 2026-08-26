import { describe, expect, it } from 'vitest';
import { isCyrillic, transliterate } from './transliterate';
import { normalize } from './normalize';

describe('transliterate — kirill → lotin', () => {
  it('o\'zbek maxsus harflarini apostrof bilan qaytaradi', () => {
    expect(transliterate('Ўқитувчи', 'lat')).toBe("O'qituvchi");
    expect(transliterate('Ғишт', 'lat')).toBe("G'isht");
    expect(transliterate('Ҳамшира', 'lat')).toBe('Hamshira');
    expect(transliterate('Қоровул', 'lat')).toBe('Qorovul');
    expect(transliterate('маъно', 'lat')).toBe("ma'no");
  });

  it('katta harfni saqlaydi, digraflarda to\'g\'ri qo\'llaydi', () => {
    expect(transliterate('Шайхонтоҳур', 'lat')).toBe('Shayxontohur');
    expect(transliterate('ЦЕХ', 'lat')).toBe('TSEX');
    expect(transliterate('Цех', 'lat')).toBe('Tsex');
    expect(transliterate('ЧИЛОНЗОР', 'lat')).toBe('CHILONZOR');
  });

  it('so\'z boshidagi "е" → "Ye"', () => {
    expect(transliterate('Етакчи мутахассис', 'lat')).toBe('Yetakchi mutaxassis');
    expect(transliterate('Енгил автомобил', 'lat')).toBe('Yengil avtomobil');
    expect(transliterate('мебел', 'lat')).toBe('mebel');
  });

  it('lotin matnga tegmaydi', () => {
    expect(transliterate("Bosh mutaxassis", 'lat')).toBe('Bosh mutaxassis');
    expect(transliterate("O'qituvchi", 'lat')).toBe("O'qituvchi");
  });

  it('natijada kirill qolmaydi', () => {
    for (const s of ['Мактабгача таълим муассасаси', 'Ногиронлиги бўлган шахслар', 'навбатчи ҳамшира']) {
      expect(isCyrillic(transliterate(s, 'lat')), s).toBe(false);
    }
  });
});

describe('transliterate — lotin → kirill', () => {
  it('asosiy so\'zlar', () => {
    expect(transliterate('Qorovul', 'cyr')).toBe('Қоровул');
    expect(transliterate("O'qituvchi", 'cyr')).toBe('Ўқитувчи');
    expect(transliterate('Oshpaz', 'cyr')).toBe('Ошпаз');
    expect(transliterate('Tarbiyachi', 'cyr')).toBe('Тарбиячи');
    expect(transliterate('Hamshira', 'cyr')).toBe('Ҳамшира');
  });

  it('apostrof variantlari bir xil natija beradi', () => {
    for (const v of ["O'qituvchi", 'Oʻqituvchi', 'O‘qituvchi', 'O`qituvchi']) {
      expect(transliterate(v, 'cyr'), v).toBe('Ўқитувчи');
    }
  });

  it('so\'z boshidagi "e" → "э", ichkarida "е"', () => {
    expect(transliterate('Elektrik', 'cyr')).toBe('Электрик');
    expect(transliterate('mebel', 'cyr')).toBe('мебел');
  });
});

describe('transliterate ↔ normalize mosligi', () => {
  it('o\'girilgan matn bir xil qidiruv kalitini beradi', () => {
    // Bu — alifbo tugmasi ishlashining sharti: ekranda yozuv o'zgaradi,
    // lekin qidiruv kaliti o'zgarmaydi.
    const samples = [
      'Қоровул',
      'Ўқитувчи',
      'Ҳудуд фарроши',
      'Етакчи мутахассис',
      'Мактабгача таълим ташкилоти тарбиячиси',
    ];
    for (const s of samples) {
      expect(normalize(transliterate(s, 'lat')), s).toBe(normalize(s));
    }
  });
});
