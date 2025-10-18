const tableBody   = document.getElementById("institutions-body");
const emptyState  = document.getElementById("empty-state");
const searchInput = document.getElementById("search");
const regionButtons = document.querySelectorAll(".region-button");

let currentRegionSlug = "tatarstan"; // по умолчанию

// безопасная подсветка
function highlight(text, q){
  if(!q) return text ?? "";
  const safe = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(safe, "gi");
  return String(text ?? "").replace(re, m => `<mark>${m}</mark>`);
}

async function loadRegion(slug){
  const res = await fetch(`data/${slug}.json`);
  if(!res.ok) throw new Error("Не удалось загрузить данные региона");
  return res.json();
}

function renderRows(items, query){
  tableBody.innerHTML = "";
  const q = (query||"").trim().toLowerCase();

  // фильтр
  const filtered = items.filter(x=>{
    if(x.type==="heading") return q==="";
    if(!q) return true;
    const hitName = (x.name||"").toLowerCase().includes(q);
    const hitNum  = (x.number+"").toLowerCase().includes(q);
    const hitDir  = (x.directions||[]).some(d=>
      (d.code||"").toLowerCase().includes(q) || (d.title||"").toLowerCase().includes(q)
    );
    return hitName || hitNum || hitDir;
  });

  if(!filtered.length){ emptyState.hidden = false; return; }
  emptyState.hidden = true;

  filtered.forEach((item, idx)=>{
    if(item.type==="heading"){
      const tr = document.createElement("tr");
      tr.className="table-subhead";
      tr.innerHTML = `
        <th scope="col">№</th>
        <th scope="col">${item.title}</th>
        <th scope="col">Направления подготовки Номер / наименование специальности</th>`;
      tableBody.appendChild(tr);
      return;
    }

    const row = document.createElement("tr");

    const tdNum = document.createElement("td");
    tdNum.setAttribute("data-label","№");
    tdNum.innerHTML = highlight(String(item.number ?? (idx+1)), q);

    const tdInfo = document.createElement("td");
    tdInfo.setAttribute("data-label","Каталог специальностей среднего/высшего проф. образования");
    tdInfo.innerHTML = `
      <div class="institution-name">${highlight(item.name, q)}</div>
      <ul class="contact-list">
        <li><strong>Сайт:</strong> <a href="${item.website||'#'}" target="_blank" rel="noopener">${item.website||""}</a></li>
        <li><strong>Группа VK:</strong> <a href="${item.vk||'#'}" target="_blank" rel="noopener">${item.vk||""}</a></li>
        <li><strong>Адрес:</strong> ${item.address||""}</li>
        <li><strong>Тел.:</strong> ${item.phone||""}</li>
        <li><strong>E-mail:</strong> <a href="mailto:${item.email||""}">${item.email||""}</a></li>
      </ul>
    `;

    const tdDirs = document.createElement("td");
    tdDirs.setAttribute("data-label","Направления подготовки Номер / наименование специальности");
    const ul = document.createElement("ul");
    ul.className="specializations";
    (item.directions||[]).forEach(d=>{
      const li = document.createElement("li");
      li.innerHTML = `${highlight(d.code, q)} ${highlight(d.title, q)}`;
      ul.appendChild(li);
    });
    tdDirs.appendChild(ul);

    row.appendChild(tdNum);
    row.appendChild(tdInfo);
    row.appendChild(tdDirs);
    tableBody.appendChild(row);
  });
}

let regionCache = {};
async function renderRegion(slug){
  if(!regionCache[slug]) regionCache[slug] = await loadRegion(slug);
  renderRows(regionCache[slug], searchInput.value);
}

searchInput.addEventListener("input", ()=>renderRegion(currentRegionSlug));

regionButtons.forEach(btn=>{
  btn.addEventListener("click", ()=>{
    regionButtons.forEach(b=>{b.classList.remove("active"); b.setAttribute("aria-selected","false");});
    btn.classList.add("active"); btn.setAttribute("aria-selected","true");
    currentRegionSlug = btn.dataset.region;
    searchInput.value = "";
    renderRegion(currentRegionSlug);
  });
});

// старт – Татарстан
renderRegion(currentRegionSlug);
