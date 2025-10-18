// scripts/main.js
// Работает с данными формата:
// window.catalogData = window.catalogData || {};
// window.catalogData["Республика Татарстан"] = [ { ... }, { type:"heading", title:"ВПО" }, { ... } ];

(function () {
  // ---------- DOM ----------
  const tableBody   = document.getElementById("institutions-body");
  const emptyState  = document.getElementById("empty-state");
  const searchInput = document.getElementById("search");
  const tabsWrap    = document.querySelector(".region-buttons");

  // ---------- УТИЛИТЫ ----------
  function qstr(v) { return (v ?? "").toString(); }

  function highlight(text, query) {
    if (!query) return qstr(text);
    const safe = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return qstr(text).replace(new RegExp(safe, "gi"), m => `<mark>${m}</mark>`);
  }

  function getRegions() {
    const src = window.catalogData || {};
    return Object.keys(src);
  }

  // ---------- Состояние ----------
  let currentRegion = null;

  // ---------- Рендер кнопок регионов (если контейнер есть на странице) ----------
  function renderRegionTabs() {
    const regions = getRegions();
    if (!tabsWrap || !regions.length) return;

    // если уже есть кнопки — не пересоздаём
    if (tabsWrap.querySelector("button")) return;

    tabsWrap.innerHTML = regions.map((r, i) => `
      <button class="region-button ${i === 0 ? "active" : ""}"
              data-region="${r}" role="tab"
              aria-selected="${i === 0 ? "true" : "false"}">${r}</button>
    `).join("");

    tabsWrap.querySelectorAll(".region-button").forEach(btn => {
      btn.addEventListener("click", () => {
        tabsWrap.querySelectorAll(".region-button").forEach(b => {
          b.classList.remove("active");
          b.setAttribute("aria-selected", "false");
        });
        btn.classList.add("active");
        btn.setAttribute("aria-selected", "true");
        currentRegion = btn.dataset.region;
        rebuild();
      });
    });
  }

  // ---------- Основной рендер таблицы ----------
  function renderRows(rows) {
    const query = searchInput ? searchInput.value.trim().toLowerCase() : "";
    tableBody.innerHTML = "";

    const filtered = rows.filter(item => {
      if (item.type === "heading") return query === ""; // «шапку» показываем только без поиска
      if (!query) return true;

      const inName = qstr(item.name).toLowerCase().includes(query);
      const inNum  = qstr(item.number).toLowerCase().includes(query);
      const inDirs = (item.directions || []).some(d =>
        qstr(d.code).toLowerCase().includes(query) ||
        qstr(d.title).toLowerCase().includes(query)
      );
      return inName || inNum || inDirs;
    });

    if (!filtered.length) {
      emptyState.hidden = false;
      return;
    }
    emptyState.hidden = true;

    filtered.forEach((item, idx) => {
      // Секция ВПО в виде мини-`thead`
      if (item.type === "heading") {
        const tr = document.createElement("tr");
        tr.className = "table-subhead";
        tr.innerHTML = `
          <th scope="col">№</th>
          <th scope="col">${item.title}</th>
          <th scope="col">Направления подготовки Номер / наименование специальности</th>
        `;
        tableBody.appendChild(tr);
        return;
      }

      const tr = document.createElement("tr");

      // №
      const tdNum = document.createElement("td");
      const shown = (item.number ?? (idx + 1)).toString();
      tdNum.setAttribute("data-label", "№");
      tdNum.innerHTML = highlight(shown, query);

      // Информация
      const tdInfo = document.createElement("td");
      tdInfo.setAttribute("data-label", "Каталог специальностей и профессионального образования");
      tdInfo.innerHTML = `
        <div class="institution-name">${highlight(item.name, query)}</div>
        <ul class="contact-list">
          <li><strong>Сайт:</strong> ${
            item.website ? `<a href="${item.website}" target="_blank" rel="noopener">${item.website}</a>` : ""
          }</li>
          <li><strong>Группа VK:</strong> ${
            item.vk ? `<a href="${item.vk}" target="_blank" rel="noopener">${item.vk}</a>` : ""
          }</li>
          <li><strong>Адрес:</strong> ${qstr(item.address)}</li>
          <li><strong>Тел.:</strong> ${qstr(item.phone)}</li>
          <li><strong>E-mail:</strong> ${
            item.email ? `<a href="mailto:${item.email}">${item.email}</a>` : ""
          }</li>
        </ul>
      `;

      // Направления
      const tdDirs = document.createElement("td");
      tdDirs.setAttribute("data-label","Направления подготовки Номер / наименование специальности");
      const ul = document.createElement("ul");
      ul.className = "specializations";
      (item.directions || []).forEach(d => {
        const li = document.createElement("li");
        li.innerHTML = `${highlight(d.code, query)} ${highlight(d.title, query)}`;
        ul.appendChild(li);
      });
      tdDirs.appendChild(ul);

      tr.appendChild(tdNum);
      tr.appendChild(tdInfo);
      tr.appendChild(tdDirs);
      tableBody.appendChild(tr);
    });
  }

  // ---------- Контроллер ----------
  function getRegionData(region) {
    const src = window.catalogData || {};
    return src[region] || [];
  }

  function rebuild() {
    const data = getRegionData(currentRegion);
    renderRows(data);
  }

  // ---------- Инициализация ----------
  (function init() {
    // Если кнопки регионов заранее размечены в HTML — используем их,
    // иначе сгенерируем из window.catalogData
    const presetActive = document.querySelector(".region-button.active");
    if (presetActive) {
      currentRegion = presetActive.dataset.region;
      // навесим обработчики
      document.querySelectorAll(".region-button").forEach(btn => {
        btn.addEventListener("click", () => {
          document.querySelectorAll(".region-button").forEach(b => {
            b.classList.remove("active");
            b.setAttribute("aria-selected", "false");
          });
          btn.classList.add("active");
          btn.setAttribute("aria-selected", "true");
          currentRegion = btn.dataset.region;
          rebuild();
        });
      });
    } else {
      renderRegionTabs();
      currentRegion = getRegions()[0] || "";
    }

    if (searchInput) {
      searchInput.addEventListener("input", rebuild);
    }
    rebuild();
  })();
})();

