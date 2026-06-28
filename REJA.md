# YURIST AKADEMIYA — To'liq Analiz va Rivojlantirish Rejasi

> Bu hujjat Sonnet (yoki boshqa coding model) bilan ishlash uchun tayyorlangan.
> Har bir vazifa aniq fayl, qator va kod o'zgarishini ko'rsatadi.
> Tartib: **A → B → C → D → E** (avval kritik xatolar, keyin yangi funksiyalar).

---

## 0. ARXITEKTURA (mavjud holat)

**Monorepo** (npm workspaces):
- `apps/api` — Node.js + Express + PostgreSQL (Supabase) + Socket.io
- `apps/web` — React + Vite (PWA, i18n: uz/en/ru/tr)

**Asosiy modullar (api):** auth, courses, lessons, tests, assignments, meetings (Daily.co video),
library, chat, admin, groups, attendance, grades, ai (Groq), exams, push, curricula,
gamification, flashcards, parent, analytics.

**Tashqi servislar:**
- Supabase PostgreSQL (`DATABASE_URL`)
- Bunny.net CDN (video/fayl)
- Groq API (AI — `llama-3.3-70b-versatile`)
- Telegram Bot (`node-telegram-bot-api`, polling)
- Daily.co (video qo'ng'iroq)
- Web Push (VAPID)

**Ikki o'qish rejimi:**
- **Online** — `courses.mode='online'`: video darslar, lesson_progress, testlar, Daily.co meetinglar
- **Offline** — `courses.mode='offline'`: guruhlar (groups), davomat (attendance), kunlik baholar (daily_grades), mock imtihonlar, curriculum/group_lessons

---

## A. KRITIK XATOLAR — DARHOL TUZATISH

### A1. 🔴 Bot ro'yxatdan o'tish ishlamaydi (ASOSIY MUAMMO)

**Sabab:** `apps/api/src/config/telegram.js` dagi registratsiya xabarlarida MarkdownV2
maxsus belgilari escape qilinmagan. Telegram MarkdownV2 da quyidagilar **majburiy** escape:
`_ * [ ] ( ) ~ \` > # + - = | { } . !`

**Buzilgan qatorlar:**
- [telegram.js:123](apps/api/src/config/telegram.js#L123) — `(+998... — ...):` → `(`, `)`, `+`, `.`, `-` escape emas → **400 xato**, ro'yxat shu yerda o'ladi
- [telegram.js:135](apps/api/src/config/telegram.js#L135) — `topilmadi.` → `.` escape emas
- Boshqa `parse_mode: 'MarkdownV2'` ishlatilgan statik xabarlarni ham tekshirish kerak

**Yechim (2 variantdan birini tanlang):**

**Variant 1 (TAVSIYA — eng oson va ishonchli):** Registratsiya oqimidagi statik xabarlarda
`parse_mode: 'MarkdownV2'` ni umuman olib tashlash. Bold (`*...*`) kerak bo'lgan joylarda
oddiy matn ishlatish. Faqat dinamik foydalanuvchi ma'lumoti bor yakuniy xabarda (login/parol)
escape qilingan holda qoldirish.

**Variant 2:** Har bir MarkdownV2 xabarni `escapeMd()` orqali o'tkazish. Lekin bold `*` belgilarini
escape qilib qo'ymaslik kerak — bu murakkabroq.

**Aniq harakatlar:**
1. `initTelegramBot()` ichidagi barcha `sendMessage(..., { parse_mode: 'MarkdownV2' })`
   chaqiruvlarini ko'rib chiqish (qatorlar: 94, 123, 124, 135, 136, 141, 147, 157, 214, 238).
2. Statik (foydalanuvchi kiritmagan) matnlarda `parse_mode` ni olib tashlash YOKI matnni
   to'g'ri escape qilish.
3. Yakuniy "Tabriklaymiz" xabarida (214-qator) `escapeMd()` allaqachon ishlatilgan —
   uni tekshirib, login/parol `\`...\`` (code) bloklari to'g'ri ishlashiga ishonch hosil qilish.

**Test:** Botda `/start` → Ro'yxatdan o'tish → ism → familiya → telefon → ... → oxirigacha
xatosiz o'tishi kerak.

---

### A2. 🔴 Soxta Telegram tekshiruvi (`verifyTelegramPhone`)

**Sabab:** [telegram.js:51-59](apps/api/src/config/telegram.js#L51-L59) — funksiya aslida
Telegram mavjudligini tekshirmaydi, faqat prefiksni hardcoded ro'yxatga solishtiradi:
`['90','91','93','94','95','97','98','99','88','77','50','33','20']`.
Yangi yoki ro'yxatda yo'q prefiks (masalan `55`, `66`) bilan haqiqiy raqam **rad etiladi** →
foydalanuvchi "Bu raqamda Telegram topilmadi" da tiqilib qoladi.

**Yechim (tanlang):**
- **Variant 1 (TAVSIYA):** Tekshiruvni faqat **format** tekshiruviga aylantirish
  (`+998` + 9 raqam). Prefiks ro'yxatini olib tashlash yoki kengaytirish.
  "Telegram tekshirilmoqda" matnini "Raqam qabul qilindi" ga o'zgartirish (chalg'itmaslik uchun).
- **Variant 2 (to'liq):** Telegram **Contact** tugmasidan foydalanish — `request_contact: true`
  bilan `reply_markup`. Foydalanuvchi raqamini Telegram o'zi yuboradi (haqiqiy, tasdiqlangan).
  Bu eng to'g'ri yo'l: `msg.contact.phone_number` ni o'qish.

**Tavsiya:** Variant 2 — Telegram Contact tugmasi. Bu real tasdiqlash beradi va UX yaxshi.

---

### A3. 🟠 Web orqali ro'yxatdan o'tishda OTP qabul qiluvchi yo'q

**Sabab:**
- [auth.service.js:29-51](apps/api/src/modules/auth/auth.service.js#L29-L51) — `register()`
  foydalanuvchini `is_verified=false` va OTP bilan yaratadi, "Telegram botga kodni yuboring" deydi.
- Lekin botda OTP qabul qiluvchi handler **yo'q**. Demak web-registratsiya o'lik tugun.
- Frontend `RegisterForm` ([Login.jsx:176](apps/web/src/pages/auth/Login.jsx#L176)) `register()`
  ni umuman chaqirmaydi — faqat "Telegram botga o'ting" tugmasini ko'rsatadi.

**Yechim (tanlang):**
- **Variant 1 (TAVSIYA — soddalik):** Web registratsiyani butunlay bot orqali qoldirish.
  `auth.service.register()` va `/api/auth/register` route'ini olib tashlash yoki
  "bot orqali ro'yxatdan o'ting" deb 410 qaytarish. Hozirgi UI allaqachon shunga moslashgan.
- **Variant 2:** OTP oqimini to'ldirish — botga OTP handler qo'shish (foydalanuvchi 6 xonali
  kodni botga yuboradi → `is_verified=true`). Lekin bu murakkabroq, va bot allaqachon to'liq
  registratsiya qiladi, demak ortiqcha.

**Tavsiya:** Variant 1. Bitta registratsiya yo'li (bot) qoldirilsin — chalkashlik kamayadi.

---

### A4. 🔴 XAVFSIZLIK — `.env` haqiqiy sirlar bilan repozitoriyada

**Sabab:** `.env` faylda haqiqiy ishlab turgan kalitlar bor:
- `DATABASE_URL` (parol bilan), `GROQ_API_KEY`, `BUNNY_API_KEY`, `TELEGRAM_BOT_TOKEN`,
  `DAILY_API_KEY`
- `JWT_SECRET=your-super-secret-jwt-key-change-in-production` (default/zaif!)

**Yechim:**
1. `.env` ni `.gitignore` ga qo'shish (agar git tarixda bo'lsa — kalitlarni **almashtirish**!).
2. `.env.example` yaratish (qiymatlarsiz, faqat kalit nomlari).
3. `JWT_SECRET` ni kuchli tasodifiy qiymatga almashtirish (kamida 32 belgi).
4. **Barcha oshkor bo'lgan kalitlarni qayta generatsiya qilish:** Telegram bot token
   (@BotFather), Groq key, Bunny key, Daily key, Supabase DB paroli.

> ⚠️ Bu eng muhim xavfsizlik ishi. Kalitlar GitHub'da bo'lsa, ular allaqachon "buzilgan"
> hisoblanadi.

---

### A5. 🟠 `parent_telegram_chat_id` hech qachon to'ldirilmaydi

**Sabab:** Registratsiyada ota-onaning telefon raqami olinadi, lekin ularning Telegram
`chat_id` si yo'q. Ota-ona hisobotlari ([parentReport.service.js]) faqat student'ning
chat_id siga yoki umuman yuborilmaydi.

**Yechim:** Ota-ona alohida botga `/start` bosib, o'z telefonini Contact orqali tasdiqlasa,
`parent_telegram_chat_id` ni to'ldirish. Yoki registratsiyada "ota-onangiz botga shu havola
orqali o'tsin" deb deeplink berish (`/start parent_<studentId>`). Bu **B bosqichida** (online/offline).

---

### A6. 🟡 Mayda xatolar

- **`generateUsername`** ([telegram.js:8-12](apps/api/src/config/telegram.js#L8)) — Kirill yoki
  maxsus belgili ism uchun `replace(/[^a-z0-9]/g,'')` hammasini o'chiradi, faqat tasodifiy 4 belgi
  qoladi. Lotin transliteratsiya yoki fallback qo'shish.
- **Login UX** — generatsiya qilingan username (`email` ustunida) tasodifiy ko'rinadi.
  Foydalanuvchiga telefon raqami bilan ham kirish mumkinligini aniq ko'rsatish (login allaqachon
  `phone` ni qo'llab-quvvatlaydi).
- **Bot polling** — bir nechta instance ishga tushsa `409 Conflict`. Production'da webhook
  yoki yagona instance kafolati kerak.
- **VAPID kalitlari** — `.env` da `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY` yo'q. Web push
  ishlashi uchun `npm run vapid` bilan generatsiya qilib, env ga qo'shish kerak. Tekshirish.
- **`saveMessage`** har bir xabarni (telefon, ism) ochiq saqlaydi — maxfiylik. Kerak bo'lsa
  maskalash.

---

## B. ONLINE FUNKSIONALLIK (to'ldirish)

> Online rejim mavjud (video darslar, progress, testlar, Daily.co). Quyidagilar yetishmaydi:

### B1. Video progress va "davom etish"
- `lesson_progress` jadvalida `watched_seconds` bor, lekin avtomatik saqlash (har 10-15 sek
  yoki `onpause`) frontend'da bo'lishi kerak — tekshirish/qo'shish.
- "Kaldim joyidan davom etish" (resume) — oxirgi ko'rilgan sekunddan boshlash.
- Darsni 90% ko'rganda avtomatik `is_completed=true`.

### B2. Kurs sertifikati
- Online kurs 100% tugaganda PDF sertifikat generatsiya qilish (yangi `certificates` jadvali).

### B3. Online dars eslatmalari
- Meeting scheduler allaqachon bor (`meetings.scheduler.js`). Online darslar uchun Telegram +
  Web Push eslatmalari ishlayotganini tekshirish (5m/10m oldin).

### B4. Test yaxshilanishlari
- Test natijasini ko'rgandan keyin AI tushuntirish (qaysi savol noto'g'ri va nega) — **D bosqich**.
- Testni yarim qoldirib qaytish (resume attempt).

---

## C. OFFLINE FUNKSIONALLIK (to'ldirish)

> Offline rejim mavjud (groups, attendance, daily_grades, mock_exams, curriculum). Yetishmaydi:

### C1. Davomat (attendance) avtomatlashtirish
- O'qituvchi har dars uchun davomat belgilaydi (mavjud). Qo'shish:
  - QR-kod orqali talaba o'zi belgilanishi (sinfda QR skaner).
  - Davomat past bo'lsa (3+ qoldirish) → ota-onaga avtomatik Telegram ogohlantirish.

### C2. Kunlik baho jurnali (daily_grades)
- Mavjud. Qo'shish: haftalik/oylik o'rtacha, trend grafigi (analytics modulida).

### C3. Offline dars jadvali (schedule_slots)
- `schedule_slots` jadvali bor. Talaba o'z guruhining haftalik jadvalini ko'rishi
  ([Schedule.jsx] tekshirish). Ertangi dars haqida Telegram eslatma.

### C4. Mock imtihon natijalari
- O'qituvchi natija + javob kalitini joylaydi (`mock_exams.answer_text` bor). Talabaga
  natija e'lon qilinganda Telegram xabar + reyting.

### C5. Ota-ona portali to'ldirish (A5 bilan bog'liq)
- `parent_telegram_chat_id` to'ldirilgach, haftalik/kunlik hisobot avtomatik (scheduler bor:
  `parentReport.scheduler.js`). Test qilish.

---

## D. AI IMKONIYATLARI (Groq bilan kengaytirish)

> Hozir AI 3 ta ish qiladi: test generatsiya, uy ishi tekshirish, AI tutor chat (Groq llama-3.3).
> `@anthropic-ai/sdk` o'rnatilgan lekin ishlatilmagan — kerak bo'lsa Claude'ga o'tish mumkin.

### D1. Mavjud AI'ni yaxshilash
- **AI Tutor** ([ai.service.js:123](apps/api/src/modules/ai/ai.service.js#L123)) — hozir dars
  kontekstini faqat sarlavhadan oladi. Dars matni/materialini (RAG) qo'shsa — aniqroq javob.
- **Streaming** — AI javobini oqim (stream) qilib ko'rsatish (UX yaxshi).

### D2. Yangi AI funksiyalari (tavsiya, prioritet bo'yicha)
1. **AI flashcard generatsiya** — dars matnidan avtomatik savol-javob kartalari
   (`flashcards` jadvali bor, faqat AI generator qo'shish).
2. **AI uy ishi yordamchisi (talaba uchun)** — talaba uy ishini yozayotganda AI maslahat
   beradi (lekin javobni to'liq yozib bermaydi — "tutor" rejimi).
3. **AI test tushuntirish** — test tugagach, har bir noto'g'ri javob uchun AI izoh.
4. **AI yuridik qidiruv** — talaba qonun/modda haqida so'raydi, AI o'zbek qonunchiligi
   kontekstida javob beradi (huquqiy bilim bazasi bilan RAG).
5. **AI hujjat tahlili** — yuklangan PDF/Word (mammoth, pdf-parse o'rnatilgan) ni AI
   xulosalaydi yoki savol-javob qiladi.
6. **AI essay/insho baholash** — mock imtihon insholarini AI dastlabki baholaydi, o'qituvchi
   tasdiqlaydi.
7. **AI o'quv rejasi (curriculum)** — mavzu kiritilsa, AI butun kurs rejasini (darslar +
   topshiriqlar) generatsiya qiladi (`curricula` jadvaliga).
8. **AI Telegram bot yordamchisi** — botda talaba savol bersa, AI javob beradi (chat
   handler botga ulanadi).

### D3. AI infratuzilma
- **Rate limiting** AI endpointlarga (qimmat, suiiste'mol oldini olish).
- **Xarajat monitoring** — AI so'rovlar sonini loglash.
- **Model tanlovi** — tez/arzon ishlar uchun Groq, murakkab tahlil uchun Claude (Opus/Sonnet)
  — `@anthropic-ai/sdk` allaqachon bor.

---

## E. IMPLEMENTATION TARTIBI (Sonnet uchun bosqichlar)

> Har bir bosqichni alohida commit qiling. Avval A (kritik), keyin B/C/D.

**1-bosqich — Bot tuzatish (A1, A2):**
- [ ] `telegram.js` MarkdownV2 escaping tuzatish (A1)
- [ ] Telegram Contact tugmasi bilan raqam tasdiqlash (A2)
- [ ] To'liq registratsiya oqimini test qilish

**2-bosqich — Xavfsizlik (A4):**
- [ ] `.env` → `.gitignore`, `.env.example` yaratish
- [ ] `JWT_SECRET` va barcha kalitlarni almashtirish

**3-bosqich — Registratsiya tozalash (A3, A5, A6):**
- [ ] Web `register()` ni soddalashtirish (bot-only)
- [ ] `parent_telegram_chat_id` oqimi
- [ ] `generateUsername` transliteratsiya, VAPID tekshirish

**4-bosqich — Online/Offline to'ldirish (B, C):**
- [ ] Video resume + auto-complete (B1)
- [ ] Davomat ogohlantirish + QR (C1)
- [ ] Jadval eslatmalari (C3), mock natija xabari (C4)
- [ ] Ota-ona hisoboti test (C5)

**5-bosqich — AI (D):**
- [ ] AI flashcard generator (D2.1)
- [ ] AI test tushuntirish (D2.3)
- [ ] Botga AI yordamchi (D2.8)
- [ ] AI endpointlarga rate limit (D3)

---

## QO'SHIMCHA: Tezkor tekshirish ro'yxati (Sonnet boshlashdan oldin)

1. `npm run migrate` ishlaydimi? (schema yangilanishi)
2. `TELEGRAM_BOT_ENABLED=true` va token to'g'rimi?
3. Bot `/start` bosilganda javob beradimi? (polling ishlayaptimi)
4. `GROQ_API_KEY` amal qiladimi? (AI test)
5. Daily.co va Bunny kalitlar amal qiladimi?
