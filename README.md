# Veil

Ask AI about private documents without handing over your identity.

**Live demo:** https://veil-b54a0.web.app (open in desktop Chrome)

## The problem
Lab reports, rental agreements, offer letters and bank statements are the documents people most need help with, and the ones they are most afraid to paste into a chatbot. Veil makes privacy not the price of getting help.

## How it works
1. **Your device hides the personal stuff.** Gemini Nano, running inside Chrome, replaces names, phone numbers, emails, addresses and account numbers with placeholders like `[PERSON_1]`.
2. **The cloud only sees the safe version.** Only the anonymized text goes to cloud Gemini, which explains the document, flags risky clauses or suggests questions to ask.
3. **Your device puts everything back.** The answer returns with your real details restored. The placeholder mapping never leaves your computer.

A **Routing Ledger** shows step by step what stayed on the device and what went to the cloud.

If the device has no on-device model, Veil does not silently fall back to the cloud. It stops and tells you.

## How Veil uses Firebase AI Logic
Firebase AI Logic hybrid inference is the core of the app (see `src/firebase.js` and `src/main.js`):
- **Redaction** uses `InferenceMode.ONLY_ON_DEVICE`, so sensitive text cannot reach the cloud. If the local model is missing it throws an error instead of falling back.
- **Reasoning** uses `InferenceMode.ONLY_IN_CLOUD` (Gemini 2.5 Flash), on anonymized text only.
- The app reads which side answered each request and shows it in the Routing Ledger.
- **App Check** (reCAPTCHA Enterprise) protects the AI calls, and enforcement is turned on for Firebase AI Logic.

## Run it yourself
Requirements: Node.js, desktop Chrome with Gemini Nano available, and a Firebase project with Firebase AI Logic and App Check enabled.

```bash
git clone https://github.com/2f2shreya/veil.git
cd veil
npm install
cp .env.example .env   # then set VITE_RECAPTCHA_SITE_KEY to your reCAPTCHA Enterprise site key
npm run dev
```

Update the Firebase config in `src/firebase.js` with your own project's values. On localhost, App Check runs in debug mode: copy the debug token printed in the browser console into Firebase Console, then App Check, then Manage debug tokens.

Build and deploy:

```bash
npm run build
npx firebase-tools deploy --only hosting
```

## Tech stack
Vite, JavaScript, Firebase AI Logic, Firebase App Check, Firebase Hosting, Gemini Nano (on-device), Gemini 2.5 Flash (cloud).

## License
Apache-2.0
 **You stay in control.** Before anything is sent, Veil lists everything it found (regex rules plus Gemini Nano) and lets you untick wrong items or add missed ones.
