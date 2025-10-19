// scripts/main.js — чистый JS, данные из window.catalogData
const DEFAULT_REGION = "Пермский край";

const tableBody  = document.getElementById("institutions-body");
const emptyState = document.getElementById("empty-state");
const searchInput= document.getElementById("search");
const regionBtns = Array.from(document.querySelectorAll(".region-button"));

function norm(s){ return (s ?? "").toString().toLowerCase(); }

// Подсветка ИМЕННО по сырому вводу пользователя (qRaw),
// с безопасным экранированием и регистронезависимым поиском.
function highlight(text, qRaw){
  const src = (text ?? "").toString();
  const q = (qRaw ?? "").toString().trim();
  if (!q) return src;
  const safe = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(safe, "gi");
  return src.replace(re, m => `<mark>${m}</mark>`);
}

function regions(){
  return Object.keys(window.catalogData || {}).sort((a,b)=>a.localeCompare(b,"ru"));
}
function setActive(name){
  regionBtns.forEach(b=>b.classList.toggle("active", b.dataset.region===name));
}

function pickInitialRegion(){
  const btnActive = document.querySelector(".region-button.active");
  if(btnActive) return btnActive.dataset.region;
  const keys = regions();
  if(keys.includes(DEFAULT_REGION)) return DEFAULT_REGION;
  if(keys.length) return keys[0];
  if(regionBtns.length) return regionBtns[0].dataset.region;
  return "";
}

let currentRegion = pickInitialRegion();
setActive(currentRegion);

function render(){
  const qRaw = (searchInput?.value || "").trim();     // оригинал для highlight
  const q    = qRaw.toLowerCase();                     // для фильтрации
  const data = Array.isArray(window.catalogData?.[currentRegion]) ? window.catalogData[currentRegion] : [];
  tableBody.innerHTML = "";

  const filtered = data.filter(item=>{
    if(item.type === "heading") return q === ""; // разделитель показываем только при пустом поиске

    // блок { level, programs } — если встретится
    if(item.level && Array.isArray(item.programs)){
      if(!q) return true;
      if(norm(item.level).includes(q)) return true;
      return item.programs.some(p => norm(p.code).includes(q) || norm(p.title).includes(q));
    }

    if(!q) return true;
    const byNum  = norm(item.number).includes(q);
    const byName = norm(item.name).includes(q);
    const byDirs = Array.isArray(item.directions) && item.directions.some(d => norm(d.code).includes(q) || norm(d.title).includes(q));
    return byNum || byName || byDirs;
  });

  if(filtered.length===0){ emptyState.hidden=false; return; }
  emptyState.hidden=true;

  filtered.forEach((item)=>{
    // Разделитель (мини thead)
    if(item.type === "heading"){
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

    // Блок уровня образования { level, programs }
    if(item.level && Array.isArray(item.programs)){
      const sub = document.createElement("tr");
      sub.className = "table-subhead";
      sub.innerHTML = `
        <th scope="col">№</th>
        <th scope="col">${highlight(item.level, qRaw)}</th>
        <th scope="col">Программы</th>
      `;
      tableBody.appendChild(sub);

      const row = document.createElement("tr");
      const td1 = document.createElement("td"); td1.setAttribute("data-label","№"); td1.innerHTML="";
      const td2 = document.createElement("td"); td2.setAttribute("data-label","Каталог"); td2.innerHTML="";
      const td3 = document.createElement("td"); td3.setAttribute("data-label","Программы");
      const ul = document.createElement("ul"); ul.className="specializations";
      item.programs.forEach(p=>{
        const li = document.createElement("li");
        li.innerHTML = `${p.code?`<strong>${highlight(p.code, qRaw)}</strong> `:""}${highlight(p.title||"", qRaw)}`;
        ul.appendChild(li);
      });
      td3.appendChild(ul);
      row.append(td1,td2,td3);
      tableBody.appendChild(row);
      return;
    }

    // Обычная запись
    const row = document.createElement("tr");

    const tdNum = document.createElement("td");
    tdNum.setAttribute("data-label","№");
    tdNum.innerHTML = highlight(item.number ?? "", qRaw);

    const tdInfo = document.createElement("td");
    tdInfo.setAttribute("data-label","Каталог специальностей и профессионального образования");
    tdInfo.innerHTML = `
      <div class="institution-name">${highlight(item.name || "", qRaw)}</div>
      <ul class="contact-list">
        ${ item.site || item.website ? `<li><strong>Сайт:</strong> <a href="${item.site || item.website}" target="_blank" rel="noopener">${highlight(item.site || item.website, qRaw)}</a></li>` : "" }
        ${ item.group || item.vk ? `<li><strong>Группа VK:</strong> <a href="${item.group || item.vk}" target="_blank" rel="noopener">${highlight(item.group || item.vk, qRaw)}</a></li>` : "" }
        ${ item.address ? `<li><strong>Адрес:</strong> ${highlight(item.address, qRaw)}</li>` : "" }
        ${ item.tel || item.phone ? `<li><strong>Тел.:</strong> ${highlight(item.tel || item.phone, qRaw)}</li>` : "" }
        ${ item.email ? `<li><strong>E-mail:</strong> <a href="mailto:${item.email}">${highlight(item.email, qRaw)}</a></li>` : "" }
      </ul>
    `;

    const tdDirs = document.createElement("td");
    tdDirs.setAttribute("data-label","Направления подготовки Номер / наименование специальности");
    const ul = document.createElement("ul"); ul.className="specializations";
    (item.directions || []).forEach(d=>{
      const li = document.createElement("li");
      li.innerHTML = `<strong>${highlight(d.code || "", qRaw)}</strong> ${highlight(d.title || "", qRaw)}`;
      ul.appendChild(li);
    });
    tdDirs.appendChild(ul);

    row.append(tdNum, tdInfo, tdDirs);
    tableBody.appendChild(row);
  });
}

function debounce(fn, ms){ let t=0; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a), ms); }; }
const onSearch = debounce(render, 120);
searchInput && searchInput.addEventListener("input", onSearch);

regionBtns.forEach(btn=>{
  btn.addEventListener("click", ()=>{
    const name = btn.dataset.region;
    if(!name) return;
    currentRegion = name;
    setActive(name);
    render();
  });
});

// Автокнопки из данных, если их нет в HTML
(function ensureButtons(){
  if(document.querySelectorAll(".region-button").length) return;
  const box = document.querySelector(".region-buttons"); if(!box) return;
  regions().forEach(r=>{
    const b = document.createElement("button");
    b.className="region-button"; b.dataset.region=r; b.textContent=r;
    b.addEventListener("click", ()=>{ currentRegion=r; setActive(r); render(); });
    box.appendChild(b);
  });
})();

// Инициализация
(function init(){
  const keys = regions();
  if(keys.includes(DEFAULT_REGION)) currentRegion = DEFAULT_REGION;
  else if(!currentRegion) currentRegion = keys[0] || regionBtns[0]?.dataset.region || "";
  setActive(currentRegion);
  render();
})();

