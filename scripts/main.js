// ===== инициализация =====
window.catalogData = window.catalogData || {};

const tableBody   = document.getElementById("institutions-body");
const emptyState  = document.getElementById("empty-state");
const searchInput = document.getElementById("search");
const regionBtns  = document.querySelectorAll(".region-button");

// стартовый регион: Пермский край, иначе первый из доступных
let currentRegion = window.catalogData["Пермский край"]
  ? "Пермский край"
  : Object.keys(window.catalogData)[0] || "";

// подсветим активную кнопку
function syncActiveButton() {
  regionBtns.forEach(btn => {
    const isActive = btn.dataset.region === currentRegion;
    btn.classList.toggle("active", isActive);
    btn.setAttribute("aria-selected", String(isActive));
  });
}
syncActiveButton();

// ===== утилита подсветки =====
function highlightMatch(text, query) {
  if (!query) return text ?? "";
  const safe = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(safe, "gi");
  return String(text ?? "").replace(re, m => `<mark>${m}</mark>`);
}

// ===== рендер =====
function render() {
  const data = window.catalogData[currentRegion] || [];
  const q = searchInput.value.trim().toLowerCase();

  tableBody.innerHTML = "";
  let rows = data.filter(item => {
    if (item.type === "heading") return q === ""; // разделитель только без поиска
    if (!q) return true;

    const inNum  = ((item.number ?? "") + "").toLowerCase().includes(q);
    const inName = (item.name || "").toLowerCase().includes(q);
    const dirs   = item.directions || [];
    const inDirs = dirs.some(d =>
      (d.code||"").toLowerCase().includes(q) ||
      (d.title||"").toLowerCase().includes(q)
    );
    return inNum || inName || inDirs;
  });

  if (!rows.length) {
    emptyState.hidden = false;
    return;
  }
  emptyState.hidden = true;

  rows.forEach((item, idx) => {
    // ---- разделитель ВПО как мини-thead ----
    if (item.type === "heading") {
      const sub = document.createElement("tr");
      sub.className = "table-subhead";
      sub.innerHTML = `
        <th scope="col">№</th>
        <th scope="col">${item.title}</th>
        <th scope="col">Направления подготовки Номер / наименование специальности</th>
      `;
      tableBody.appendChild(sub);
      return;
    }

    const tr = document.createElement("tr");

    const tdNum = document.createElement("td");
    const shown = (item.number ?? (idx + 1)).toString();
    tdNum.innerHTML = highlightMatch(shown, q);
    tdNum.setAttribute("data-label", "№");

    const tdInfo = document.createElement("td");
    tdInfo.setAttribute("data-label","Каталог специальностей и профессионального образования");
    tdInfo.innerHTML = `
      <div class="institution-name">${highlightMatch(item.name, q)}</div>
      <ul class="contact-list">
        <li><strong>Сайт:</strong> ${item.website ? `<a href="${item.website}" target="_blank" rel="noopener">${item.website}</a>` : ""}</li>
        <li><strong>Группа VK:</strong> ${item.vk ? `<a href="${item.vk}" target="_blank" rel="noopener">${item.vk}</a>` : ""}</li>
        <li><strong>Адрес:</strong> ${item.address || ""}</li>
        <li><strong>Тел.:</strong> ${item.phone || ""}</li>
        <li><strong>E-mail:</strong> ${item.email ? `<a href="mailto:${item.email}">${item.email}</a>` : ""}</li>
      </ul>
    `;

    const tdDirs = document.createElement("td");
    tdDirs.setAttribute("data-label","Направления подготовки Номер / наименование специальности");
    const ul = document.createElement("ul");
    ul.className = "specializations";
    (item.directions || []).forEach(d => {
      const li = document.createElement("li");
      li.innerHTML = `${highlightMatch(d.code, q)} ${highlightMatch(d.title, q)}`;
      ul.appendChild(li);
    });
    tdDirs.appendChild(ul);

    tr.appendChild(tdNum);
    tr.appendChild(tdInfo);
    tr.appendChild(tdDirs);
    tableBody.appendChild(tr);
  });
}

// ===== события =====
searchInput.addEventListener("input", render);
regionBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    currentRegion = btn.dataset.region;
    syncActiveButton();
    render();
  });
});

// первый рендер
render();

