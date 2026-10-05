import { describe, expect, it } from 'vitest';
import { editDistance, findSimilar, loose, maxEdits, squeeze, suggestQuery, type IndexEntry } from './fuzzy';
import { normalize } from './normalize';

const key = (s: string) => loose(normalize(s));

describe('loose — klaviaturaga chidamli kalit', () => {
  it('rus klaviaturasi xatolari bitta kalitga tushadi', () => {
    expect(key('Коровул')).toBe(key('Қоровул'));
    expect(key('хамшира')).toBe(key('ҳамшира'));
    expect(key('hamshira')).toBe(key('xamshira'));
    expect(key('Бухгалтер')).toBe(key('buhgalter'));
  });

  it('boshqa farqlar saqlanadi', () => {
    expect(key('Ўқитувчи')).not.toBe(key('укитувчи')); // ў ≠ у — buni xato sanash hal qiladi
    expect(key('farrosh')).not.toBe(key('farosh'));
    expect(key('shifokor')).toBe('shifokor');
  });

  it("satr ichidagi moslik saqlanadi — aniq natijalar yo'qolmaydi", () => {
    for (const word of ['qorovulxona', 'buxgalteriya', 'aqqxxa']) {
      for (let i = 0; i < word.length; i++) {
        for (let j = i + 1; j <= word.length; j++) {
          expect(loose(word).includes(loose(word.slice(i, j)))).toBe(true);
        }
      }
    }
  });
});

describe('squeeze, maxEdits', () => {
  it("qo'sh harf bittaga", () => {
    expect(squeeze('farrosh')).toBe('farosh');
    expect(squeeze('kassir')).toBe('kasir');
    expect(squeeze('aaabbb')).toBe('ab');
  });

  it("qisqa so'zda xato tuzatilmaydi", () => {
    expect(maxEdits(4)).toBe(0);
    expect(maxEdits(5)).toBe(1);
    expect(maxEdits(8)).toBe(1);
    expect(maxEdits(9)).toBe(2);
  });
});

describe('editDistance — Damerau–Levenshtein (OSA)', () => {
  it('asosiy tahrirlar', () => {
    expect(editDistance('qorovul', 'qorovul', 2)).toBe(0);
    expect(editDistance('qarovul', 'qorovul', 2)).toBe(1); // almashtirish
    expect(editDistance('oqtuvchi', 'oqituvchi', 2)).toBe(1); // tushib qolgan harf
    expect(editDistance('elektirik', 'elektrik', 2)).toBe(1); // ortiqcha harf
    expect(editDistance('ohspaz', 'oshpaz', 2)).toBe(1); // o'rni almashgan
  });

  it('undosh almashsa — 2 (odatda boshqa so\'z)', () => {
    expect(editDistance('oktuvchi', 'ortuvchi', 2)).toBe(2);
    expect(editDistance('oktuvchi', 'ortuvchi', 1)).toBe(2);
  });

  it("chegaradan oshsa — max + 1", () => {
    expect(editDistance('qorovul', 'oshpaz', 1)).toBe(2);
    expect(editDistance('abc', 'abcdefgh', 2)).toBe(3);
  });

  it("prefix — so'z boshlanishi bilan, qo'shimcha hisobga olinmaydi", () => {
    expect(editDistance('qorovul', 'qorovuli', 1, true)).toBe(0);
    expect(editDistance('karovul', 'korovuli', 1, true)).toBe(1);
    expect(editDistance('oktuvchi', 'okituvchisi', 1, true)).toBe(1);
    expect(editDistance('qorovul', 'qorovuli', 1)).toBe(1);
  });
});

const entry = (label: string, n: number): IndexEntry => ({ ps: normalize(label), label, n, p: n });

const index: IndexEntry[] = [
  entry('Ўқитувчи', 300),
  entry("O'qituvchi", 20),
  entry('Математика фани ўқитувчиси', 100),
  entry('Математика укитувчиси', 5),
  entry('Қоровул', 70),
  entry('Кабристон қоровули', 5),
  entry('Коровул', 1),
  entry('Бухгалтер', 120),
  entry('Бош бухгалтер', 40),
  entry('Ҳайдовчи', 150),
  entry('Ошпаз', 30),
  entry('Ошхона ишчиси', 25),
  entry('Юк ортувчи', 200),
  entry('Электрик', 70),
  entry('Ҳудуд фарроши', 300),
  entry('Фаррош', 38),
  entry('Hudud faroshi', 1),
];

describe("findSimilar — xato yozilgan so'rovga o'xshash lavozimlar", () => {
  const labels = (q: string) => findSimilar(normalize(q), index, 10).map((e) => e.label);

  it("bitta harf xatosi, qo'shimchali shakllar ham topiladi", () => {
    expect(labels('qarovul')).toEqual(['Қоровул', 'Кабристон қоровули', 'Коровул']); // xato teng — ko'pi oldin
    // "укитувчиси" — 2 xato (у ≠ ў va tushib qolgan "и"), 8 harfli so'zga ko'p
    expect(labels('oqtuvchi')).toEqual(['Ўқитувчи', 'Математика фани ўқитувчиси', "O'qituvchi"]);
    expect(labels('elektirik')).toEqual(['Электрик']);
    expect(labels('buxgaltr')).toEqual(['Бухгалтер', 'Бош бухгалтер']);
  });

  it("qo'sh harf xatosi — xato emas", () => {
    expect(labels('farosh')).toEqual(['Ҳудуд фарроши', 'Фаррош', 'Hudud faroshi']);
  });

  it("so'zlar tartibi muhim emas, hammasi mos kelishi kerak", () => {
    expect(labels('buxgaltr bosh')).toEqual(['Бош бухгалтер']);
    expect(labels('bosh qorovul')).toEqual([]);
  });

  it("noto'g'ri o'xshashliklar qo'shilmaydi", () => {
    expect(labels('oshpz')).toEqual(['Ошпаз']); // "Ошхона" — 2 xato
    expect(labels('oqtuvchi')).not.toContain('Юк ортувчи'); // k → r — boshqa so'z
    expect(labels('kassa')).toEqual([]);
    expect(labels('ab')).toEqual([]);
  });
});

describe('suggestQuery — "Balki shuni qidirgandirsiz"', () => {
  it("xato yozilgan so'z — bazadagi eng ko'p uchragan asl shaklda", () => {
    expect(suggestQuery('qarovul', index)).toBe('қоровул');
    expect(suggestQuery('oqtuvchi', index)).toBe('ўқитувчи');
    expect(suggestQuery('haydovhi', index)).toBe('ҳайдовчи');
    expect(suggestQuery('oshpz', index)).toBe('ошпаз');
    expect(suggestQuery('elektirik', index)).toBe('электрик');
    expect(suggestQuery('farosh', index)).toBe('фаррош');
  });

  it('bazada kam uchraydigan xato shakl ham tuzatiladi (rus klaviaturasi)', () => {
    expect(suggestQuery('укитувчи', index)).toBe('ўқитувчи');
  });

  it("ko'p so'zli so'rovda faqat xato so'z almashadi", () => {
    expect(suggestQuery('bosh buxgaltr', index)).toBe('bosh бухгалтер');
  });

  it("to'g'ri yozilgan so'rovga taklif yo'q", () => {
    expect(suggestQuery('qorovul', index)).toBeNull();
    expect(suggestQuery('Коровул', index)).toBeNull(); // natijalar baribir bir xil
    expect(suggestQuery("o'qituvchi", index)).toBeNull();
    expect(suggestQuery('Бош бухгалтер', index)).toBeNull();
    expect(suggestQuery('bosh', index)).toBeNull();
  });

  it("qisqa, o'xshashi yo'q yoki ro'yxat bo'sh — null", () => {
    expect(suggestQuery('it', index)).toBeNull();
    expect(suggestQuery('zzzzzz', index)).toBeNull();
    expect(suggestQuery('qarovul', [])).toBeNull();
  });

  it('kam uchraydigan taklif berilmaydi', () => {
    expect(suggestQuery('qarovul', [entry('Қоровул', 2)])).toBeNull();
  });
});
