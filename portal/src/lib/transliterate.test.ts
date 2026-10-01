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

  it('so\'z oxiridagi digraf ham to\'liq katta bo\'ladi (ЛАБОРАТОРИЯ → LABORATORIYA)', () => {
    expect(transliterate('ЛАБОРАТОРИЯ', 'lat')).toBe('LABORATORIYA');
    expect(transliterate('Лаборатория', 'lat')).toBe('Laboratoriya');
    expect(transliterate('БОШ БОШҚАРМАСИ', 'lat')).toBe('BOSH BOSHQARMASI');
    expect(transliterate('КОМИССИЯ МУДИРИ', 'lat')).toBe('KOMISSIYA MUDIRI');
    expect(transliterate('ЛИЦЕЕ', 'lat')).toBe('LITSEYE');
    // Yakka harf: oldingi ham, keyingi ham yo'q — faqat bosh harf katta
    expect(transliterate('Я', 'lat')).toBe('Ya');
    expect(transliterate('Ц', 'lat')).toBe('Ts');
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
    // normalize.ts dagi APOSTROPHES to'plami bilan bir xil
    const apostrophes = [..."'‘’‚‛ʻʼʽʹʺ`´′‵"];
    for (const a of apostrophes) {
      expect(transliterate(`O${a}qituvchi`, 'cyr'), `O${a}qituvchi`).toBe('Ўқитувчи');
      expect(transliterate(`Bog${a}bon`, 'cyr'), `Bog${a}bon`).toBe('Боғбон');
    }
    // Unicode modifikator apostroflari (U+02BC, U+00B4) — ilgari о+ъ chiqardi
    expect(transliterate('Oʼqituvchi', 'cyr')).toBe('Ўқитувчи');
    expect(transliterate('O´qituvchi', 'cyr')).toBe('Ўқитувчи');
    expect(transliterate('Bogʼbon', 'cyr')).toBe('Боғбон');
  });

  it('"yo\'" → "йў", "ё"+"ъ" emas', () => {
    expect(transliterate("yo'q", 'cyr')).toBe('йўқ');
    expect(transliterate("Yo'l qurilish", 'cyr')).toBe('Йўл қурилиш');
    expect(transliterate("yo'nalish boshlig'i", 'cyr')).toBe('йўналиш бошлиғи');
    expect(transliterate('Yoʻldosh', 'cyr')).toBe('Йўлдош');
    expect(transliterate("YO'NALISH", 'cyr')).toBe('ЙЎНАЛИШ');
    // Apostrofsiz "yo" avvalgidek ё
    expect(transliterate('yosh', 'cyr')).toBe('ёш');
  });

  it('"ts": qarz so\'zlarda ц, o\'zbekcha qo\'shimcha chegarasida тс', () => {
    expect(transliterate('ketsa', 'cyr')).toBe('кетса');
    expect(transliterate('qaytsa', 'cyr')).toBe('қайтса');
    expect(transliterate('aytsang', 'cyr')).toBe('айтсанг');
    expect(transliterate('otsiz', 'cyr')).toBe('отсиз');
    expect(transliterate('Ketsin', 'cyr')).toBe('Кетсин');

    expect(transliterate('Sotsial', 'cyr')).toBe('Социал');
    expect(transliterate('litsenziya', 'cyr')).toBe('лицензия');
    expect(transliterate('Protsess', 'cyr')).toBe('Процесс');
    expect(transliterate('tsex', 'cyr')).toBe('цех');
    expect(transliterate('mototsikl', 'cyr')).toBe('мотоцикл');
    expect(transliterate('operatsiya', 'cyr')).toBe('операция');
  });

  it('chet harfli so\'zlar (c, w) o\'z holicha qoladi, qolgani o\'giriladi', () => {
    expect(transliterate('Coca-Cola Ichimligi Uzbekiston', 'cyr')).toBe('Coca-Cola Ичимлиги Узбекистон');
    expect(transliterate('CAT 330 operatori', 'cyr')).toBe('CAT 330 оператори');
    expect(transliterate('Windows', 'cyr')).toBe('Windows');
    // "ch" tarkibidagi c — o'zbekcha, o'giriladi
    expect(transliterate('Chevrolet', 'cyr')).toBe('Чевролет');
    expect(transliterate('MCHJ', 'cyr')).toBe('МЧЖ');
    expect(transliterate('IT PARK MCHJ', 'cyr')).toBe('ИТ ПАРК МЧЖ');
    // Raqamli/defisli tokenlar o'girilaveradi (formatDate/formatSalary uchun)
    expect(transliterate('1-iyul, 2026', 'cyr')).toBe('1-июл, 2026');
    expect(transliterate("5 000 000 so'm", 'cyr')).toBe('5 000 000 сўм');
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
      'ЛАБОРАТОРИЯ МУДИРИ',
      'БОШ БОШҚАРМАСИ',
    ];
    for (const s of samples) {
      expect(normalize(transliterate(s, 'lat')), s).toBe(normalize(s));
    }
  });
});
