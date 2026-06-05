# 🦆 huurhun_clothes — Онлайн дэлгүүр

Next.js 14 + Supabase + QPay дээр бүтээсэн, бэлэн ажиллах онлайн дэлгүүрийн код.

## Юу багтсан вэ

**Хэрэглэгчийн тал**
- Нүүр хуудас (hero, ангилал, хямдрал, шинэ бараа, урамшуулал)
- Ангилал бүрийн хуудас
- Барааны дэлгэрэнгүй: зурагнууд, үнэ, хямдралын хувь, **хэмжээ / өнгө / үлдэгдэл** сонголт
- Сагс (төхөөрөмж дээр хадгалагдана)
- Захиалга өгөх → **12 оронтой код** автоматаар үүснэ
- Захиалгын баталгаажуулалт + QPay QR
- Google эсвэл имэйлээр нэвтрэх
- Профайл: миний өмнөх захиалгууд
- Footer: 2 салбарын байршил (Google Maps), утас, Instagram

**Админ панел** (`/admin`)
- Хянах самбар (статистик)
- Бараа нэмэх/засах/устгах: олон зураг, үнэ, хямдрал, ангилал, хэмжээ/өнгө/тоо
- Ангилал нэмэх/устгах (зурагтай)
- Урамшуулал (1+1, дагалдан бараа гэх мэт)
- Захиалга харах: **захиалагчийн код, утас, хаяг**, төлбөрийн төлөв, статус өөрчлөх

---

## 1. Суулгах

Компьютерт **Node.js 18+** суулгасан байх ёстой. Дараа нь:

```bash
npm install
cp .env.local.example .env.local   # дараа нь .env.local-оо бөглөнө
npm run dev
```

Браузераар `http://localhost:3000` нээнэ.

---

## 2. Supabase тохиргоо (өгөгдлийн сан + нэвтрэлт + зураг)

1. https://supabase.com дээр үнэгүй бүртгүүлж **шинэ project** үүсгэнэ.
2. **Settings → API** хэсгээс дараах 3 утгыг хуулж `.env.local`-д тавина:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (нууц — зөвхөн серверт)
3. **SQL Editor** → `supabase/schema.sql` файлын агуулгыг бүхэлд нь хуулж **RUN** дарна. (Бүх хүснэгт, эрх, аюулгүй байдлын дүрэм үүснэ.)
4. **Storage → New bucket** → нэр нь яг `products`, **Public bucket** = ON болгож үүсгэнэ. (Зургийн policy-г schema.sql аль хэдийн тохируулсан.)

### Google-ээр нэвтрэх (заавал биш)
- **Authentication → Providers → Google** идэвхжүүлж, Google Cloud Console-оос Client ID/Secret авч оруулна.
- Имэйлээр нэвтрэх (magic link) нь тусдаа тохиргоогүйгээр шууд ажиллана.

### Өөрийгөө админ болгох
- Эхлээд апп дээрээ нэг удаа нэвтэрнэ (Google эсвэл имэйл).
- Дараа нь Supabase → SQL Editor дотор:
  ```sql
  update profiles set is_admin = true where email = 'таны_имэйл@gmail.com';
  ```
- Одоо `/admin` нээгдэнэ.

---

## 3. QPay тохиргоо (төлбөр)

1. https://merchant.qpay.mn дээр мерчант бүртгэл нээж, дараах 3 утгыг авна:
   - `QPAY_USERNAME`, `QPAY_PASSWORD`, `QPAY_INVOICE_CODE`
2. `.env.local`-д тавина.
3. Тохируулаагүй ч апп ажиллана — энэ үед захиалга үүснэ, төлбөрийг **гараар** (хүргэлтээр / шилжүүлгээр) авч, админаас "Төлсөн" гэж тэмдэглэнэ. QPay тохируулсан үед захиалгын хуудсанд QR гарч ирнэ.

> Анхаар: `callback_url` нь интернэтээс хүрэх ёстой тул QPay-г бодитоор турших гэвэл deploy хийсний дараа (доорх алхам) хийнэ. Локал дээр туршихад [ngrok](https://ngrok.com) ашиглаж болно.

---

## 4. Deploy (Vercel — хамгийн хялбар, үнэгүй)

1. Кодоо GitHub руу push хийнэ.
2. https://vercel.com → **New Project** → GitHub repo-гоо сонгоно.
3. **Environment Variables** хэсэгт `.env.local` доторх бүх утгыг (мөн `NEXT_PUBLIC_SITE_URL`-ийг өөрийн домэйнээр) нэмнэ.
4. Deploy дарна.
5. Supabase → **Authentication → URL Configuration** дотор Site URL болон Redirect URL-д өөрийн домэйнээ нэмнэ (`https://таны-домэйн/auth/callback`).

---

## 5. Брэндээ өөрчлөх

| Юу | Хаана |
|---|---|
| Логоны зураг | `public/logo.jpg`-г солих |
| Дэлгүүрийн нэр (huurhun_clothes) | `Header.js`, `Footer.js`, `layout.js` дотор |
| Утас, Instagram | `src/components/Footer.js` дээд талын `PHONE`, `INSTAGRAM` |
| 2 салбарын Maps холбоос | `src/components/Footer.js` `BRANCHES` массив |
| Өнгө (navy / жүрж / cream) | `tailwind.config.js` → `colors` |
| Фонт | `src/app/layout.js` → `Unbounded`, `Manrope` |

---

## Бүтэц

```
src/
  app/
    page.js                 нүүр
    category/[slug]/         ангилал
    product/[id]/            барааны дэлгэрэнгүй
    cart/  checkout/         сагс, захиалга
    order/[code]/            захиалгын код + QPay QR
    login/  profile/         нэвтрэх, профайл
    auth/callback/           OAuth/имэйл буцах
    admin/                   админ панел
    api/qpay/                нэхэмжлэх үүсгэх + callback
  components/                Header, Footer, ProductCard, AddToCart
  context/CartContext.js     сагс
  lib/supabase/              client / server / admin холболт
  lib/utils.js               үнэ формат, код үүсгэгч
supabase/schema.sql          өгөгдлийн сангийн бүх тохиргоо
```

Амжилт хүсье! 🦆
