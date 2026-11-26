// nano.js: finds personal details with Gemini Nano, on your device only.
import { localModel } from "./firebase.js";

function parseNanoItems(raw) {
    const cleaned = String(raw || "").replace(/```json|```/gi, "");
    const start = cleaned.indexOf("[");
    const end = cleaned.lastIndexOf("]");
    if (start === -1 || end <= start) return null;
    try {
        const arr = JSON.parse(cleaned.slice(start, end + 1));
        return Array.isArray(arr) ? arr : null;
    } catch {
        return null;
    }
}

export async function nanoDetect(text) {
    const prompt = `Find personal identifiers in the document below: person names, street addresses, phone numbers, emails, ID or account numbers, dates of birth.

Example input: "Call Anita Rao at 9000000000, 5 MG Road, Pune."
Example output: [{"text":"Anita Rao","type":"PERSON"},{"text":"5 MG Road, Pune","type":"ADDRESS"}]

Reply with ONLY the JSON array, nothing else.
Each "text" must be copied exactly from the document.

Document:
${text}`;

    // Throws if there is no on-device model, so main.js stops. No cloud fallback.
    const result = await localModel().generateContent(prompt);
    const parsed = parseNanoItems(result.response.text());

    if (!parsed) {
        return { items: [], source: "ON_DEVICE", readable: false };
    }

    const items = parsed
        .filter((p) => p && p.text && p.type)
        .map((p) => ({
            type: String(p.type).toUpperCase(),
            value: String(p.text),
            source: "gemini-nano",
        }));

    return { items, source: "ON_DEVICE", readable: true };
}