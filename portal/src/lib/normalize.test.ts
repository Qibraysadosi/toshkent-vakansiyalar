import { describe, expect, it } from 'vitest';
import { cleanText, hasCyrillic, normalize } from './normalize';

describe('normalize — PLAN.md §3.1 asosiy va\'da', () => {
  it('"Қоровул" = "qorovul" = "Qorovul"', () => {
    expect(normalize('Қоровул')).toBe('qorovul');
    expect(normalize('qorovul')).toBe('qorovul');
    expect(normalize('Qorovul')).toBe('qorovul');
    expect(normalize('ҚОРОВУЛ')).toBe('qorovul');
    expect(normalize('  Қоровул  ')).toBe('qorovul');
  });

  it('apostrofning barcha ko\'rinishlari bir xil kalitga tushadi', () => {
    const expected = 'oqituvchi';
    for (const variant of [
      'Ўқитувчи',
      "O'qituvchi", // to'g'ri burchakli apostrof (U+0027)
      'Oʻqituvchi', // U+02BB — rasmiy o'zbek lotin
      'O‘qituvchi', // U+2018
      'O’qituvchi', // U+2019
      'O`qituvchi', // U+0060 backtick
      'Oqituvchi',
    ]) {
      expect(normalize(variant), variant).toBe(expected);
    }
  });

  it('o\'zbek maxsus harflari: ў қ ғ ҳ ъ', () => {
    expect(normalize('Ўзбекистон')).toBe('ozbekiston');
    expect(normalize('Қишлоқ')).toBe('qishloq');
    expect(normalize('Ғишт')).toBe('gisht');
    expect(normalize("g'isht")).toBe('gisht');
    expect(normalize('Ҳамшира')).toBe('hamshira');
    expect(normalize('маъно')).toBe('mano');
    expect(normalize("ma'no")).toBe('mano');
    expect(normalize('Фарғона')).toBe('fargona');
    expect(normalize("Farg'ona")).toBe('fargona');
  });

  it('digraflar: ё ж ц ч ш ю я х', () => {
    expect(normalize('ёрдамчи')).toBe('yordamchi');
    expect(normalize('yordamchi')).toBe('yordamchi');
    expect(normalize('мотоцикл')).toBe('mototsikl');
    expect(normalize('Чилонзор')).toBe('chilonzor');
    expect(normalize('Шайхонтоҳур')).toBe('shayxontohur');
    expect(normalize('юрист')).toBe('yurist');
    expect(normalize('Ясловчи')).toBe('yaslovchi');
    expect(normalize('хизмат')).toBe('xizmat');
    expect(normalize('муҳандис')).toBe('muhandis');
    expect(normalize('инженер')).toBe('injener');
  });

  it('kirill "е": so\'z boshida "ye", ichkarida "e"', () => {
    // Bazada ikkala yozuv ham bor va bitta kalitga tushishi shart
    expect(normalize('Етакчи мутахассис')).toBe('yetakchi mutaxassis');
    expect(normalize('Yetakchi mutaxassis')).toBe('yetakchi mutaxassis');
    expect(normalize('Енгил автомобил')).toBe('yengil avtomobil');
    expect(normalize('Yengil avtomobil')).toBe('yengil avtomobil');
    // unlidan keyin ham "ye"
    expect(normalize('маектуб')).toBe('mayektub');
    // undoshdan keyin oddiy "e"
    expect(normalize('мебел')).toBe('mebel');
    expect(normalize('менежер')).toBe('menejer');
  });

  it('ruscha lavozimlar (bazada uchraydi)', () => {
    expect(normalize('сторож')).toBe('storoj');
    expect(normalize('дворник')).toBe('dvornik');
    expect(normalize('уборщица')).toBe('uborshitsa');
    expect(normalize('водитель')).toBe('voditel');
    expect(normalize('медсестра')).toBe('medsestra');
    expect(normalize('грузчик')).toBe('gruzchik');
    expect(normalize('Психолог')).toBe('psixolog');
  });

  it('bo\'shliq va bo\'sh qiymatlar', () => {
    expect(normalize('хона  ҳамшираси')).toBe('xona hamshirasi'); // ikkilangan bo'shliq
    expect(normalize('\t Ошпаз \n')).toBe('oshpaz');
    expect(normalize('')).toBe('');
    expect(normalize(null)).toBe('');
    expect(normalize(undefined)).toBe('');
  });

  it('aralash alifboli yozuvlar (bazada 85 ta qator)', () => {
    expect(normalize('Rus тили Ўқитувчи')).toBe('rus tili oqituvchi');
    expect(normalize('IT ҳамшира')).toBe('it hamshira');
    expect(normalize('suvchi chilangar 2-тоифа')).toBe('suvchi chilangar 2-toifa');
  });

  it('NFC: birlashtiruvchi belgili "ў" ham aynan mos tushadi', () => {
    const composed = 'ў'; // U+045E
    const decomposed = 'ў'; // у + combining breve
    expect(normalize(decomposed)).toBe(normalize(composed));
    expect(normalize(decomposed)).toBe('o');
  });

  it('idempotent — normallashgan matnni qayta o\'tkazish o\'zgartirmaydi', () => {
    for (const s of ['Қоровул', 'Ўқитувчи', 'уборщица', 'Етакчи мутахассис', 'Ҳудуд фарроши']) {
      expect(normalize(normalize(s))).toBe(normalize(s));
    }
  });

  it('natijada hech qachon kirill harf qolmaydi', () => {
    const samples = [
      'Мактабгача таълим муассасаси мусиқа раҳбари',
      'Ногиронлиги бўлган шахслар',
      'Ўн тўрт ёшга тўлмаган болалари',
      'Жазони ижро этиш муассасаларидан озод қилинган',
      'Қуритиш жихози оператори',
      'навбатчи кичик тиббий ходим',
    ];
    for (const s of samples) expect(hasCyrillic(normalize(s)), s).toBe(false);
  });
});

describe('cleanText — PLAN.md §2.4', () => {
  it('trim va ikkilangan bo\'shliqni tuzatadi, yozuvni saqlaydi', () => {
    expect(cleanText('  Мактабгача  таълим ')).toBe('Мактабгача таълим');
    expect(cleanText('хона  ҳамшираси')).toBe('хона ҳамшираси');
  });

  it('faqat muvozanatli qavslovchi qo\'shtirnoqni oladi', () => {
    expect(cleanText('"CLASS TEX"')).toBe('CLASS TEX');
    expect(cleanText('«Call-markaz»')).toBe('Call-markaz');
    expect(cleanText('“Call-markaz” хизмати')).toBe('“Call-markaz” хизмати');
    expect(cleanText('"CLASS TEX PRODUCTION" MAS\'ULIYATI')).toBe('"CLASS TEX PRODUCTION" MAS\'ULIYATI');
  });

  it('bo\'sh qiymatlar', () => {
    expect(cleanText(null)).toBe('');
    expect(cleanText(undefined)).toBe('');
    expect(cleanText(0)).toBe('0');
  });
});

describe('normalize — qidiruv hulq-atvori', () => {
  it('qism so\'z bo\'yicha topiladi (ILIKE %q% mantiqi)', () => {
    const rows = [
      'Ҳарбийлашган қоровуллик инспектори',
      'Механика таъмирлаш цехи (3 пост) қоровули',
      '"Urga" uchastkasi qorovuli',
      'Назорат ўтиш жойи қоровули',
      'Ошпаз',
    ];
    const q = normalize('qorovul');
    expect(rows.filter((r) => normalize(r).includes(q))).toHaveLength(4);
  });

  it('lotin so\'rovi kirill yozuvini topadi va aksincha', () => {
    expect(normalize('Ҳайдовчи').includes(normalize('haydovchi'))).toBe(true);
    expect(normalize('Yengil avtomobil haydovchisi').includes(normalize('ҳайдовчи'))).toBe(true);
  });
});
