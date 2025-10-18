// === Работает с window.catalogData ===
(function () {
  const tableBody = document.getElementById("institutions-body");
  const emptyState = document.getElementById("empty-state");
  const searchInput = document.getElementById("search");
  const regionButtons = document.querySelectorAll(".region-button");

  let currentRegion =
    document.querySelector(".region-button.active")?.dataset.region ||
    "Республика Татарстан";

  function highlightMatch(text, query) {
    if (!query) return text ?? "";
    const safe = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(safe, "gi");
    return String(text ?? "").replace(re, (m) => `<mark>${m}</mark>`);
  }

  function getRegionData(region) {
    return (window.catalogData && window.catalogData[region]) || [];
  }

  function renderRows(list) {
    const query = searchInput.value.trim().toLowerCase();
    tableBody.innerHTML = "";

    const filtered = list.filter((item) => {
      if (item.type === "heading") return query === "";
      if (!query) return true;

      const inName = (item.name || "").toLowerCase().includes(query);
      const inNum = ((item.number ?? "") + "").toLowerCase().includes(query);
      const inDirs = (item.directions || []).some(
        (d) =>
          (d.code || "").toLowerCase().includes(query) ||
          (d.title || "").toLowerCase().includes(query)
      );
      return inName || inNum || inDirs;
    });

    if (filtered.length === 0) {
      emptyState.hidden = false;
      return;
    }
    emptyState.hidden = true;

    filtered.forEach((item, index) => {
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

      const numberCell = document.createElement("td");
      const shownNumber = (item.number ?? index + 1).toString();
      numberCell.innerHTML = highlightMatch(shownNumber, query);
      numberCell.setAttribute("data-label", "№");

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

      const dirsCell = document.createElement("td");
      dirsCell.setAttribute(
        "data-label",
        "Направления подготовки Номер / наименование специальности"
      );
      const listEl = document.createElement("ul");
      listEl.className = "specializations";
      (item.directions || []).forEach((dir) => {
        const li = document.createElement("li");
        li.innerHTML = `${highlightMatch(dir.code, query)} ${highlightMatch(
          dir.title,
          query
        )}`;
        listEl.appendChild(li);
      });
      dirsCell.appendChild(listEl);

      row.appendChild(numberCell);
      row.appendChild(infoCell);
      row.appendChild(dirsCell);
      tableBody.appendChild(row);
    });
  }

  function rebuild() {
    const data = getRegionData(currentRegion);
    renderRows(data);
  }

  searchInput.addEventListener("input", rebuild);

  regionButtons.forEach((btn) =>
    btn.addEventListener("click", () => {
      regionButtons.forEach((b) => {
        b.classList.remove("active");
        b.setAttribute("aria-selected", "false");
      });
      btn.classList.add("active");
      btn.setAttribute("aria-selected", "true");
      currentRegion = btn.dataset.region;
      rebuild();
    })
  );

  rebuild();
})();
