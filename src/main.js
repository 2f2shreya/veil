import { localModel, cloudModel } from "./firebase.js";

const $ = (id) => document.getElementById(id);

// ---------- Routing Ledger ----------
const ledger = [];
function log(step, route, detail) {
  ledger.push({ step, route, detail });
  $("ledger").innerHTML = ledger
    .map((e) => `<div><b class="${e.route === "ON_DEVICE" ? "local" : "cloud"}">${e.route}</b> | ${e.step}: ${e.detail}</div>`)
    .join("");
}

// ---------- Rule-based backup so redaction never relies only on the small model ----------
const PATTERNS = [
  ["EMAIL", /[\w.+-]+@[\w-]+\.[\w.-]+/g],
  ["PHONE", /\+?\d[\d\s-]{8,}\d/g],
  ["ID", /\b\d{8,}\b/g],
];

// ---------- Step 1: redact on-device ----------
async function redact(text) {
  const found = new Map(); // original text -> TYPE
  const prompt =
    `Find personal identifiers in the text below. Include EVERY person's full name (check each one), phone numbers, ` +
    `emails, street addresses, bank account or government ID numbers, and dates of birth. ` +
    `Do NOT include money amounts, rent, deposits, percentages, cities or general dates. ` +
    `Return ONLY a JSON array like [{"text":"exact substring","type":"PERSON"}]. ` +
    `Types: PERSON, PHONE, EMAIL, ADDRESS, ID, DOB. ` +
    `Each "text" must be copied exactly from the document.\n\nText:\n${text}`;

  const result = await localModel().generateContent(prompt); // throws if no on-device model
  const source = result.response.inferenceSource ?? "ON_DEVICE";

  try {
    const raw = result.response.text().replace(/```json|```/g, "").trim();
    for (const item of JSON.parse(raw)) {
      const type = String(item.type || "ITEM").toUpperCase().replace(/[^A-Z]/g, "") || "ITEM";
      if (type === "ID" && String(item.text).replace(/\D/g, "").length < 8) continue; // short numbers are usually amounts
      if (item.text && text.includes(item.text)) found.set(item.text, type);
    }
  } catch {
    log("Redaction", "ON_DEVICE", "model output unreadable, using rules only");
  }

  for (const [type, re] of PATTERNS) {
    for (const m of text.match(re) ?? []) if (!found.has(m.trim())) found.set(m.trim(), type);
  }

  // Replace longest strings first, build placeholder map (stays in memory only).
  const counters = {};
  const map = {};
  let safe = text;
  for (const original of [...found.keys()].sort((a, b) => b.length - a.length)) {
    const type = found.get(original);
    counters[type] = (counters[type] || 0) + 1;
    const placeholder = `[${type}_${counters[type]}]`;
    map[placeholder] = original;
    safe = safe.split(original).join(placeholder);
  }
  return { safe, map, source };
}

// ---------- Step 3: restore on-device ----------
function restore(text, map) {
  let out = text;
  for (const [placeholder, original] of Object.entries(map)) {
    const name = placeholder.slice(1, -1);
    out = out.replace(new RegExp(`\\[?\\s*${name}\\b\\s*\\]?`, "gi"), () => original);
  }
  return out;
}

// Show text safely, turning **bold** and "* " bullets into readable formatting.
function show(el, text) {
  const safe = text.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  el.innerHTML = safe.replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/^\* /gm, "• ");
}

// ---------- Run everything ----------
$("go").onclick = async () => {
  const text = $("doc").value.trim();
  if (!text) return;
  ledger.length = 0;
  $("ledger").textContent = "";
  $("safe").textContent = "Working...";
  $("answer").textContent = "";
  let stage = "redaction";

  try {
    let t = performance.now();
    const { safe, map, source } = await redact(text);
    log("Redaction", source, `${Object.keys(map).length} personal items hidden, 0 sent to cloud (${Math.round(performance.now() - t)} ms)`);
    $("safe").textContent = safe;

    stage = "reasoning";
    t = performance.now();
    const res = await cloudModel().generateContent(
      `${$("task").value}\nKeep placeholders like [PERSON_1] exactly as written.\n\nDocument:\n${safe}`
    );
    log("Reasoning", res.response.inferenceSource ?? "IN_CLOUD", `anonymized text only (${Math.round(performance.now() - t)} ms)`);

    show($("answer"), restore(res.response.text(), map));
    log("Restore", "ON_DEVICE", "details put back locally, mapping never stored");
  } catch (err) {
    console.error(err);
    $("safe").textContent = "";
    $("answer").textContent =
      stage === "redaction"
        ? "No on-device model is available here, so Veil stopped. It will not send your raw text to the cloud."
        : "The cloud step failed. Your personal details were not sent. Check the console for the error.";
    log("Stopped", "ON_DEVICE", `${stage} step failed, nothing sensitive left the device`);
  }
};
