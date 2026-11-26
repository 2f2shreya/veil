import { cloudModel } from "./firebase.js";
import { detect } from "./detect.js";
import { nanoDetect } from "./nano.js";
import { reviewItems } from "./review.js";
import { mergeItems, buildSafe } from "./redactor.js";

const $ = (id) => document.getElementById(id);

// ---------- Routing Ledger ----------
const ledger = [];
function log(step, route, detail) {
  const r = String(route).toUpperCase();
  ledger.push({ step, route: r, detail });
  $("ledger").innerHTML = ledger
    .map((e) => `<div><b class="${e.route === "ON_DEVICE" ? "local" : "cloud"}">${e.route}</b> | ${e.step}: ${e.detail}</div>`)
    .join("");
}

// ---------- Retry helper for busy cloud models ----------
async function withRetry(fn, tries = 4) {
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (e) {
      const msg = String(e && e.message);
      const busy = /\b(500|503)\b/.test(msg);
      if (!busy || i === tries - 2) throw e;
      await new Promise((r) => setTimeout(r, 3000 * (i + 1)));
    }
  }
}

// ---------- Step 1: find personal details on-device (Gemini Nano + rules) ----------
async function findItems(text) {
  const nano = await nanoDetect(text); // throws if no on-device model
  const rules = detect(text).map((i) => ({ type: i.type, value: i.value, source: "regex" }));
  const longNumbers = (text.match(/\b\d{8,}\b/g) ?? []).map((v) => ({ type: "ID", value: v, source: "regex" }));
  const items = mergeItems(rules, longNumbers, nano.items);
  return { items, source: nano.source, readable: nano.readable };
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
  $("review").innerHTML = "";
  $("safe").textContent = "Working...";
  $("answer").textContent = "";
  let stage = "redaction";

  try {
    let t = performance.now();
    const { items, source, readable } = await findItems(text);
    const nRegex = items.filter((i) => i.source === "regex").length;
    const nNano = items.filter((i) => i.source === "gemini-nano").length;
    if (!readable) log("Detection", "ON_DEVICE", "Gemini Nano output was unreadable, using rules only");
    log("Detection", source, `regex found ${nRegex}, Gemini Nano found ${nNano} (${Math.round(performance.now() - t)} ms)`);

    // Review before anything leaves the device
    $("safe").textContent = "Review the list above. Nothing has been sent to the cloud yet.";
    const approved = await reviewItems($("review"), items);
    const left = items.filter((i) => !approved.some((a) => a.value === i.value));
    if (left.length) log("Review", "ON_DEVICE", `you chose to leave ${left.length} detected item(s) visible`);
    if (!approved.length && !window.confirm("Nothing is selected to hide, so your full text would go to the cloud. Send anyway?")) {
      $("safe").textContent = "Cancelled. Nothing was sent.";
      log("Stopped", "ON_DEVICE", "cancelled by you, nothing left the device");
      return;
    }

    const { safe, map } = buildSafe(text, approved);
    log("Redaction", "ON_DEVICE", `${Object.keys(map).length} personal items hidden, 0 sent to cloud`);
    $("safe").textContent = safe;

    stage = "reasoning";
    t = performance.now();
    $("answer").textContent = "Asking the cloud (it retries automatically if busy)...";
    const res = await withRetry(() =>
      cloudModel().generateContent(
        `${$("task").value}\nText in square brackets like [PERSON_1] or [PHONE_1] stands for hidden details. Keep them exactly as written and never invent new bracketed placeholders.\n\nDocument:\n${safe}`
      )
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