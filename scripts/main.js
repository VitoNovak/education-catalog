// ---------- НАСТРОЙКА И ИСТОЧНИКИ ДАННЫХ ----------
const DATA_SOURCES = {
  "Республика Татарстан": "data/tatarstan.json",
  // Когда появятся другие – просто раскомментируй/добавь:
  // "Пермский край": "data/perm.json",
  // "Свердловская область": "data/sverdlovsk.json",
  // "Челябинская область": "data/chelyabinsk.json",
  // "Тюменская область": "data/tyumen.json",
};

const tableBody   = document.getElementById("institutions-body");
const emptyState  = document.getElementById("empty-state");
const searchInput = document.getElementById("search");
const regionBtns  = document.querySelectorAll(".region-button");
let currentRegion =
  document.querySelector(".region-button.active")?.dataset.region ||
  Object.keys(DATA_SOURCES)[0];

// ---------- УТИЛИТЫ ----------
function highlightMatch(text, query) {
  if (!query) return text ?? "";
  const safe = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(safe, "gi");
  return String(text ?? "").replace(re, (m) => `<mark>${m}</mark>`);
}

// «Терпимый» парсер JSON-подобного текста (ключи без кавычек, лишние запятые и т.п.)
function parseLooseJsonObjects(raw) {
  if (!raw) return [];
  let txt = raw;

  // убираем BOM и комментарии // ...
  txt = txt.replace(/^\uFEFF/, "").replace(/\/\/.*$/gm, "");

  // если это массив в валидном JSON — сразу пробуем
  try {
    const maybe = JSON.parse(txt);
    return Array.isArray(maybe) ? maybe : [maybe];
  } catch {}

  // ставим кавычки на ключи вида: region: "..."
  txt = txt.replace(/([{\s,])([a-zA-Z_][\w]*)\s*:/g, '$1"$2":');

  // убираем запятые перед закрывающими скобками
  txt = txt.replace(/,(\s*[}\]])/g, "$1");

  // если несколько объектов подряд, превращаем в массив
  const looksLikeManyObjects = /}\s*{/.test(txt.trim());
  if (looksLikeManyObjects) {
    txt = txt.replace(/}\s*{/, "},{"); // минимум одно место
    txt = "[" + txt.replace(/}\s*{\s*/g, "},{") + "]";
  } else {
    // если одиночный объект — завернём в массив
    if (!/^\s*\[/.test(txt)) txt = "[" + txt + "]";
  }

  // финальная попытка
  const arr = JSON.parse(txt);
  return Array.isArray(arr) ? arr : [arr];
}

// загружаем все выбранные источники (только активный регион при переключении)
async function loadRegionData(region) {
  const url = DATA_SOURCES[region];
  if (!url) return [];

  const res = await fetch(url, { cache: "no-store" });
  const text = await res.text();
  const arr = parseLooseJsonObjects(text);

  // Если у записей не проставлен region — проставим
  return arr.map((x) => ({ region, ...x }));
}

// ---------- РЕНДЕР ----------
function renderRows(institutions) {
  const query = searchInput.value.trim().toLowerCase();
  tableBody.innerHTML = "";

  // Отфильтровать по поиску
  const filtered = institutions.filter((item) => {
    if (item.type === "heading") return query === "";
    if (!query) return true;

    const dirs = item.directions || [];
    const inDirs = dirs.some(
      (d) =>
        (d.code || "").toLowerCase().includes(query) ||
        (d.title || "").toLowerCase().includes(query)
    );
    const inNum = ((item.number ?? "") + "").toLowerCase().includes(query);
    const inName = (item.name || "").toLowerCase().includes(query);
    return inDirs || inNum || inName;
  });

  if (filtered.length === 0) {
    emptyState.hidden = false;
    return;
  }
  emptyState.hidden = true;

  filtered.forEach((item, index) => {
    // СЕГМЕНТ-ЗАГОЛОВОК (ВПО) — мини thead
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

    const row = document.createElement("tr");

    // №
    const numberCell = document.createElement("td");
    const shownNumber = (item.number ?? index + 1).toString();
    numberCell.innerHTML = highlightMatch(shownNumber, query);
    numberCell.setAttribute("data-label", "№");

    // Информация
    const infoCell = document.createElement("td");
    infoCell.setAttribute(
      "data-label",
      "Каталог специальностей и профессионального образования"
    );
    infoCell.innerHTML = `
      <div class="institution-name">${highlightMatch(item.name, query)}</div>
      <ul class="contact-list">
        <li><strong>Сайт:</strong> ${
          item.website
            ? `<a href="${item.website}" target="_blank" rel="noopener">${item.website}</a>`
            : ""
        }</li>
        <li><strong>Группа VK:</strong> ${
          item.vk
            ? `<a href="${item.vk}" target="_blank" rel="noopener">${item.vk}</a>`
            : ""
        }</li>
        <li><strong>Адрес:</strong> ${item.address || ""}</li>
        <li><strong>Тел.:</strong> ${item.phone || ""}</li>
        <li><strong>E-mail:</strong> ${
          item.email ? `<a href="mailto:${item.email}">${item.email}</a>` : ""
        }</li>
      </ul>
    `;

    // Направления
    const dirsCell = document.createElement("td");
    dirsCell.setAttribute(
      "data-label",
      "Направления подготовки Номер / наименование специальности"
    );
    const list = document.createElement("ul");
    list.className = "specializations";
    (item.directions || []).forEach((dir) => {
      const li = document.createElement("li");
      li.innerHTML = `${highlightMatch(dir.code, query)} ${highlightMatch(
        dir.title,
        query
      )}`;
      list.appendChild(li);
    });
    dirsCell.appendChild(list);

    row.appendChild(numberCell);
    row.appendChild(infoCell);
    row.appendChild(dirsCell);
    tableBody.appendChild(row);
  });
}

// ---------- КОНТРОЛЛЕР ----------
async function rebuild() {
  // грузим активный регион
  const data = await loadRegionData(currentRegion);

  // Правило разметки: сначала СПО (обычные записи),
  // затем добавляем СЕКЦИОННЫЙ заголовок ВПО,
  // затем ВПО (обычные записи с продолжением нумерации).
  // Чтобы это работало из «сыраых» данных, можно впоследствии помечать
  // записи ВПО флагом isVpo:true. Сейчас оставим как есть: всё, что уже
  // в файле — просто отрисовывается; а разделитель ты можешь вставлять
  // отдельной записью прямо в файл как:
  // { type: "heading", title: "Каталог специальностей высшего профессионального образования (ВПО)" }

  renderRows(data);
}

// поиск
searchInput.addEventListener("input", rebuild);

// переключение регионов
regionBtns.forEach((btn) =>
  btn.addEventListener("click", () => {
    regionBtns.forEach((b) => {
      b.classList.remove("active");
      b.setAttribute("aria-selected", "false");
    });
    btn.classList.add("active");
    btn.setAttribute("aria-selected", "true");
    currentRegion = btn.dataset.region;
    rebuild();
  })
);

// первый рендер
rebuild();
