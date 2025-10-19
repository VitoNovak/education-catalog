// scripts/main.js
const DEFAULT_REGION = "Пермский край";

const tbody = document.getElementById("tbody");
const regionsBar = document.getElementById("regions");
const searchInput = document.getElementById("search");
const emptyState = document.getElementById("empty");

let currentRegion = null;
let lastQuery = "";

// ===== helpers
function listRegions() {
  return Object.keys(window.catalogData || {}).sort((a, b) => a.localeCompare(b, "ru"));
}
function setActiveButton(name) {
  for (const btn of regionsBar.querySelectorAll("button")) {
    btn.classList.toggle("active", btn.dataset.region === name);
  }
}
function buildRegionsUI() {
  const frag = document.createDocumentFragment();
  listRegions().forEach(region => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = region;
    btn.dataset.region = region;
    btn.addEventListener("click", () => {
      if (currentRegion !== region) {
        currentRegion = region;
        setActiveButton(region);
        render();
      }
    });
    frag.appendChild(btn);
  });
  regionsBar.innerHTML = "";
  regionsBar.appendChild(frag);
}
function norm(s) { return (s ?? "").toString().toLowerCase(); }

// показываем в тексте ссылки только домен (href остаётся полным)
function displayURL(url) {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function matchesQueryItem(item, q) {
  if (!q) return true;
  if (item.type === "heading") return norm(item.title).includes(q);

  if (item.level && Array.isArray(item.programs)) {
    if (norm(item.level).includes(q)) return true;
    return item.programs.some(p => norm(p.code).includes(q) || norm(p.title).includes(q));
  }

  const inNumber = norm(item.number).includes(q);
  const inName   = norm(item.name).includes(q);
  let inDirections = false;
  if (Array.isArray(item.directions)) {
    inDirections = item.directions.some(d =>
      norm(d.code).includes(q) || norm(d.title).includes(q)
    );
  }
  return inNumber || inName || inDirections;
}

function render() {
  const regionData = window.catalogData[currentRegion] || [];
  const q = lastQuery;
  let visible = 0;
  let html = "";

  for (const item of regionData) {
    if (!matchesQueryItem(item, q)) continue;

    // heading
    if (item.type === "heading") {
      html += `<tr class="heading-row"><th colspan="4">${item.title}</th></tr>`;
      visible++;
      continue;
    }

    // level/programs блок
    if (item.level && Array.isArray(item.programs)) {
      const progs = item.programs
        .map(p => `<div class="dir"><span class="code">${p.code || ""}</span> ${p.title || ""}</div>`)
        .join("");
      html += `<tr class="heading-row"><th colspan="4">${item.level}</th></tr>`;
      html += `<tr><td class="number"></td><td class="name"></td><td class="contacts"></td><td class="directions">${progs}</td></tr>`;
      visible += 2;
      continue;
    }

    // обычная запись + синонимы полей
    const site  = item.site  || item.website || "";
    const group = item.group || item.vk      || "";
    const tel   = item.tel   || item.phone   || "";

    const contacts = [
      site  ? `Сайт: <a href="${site}" target="_blank" rel="noopener">${displayURL(site)}</a>` : "",
      group ? `Группа: <a href="${group}" target="_blank" rel="noopener">${displayURL(group)}</a>` : "",
      item.address ? `Адрес: ${item.address}` : "",
      tel ? `Тел.: ${tel}` : "",
      item.email ? `E-mail: <a href="mailto:${item.email}">${item.email}</a>` : ""
    ].filter(Boolean).join("<br>");

    const dirs = Array.isArray(item.directions)
      ? item.directions.map(d =>
          `<div class="dir"><span class="code">${d.code || ""}</span> ${d.title || ""}</div>`
        ).join("")
      : "";

    html += `
      <tr>
        <td class="number">${item.number ?? ""}</td>
        <td class="name">${item.name ?? ""}</td>
        <td class="contacts">${contacts}</td>
        <td class="directions">${dirs}</td>
      </tr>
    `;
    visible++;
  }

  tbody.innerHTML = html;
  emptyState.hidden = visible > 0;
}

function debounce(fn, ms) {
  let t = 0;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn.apply(this, args), ms); };
}

const onSearch = debounce(() => {
  lastQuery = norm(searchInput.value.trim());
  requestAnimationFrame(render);
}, 150);

document.addEventListener("DOMContentLoaded", () => {
  buildRegionsUI();
  const regions = listRegions();
  currentRegion = regions.includes(DEFAULT_REGION) ? DEFAULT_REGION : regions[0] || null;
  setActiveButton(currentRegion);
  render();
  searchInput.addEventListener("input", onSearch);
});
