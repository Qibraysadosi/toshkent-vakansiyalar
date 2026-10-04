/**
 * Toshkent shahrining 12 tumani + Toshkent viloyatidan alohida fayl bilan
 * keladigan tumanlar (hozircha Qibray).
 *
 * `db` — bazadagi AYNAN shu yozuv (Excel'dan kelgan kirillcha nom). Filtrlash
 * shu qiymat bo'yicha boradi, shuning uchun o'zgartirilmasin.
 *
 * `points` — bosh sahifadagi xarita uchun soddalashtirilgan poligon
 * (PLAN §5.3: geografik aniqlik shart emas, tumanlarning o'zaro joylashuvi
 * taxminan to'g'ri bo'lsa yetarli). viewBox: 0 0 1000 780.
 */

/**
 * `shahar` — Toshkent shahri (oylik umumiy fayl, 12 tuman birga keladi).
 * `viloyat` — Toshkent viloyati tumani (o'z alohida fayli bilan keladi).
 * Import qamrovi shunga bog'liq — qarang: `importScope()`.
 */
export type Region = 'shahar' | 'viloyat';

export interface District {
  slug: string;
  db: string;
  lat: string;
  cyr: string;
  region: Region;
  points: string;
  /** Xaritadagi yozuv markazi (poligon markazi qo'lda tanlangan). */
  label: [number, number];
}

export const DISTRICTS: District[] = [
  {
    slug: 'olmazor',
    db: 'Олмазор тумани',
    lat: 'Olmazor',
    cyr: 'Олмазор',
    region: 'shahar',
    points: '60,40 420,40 420,230 250,270 60,230',
    label: [232, 150],
  },
  {
    slug: 'yunusobod',
    db: 'Юнусобод тумани',
    lat: 'Yunusobod',
    cyr: 'Юнусобод',
    region: 'shahar',
    points: '420,40 830,40 870,200 700,260 420,230',
    label: [630, 150],
  },
  {
    slug: 'mirzo-ulugbek',
    db: 'Мирзо Улуғбек тумани',
    lat: "Mirzo Ulug'bek",
    cyr: 'Мирзо Улуғбек',
    region: 'shahar',
    points: '870,200 965,300 945,520 760,540 700,400 700,260',
    label: [830, 380],
  },
  {
    slug: 'uchtepa',
    db: 'Учтепа тумани',
    lat: 'Uchtepa',
    cyr: 'Учтепа',
    region: 'shahar',
    points: '60,230 250,270 300,420 230,545 80,480',
    label: [180, 380],
  },
  {
    slug: 'shayxontohur',
    db: 'Шайхонтохур тумани',
    lat: 'Shayxontohur',
    cyr: 'Шайхонтоҳур',
    region: 'shahar',
    points: '250,270 420,230 700,260 700,400 520,430 300,420',
    label: [480, 330],
  },
  {
    slug: 'mirobod',
    db: 'Миробод тумани',
    lat: 'Mirobod',
    cyr: 'Миробод',
    region: 'shahar',
    points: '520,430 700,400 760,540 625,590 520,540',
    label: [625, 480],
  },
  {
    slug: 'yakkasaroy',
    db: 'Яккасарой тумани',
    lat: 'Yakkasaroy',
    cyr: 'Яккасарой',
    region: 'shahar',
    points: '300,420 520,430 520,540 390,572 300,510',
    label: [405, 480],
  },
  {
    slug: 'chilonzor',
    db: 'Чилонзор тумани',
    lat: 'Chilonzor',
    cyr: 'Чилонзор',
    region: 'shahar',
    points: '230,545 300,510 390,572 362,700 180,690 150,600',
    label: [270, 615],
  },
  {
    slug: 'yangihayot',
    db: 'Янгиҳаёт тумани',
    lat: 'Yangihayot',
    cyr: 'Янгиҳаёт',
    region: 'shahar',
    points: '390,572 520,540 540,655 470,742 362,700',
    label: [452, 640],
  },
  {
    slug: 'sergeli',
    db: 'Сергели тумани',
    lat: 'Sergeli',
    cyr: 'Сергели',
    region: 'shahar',
    points: '540,655 625,590 715,650 700,742 470,742',
    label: [605, 680],
  },
  {
    slug: 'yashnobod',
    db: 'Яшнобод тумани',
    lat: 'Yashnobod',
    cyr: 'Яшнобод',
    region: 'shahar',
    points: '625,590 760,540 855,600 812,688 715,650',
    label: [745, 608],
  },
  {
    slug: 'bektemir',
    db: 'Бектемир тумани',
    lat: 'Bektemir',
    cyr: 'Бектемир',
    region: 'shahar',
    points: '855,600 945,520 968,624 900,722 812,688',
    label: [893, 622],
  },
  {
    // Toshkent viloyati — shaharning shimoli-sharqi (Yunusobod va Mirzo Ulug'bek bilan chegaradosh).
    // Bazadagi nom Qibray faylidagi yozuvdan aynan olingan.
    slug: 'qibray',
    db: 'Қибрай тумани',
    lat: 'Qibray',
    cyr: 'Қибрай',
    region: 'viloyat',
    points: '830,40 978,40 978,300 965,300 870,200',
    label: [918, 118],
  },
];

const BY_SLUG = new Map(DISTRICTS.map((d) => [d.slug, d]));
const BY_DB = new Map(DISTRICTS.map((d) => [d.db, d]));

export function districtBySlug(slug: string): District | undefined {
  return BY_SLUG.get(slug);
}

export function districtByDbName(name: string): District | undefined {
  return BY_DB.get(name);
}

export const CITY_DISTRICTS = DISTRICTS.filter((d) => d.region === 'shahar');

/** Bazadagi nomni ekranga chiqarish uchun ("Олмазор тумани" → "Olmazor"). */
export function districtLabel(dbName: string, script: 'lat' | 'cyr' = 'lat'): string {
  const d = BY_DB.get(dbName);
  if (!d) return dbName;
  return script === 'cyr' ? d.cyr : d.lat;
}

/** Manzildagi hudud: "Toshkent" (shahar) yoki "Toshkent viloyati" (Qibray kabi). */
export function regionLabel(dbName: string, script: 'lat' | 'cyr' = 'lat'): string {
  const viloyat = BY_DB.get(dbName)?.region === 'viloyat';
  if (script === 'cyr') return viloyat ? 'Тошкент вилояти' : 'Тошкент';
  return viloyat ? 'Toshkent viloyati' : 'Toshkent';
}

/**
 * Import qamrovi — fayl qaysi tumanlardagi vakansiyalarni ALMASHTIRADI.
 * Fayldagi har tuman uchun:
 *  - shahar tumani → butun shahar (12 tuman): oylik shahar fayli shaharning
 *    to'liq surati, o'sha oyda vakansiyasi qolmagan tuman ham tozalanadi;
 *  - viloyat tumani (Qibray) → faqat o'zi;
 *  - ro'yxatda yo'q nom → faqat o'zi.
 * Qamrovdan tashqaridagi vakansiyalarga import tegmaydi: Qibray fayli
 * Toshkentni, Toshkent fayli Qibrayni o'chirmaydi.
 */
export function importScope(fileDistricts: Iterable<string>): string[] {
  const scope = new Set<string>();
  for (const name of fileDistricts) {
    const d = BY_DB.get(name);
    if (d?.region === 'shahar') for (const c of CITY_DISTRICTS) scope.add(c.db);
    else scope.add(name);
  }
  return [...scope].sort();
}

/**
 * Faqat bitta viloyat tumanidan iborat fayl uchun batch nomiga tuman qo'shiladi
 * ("2026-10" → "2026-10-qibray") — shahar fayli bilan bir xil nom tanlansa ham
 * import tarixi va Telegram bildirishnomalari (first_batch) aralashib ketmaydi.
 */
export function scopedBatch(batch: string, fileDistricts: Iterable<string>): string {
  const names = [...new Set(fileDistricts)];
  if (names.length !== 1) return batch;
  const d = BY_DB.get(names[0]);
  if (!d || d.region !== 'viloyat') return batch;
  return batch.endsWith(`-${d.slug}`) ? batch : `${batch}-${d.slug}`;
}
