export function mergeItems(...lists) {
    const seen = new Set();
    const out = [];
    for (const list of lists) {
        if (!Array.isArray(list)) continue;
        for (const it of list) {
            if (!it || !it.value) continue;
            if (seen.has(it.value)) continue;
            seen.add(it.value);
            out.push(it);
        }
    }
    return out;
}

export function buildSafe(text, items) {
    const counts = {};
    const map = {};
    const typeOf = {};
    for (const i of items || []) {
        if (i && i.value) typeOf[i.value] ??= i.type;
    }
    const values = Object.keys(typeOf).sort((a, b) => b.length - a.length);
    let safe = text;
    for (const v of values) {
        const t = typeOf[v];
        counts[t] = (counts[t] || 0) + 1;
        const ph = `[${t}_${counts[t]}]`;
        map[ph] = v;
        safe = safe.split(v).join(ph);
    }
    return { safe, map };
}

export function restorePlaceholders(answer, map) {
    let out = answer || "";
    for (const [ph, original] of Object.entries(map || {})) {
        out = out.split(ph).join(original);
    }
    return out;
}