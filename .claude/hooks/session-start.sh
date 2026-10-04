#!/bin/bash
# SessionStart hook — Claude Code on the web (bulutli sessiya) muhitini tayyorlaydi.
#
# Har yangi sessiya bo'sh konteynerda boshlanadi: node_modules, Postgres, .env.local
# yo'q. Bu skript hammasini idempotent (qayta-qayta ishga tushirsa ham xavfsiz)
# tarzda tiklaydi, shunda `npm test`, `npm run typecheck`, `npm run dev` darhol ishlaydi.
#
# Faqat bulutda ishlaydi (CLAUDE_CODE_REMOTE=true). Lokal kompyuterda hech nima qilmaydi.
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

ROOT="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
PORTAL="$ROOT/portal"
DB_USER="vak"
DB_PASS="vak"
DB_NAME="vakansiyalar"
DB_URL="postgresql://${DB_USER}:${DB_PASS}@127.0.0.1:5432/${DB_NAME}"

log() { echo "[session-start] $*"; }

if [ ! -d "$PORTAL" ]; then
  log "portal/ topilmadi — o'tkazib yuborildi."
  exit 0
fi

SUDO=""
if [ "$(id -u)" -ne 0 ]; then SUDO="sudo -n"; fi

# ---------------------------------------------------------------------------
# 1. Postgres 16 (tizim paketi; Docker bulutda yo'q)
# ---------------------------------------------------------------------------
if ! command -v pg_lsclusters >/dev/null 2>&1; then
  log "Postgres o'rnatilmoqda..."
  export DEBIAN_FRONTEND=noninteractive
  $SUDO apt-get update -qq >/dev/null
  $SUDO apt-get install -y -qq postgresql postgresql-contrib >/dev/null
fi

if ! pg_lsclusters 2>/dev/null | grep -q ' online'; then
  log "Postgres ishga tushirilmoqda..."
  $SUDO service postgresql start >/dev/null 2>&1 || {
    PG_VER="$(ls /etc/postgresql | sort -V | tail -1)"
    $SUDO pg_ctlcluster "$PG_VER" main start
  }
fi

pg_admin() {
  if [ "$(id -u)" -eq 0 ]; then
    runuser -u postgres -- psql -v ON_ERROR_STOP=1 -Atq "$@"
  else
    sudo -n -u postgres psql -v ON_ERROR_STOP=1 -Atq "$@"
  fi
}

for _ in $(seq 1 30); do
  if pg_admin -c 'select 1' >/dev/null 2>&1; then break; fi
  sleep 1
done
if ! pg_admin -c 'select 1' >/dev/null 2>&1; then
  log "XATO: Postgres javob bermayapti."
  exit 1
fi

# ---------------------------------------------------------------------------
# 2. Rol + baza + sxema (schema.sql idempotent)
# ---------------------------------------------------------------------------
if [ "$(pg_admin -c "select 1 from pg_roles where rolname='${DB_USER}'")" != "1" ]; then
  log "Rol '${DB_USER}' yaratilmoqda..."
  pg_admin -c "create role ${DB_USER} login superuser password '${DB_PASS}'"
fi
if [ "$(pg_admin -c "select 1 from pg_database where datname='${DB_NAME}'")" != "1" ]; then
  log "Baza '${DB_NAME}' yaratilmoqda..."
  pg_admin -c "create database ${DB_NAME} owner ${DB_USER}"
fi
log "Sxema qo'llanmoqda..."
psql "$DB_URL" -v ON_ERROR_STOP=1 -q -f "$PORTAL/supabase/schema.sql" >/dev/null

# ---------------------------------------------------------------------------
# 3. .env.local (bor bo'lsa tegilmaydi). Muhitda DATABASE_URL (masalan,
#    Supabase'ning sessiya secret'i) bo'lsa, lokal Postgres o'rniga shu olinadi.
# ---------------------------------------------------------------------------
if [ ! -f "$PORTAL/.env.local" ]; then
  log ".env.local yaratilmoqda..."
  cat > "$PORTAL/.env.local" << ENV
# Bulutli sessiya uchun avtomatik yaratildi (.claude/hooks/session-start.sh)
DATABASE_URL=${DATABASE_URL:-$DB_URL}
NEXT_PUBLIC_SITE_URL=http://localhost:3000
ADMIN_PASSWORD=parol123
TG_BOT_TOKEN=
TG_WEBHOOK_SECRET=
ENV
fi

# ---------------------------------------------------------------------------
# 4. npm bog'liqliklari (keshlangan node_modules bo'lsa bir necha soniya)
# ---------------------------------------------------------------------------
cd "$PORTAL"
log "npm install..."
npm install --no-audit --no-fund --prefer-offline --loglevel=error

# ---------------------------------------------------------------------------
# 5. Namuna ma'lumot: LOKAL baza bo'sh bo'lsa data/seed/*.xlsx import qilinadi
#    (sun'iy namunalar, faqat lokal Postgres'ga — production'ga hech qachon)
# ---------------------------------------------------------------------------
COUNT="$(psql "$DB_URL" -Atqc 'select count(*) from vacancies' 2>/dev/null || echo 0)"
if [ "${COUNT:-0}" = "0" ]; then
  shopt -s nullglob
  for f in "$PORTAL"/data/seed/*.xlsx; do
    log "Import: $(basename "$f")"
    # DATABASE_URL har doim LOKAL baza: muhitda Supabase secret bo'lsa ham
    # namuna fayllar hech qachon production'ga yozilmasin.
    DATABASE_URL="$DB_URL" npm run --silent import -- "$f" >/dev/null || log "OGOHLANTIRISH: import xato berdi — $f"
  done
  shopt -u nullglob
fi

# ---------------------------------------------------------------------------
# 6. Sessiya muhit o'zgaruvchilari
# ---------------------------------------------------------------------------
if [ -n "${CLAUDE_ENV_FILE:-}" ]; then
  if [ -z "${DATABASE_URL:-}" ]; then
    echo "export DATABASE_URL=\"${DB_URL}\"" >> "$CLAUDE_ENV_FILE"
  fi
fi

log "Tayyor: Postgres online, sxema qo'llandi, vacancies=$(psql "$DB_URL" -Atqc 'select count(*) from vacancies')"
