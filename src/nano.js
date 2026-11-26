import { localModel } from "./firebase.js";

export async function nanoDetect(text) {
    const prompt =
        "Find personal details in the text: people's names, street addresses, cities, " +
        "and employer or company names that identify a person. " +
        'Reply with ONLY a JSON array like [{"type":"PERSON","value":"exact words from the text"}]. ' +
        "Allowed types: PERSON, ADDRESS, CITY, ORG. If nothing is found reply []\n\nTEXT:\n" + text;
    const res = await localModel().generateContent(prompt);
    const raw = res.response.text();
    const a = raw.indexOf("["), b = raw.lastIndexOf("]");
    if (a === -1 || b === -1) return [];
    try {
        return JSON.parse(raw.slice(a, b + 1))
            .filter((x) => x && typeof x.value === "string" && text.includes(x.value))
            .map((x) => ({ type: x.type || "OTHER", value: x.value, source: "gemini-nano" }));
    } catch {
        return [];
    }
}