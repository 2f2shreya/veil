// Finds structured personal data (India-focused) with regex.
const RULES = [
    { type: "EMAIL", re: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g },
    { type: "PAN", re: /\b[A-Z]{5}[0-9]{4}[A-Z]\b/g },
    { type: "IFSC", re: /\b[A-Z]{4}0[A-Z0-9]{6}\b/g },
    { type: "ACCOUNT", re: /(?:account|a\/c|acct)[^0-9]{0,25}(\d{9,18})/gi, group: 1 },
    { type: "PHONE", re: /(?:\+91[\s-]?|\b)[6-9]\d{4}[\s-]?\d{5}\b/g },
    { type: "AADHAAR", re: /\b[2-9]\d{3}\s?\d{4}\s?\d{4}\b/g },
    { type: "DOB", re: /(?:dob|date of birth)[:\s]*([0-3]?\d[\/-][01]?\d[\/-](?:19|20)\d{2})/gi, group: 1 },
];

export function detect(text) {
    const found = [];
    for (const rule of RULES) {
        for (const m of text.matchAll(rule.re)) {
            const value = m[rule.group ?? 0];
            const start = m.index + (rule.group ? m[0].indexOf(value) : 0);
            const end = start + value.length;
            if (found.some((f) => start < f.end && end > f.start)) continue;
            found.push({ type: rule.type, value, start, end });
        }
    }
    return found.sort((a, b) => a.start - b.start);
}