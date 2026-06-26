/* ── CONFIG SUPABASE ── */
const SB  = 'https://qefpnyrumjacrznebtgf.supabase.co';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFlZnBueXJ1bWphY3J6bmVidGdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI0NTU3MzgsImV4cCI6MjA5ODAzMTczOH0.IbupYWa_yv8M7Ypzui97Fw3pc1VZt_ZEHE2RQvRz6S4';
const H   = { 'Content-Type':'application/json', 'apikey':KEY, 'Authorization':'Bearer '+KEY, 'Prefer':'return=representation' };

const TODAY = new Date().toISOString().split('T')[0];
const WS    = (() => { const d = new Date(); d.setDate(d.getDate() - d.getDay()); return d.toISOString().split('T')[0]; })();
const MS    = TODAY.slice(0,7) + '-01';

/* ── SUPABASE API ── */
async function api(method, table, body, params = '') {
  const r = await fetch(`${SB}/rest/v1/${table}${params}`, {
    method, headers: H,
    body: body ? JSON.stringify(body) : undefined
  });
  if (r.status === 204 || method === 'DELETE') return [];
  const txt = await r.text();
  return txt ? JSON.parse(txt) : [];
}
const GET   = (t, p)    => api('GET',    t, null, p);
const POST  = (t, b)    => api('POST',   t, b);
const PATCH = (t, b, p) => api('PATCH',  t, b, p);
const DEL   = (t, p)    => api('DELETE', t, null, p);

/* ── UTILS ── */
function uid()  { return 'x' + Date.now() + Math.random().toString(36).slice(2, 5); }
function esc(s) { return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

/* ── TOAST ── */
function toast(msg, type = 'ok') {
  const el = document.getElementById('toast');
  el.className = 'toast show ' + type;
  el.innerHTML = `<span class="t-icon">${type === 'ok' ? icon('check') : icon('alert')}</span> ${msg}`;
  setTimeout(() => { el.className = 'toast'; }, 2600);
}

/* ── SUPABASE STATUS ── */
async function pingDB() {
  const dot = document.getElementById('sb-dot');
  const lbl = document.getElementById('sb-lbl');
  const ms  = document.getElementById('sb-ms');
  dot.className = 'sb-dot chk'; lbl.textContent = 'Supabase'; ms.textContent = '';
  const t = Date.now();
  try {
    await fetch(`${SB}/rest/v1/projects?select=id&limit=1`, { headers: { 'apikey': KEY, 'Authorization': 'Bearer ' + KEY } });
    const d = Date.now() - t;
    dot.className = 'sb-dot ok'; lbl.textContent = 'Connecté'; ms.textContent = ' · ' + d + 'ms';
  } catch(e) {
    dot.className = 'sb-dot err'; lbl.textContent = 'Hors ligne';
  }
}

/* ── SIDEBAR TOGGLE ── */
let SB_OPEN = true;
function toggleSB() {
  SB_OPEN = !SB_OPEN;
  document.getElementById('sidebar').classList.toggle('collapsed', !SB_OPEN);
  document.getElementById('sb-icon').innerHTML = SB_OPEN ? icon('sidebarL') : icon('sidebarR');
}

/* ── PROJECTS ── */
let PROJS = [];
async function loadProjects() {
  try { PROJS = await GET('projects', '?order=created_at.asc&select=*,subtasks(*)'); }
  catch(e) { PROJS = []; }
}

function fillSel(id, all = false) {
  const s = document.getElementById(id);
  const c = s.value;
  s.innerHTML = all ? '<option value="">Tous les projets</option>' : '<option value="">— Sélectionner —</option>';
  PROJS.forEach(p => {
    const o = document.createElement('option');
    o.value = p.id; o.textContent = p.name;
    if (p.id === c) o.selected = true;
    s.appendChild(o);
  });
}

/* ── RENDER HELPERS ── */
function renderList(elId, acts, who, editable) {
  const el = document.getElementById(elId);
  if (!acts.length) {
    el.innerHTML = `<div class="empty-state">
      <span class="empty-icon">${icon('inbox','icon-lg')}</span>
      <div class="empty-title">Aucune action enregistrée</div>
      <div class="empty-sub">Les actions apparaîtront ici une fois saisies.</div>
    </div>`;
    return;
  }
  el.innerHTML = acts.map((a, i) => `
    <div class="acard" style="animation-delay:${i * .04}s">
      <div class="acard-meta">
        ${who === 'manager' ? `<span class="chip ${a.who==='ak'?'ch-ak':'ch-hz'}">${a.who==='ak'?'Abdelkader':'Hamza'}</span>` : ''}
        <span class="chip ch-date">${icon('calendar')} ${a.date}</span>
        <span class="chip ch-proj">${esc(a.projects?.name || '')}</span>
        ${a.subtasks ? `<span class="chip ch-sub">${esc(a.subtasks.name)}</span>` : ''}
      </div>
      <div class="acard-desc">${esc(a.description)}</div>
      ${editable ? `<div class="acard-foot">
        <button class="btn-ghost" onclick="editAct('${a.id}')">${icon('edit')} Modifier</button>
        <button class="btn-ghost danger" onclick="delAct('${a.id}')">${icon('trash')} Supprimer</button>
      </div>` : ''}
    </div>`).join('');
}

/* ── PROJECT LIST (manager) ── */
async function renderProjList() {
  const el = document.getElementById('proj-list');
  el.innerHTML = `<div class="loading-row"><div class="spinner"></div> Chargement…</div>`;
  await loadProjects();
  if (!PROJS.length) {
    el.innerHTML = `<div class="empty-state"><span class="empty-icon">${icon('folderX','icon-lg')}</span><div class="empty-title">Aucun projet</div></div>`;
    return;
  }
  el.innerHTML = PROJS.map((p, i) => `
    <div class="pcard" style="animation-delay:${i*.05}s" id="pc-${p.id}">
      <div class="pcard-hdr">
        <button class="pcard-name-btn" onclick="toggleSTP('${p.id}')">
          <div class="pcard-icon">${icon('folder')}</div>
          <span id="pn-${p.id}">${esc(p.name)}</span>
          <span class="pbadge">${(p.subtasks||[]).length} sous-tâche${(p.subtasks||[]).length!==1?'s':''}</span>
        </button>
        <div style="display:flex;gap:.35rem">
          <button class="btn-ghost" onclick="startEP('${p.id}')">${icon('edit')}</button>
          <button class="btn-ghost danger" onclick="delP('${p.id}')">${icon('trash')}</button>
        </div>
      </div>
      <div id="pe-${p.id}" class="hidden" style="margin-top:.625rem">
        <div class="edit-il">
          <input type="text" class="field-input" id="pei-${p.id}" value="${esc(p.name)}" onkeydown="if(event.key==='Enter')saveEP('${p.id}')">
          <button class="btn-grad" onclick="saveEP('${p.id}')">${icon('check')}</button>
          <button class="btn-ghost" onclick="cancelEP('${p.id}')">${icon('x')}</button>
        </div>
      </div>
      <div class="st-panel hidden" id="stp-${p.id}">
        ${(p.subtasks||[]).map(st => `
          <div class="st-row" id="str-${st.id}">
            <div class="st-name"><div class="st-dot"></div><span id="stn-${st.id}">${esc(st.name)}</span></div>
            <div id="ste-${st.id}" class="hidden edit-il" style="flex:1;margin-left:.5rem">
              <input type="text" class="field-input" id="stei-${st.id}" value="${esc(st.name)}" onkeydown="if(event.key==='Enter')saveEST('${p.id}','${st.id}')">
              <button class="btn-grad" onclick="saveEST('${p.id}','${st.id}')">${icon('check')}</button>
              <button class="btn-ghost" onclick="cancelEST('${st.id}')">${icon('x')}</button>
            </div>
            <div style="display:flex;gap:.25rem;margin-left:.5rem">
              <button class="btn-ghost" onclick="startEST('${st.id}')">${icon('edit')}</button>
              <button class="btn-ghost danger" onclick="delST('${p.id}','${st.id}')">${icon('trash')}</button>
            </div>
          </div>`).join('')}
        <div class="add-il">
          <input type="text" class="field-input" id="nst-${p.id}" placeholder="Ajouter une sous-tâche…" onkeydown="if(event.key==='Enter')addST('${p.id}')">
          <button class="btn-grad" onclick="addST('${p.id}')">${icon('plus')}</button>
        </div>
      </div>
    </div>`).join('');
}

function toggleSTP(pid) { document.getElementById('stp-'+pid).classList.toggle('hidden'); }
function showAddP()  { document.getElementById('ap-box').classList.remove('hidden'); document.getElementById('np-in').focus(); }
function hideAddP()  { document.getElementById('ap-box').classList.add('hidden'); document.getElementById('np-in').value = ''; }
async function saveNP() {
  const n = document.getElementById('np-in').value.trim(); if (!n) return;
  try { await POST('projects', { id: uid(), name: n }); toast('Projet créé'); hideAddP(); await renderProjList(); }
  catch(e) { toast('Erreur', 'err'); }
}
function startEP(pid)  { document.querySelector(`#pc-${pid} .pcard-name-btn`).style.opacity='.3'; document.getElementById('pe-'+pid).classList.remove('hidden'); document.getElementById('pei-'+pid).focus(); }
function cancelEP(pid) { document.querySelector(`#pc-${pid} .pcard-name-btn`).style.opacity='';  document.getElementById('pe-'+pid).classList.add('hidden'); }
async function saveEP(pid) {
  const v = document.getElementById('pei-'+pid).value.trim(); if (!v) return;
  try { await PATCH('projects', { name: v }, `?id=eq.${pid}`); toast('Projet modifié'); await renderProjList(); }
  catch(e) { toast('Erreur', 'err'); }
}
async function delP(pid) {
  if (!confirm('Supprimer ce projet et toutes ses sous-tâches ?')) return;
  try { await DEL('projects', `?id=eq.${pid}`); toast('Supprimé'); await renderProjList(); }
  catch(e) { toast('Erreur', 'err'); }
}
async function addST(pid) {
  const inp = document.getElementById('nst-'+pid);
  const n = inp.value.trim(); if (!n) return;
  try { await POST('subtasks', { id: uid(), project_id: pid, name: n }); toast('Sous-tâche ajoutée'); inp.value = ''; await renderProjList(); setTimeout(() => document.getElementById('stp-'+pid).classList.remove('hidden'), 80); }
  catch(e) { toast('Erreur', 'err'); }
}
function startEST(stid)  { document.getElementById('stn-'+stid).parentElement.classList.add('hidden'); document.getElementById('ste-'+stid).classList.remove('hidden'); document.getElementById('stei-'+stid).focus(); }
function cancelEST(stid) { document.getElementById('stn-'+stid).parentElement.classList.remove('hidden'); document.getElementById('ste-'+stid).classList.add('hidden'); }
async function saveEST(pid, stid) {
  const v = document.getElementById('stei-'+stid).value.trim(); if (!v) return;
  try { await PATCH('subtasks', { name: v }, `?id=eq.${stid}`); toast('Sous-tâche modifiée'); await renderProjList(); setTimeout(() => document.getElementById('stp-'+pid).classList.remove('hidden'), 80); }
  catch(e) { toast('Erreur', 'err'); }
}
async function delST(pid, stid) {
  if (!confirm('Supprimer cette sous-tâche ?')) return;
  try { await DEL('subtasks', `?id=eq.${stid}`); toast('Supprimée'); await renderProjList(); setTimeout(() => document.getElementById('stp-'+pid).classList.remove('hidden'), 80); }
  catch(e) { toast('Erreur', 'err'); }
}

/* ── SWAM LOGO SVG ── */
const SWAM_LOGO = `
<svg viewBox="0 0 260 72" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="SWAM Switch Al Maghrib">
  <defs>
    <linearGradient id="swg" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%"   stop-color="#4BBFE8"/>
      <stop offset="50%"  stop-color="#7B5EA7"/>
      <stop offset="100%" stop-color="#8B3A8F"/>
    </linearGradient>
  </defs>
  <!-- s -->
  <path d="M8 38 C8 32 12 29 18 29 C24 29 27 32 27 36 C27 40 24 42 18 44 C12 46 8 49 8 54 C8 59 12 62 18 62 C24 62 28 59 28 54" stroke="url(#swg)" stroke-width="5.5" fill="none" stroke-linecap="round"/>
  <!-- w -->
  <polyline points="33,29 40,62 48,42 56,62 63,29" stroke="url(#swg)" stroke-width="5.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  <!-- a (circle + stem) -->
  <circle cx="87" cy="44" r="15" stroke="url(#swg)" stroke-width="5.5" fill="none"/>
  <line x1="100" y1="50" x2="100" y2="64" stroke="url(#swg)" stroke-width="5.5" stroke-linecap="round"/>
  <!-- m -->
  <polyline points="108,62 108,29 125,50 142,29 142,62" stroke="url(#swg)" stroke-width="5.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  <!-- SWITCH AL MAGHRIB -->
  <text x="75" y="72" font-family="Inter,Arial,sans-serif" font-size="9.5" font-weight="600" fill="#8A92AA" text-anchor="middle" letter-spacing="2.8">SWITCH AL MAGHRIB</text>
</svg>`;
