/**
 * Kvota yo'nalishlari — bazadagi 9 toifa (Excel'dan aynan shu yozuvda keladi).
 * `db` — bazadagi to'liq matn (filtr shu bo'yicha), `lat`/`cyr` — qisqa nom.
 */
export interface QuotaCategory {
  slug: string;
  db: string;
  lat: string;
  cyr: string;
}

export const QUOTAS: QuotaCategory[] = [
  {
    slug: 'nogironlik',
    db: 'Ногиронлиги бўлган шахслар',
    lat: 'Nogironligi bor shaxslar',
    cyr: 'Ногиронлиги бор шахслар',
  },
  {
    slug: 'bitiruvchi-yoshlar',
    db: 'Умумий ўрта ва ўрта махсус таълим ташкилотларини, касб-ҳунар мактабларини, касб-ҳунар коллежларини ҳамда техникумларни тамомлаб, касбга эга бўлган ёшлар',
    lat: 'Kasbga ega bitiruvchi yoshlar',
    cyr: 'Касбга эга битирувчи ёшлар',
  },
  {
    slug: 'yolgiz-ota-ona',
    db: 'Ўн тўрт ёшга тўлмаган болалари, ногиронлиги бўлган болалари бор ёлғиз ота ёки она, шунингдек кўп болали оилаларнинг ота-оналари',
    lat: "Yolg'iz yoki ko'p bolali ota-onalar",
    cyr: 'Ёлғиз ёки кўп болали ота-оналар',
  },
  {
    slug: 'zoravonlik-jabrlanganlar',
    db: 'Оилавий (маиший) зўравонликдан жабр кўрган шахслар',
    lat: "Oilaviy zo'ravonlikdan jabr ko'rganlar",
    cyr: 'Оилавий зўравонликдан жабр кўрганлар',
  },
  {
    slug: 'pensiya-oldi',
    db: 'Пенсияолди ёшидаги шахслар',
    lat: 'Pensiya oldi yoshidagilar',
    cyr: 'Пенсия олди ёшидагилар',
  },
  {
    slug: 'ozod-qilinganlar',
    db: 'Жазони ижро этиш муассасаларидан озод қилинган ёки суд қарорига кўра ўзига нисбатан тиббий йўсиндаги мажбурлов чоралари қўлланилган шахслар',
    lat: 'Jazoni o’tab ozod qilinganlar',
    cyr: 'Жазони ўтаб озод қилинганлар',
  },
  {
    slug: 'boshqa',
    db: 'Қонун ҳужжатларига мувофиқ бошқа шахслар',
    lat: 'Qonunga muvofiq boshqa shaxslar',
    cyr: 'Қонунга мувофиқ бошқа шахслар',
  },
  {
    slug: 'odam-savdosi',
    db: 'Одам савдосидан жабрланганлар',
    lat: 'Odam savdosidan jabrlanganlar',
    cyr: 'Одам савдосидан жабрланганлар',
  },
  {
    slug: 'harbiy-xizmatdan',
    db: 'Ўзбекистон Республикаси Мудофаа вазирлигининг, Ички ишлар вазирлигининг, Фавқулодда вазиятлар вазирлигининг, Миллий гвардиясининг, Давлат хавфсизлик хизматининг қўшинларидаги муддатли ҳарбий хизматдан бўшатилган шахслар',
    lat: 'Muddatli harbiy xizmatdan bo’shatilganlar',
    cyr: 'Муддатли ҳарбий хизматдан бўшатилганлар',
  },
];

const BY_SLUG = new Map(QUOTAS.map((q) => [q.slug, q]));
const BY_DB = new Map(QUOTAS.map((q) => [q.db, q]));

export function quotaBySlug(slug: string): QuotaCategory | undefined {
  return BY_SLUG.get(slug);
}

/** Bazadagi to'liq matn → qisqa nom (topilmasa matnning o'zi). */
export function quotaLabel(db: string | null, script: 'lat' | 'cyr' = 'lat'): string {
  if (!db) return '';
  const q = BY_DB.get(db);
  return q ? q[script] : db;
}
