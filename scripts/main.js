// scripts/main.js
const DEFAULT_REGION = "Пермский край";

const tableBody  = document.getElementById("institutions-body");
const emptyState = document.getElementById("empty-state");
const searchInput= document.getElementById("search");
const regionBtns = Array.from(document.querySelectorAll(".region-button"));

// helper
function norm(s){ return (s ?? "").toString().toLowerCase(); }
function highlightMatch(text, query){
  if(!query) return text ?? "";
  const safe = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(safe, "gi");
  return String(text ?? "").replace(re, m => `<mark>${m}</mark>`);
}

// determine regions list (from window.catalogData keys)
function listRegions(){
  return Object.keys(window.catalogData || {}).sort((a,b)=> a.localeCompare(b,"ru"));
}

// set active button UI (if buttons exist)
function setActiveButton(name){
  if(!regionBtns.length) return;
  regionBtns.forEach(btn => btn.classList.toggle("active", btn.dataset.region === name));
}

// choose initial region: active button -> DEFAULT_REGION if present -> first data key -> first button
function initialRegion(){
  const btnActive = document.querySelector(".region-button.active");
  if(btnActive) return btnActive.dataset.region;
  const keys = listRegions();
  if(keys.includes(DEFAULT_REGION)) return DEFAULT_REGION;
  if(keys.length) return keys[0];
  if(regionBtns.length) return regionBtns[0].dataset.region;
  return "";
}

let currentRegion = initialRegion();
setActiveButton(currentRegion);

// render function
function render(){
  const regionData = (window.catalogData && Array.isArray(window.catalogData[currentRegion])) ? window.catalogData[currentRegion] : [];
  const q = norm(searchInput?.value?.trim() || "");
  tableBody.innerHTML = "";

  const filtered = regionData.filter(item => {
    if(item.type === "heading") return q === ""; // show heading only when no query (keeps behavior consistent)
    if(!q) return true;

    // support { level, programs } blocks
    if(item.level && Array.isArray(item.programs)){
      if(norm(item.level).includes(q)) return true;
      return item.programs.some(p => norm(p.code).includes(q) || norm(p.title).includes(q));
    }

    const inNumber = norm(item.number).includes(q);
    const inName   = norm(item.name).includes(q);
    let inDirections = false;
    if(Array.isArray(item.directions)){
      inDirections = item.directions.some(d => norm(d.code).includes(q) || norm(d.title).includes(q));
    }
    return inNumber || inName || inDirections;
  });

  if(filtered.length === 0){
    emptyState.hidden = false;
    return;
  }
  emptyState.hidden = true;

  filtered.forEach((item, idx) => {
    // heading row (ВПО разделитель)
    if(item.type === "heading"){
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

    // level/programs block -> render level as heading + list of programs
    if(item.level && Array.isArray(item.programs)){
      const sub = document.createElement("tr");
      sub.className = "table-subhead";
      sub.innerHTML = `
        <th scope="col">№</th>
        <th scope="col">${item.level}</th>
        <th scope="col">Программы</th>
      `;
      tableBody.appendChild(sub);

      const row = document.createElement("tr");
      const tdNum = document.createElement("td");
      tdNum.setAttribute("data-label","№");
      tdNum.innerHTML = "";
      const tdInfo = document.createElement("td");
      tdInfo.setAttribute("data-label","Каталог");
      tdInfo.innerHTML = "";
      const tdDirs = document.createElement("td");
      tdDirs.setAttribute("data-label","Программы");
      const ul = document.createElement("ul");
      ul.className = "specializations";
      item.programs.forEach(p => {
        const li = document.createElement("li");
        li.innerHTML = `${p.code ? `<strong>${p.code}</strong> ` : ""}${p.title || ""}`;
        ul.appendChild(li);
      });
      tdDirs.appendChild(ul);
      row.appendChild(tdNum); row.appendChild(tdInfo); row.appendChild(tdDirs);
      tableBody.appendChild(row);
      return;
    }

    // normal entry
    const row = document.createElement("tr");

    const tdNum = document.createElement("td");
    tdNum.setAttribute("data-label","№");
    tdNum.innerHTML = highlightMatch(item.number ?? "", q);

    const tdInfo = document.createElement("td");
    tdInfo.setAttribute("data-label","Каталог специальностей и профессионального образования");
    tdInfo.innerHTML = `
      <div class="institution-name">${highlightMatch(item.name || "", q)}</div>
      <ul class="contact-list">
        ${ item.site || item.website ? `<li><strong>Сайт:</strong> <a href="${item.site || item.website}" target="_blank" rel="noopener">${item.site || item.website}</a></li>` : "" }
        ${ item.group || item.vk ? `<li><strong>Группа VK:</strong> <a href="${item.group || item.vk}" target="_blank" rel="noopener">${item.group || item.vk}</a></li>` : "" }
        ${ item.address ? `<li><strong>Адрес:</strong> ${item.address}</li>` : "" }
        ${ item.tel || item.phone ? `<li><strong>Тел.:</strong> ${item.tel || item.phone}</li>` : "" }
        ${ item.email ? `<li><strong>E-mail:</strong> <a href="mailto:${item.email}">${item.email}</a></li>` : "" }
      </ul>
    `;

    const tdDirs = document.createElement("td");
    tdDirs.setAttribute("data-label","Направления подготовки Номер / наименование специальности");
    const ul = document.createElement("ul");
    ul.className = "specializations";
    (item.directions || []).forEach(d => {
      const li = document.createElement("li");
      li.innerHTML = `<strong>${d.code || ""}</strong> ${highlightMatch(d.title || "", q)}`;
      ul.appendChild(li);
    });
    tdDirs.appendChild(ul);

    row.appendChild(tdNum); row.appendChild(tdInfo); row.appendChild(tdDirs);
    tableBody.appendChild(row);
  });
}

// debounce for search
function debounce(fn, ms){ let t=0; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a), ms); }; }

const onSearch = debounce(() => render(), 150);

// wire events
searchInput && searchInput.addEventListener("input", onSearch);

regionBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    const name = btn.dataset.region;
    if(!name) return;
    currentRegion = name;
    setActiveButton(name);
    render();
  });
});

// if there are no region buttons on page, create them automatically from data
function ensureRegionButtons(){
  if(document.querySelectorAll(".region-button").length) return;
  const container = document.querySelector(".region-buttons");
  if(!container) return;
  listRegions().forEach(r=>{
    const b = document.createElement("button");
    b.className = "region-button";
    b.dataset.region = r;
    b.textContent = r;
    b.addEventListener("click", ()=>{ currentRegion = r; setActiveButton(r); render(); });
    container.appendChild(b);
  });
}

// initial
ensureRegionButtons();
setActiveButton(currentRegion);
render();
