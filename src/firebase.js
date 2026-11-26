import { initializeApp } from "firebase/app";
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "firebase/app-check";
import { getAI, getGenerativeModel, GoogleAIBackend, InferenceMode } from "firebase/ai";

const firebaseConfig = {
    apiKey: "AIzaSyC9fvTxgf41fulQSe3qyqtojZpwIbwYelg",
    authDomain: "veil-b54a0.firebaseapp.com",
    projectId: "veil-b54a0",
    storageBucket: "veil-b54a0.firebasestorage.app",
    messagingSenderId: "414395476469",
    appId: "1:414395476469:web:31b4c67bbd241022b998bc"
};

export const app = initializeApp(firebaseConfig);

// App Check debug token (the contest accepts debug tokens).
if (import.meta.env.VITE_APPCHECK_DEBUG_TOKEN) {
    self.FIREBASE_APPCHECK_DEBUG_TOKEN = import.meta.env.VITE_APPCHECK_DEBUG_TOKEN;
} else if (import.meta.env.DEV) {
    self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
}

initializeAppCheck(app, {
    provider: new ReCaptchaEnterpriseProvider(import.meta.env.VITE_RECAPTCHA_SITE_KEY),
    isTokenAutoRefreshEnabled: true,
});

const ai = getAI(app, { backend: new GoogleAIBackend() });

// Step 1: redaction. Runs ONLY on your device, never falls back to the cloud.
export const localModel = () =>
    getGenerativeModel(ai, { mode: InferenceMode.ONLY_ON_DEVICE });

// Step 2: reasoning. Runs ONLY in the cloud, used on anonymized text only.
export const cloudModel = () =>
    getGenerativeModel(ai, {
        mode: InferenceMode.ONLY_IN_CLOUD,
        inCloudParams: { model: "gemini-3.5-flash-lite" },
    });