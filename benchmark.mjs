import { detect } from "./src/detect.js";

const cases = [
    {
        name: "lease",
        text: "Tenant Rohan Mehta, phone 9876543210, email rohan.mehta@example.com. Rent is paid to account number 123456789012, IFSC HDFC0001234.",
        expect: ["9876543210", "rohan.mehta@example.com", "123456789012", "HDFC0001234"]
    },
    {
        name: "scam sms",
        text: "Dear customer, your SBI KYC has expired. Call 8765432109 or click the link now. Update PAN ABCDE1234F today.",
        expect: ["8765432109", "ABCDE1234F"]
    },
    {
        name: "offer letter",
        text: "Offer for Priya Nair. Contact priya.nair@example.org or +91 98765 43210 before joining.",
        expect: ["priya.nair@example.org", "+91 98765 43210"]
    },
    {
        name: "lab report",
        text: "Patient Amit Shah, DOB 12/03/1988. Mobile 7012345678. Aadhaar 2345 6789 0123. Hemoglobin 11.2 g/dL.",
        expect: ["12/03/1988", "7012345678", "2345 6789 0123"]
    },
    {
        name: "bank sms",
        text: "A/c XX4321 debited Rs 5000. UPI ref 412345678901. Call 1800 123 4567 if this was not you.",
        expect: []
    },
];

let total = 0, caught = 0, extra = 0;
for (const c of cases) {
    const found = detect(c.text).map((f) => f.value);
    for (const e of c.expect) {
        total++;
        if (found.includes(e)) caught++; else console.log(`MISSED [${c.name}]:`, e);
    }
    for (const f of found) {
        if (!c.expect.includes(f)) { extra++; console.log(`EXTRA  [${c.name}]:`, f); }
    }
}
console.log(`\nCaught ${caught} of ${total} sensitive items. Extra flags: ${extra}.`);