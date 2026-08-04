# Sukoon — Website Setup Guide

Is version mein sab kuch **real/live** hai: shared database (Firebase),
real email + SMS OTP, real Razorpay payment, aur ek secure AI companion
backend. Neeche diye steps follow karke sab activate karo.

## Already ho chuka hai ✅
- Firebase project banaya, Firestore database on kiya
- `firebaseConfig` file mein daal di gayi hai
- Website build karke Netlify pe live kar di gayi hai

## Ab jo karna hai

### 1. Real Email OTP (EmailJS)

1. [emailjs.com](https://www.emailjs.com) pe free account banao
2. **Email Services → Add New Service** → Gmail (ya koi bhi) connect karo
3. **Email Templates → Create New Template** banao jisme ye do fields ho:
   - `{{to_email}}` — kisko bhejna hai
   - `{{otp_code}}` — code
   (Template body mein bas likh do: "Aapka Sukoon verification code hai: {{otp_code}}")
4. **Account → General** mein apni **Public Key** milegi
5. `src/App.jsx` file kholo, upar dhundo:
   ```js
   const EMAILJS_SERVICE_ID = 'YOUR_EMAILJS_SERVICE_ID';
   const EMAILJS_TEMPLATE_ID = 'YOUR_EMAILJS_TEMPLATE_ID';
   const EMAILJS_PUBLIC_KEY = 'YOUR_EMAILJS_PUBLIC_KEY';
   ```
   In teeno jagah apni real values daal do.

### 2. Real SMS OTP (Firebase Phone Auth)

1. Firebase Console → apna project → **Authentication → Get started**
2. **Sign-in method** tab → **Phone** → enable karo → Save
3. Kuch nahi likhna, code mein already sab set hai (numbers `+91` maan liye
   jaate hain jab tak khud "+" laga ke na likhein)

**Note:** Free (Spark) plan pe testing ke liye kaafi hai. Agar bahut saare
real users SMS OTP lenge, to Firebase apne aap **Blaze (pay-as-you-go)**
plan maangega — usme bhi shuruaati use bahut sasta/free hi rehta hai.

### 3. Real Payment (Razorpay — paisa seedha aapke bank account mein)

1. [razorpay.com](https://razorpay.com) pe account banao — apna bank account
   jodo (KYC/PAN details lagenge, ye Razorpay ka legal requirement hai taaki
   paisa aapko hi mile)
2. Dashboard mein **Settings → API Keys → Generate Key** (test key se shuru
   kar sakte ho, phir "Live mode" on karke live key lena — tabhi asli paisa
   aayega)
3. `src/App.jsx` mein dhundo:
   ```js
   const RAZORPAY_KEY_ID = 'rzp_test_YOUR_KEY_ID_HERE';
   ```
   Apni **Live Key ID** yahan daal do (jaise `rzp_live_XXXXXXXX`).

### 4. AI Companion feature (secure backend)

`netlify/functions/chat.js` file already ban chuki hai — bas Netlify
dashboard mein apni site ke andar:
**Site configuration → Environment variables → Add a variable**
- Key: `ANTHROPIC_API_KEY`
- Value: apni key ([console.anthropic.com](https://console.anthropic.com) se)

## Sab kuch ek saath deploy karo

Har baar code (`src/App.jsx`) mein koi bhi value badlo, dobara build +
deploy karna padega:

```bash
npm install
npm run build
netlify deploy --prod --dir=dist --functions=netlify/functions
```

## Note

- Diary, posts, stories, profiles, messages — sab Firestore mein save
  hote hain, isliye sab users ek doosre ke posts/DMs dekh payenge.
- Premium lene par khud-ba-khud **unlimited diary entries** aur **blue tick
  (verified badge)** mil jaata hai — ye already app mein wired hai, kuch
  extra karne ki zaroorat nahi.
- Forgot-password ab bhi OTP maangega (security ke liye) — koi bhi seedha
  bina verify kiye password badal nahi sakta.
