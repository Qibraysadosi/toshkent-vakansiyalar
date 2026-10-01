import { describe, expect, it } from 'vitest';
import {
  EXCEL_HEADERS,
  FIELD_ORDER,
  MAX_PLAUSIBLE_SALARY,
  MIN_PLAUSIBLE_SALARY,
  SALARY_NOTE_SCHEDULE,
  SALARY_NOTE_UNCLEAR,
  mapHeaders,
  parseDate,
  parsePhone,
  parseSalary,
  parseStavka,
  parseStir,
  transformRows,
} from './import-transform';

const HEADER = FIELD_ORDER.map((f) => EXCEL_HEADERS[f]);

/** Real fayldagi qatorga o'xshash yordamchi. */
function row(over: Partial<Record<(typeof FIELD_ORDER)[number], unknown>> = {}): unknown[] {
  const base: Record<string, unknown> = {
    district: 'Олмазор тумани',
    stir: 301247839,
    company: 'PAXTAOY 26-SON MAKTABGACHA TA',
    phone: '998712449302',
    department: 'Tarbiyachilar',
    position: 'Тарбиячи',
    posted_date: '01.07.2026',
    stavka: '1.00',
    salary: '2500000',
    education: 'Олий',
    quota: null,
  };
  return FIELD_ORDER.map((f) => (f in over ? over[f] : base[f]));
}

describe('parseStir — PLAN §2.3', () => {
  it('boshidagi nolni saqlaydi', () => {
    expect(parseStir('12345678')).toBe('012345678');
    expect(parseStir(12345678)).toBe('012345678');
    expect(parseStir('301375023')).toBe('301375023');
    expect(parseStir(301375023)).toBe('301375023');
  });

  it("noto'g'ri qiymatda null", () => {
    expect(parseStir('')).toBeNull();
    expect(parseStir(null)).toBeNull();
    expect(parseStir('ABC')).toBeNull();
    expect(parseStir('1234567890')).toBeNull(); // 9 xonadan uzun
  });
});

describe('parseSalary — PLAN §2.1', () => {
  it('raqamni maosh sifatida oladi', () => {
    expect(parseSalary('2500000')).toEqual({ salary: 2500000, salary_note: null });
    expect(parseSalary('128333.33')).toEqual({ salary: 128333.33, salary_note: null });
    expect(parseSalary('1 250 000')).toEqual({ salary: 1250000, salary_note: null });
    expect(parseSalary('1250000,50')).toEqual({ salary: 1250000.5, salary_note: null });
  });

  it('matnli maoshni izohga aylantiradi', () => {
    expect(parseSalary('Ish haqi shtat jadvaliga (ichki tarif rejasi) muvofiq belgilanadi')).toEqual({
      salary: null,
      salary_note: SALARY_NOTE_SCHEDULE,
    });
    expect(parseSalary('')).toEqual({ salary: null, salary_note: SALARY_NOTE_SCHEDULE });
    expect(parseSalary(null)).toEqual({ salary: null, salary_note: SALARY_NOTE_SCHEDULE });
  });

  it('haddan tashqari katta qiymatni rad etadi (bazada 8 ta)', () => {
    expect(parseSalary('1942143118.98')).toEqual({ salary: null, salary_note: SALARY_NOTE_UNCLEAR });
    expect(parseSalary(String(MAX_PLAUSIBLE_SALARY + 1))).toEqual({ salary: null, salary_note: SALARY_NOTE_UNCLEAR });
    expect(parseSalary(String(MAX_PLAUSIBLE_SALARY)).salary).toBe(MAX_PLAUSIBLE_SALARY);
  });

  it('haddan tashqari kichik qiymatni rad etadi (9 so\'m, 1 so\'m ...)', () => {
    expect(parseSalary('9.00')).toEqual({ salary: null, salary_note: SALARY_NOTE_UNCLEAR });
    expect(parseSalary('600.00')).toEqual({ salary: null, salary_note: SALARY_NOTE_UNCLEAR });
    expect(parseSalary('0.01')).toEqual({ salary: null, salary_note: SALARY_NOTE_UNCLEAR });
    expect(parseSalary(String(MIN_PLAUSIBLE_SALARY)).salary).toBe(MIN_PLAUSIBLE_SALARY);
  });
});

describe('parseDate', () => {
  it('DD.MM.YYYY → ISO', () => {
    expect(parseDate('01.07.2026')).toBe('2026-07-01');
    expect(parseDate('3.7.2026')).toBe('2026-07-03');
    expect(parseDate('2026-07-01')).toBe('2026-07-01');
  });

  it('Excel seriya raqamini tushunadi', () => {
    expect(parseDate(46204)).toBe('2026-07-01');
  });

  it("noto'g'ri sanada null", () => {
    expect(parseDate('')).toBeNull();
    expect(parseDate('foo')).toBeNull();
    expect(parseDate('45.13.2026')).toBeNull();
  });

  it('kalendarda mavjud bo\'lmagan sanani rad etadi (Postgres `date` yiqilmasin)', () => {
    expect(parseDate('31.04.2026')).toBeNull();
    expect(parseDate('30.02.2026')).toBeNull();
    expect(parseDate('29.02.2025')).toBeNull();
    expect(parseDate('2026-04-31')).toBeNull();
    expect(parseDate('2026-02-30')).toBeNull();
    expect(parseDate('2026-13-45')).toBeNull();
    expect(parseDate('29.02.2024')).toBe('2024-02-29'); // kabisa yili saqlanadi
    expect(parseDate('2024-02-29')).toBe('2024-02-29');
  });
});

describe('parseStavka / parsePhone', () => {
  it('stavka', () => {
    expect(parseStavka('1.00')).toBe(1);
    expect(parseStavka('0.25')).toBe(0.25);
    expect(parseStavka('1,15')).toBe(1.15);
    expect(parseStavka('')).toBeNull();
    expect(parseStavka('0')).toBeNull();
  });

  it('bir nechta telefon raqami vergul bilan', () => {
    expect(parsePhone('998712449302')).toBe('998712449302');
    expect(parsePhone('998712449302,998712449303')).toBe('998712449302, 998712449303');
    expect(parsePhone('998712449302, 998712449302')).toBe('998712449302'); // takror
    expect(parsePhone('')).toBeNull();
    expect(parsePhone('12')).toBeNull(); // juda qisqa
  });
});

describe('mapHeaders', () => {
  it('kirillcha sarlavhalarni topadi', () => {
    const { index, matchedByName } = mapHeaders(HEADER);
    expect(matchedByName).toBe(true);
    expect(index.district).toBe(0);
    expect(index.stir).toBe(1);
    expect(index.position).toBe(5);
    expect(index.quota).toBe(10);
  });

  it('ustunlar boshqa tartibda bo\'lsa ham topadi', () => {
    const shuffled = [...HEADER].reverse();
    const { index, matchedByName } = mapHeaders(shuffled);
    expect(matchedByName).toBe(true);
    expect(index.district).toBe(10);
    expect(index.quota).toBe(0);
  });

  it('sarlavha topilmasa tartib bo\'yicha zaxiraga o\'tadi', () => {
    const { index, matchedByName } = mapHeaders(['a', 'b', 'c']);
    expect(matchedByName).toBe(false);
    expect(index.district).toBe(0);
    expect(index.quota).toBe(10);
  });
});

describe('transformRows', () => {
  it('bir xil qatorlarni birlashtirib positions_count yozadi (PLAN §2.2)', () => {
    const { vacancies, report } = transformRows([row(), row(), row()], HEADER, 'b1');
    expect(vacancies).toHaveLength(1);
    expect(vacancies[0].positions_count).toBe(3);
    expect(report.rowsRead).toBe(3);
    expect(report.rowsMerged).toBe(1);
    expect(report.duplicatesMerged).toBe(2);
  });

  it('faqat sanasi farq qilgan qatorlar ham birlashadi — eng so\'nggi sana qoladi', () => {
    const { vacancies } = transformRows(
      [row({ posted_date: '01.07.2026' }), row({ posted_date: '05.07.2026' }), row({ posted_date: '03.07.2026' })],
      HEADER,
      'b1',
    );
    expect(vacancies).toHaveLength(1);
    expect(vacancies[0].positions_count).toBe(3);
    expect(vacancies[0].posted_date).toBe('2026-07-05');
  });

  it('fingerprint barqaror: sana va batch o\'zgarsa ham bir xil', () => {
    const a = transformRows([row({ posted_date: '01.07.2026' })], HEADER, '2026-07').vacancies[0];
    const b = transformRows([row({ posted_date: '02.08.2026' })], HEADER, '2026-08').vacancies[0];
    expect(a.fingerprint).toBe(b.fingerprint);
    const c = transformRows([row({ salary: '3000000' })], HEADER, '2026-08').vacancies[0];
    expect(c.fingerprint).not.toBe(a.fingerprint);
  });

  it('farqi bor qatorlar birlashmaydi', () => {
    const { vacancies } = transformRows([row(), row({ position: 'Ошпаз' })], HEADER, 'b1');
    expect(vacancies).toHaveLength(2);
    expect(vacancies.every((v) => v.positions_count === 1)).toBe(true);
  });

  it('position_search normalize qilingan bo\'ladi', () => {
    const { vacancies } = transformRows([row({ position: 'Ўқитувчи' })], HEADER, 'b1');
    expect(vacancies[0].position).toBe('Ўқитувчи'); // original saqlanadi
    expect(vacancies[0].position_search).toBe('oqituvchi');
  });

  it('bir STIR uchun bitta korxona yozuvi', () => {
    const { companies } = transformRows(
      [row(), row({ position: 'Ошпаз' }), row({ stir: 200903001, company: 'BOSHQA' })],
      HEADER,
      'b1',
    );
    expect(companies).toHaveLength(2);
    expect(companies.find((c) => c.stir === '301247839')?.name).toBe('PAXTAOY 26-SON MAKTABGACHA TA');
    expect(companies.find((c) => c.stir === '301247839')?.name_search).toBe('paxtaoy 26-son maktabgacha ta');
  });

  it("korxona bir nechta tumanda bo'lsa — eng ko'p uchragani", () => {
    const rows = [
      row({ district: 'Чилонзор тумани', position: 'A' }),
      row({ district: 'Чилонзор тумани', position: 'B' }),
      row({ district: 'Миробод тумани', position: 'C' }),
    ];
    const { companies, vacancies } = transformRows(rows, HEADER, 'b1');
    expect(companies[0].district).toBe('Чилонзор тумани');
    // Vakansiyalar esa O'Z tumanini saqlaydi
    expect(vacancies.map((v) => v.district).sort()).toEqual(
      ['Миробод тумани', 'Чилонзор тумани', 'Чилонзор тумани'].sort(),
    );
  });

  it('yaroqsiz qatorlarni xatoga yozib o\'tkazib yuboradi', () => {
    const { vacancies, report } = transformRows(
      [row(), row({ stir: null }), row({ position: '' }), row({ district: null })],
      HEADER,
      'b1',
    );
    expect(vacancies).toHaveLength(1);
    expect(report.errors).toHaveLength(3);
    expect(report.errors.map((e) => e.reason)).toEqual([
      "STIR bo'sh yoki noto'g'ri",
      "Lavozim bo'sh",
      "Tuman bo'sh",
    ]);
  });

  it("noto'g'ri sana qatorni tashlamaydi — bo'sh qoladi, hisobotda ko'rinadi", () => {
    const { vacancies, report } = transformRows(
      [row({ posted_date: '31.04.2026' }), row({ posted_date: null, position: 'B' })],
      HEADER,
      'b1',
    );
    expect(vacancies).toHaveLength(2);
    expect(vacancies.every((v) => v.posted_date === null)).toBe(true);
    expect(report.skipped).toBe(0);
    // Bo'sh katak xato emas, faqat tushunarsiz qiymat xato
    expect(report.errors).toEqual([{ row: 2, reason: "Sana noto'g'ri — bo'sh qoldirildi", value: '31.04.2026' }]);
  });

  it("butunlay bo'sh qatorlar jimgina tashlanadi", () => {
    const { vacancies, report } = transformRows([row(), [], [null, null, null]], HEADER, 'b1');
    expect(vacancies).toHaveLength(1);
    expect(report.errors).toHaveLength(0);
  });

  it('maosh hisoblagichlari to\'g\'ri sanaydi', () => {
    const { report } = transformRows(
      [
        row({ salary: '2500000', position: 'A' }),
        row({ salary: 'Ish haqi shtat jadvaliga muvofiq belgilanadi', position: 'B' }),
        row({ salary: '1942143118.98', position: 'C' }),
        row({ salary: '9.00', position: 'D' }),
      ],
      HEADER,
      'b1',
    );
    expect(report.salaryNumeric).toBe(1);
    expect(report.salaryScheduleNote).toBe(1);
    expect(report.salaryTooHigh).toBe(1);
    expect(report.salaryTooLow).toBe(1);
  });

  it('import_batch har bir vakansiyaga yoziladi', () => {
    const { vacancies } = transformRows([row()], HEADER, '2026-08-24');
    expect(vacancies[0].import_batch).toBe('2026-08-24');
  });
});
