# Fintellect

AI buxgalteriya yordamchisi — O'zbekiston uchun buxgalteriya, soliq va moliya savollariga
javob beruvchi AI chat ilovasi (o'zbek tilida, lotin yozuvida).

## Stack

- **Frontend:** React 18 + Vite, plain CSS (custom design system, Sora/Inter fonts)
- **Backend:** Express, `/api/chat` orqali Anthropic Claude API'ga streaming proxy
- **Saqlash:** Suhbatlar tarixi brauzer `localStorage`'ida saqlanadi

## Ishga tushirish

```bash
npm install
cp .env.example .env
# .env faylida ANTHROPIC_API_KEY qiymatini o'zingizning Claude API kalitingizga almashtiring
npm run dev
```

Bu ikkita jarayonni ishga tushiradi:

- Vite dev-server — `http://localhost:5173` (frontend, `/api` so'rovlarini backendga proksi qiladi)
- Express API server — `http://localhost:8787` (`/api/chat`, Claude API bilan ishlaydi)

Brauzerda `http://localhost:5173` manzilini oching.

## Production build

```bash
npm run build
npm start
```

`npm start` Express serverini ishga tushiradi — u `/api/chat` so'rovlarini va `dist/`
papkasidagi tayyor frontendni bitta portda (`.env`dagi `PORT`, standart 8787) xizmat qiladi.

## Muhit o'zgaruvchilari (`.env`)

| O'zgaruvchi | Tavsif |
| --- | --- |
| `ANTHROPIC_API_KEY` | Claude API kaliti ([console.anthropic.com](https://console.anthropic.com/)) |
| `ANTHROPIC_MODEL` | Ishlatiladigan model (standart: `claude-sonnet-5`) |
| `PORT` | Backend server porti (standart: `8787`) |

## Loyiha tuzilishi

```
server/            Express API (Claude proxy, tizim prompti)
src/
  components/       Sidebar, WelcomeScreen, ChatView, ChatInput, PricingModal ...
  lib/              api.js (streaming client), storage.js (localStorage)
  App.jsx           Asosiy holat va layout
```

## Xususiyatlar

- Faqat buxgalteriya/soliq/moliya mavzusidagi savollarga javob beradi (tizim prompti orqali cheklangan)
- Xabarlar Claude API orqali real vaqtda (streaming) chiqariladi
- Bir nechta suhbatlarni saqlash va ular orasida almashish (localStorage)
- "Tariflar" oynasi: Kunlik / Oylik / Yillik tariflar
- Tungi/kunduzgi mavzu (dark/light) almashtirish
- Mobil qurilmalarga moslashgan (keyinchalik Telegram Mini App sifatida ishlatish uchun tayyor)
