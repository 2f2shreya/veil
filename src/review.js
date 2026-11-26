export function reviewItems(container, items) {
    return new Promise((resolve) => {
        const state = items.map((i) => ({ ...i, on: true }));
        container.innerHTML = "";
        const title = document.createElement("h3");
        title.textContent = "Review: tick what should be hidden";
        const list = document.createElement("div");
        container.append(title, list);

        function draw() {
            list.innerHTML = "";
            state.forEach((it) => {
                const row = document.createElement("label");
                row.style.display = "block";
                const box = document.createElement("input");
                box.type = "checkbox";
                box.checked = it.on;
                box.onchange = () => { it.on = box.checked; };
                row.append(box, ` ${it.type}: ${it.value} (found by ${it.source})`);
                list.append(row);
            });
        }
        draw();

        const add = document.createElement("input");
        add.placeholder = "Add something that was missed (exact text)";
        const addBtn = document.createElement("button");
        addBtn.textContent = "Add";
        addBtn.onclick = () => {
            const v = add.value.trim();
            if (!v) return;
            state.push({ type: "OTHER", value: v, source: "you", on: true });
            add.value = "";
            draw();
        };
        const go = document.createElement("button");
        go.textContent = "Send anonymized text to cloud";
        go.onclick = () => { container.innerHTML = ""; resolve(state.filter((s) => s.on)); };
        container.append(add, addBtn, go);
    });
}