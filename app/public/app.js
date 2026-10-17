/* Insubria Hub: interfaccia della web app autonoma. I dati vivono sul server (/api), le notifiche arrivano via Web Push. */

/* ------------------------------------------------------------------ dati statici */
const DEPARTMENTS = [
  { id: "DBSV", name: "Biotecnologie e scienze della vita", city: "Varese" },
  { id: "DiDEC", name: "Diritto, economia e culture", city: "Como" },
  { id: "DiECO", name: "Economia", city: "Varese" },
  { id: "DMC", name: "Medicina e chirurgia", city: "Varese" },
  { id: "DiMIT", name: "Medicina e innovazione tecnologica", city: "Varese" },
  { id: "DISAT", name: "Scienza e alta tecnologia", city: "Como" },
  { id: "DISTA", name: "Scienze teoriche e applicate", city: "Varese" },
  { id: "DiSUIT", name: "Scienze umane e dell'innovazione per il territorio", city: "Como" },
];
const UNIS = ["Insubria (Varese-Como)", "Politecnico di Milano", "Statale di Milano", "Milano-Bicocca", "Bocconi", "Cattolica del Sacro Cuore", "IULM", "LIUC Castellanza", "Pavia", "Bergamo", "Brescia", "Torino", "Politecnico di Torino", "Piemonte Orientale", "Genova", "Padova", "Verona", "Ca' Foscari Venezia", "IUAV Venezia", "Trento", "Trieste", "Udine", "Bologna", "Modena e Reggio Emilia", "Parma", "Ferrara", "Firenze", "Pisa", "Siena", "Scuola Normale Superiore", "Perugia", "Politecnica delle Marche", "Macerata", "Urbino", "Camerino", "Roma La Sapienza", "Roma Tor Vergata", "Roma Tre", "LUISS", "L'Aquila", "Chieti-Pescara", "Napoli Federico II", "Salerno", "Bari", "Politecnico di Bari", "Salento", "Calabria", "Catania", "Messina", "Palermo", "Cagliari", "Sassari", "Altra università"];
const AREAS = ["Economia", "Giurisprudenza", "Medicina", "Professioni sanitarie", "Biotecnologie", "Biologia", "Chimica", "Fisica", "Matematica", "Informatica", "Ingegneria", "Scienze ambientali", "Comunicazione", "Lingue", "Storia e turismo", "Psicologia", "Scienze motorie", "Vita da studente", "Altro"];
const LINKS = [
  { t: "Esse3", u: "https://www.uninsubria.it/servizi/tutti-i-servizi/servizi-web-esse3", i: "id" },
  { t: "E-learning", u: "https://elearning.uninsubria.it/", i: "screen" },
  { t: "Mail studenti", u: "https://email.uninsubria.it", i: "mail" },
  { t: "Biblioteca", u: "https://uninsubria.libguides.com/siba", i: "book" },
  { t: "Erasmus+", u: "https://www.uninsubria.it/internazionale/mobilita-allestero/programma-erasmus", i: "globe" },
  { t: "InfoStudenti", u: "https://www.uninsubria.it/servizi/tutti-i-servizi/infostudenti-servizio-informazioni-gli-studenti", i: "help" },
];
const IG_EVENTS = "https://www.instagram.com/insubria_eventi_team/";
const ESN = "https://insubria.esn.it";
const COURSE_CFU = { triennale: 180, magistrale: 120, ciclo5: 300, ciclo6: 360 };
const LVL = { urgente: 0, importante: 1, info: 2 };
const LVL_LABEL = { urgente: "Urgente", importante: "Importante", info: "Avviso" };
const ANN_CATS = ["Lezioni", "Esami e appelli", "Segreteria", "Servizi", "Sicurezza ed emergenze", "Eventi", "Altro"];
const MAT_KINDS = ["Slide", "Dispense", "Esercizi", "Esami passati", "Bibliografia", "Altro"];
const STAFF_ROLES = ["Docente", "Ricercatore/Ricercatrice", "Tutor", "Segreteria studenti", "Personale tecnico-amministrativo"];
const CITIES = ["Varese", "Como", "Busto Arsizio"];
const REPORT_REASONS = ["Offensivo", "Spam o pubblicità", "Contenuto copiato o vietato", "Dati personali", "Altro"];
const PUSH_LABELS = {
  announcements: "Comunicazioni importanti e avvisi",
  answers: "Risposte del personale alle mie domande",
  replies: "Risposte degli studenti alle mie domande",
  events: "Nuovi eventi",
  requests: "Nuove richieste per il personale",
  moderation: "Contenuti segnalati più volte",
};
const DEMO_EXAMS = [
  { id: "d1", name: "Analisi matematica I", cfu: 9, grade: 26, lode: false, date: "2025-01-28", status: "passed" },
  { id: "d2", name: "Programmazione", cfu: 12, grade: 30, lode: true, date: "2025-02-17", status: "passed" },
  { id: "d3", name: "Inglese B2", cfu: 3, grade: null, lode: false, date: "2025-04-09", status: "passed", idoneita: true },
  { id: "d4", name: "Architettura degli elaboratori", cfu: 9, grade: 24, lode: false, date: "2025-06-20", status: "passed" },
  { id: "d5", name: "Algoritmi e strutture dati", cfu: 12, grade: 28, lode: false, date: "2025-07-10", status: "passed" },
  { id: "d6", name: "Fisica", cfu: 6, grade: 23, lode: false, date: "2025-09-15", status: "passed" },
  { id: "d7", name: "Basi di dati", cfu: 9, grade: null, lode: false, date: "2026-01-20", status: "planned" },
];

/* ------------------------------------------------------------------ stato */
const S = {
  tab: "home", me: null, profile: null, exams: DEMO_EXAMS.slice(), demo: true,
  posts: [], postsState: "loading", events: [], anns: [], materials: [], faq: [], reports: [], bans: [], activity: [],
  filter: { uni: "Insubria (Varese-Como)", area: "Tutte", q: "" },
  chat: [], busy: false, streaming: false, ctl: null,
  openPost: null, detail: null,
  commSeg: "domande", matDep: "Tutti", matQ: "", staffSub: "panoramica", inboxF: "aperte", evCity: "Tutte",
  login: { step: "email", email: "", devCode: "" },
  push: { supported: false, permission: "default", subscribed: false, prefs: {}, endpoint: null },
  installEvt: null, dismissed: [],
};
const isStaff = () => !!S.me && S.me.role !== "student";
const banned = () => !!S.me?.banned;

/* ------------------------------------------------------------------ utility */
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmtDate = (d, o = { day: "numeric", month: "short", year: "numeric" }) => { if (!d) return ""; try { return new Date(d + (String(d).length === 10 ? "T12:00:00" : "")).toLocaleDateString("it-IT", o); } catch { return d; } };
const ago = ms => { const m = Math.round((Date.now() - ms) / 60000); if (m < 1) return "ora"; if (m < 60) return m + " min fa"; const h = Math.round(m / 60); if (h < 24) return h + " h fa"; const g = Math.round(h / 24); return g < 30 ? g + " g fa" : new Date(ms).toLocaleDateString("it-IT"); };
const ls = { get(k) { try { return JSON.parse(localStorage.getItem("ih_" + k)); } catch { return null; } }, set(k, v) { try { localStorage.setItem("ih_" + k, JSON.stringify(v)); } catch {} } };
const uidGen = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
const todayISO = () => new Date().toISOString().slice(0, 10);
const depCity = id => DEPARTMENTS.find(d => d.id === id)?.city;
const audLabel = v => DEPARTMENTS.find(d => d.id === v)?.name || (CITIES.includes(v) ? "sede di " + v : v);
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const isStandalone = () => matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;

const ICON = {
  id: '<path d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/><circle cx="9.5" cy="10.5" r="2"/><path d="M6.5 16c.6-1.5 1.7-2.2 3-2.2s2.4.7 3 2.2M14.5 9.5h3M14.5 13h3"/>',
  screen: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="m3.5 7 8.5 6 8.5-6"/>',
  book: '<path d="M12 6.5C10 5 7.5 4.5 4 4.5v14c3.5 0 6 .5 8 2 2-1.5 4.5-2 8-2v-14c-3.5 0-6 .5-8 2zM12 6.5v14"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.6 9.3a2.5 2.5 0 0 1 4.8 1c0 1.7-2.4 2-2.4 3.7M12 17h.01"/>',
  send: '<path d="M4 12 20 4l-6 16-2.5-6.5z"/><path d="m11.5 13.5 3-3"/>',
  stop: '<rect x="7" y="7" width="10" height="10" rx="2"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  chat: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.9A8 8 0 1 1 21 12z"/>',
  cal: '<rect x="3" y="4.5" width="18" height="16.5" rx="3"/><path d="M3 9.5h18M8 3v3M16 3v3"/>',
  up: '<path d="m6 14 6-6 6 6"/>',
  ig: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/>',
  shield: '<path d="M12 3 4.5 6v5.5c0 4.6 3.2 8.4 7.5 9.5 4.3-1.1 7.5-4.9 7.5-9.5V6z"/><path d="m9 12 2 2 4-4"/>',
  upload: '<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/>',
  megaphone: '<path d="M3 10v4a1 1 0 0 0 1 1h3l5 4V5L7 9H4a1 1 0 0 0-1 1z"/><path d="M16 9a4 4 0 0 1 0 6M19 6.5a8 8 0 0 1 0 11"/>',
  bell: '<path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15z"/><path d="M10 20.5a2.2 2.2 0 0 0 4 0"/>',
};
const icon = (n, extra = "") => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" ${extra}>${ICON[n]}</svg>`;

function toast(msg) {
  const r = $("#toast-root");
  r.innerHTML = `<div class="toast glass" role="status">${esc(msg)}</div>`;
  clearTimeout(toast.t); toast.t = setTimeout(() => (r.innerHTML = ""), 2800);
}

/* ------------------------------------------------------------------ API */
async function api(path, { method = "GET", body, form } = {}) {
  const headers = { "x-ih": "1" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const res = await fetch(path, { method, credentials: "include", headers, body: form || (body !== undefined ? JSON.stringify(body) : undefined) });
  const data = res.headers.get("content-type")?.includes("json") ? await res.json() : null;
  if (!res.ok) {
    const err = new Error(data?.error || "Errore di rete. Riprova.");
    err.status = res.status;
    if (res.status === 401 && S.me) { S.me = null; render(); }
    throw err;
  }
  return data;
}
const loaders = {
  posts: async () => { S.posts = await api("/api/posts"); S.postsState = "ready"; if (S.openPost) await loadDetail(); },
  announcements: async () => { S.anns = await api("/api/announcements"); },
  materials: async () => { S.materials = await api("/api/materials"); },
  faq: async () => { S.faq = await api("/api/faq"); },
  events: async () => { S.events = await api("/api/events"); },
  reports: async () => { if (isStaff()) S.reports = await api("/api/moderation/reports"); },
  bans: async () => { if (isStaff()) S.bans = await api("/api/moderation/bans"); },
  activity: async () => { if (isStaff()) S.activity = await api("/api/staff/activity"); },
};
async function refresh(name) {
  try { await loaders[name](); } catch (e) { if (name === "posts") S.postsState = "offline"; }
  scheduleRender();
}
let renderQueued = false;
function scheduleRender() {
  if (renderQueued) return;
  renderQueued = true;
  requestAnimationFrame(() => {
    renderQueued = false;
    const typing = document.activeElement?.matches?.("#view textarea, #view input:not([type=search]):not([type=range])");
    if (S.tab === "ai" || typing) return;   // non ridisegnare mentre lo studente scrive
    render(true);
  });
}
let es = null;
function connectStream() {
  es?.close();
  es = new EventSource("/api/stream", { withCredentials: true });
  es.addEventListener("change", e => { const r = JSON.parse(e.data).r; if (loaders[r]) refresh(r); });
}

/* ------------------------------------------------------------------ libretto */
let librettoChain = Promise.resolve();
function persistExams() {
  S.demo = false;
  const exams = S.exams.map(e => ({ ...e }));
  librettoChain = librettoChain.then(() => api("/api/me/libretto", { method: "PUT", body: { exams } })).catch(e => toast(e.message));
}
function stats() {
  const passed = S.exams.filter(e => e.status === "passed");
  const graded = passed.filter(e => typeof e.grade === "number");
  const cfu = passed.reduce((a, e) => a + Number(e.cfu || 0), 0);
  const gCfu = graded.reduce((a, e) => a + Number(e.cfu || 0), 0);
  const arit = graded.length ? graded.reduce((a, e) => a + e.grade, 0) / graded.length : 0;
  const pond = gCfu ? graded.reduce((a, e) => a + e.grade * e.cfu, 0) / gCfu : 0;
  const target = COURSE_CFU[S.profile?.courseType] || 180;
  return { passed, graded, cfu, gCfu, arit, pond, base: pond / 30 * 110, target, lodi: graded.filter(e => e.lode).length };
}
const f2 = n => n ? n.toFixed(2).replace(".", ",") : "–";

/* ------------------------------------------------------------------ notifiche push */
const b64ToBytes = s => { const raw = atob(s.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - s.length % 4) % 4)); return Uint8Array.from(raw, c => c.charCodeAt(0)); };
async function initPush() {
  const P = S.push;
  P.supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  if (!P.supported) return;
  P.permission = Notification.permission;
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (!sub) { P.subscribed = false; return; }
    P.endpoint = sub.endpoint;
    const st = await api("/api/push/status", { method: "POST", body: { endpoint: sub.endpoint } });
    if (!st.subscribed && P.permission === "granted") await api("/api/push/subscribe", { method: "POST", body: { subscription: sub.toJSON() } });
    P.subscribed = true; P.prefs = st.prefs;
  } catch {}
}
async function enablePush() {
  const P = S.push;
  if (!P.supported) return toast(isIOS() && !isStandalone() ? "Su iPhone aggiungi prima l'app alla schermata Home" : "Questo browser non supporta le notifiche");
  const perm = await Notification.requestPermission();
  P.permission = perm;
  if (perm !== "granted") { render(true); refreshSheet(); return toast("Notifiche non autorizzate: puoi attivarle dalle impostazioni"); }
  try {
    const reg = await navigator.serviceWorker.ready;
    const { key } = await api("/api/push/key");
    const sub = (await reg.pushManager.getSubscription()) || (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(key) }));
    const r = await api("/api/push/subscribe", { method: "POST", body: { subscription: sub.toJSON() } });
    Object.assign(P, { subscribed: true, endpoint: sub.endpoint, prefs: r.prefs });
    toast("Notifiche attive su questo dispositivo");
  } catch (e) { toast("Attivazione non riuscita: " + e.message); }
  render(true); refreshSheet();
}
async function disablePush() {
  const P = S.push;
  try {
    const sub = await (await navigator.serviceWorker.ready).pushManager.getSubscription();
    if (sub) { await api("/api/push/subscribe", { method: "DELETE", body: { endpoint: sub.endpoint } }); await sub.unsubscribe(); }
    Object.assign(P, { subscribed: false, endpoint: null });
    toast("Notifiche disattivate su questo dispositivo");
  } catch (e) { toast(e.message); }
  refreshSheet();
}
function vPushBox() {
  const P = S.push;
  let inner;
  if (!P.supported) {
    inner = isIOS() && !isStandalone()
      ? `<p style="margin:0;font-size:14px">Su iPhone e iPad le notifiche funzionano quando l'app è sulla schermata Home (iOS 16.4 o successivo):</p><ol style="margin:0;padding-left:18px;font-size:14px"><li>apri questo sito in Safari;</li><li>tocca Condividi e poi "Aggiungi alla schermata Home";</li><li>apri Insubria Hub dalla Home e torna qui.</li></ol>`
      : `<p class="muted" style="margin:0;font-size:14px">Questo browser non supporta le notifiche push. Usa Chrome, Edge, Firefox o Safari aggiornati.</p>`;
  } else if (P.permission === "denied") {
    inner = `<p style="margin:0;font-size:14px">Hai bloccato le notifiche per Insubria Hub. Riattivale dalle impostazioni del browser o del sistema (Notifiche → Insubria Hub), poi ricarica la pagina.</p>`;
  } else if (!P.subscribed) {
    inner = `<p class="muted" style="margin:0;font-size:14px">Ricevi nel centro notifiche del telefono o del computer le comunicazioni urgenti e le risposte alle tue domande.</p><button class="btn primary" data-act="push-on">${icon("bell", 'width="18" height="18"')}Attiva notifiche su questo dispositivo</button>`;
  } else {
    const keys = ["announcements", "answers", "replies", "events", ...(isStaff() ? ["requests", "moderation"] : [])];
    inner = `<div class="switch"><span><b>Comunicazioni urgenti</b><br><span class="hint">Arrivano sempre, anche con le altre disattivate</span></span><input type="checkbox" checked disabled aria-label="Comunicazioni urgenti sempre attive"></div>
      ${keys.map(k => `<label class="switch"><span>${PUSH_LABELS[k]}</span><input type="checkbox" data-pref="${k}" ${P.prefs[k] ? "checked" : ""}></label>`).join("")}
      <div class="row" style="flex-wrap:wrap;gap:8px"><button class="btn ghost small" data-act="push-test">Invia notifica di prova</button><button class="btn ghost small" style="color:var(--bad)" data-act="push-off">Disattiva su questo dispositivo</button></div>`;
  }
  return `<div class="push-box" id="push-box">${inner}</div>`;
}
function refreshSheet() { const b = $("#push-box"); if (b) b.outerHTML = vPushBox(); }

/* ------------------------------------------------------------------ avvisi */
function activeAnns(all) {
  const t = todayISO();
  return S.anns.filter(a => all || !a.expiresAt || a.expiresAt >= t).sort((a, b) => (LVL[a.level] ?? 2) - (LVL[b.level] ?? 2) || b.createdAt - a.createdAt);
}
function vAnn(a, staff) {
  const expired = a.expiresAt && a.expiresAt < todayISO();
  return `<article class="ann glass ${esc(a.level)} ${expired ? "expired" : ""}" ${a.level === "urgente" ? 'role="alert"' : ""}>
    <span class="lvl" aria-hidden="true"></span>
    <div style="min-width:0;display:grid;gap:2px">
      <div class="meta"><b style="color:var(--ink)">${LVL_LABEL[a.level] || "Avviso"}</b>${a.category ? `<span>· ${esc(a.category)}</span>` : ""}<span>· ${ago(a.createdAt)}</span>${staff && a.pinned ? '<span class="tag staff">In cima</span>' : ""}${expired ? '<span class="tag">Scaduto</span>' : ""}</div>
      <b style="font-size:15px">${esc(a.title)}</b>
      ${a.body ? `<div class="muted" style="font-size:13.5px;white-space:pre-wrap;overflow-wrap:anywhere">${esc(a.body)}</div>` : ""}
      ${a.link ? `<a href="${esc(a.link)}" target="_blank" rel="noopener" style="font-size:13.5px;font-weight:600">Dettagli →</a>` : ""}
      <span class="hint">${esc(a.byLabel || "Ateneo")}${a.audience && a.audience !== "tutti" ? " · per " + esc(audLabel(a.audience)) : ""}${a.expiresAt ? " · fino al " + fmtDate(a.expiresAt, { day: "numeric", month: "short" }) : ""}</span>
    </div>
    ${staff ? `<div class="stack" style="gap:6px"><button class="btn ghost small" data-act="pin-ann" data-id="${a.id}">${a.pinned ? "Togli dalla cima" : "Fissa in cima"}</button><button class="btn ghost small" style="color:var(--bad)" data-act="del-ann" data-id="${a.id}">Elimina</button></div>`
      : a.pinned && a.level !== "urgente" ? `<button class="link-btn" style="color:var(--ink-soft);font-size:18px;line-height:1" data-act="dismiss-ann" data-id="${a.id}" aria-label="Nascondi questo avviso">×</button>` : ""}
  </article>`;
}
function vPinned() {
  if (S.tab === "staff") return "";
  return activeAnns().filter(a => a.pinned && (a.level === "urgente" || !S.dismissed.includes(a.id))).map(a => vAnn(a)).join("");
}

/* ------------------------------------------------------------------ viste */
function vLogin() {
  const L = S.login;
  return `<section class="login">
    <div class="hero glass">
      <span class="eyebrow">Università dell'Insubria</span>
      <h1>Libretto, community e avvisi in <em>un'app</em></h1>
      <p class="muted" style="margin:0">Accedi con la mail universitaria o con una personale. Ti mandiamo un codice di 6 cifre, niente password.</p>
    </div>
    ${L.step === "email" ? `<form class="panel glass f" id="login-email" novalidate style="margin:0">
      <div class="field"><label for="l-email">Email</label><input id="l-email" type="email" autocomplete="email" inputmode="email" required placeholder="nome.cognome@studenti.uninsubria.it" value="${esc(L.email)}"></div>
      <p class="hint" id="l-err" style="color:var(--bad)" hidden></p>
      <button class="btn primary">Ricevi il codice</button>
      <p class="hint" style="margin:0">Con una mail @uninsubria.it accedi come personale dell'ateneo.</p>
    </form>` : `<form class="panel glass f" id="login-code" novalidate style="margin:0">
      <p style="margin:0">Abbiamo inviato il codice a <b>${esc(L.email)}</b>.</p>
      ${L.devCode ? `<p class="hint" style="margin:0">Modalità sviluppo: il codice è <b>${esc(L.devCode)}</b></p>` : ""}
      <div class="field"><label for="l-code">Codice</label><input id="l-code" class="code-input" inputmode="numeric" autocomplete="one-time-code" maxlength="6" required value="${esc(L.devCode)}"></div>
      <p class="hint" id="l-err" style="color:var(--bad)" hidden></p>
      <button class="btn primary">Accedi</button>
      <button type="button" class="link-btn" data-act="login-back">Cambia email</button>
    </form>`}
  </section>`;
}

function vHome() {
  const st = stats();
  const name = S.profile?.firstName;
  const next = S.exams.filter(e => e.status === "planned").sort((a, b) => (a.date || "").localeCompare(b.date || ""))[0];
  const ev = S.events.filter(e => e.date >= todayISO()).slice(0, 2);
  const others = activeAnns().filter(a => !a.pinned).slice(0, 3);
  const askPush = S.push.supported && !S.push.subscribed && S.push.permission === "default" && !S.dismissed.includes("push");
  const iosHint = !S.push.supported && isIOS() && !isStandalone() && !S.dismissed.includes("ios");
  return `
  ${askPush ? `<div class="banner glass"><div><b>Attiva le notifiche</b><br><span class="muted">Comunicazioni urgenti e risposte alle tue domande, direttamente nel centro notifiche.</span></div><div class="stack" style="gap:4px"><button class="btn primary small" data-act="push-on">Attiva</button><button class="link-btn" style="font-size:12.5px;color:var(--ink-soft)" data-act="dismiss" data-id="push">Non ora</button></div></div>` : ""}
  ${iosHint ? `<div class="banner glass"><div><b>Installa l'app su iPhone</b><br><span class="muted">Condividi → "Aggiungi alla schermata Home" per ricevere le notifiche.</span></div><button class="link-btn" style="color:var(--ink-soft)" data-act="dismiss" data-id="ios" aria-label="Chiudi">×</button></div>` : ""}
  <section class="hero glass">
    <span class="eyebrow">${S.demo ? "Libretto di esempio" : "Il tuo percorso"}</span>
    <h1>${name ? `Ciao ${esc(name)},<br>` : ""}sei a <em>${st.cfu}</em> CFU su ${st.target}</h1>
    <div class="kpis">
      <div class="kpi"><b>${f2(st.pond)}</b><span>media ponderata</span></div>
      <div class="kpi"><b>${st.base ? Math.round(st.base) : "–"}</b><span>base di laurea</span></div>
      <div class="kpi"><b>${st.passed.length}</b><span>esami superati</span></div>
    </div>
    ${next ? `<div class="row" style="justify-content:space-between"><span class="muted" style="font-size:13.5px">Prossimo: <b style="color:var(--ink)">${esc(next.name)}</b>${next.date ? " · " + fmtDate(next.date, { day: "numeric", month: "short" }) : ""}</span><button class="link-btn" data-tab-go="libretto">Libretto →</button></div>` : ""}
  </section>
  <button class="composer glass" style="position:static;cursor:text;text-align:left;width:100%;border:1px solid var(--glass-edge)" data-tab-go="ai">
    <span class="muted" style="flex:1;padding:9px 0">Chiedi all'assistente Insubria…</span>
    <span class="icon-btn" aria-hidden="true">${icon("send")}</span>
  </button>
  ${others.length ? `<div class="section-h"><h2>Avvisi dell'ateneo</h2></div>${others.map(a => vAnn(a)).join("")}` : ""}
  <div class="section-h"><h2>Servizi rapidi</h2></div>
  <div class="tile-grid">${LINKS.map(l => `<a class="tile glass" href="${l.u}" target="_blank" rel="noopener">${icon(l.i)}${l.t}</a>`).join("")}</div>
  <div class="section-h"><h2>Prossimi eventi</h2><button data-tab-go="eventi">Tutti</button></div>
  ${ev.length ? ev.map(vEvent).join("") : `<a class="ig glass" href="${IG_EVENTS}" target="_blank" rel="noopener"><span class="logo">${icon("ig")}</span><span><b>@insubria_eventi_team</b><br><span class="muted" style="font-size:13.5px">Feste, aperitivi e iniziative in ateneo.</span></span></a>`}
  ${vQuantum()}`;
}
function vQuantum() {
  return `<section class="quantum glass">
    <span class="eyebrow">Laboratorio quantistico</span>
    <h2 style="font-size:21px">Volta B1, a Como</h2>
    <span class="status">In attesa dell'apertura dell'accesso</span>
    <p class="muted" style="margin:0;font-size:14px">Annealer D-Wave Advantage2 da oltre 4.400 qubit, inaugurato il 16 ottobre 2026 a Villa Saporiti. Accesso previsto via cloud D-Wave Leap per università e ricercatori. Lo useremo per ottimizzare piano esami, appelli e gruppi di studio.</p>
  </section>`;
}

function vLibretto() {
  const st = stats();
  const pct = Math.min(1, st.cfu / st.target);
  const C = 2 * Math.PI * 50;
  const list = S.exams.slice().sort((a, b) => (a.status === b.status ? (b.date || "").localeCompare(a.date || "") : a.status === "planned" ? -1 : 1));
  return `
  ${S.demo ? `<div class="banner"><div><b>Questi sono esami di esempio.</b> Aggiungi il tuo primo esame e spariranno.</div></div>` : ""}
  <section class="panel glass">
    <div class="ring-wrap">
      <div class="ring" role="img" aria-label="${st.cfu} CFU su ${st.target}">
        <svg viewBox="0 0 116 116"><circle cx="58" cy="58" r="50" fill="none" stroke="var(--hair)" stroke-width="11"/><circle cx="58" cy="58" r="50" fill="none" stroke="var(--brand)" stroke-width="11" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - pct)}" style="transition:stroke-dashoffset .8s ease"/></svg>
        <div class="c"><b>${st.cfu}</b><span>di ${st.target} CFU</span></div>
      </div>
      <div class="stat-list">
        <div><span class="muted">Media ponderata</span><b>${f2(st.pond)}</b></div>
        <div><span class="muted">Media aritmetica</span><b>${f2(st.arit)}</b></div>
        <div><span class="muted">Base di laurea</span><b>${st.base ? st.base.toFixed(1).replace(".", ",") : "–"}</b></div>
        <div><span class="muted">Lodi</span><b>${st.lodi}</b></div>
      </div>
    </div>
  </section>
  ${st.graded.length > 1 ? `<section class="panel glass"><div class="section-h" style="margin:0 0 6px"><h2 style="font-size:16px">Andamento voti</h2><span class="hint"><span style="color:var(--brand)">●</span> voto · <span style="color:var(--peach)">━</span> media ponderata</span></div>${vChart(st.graded)}</section>` : ""}
  ${vSimulator(st)}
  <div class="section-h"><h2>Esami</h2><button data-act="add-exam">+ Aggiungi</button></div>
  <section class="panel glass" style="padding:6px 14px">
    ${list.length ? list.map(e => `
      <button class="exam" data-act="edit-exam" data-id="${e.id}">
        <span class="grade ${e.status === "planned" ? "plan" : e.grade >= 28 ? "hi" : ""}">${e.status === "planned" ? "—" : e.idoneita ? "ID" : e.grade + (e.lode ? "<sup style='font-size:10px'>L</sup>" : "")}</span>
        <span style="min-width:0"><span class="n">${esc(e.name)}</span><br><span class="m">${e.cfu} CFU${e.date ? " · " + fmtDate(e.date) : ""}</span></span>
        <span class="pill ${e.status === "planned" ? "warn" : "ok"}">${e.status === "planned" ? "Da sostenere" : "Superato"}</span>
      </button>`).join("") : `<p class="muted" style="padding:14px 4px">Nessun esame. Tocca "Aggiungi" per iniziare.</p>`}
  </section>`;
}
function vChart(graded) {
  const pts = graded.slice().sort((a, b) => (a.date || "").localeCompare(b.date || ""));
  const W = 320, H = 130, L = 26, R = 10, T = 10, B = 20;
  const x = i => L + (pts.length === 1 ? 0 : i * (W - L - R) / (pts.length - 1));
  const y = v => T + (30 - v) * (H - T - B) / 12;
  let sw = 0, sc = 0;
  const avg = pts.map(p => { sw += p.grade * p.cfu; sc += p.cfu; return sw / sc; });
  const line = pts.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.grade).toFixed(1)}`).join("");
  const area = line + `L${x(pts.length - 1).toFixed(1)},${H - B}L${x(0).toFixed(1)},${H - B}Z`;
  const aLine = avg.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join("");
  const grid = [18, 22, 26, 30].map(v => `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" stroke="var(--hair)"/><text x="${L - 6}" y="${y(v) + 3}" text-anchor="end">${v}</text>`).join("");
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Voti in ordine di data">
    <defs><linearGradient id="ga" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="var(--brand)" stop-opacity=".28"/><stop offset="1" stop-color="var(--brand)" stop-opacity="0"/></linearGradient></defs>
    ${grid}<path d="${area}" fill="url(#ga)"/><path d="${line}" fill="none" stroke="var(--brand)" stroke-width="2.2" stroke-linejoin="round"/>
    <path d="${aLine}" fill="none" stroke="var(--peach)" stroke-width="2" stroke-dasharray="4 3"/>
    ${pts.map((p, i) => `<circle cx="${x(i)}" cy="${y(p.grade)}" r="${i === pts.length - 1 ? 4.5 : 3}" fill="var(--brand)" stroke="var(--ground)" stroke-width="1.5"><title>${esc(p.name)}: ${p.grade}</title></circle>`).join("")}
    <text x="${L}" y="${H - 4}">${fmtDate(pts[0].date, { month: "short", year: "2-digit" })}</text>
    <text x="${W - R}" y="${H - 4}" text-anchor="end">${fmtDate(pts[pts.length - 1].date, { month: "short", year: "2-digit" })}</text>
  </svg>`;
}
function vSimulator(st) {
  const plan = S.exams.find(e => e.status === "planned");
  if (!plan) return "";
  const g = S.simGrade || 27;
  return `<section class="panel glass stack">
    <div class="section-h" style="margin:0"><h2 style="font-size:16px">Simula il prossimo voto</h2><span class="tag">${esc(plan.name)}</span></div>
    <input type="range" id="sim" min="18" max="30" step="1" value="${g}" aria-label="Voto simulato" style="width:100%;accent-color:var(--brand)">
    <div class="row" id="sim-out" style="justify-content:space-between;font-size:14px">${simOut(st, plan, g)}</div>
  </section>`;
}
function simOut(st, plan, g) {
  const nc = st.gCfu + Number(plan.cfu);
  const np = nc ? (st.pond * st.gCfu + g * plan.cfu) / nc : 0;
  const diff = np - st.pond;
  return `<span>Con <b style="font-family:var(--font-display);font-size:18px">${g}</b></span><span>media <b>${f2(np)}</b> <span style="color:${diff >= 0 ? "var(--ok)" : "var(--bad)"}">(${diff >= 0 ? "+" : ""}${diff.toFixed(2).replace(".", ",")})</span> · base <b>${(np / 30 * 110).toFixed(1).replace(".", ",")}</b></span>`;
}

/* ---- community */
function vCommunity() {
  const seg = `<div class="seg glass" role="group" aria-label="Sezione"><button data-seg="domande" aria-pressed="${S.commSeg === "domande"}">Domande</button><button data-seg="materiali" aria-pressed="${S.commSeg === "materiali"}">Materiali dei docenti</button></div>`;
  return seg + (S.commSeg === "materiali" ? vMaterials() : vQuestions());
}
function vQuestions() {
  const f = S.filter, q = f.q.trim().toLowerCase();
  const list = S.posts.filter(p => (f.uni === "Tutte" || p.uni === f.uni) && (f.area === "Tutte" || p.area === f.area) && (!q || (p.title + " " + p.body + " " + (p.subject || "")).toLowerCase().includes(q)));
  return `
  <div class="search glass">
    <input id="q" type="search" placeholder="Cerca materie, esami, appunti…" value="${esc(f.q)}" aria-label="Cerca nella community">
    <select id="uni-filter" aria-label="Università">${["Tutte", ...UNIS].map(u => `<option ${u === f.uni ? "selected" : ""}>${esc(u)}</option>`).join("")}</select>
  </div>
  <div class="chips" role="group" aria-label="Area">${["Tutte", ...AREAS].map(a => `<button class="chip" data-area="${esc(a)}" aria-pressed="${a === f.area}">${esc(a)}</button>`).join("")}</div>
  <div class="row" style="justify-content:space-between"><span class="muted" style="font-size:13px">${S.postsState === "ready" ? `${list.length} discussion${list.length === 1 ? "e" : "i"}` : S.postsState === "offline" ? "Community non raggiungibile: controlla la connessione" : "Carico le discussioni…"}</span>${S.postsState === "ready" && !banned() ? `<button class="btn primary small" data-act="new-post">${icon("plus", 'width="16" height="16"')}Nuova domanda</button>` : ""}</div>
  ${banned() ? `<div class="banner"><div>Il tuo account è sospeso dai moderatori: puoi leggere ma non scrivere.</div></div>` : ""}
  ${list.length ? list.map(vPost).join("") : `<div class="empty glass">${icon("chat")}
      <h3>${S.posts.length ? "Nessun risultato con questi filtri" : "Ancora nessuna discussione"}</h3>
      <p class="muted" style="margin:0;max-width:34ch">${S.posts.length ? "Prova un'altra università o togli il filtro per area." : "Apri tu la prima: chiedi consigli su un esame, condividi un metodo di studio, cerca compagni per un progetto."}</p>
      ${S.postsState === "ready" && !S.posts.length && !banned() ? `<button class="btn primary" data-act="new-post">Scrivi la prima domanda</button>` : ""}
    </div>`}`;
}
function vPost(p) {
  return `<article class="post glass" data-act="open-post" data-id="${p.id}" tabindex="0">
    <div class="meta">${p.hidden ? '<span class="tag" style="color:var(--bad)">Nascosta</span>' : ""}${p.authorBanned ? '<span class="tag" style="color:var(--bad)">Autore sospeso</span>' : ""}${p.staffAnswerCount ? '<span class="tag staff">Risposta del personale</span>' : ""}<span class="tag uni">${esc(p.uni)}</span><span class="tag">${esc(p.area)}</span>${p.toStaff ? '<span class="tag">Per docenti e personale</span>' : ""}${p.subject ? `<span>${esc(p.subject)}</span>` : ""}</div>
    <h3>${esc(p.title)}</h3>
    <p>${esc(p.body)}</p>
    <div class="meta"><span>${esc(p.authorName)}</span><span>· ${ago(p.createdAt)}</span>${p.replyCount ? `<span>· ${p.replyCount} rispost${p.replyCount === 1 ? "a" : "e"}</span>` : ""}
      <button class="vote" data-act="vote" data-id="${p.id}" aria-pressed="${!!p.myVote}" aria-label="Utile">${icon("up", 'width="14" height="14"')}${p.votes}</button></div>
  </article>`;
}
function vMaterialItem(m, staff) {
  const dep = DEPARTMENTS.find(d => d.id === m.dep);
  return `<article class="file glass">
    <span class="ext">${esc(m.ext)}</span>
    <div style="min-width:0;display:grid;gap:3px">
      <b style="line-height:1.25">${esc(m.title)}</b>
      <div class="meta"><span class="tag">${esc(m.kind)}</span>${m.course ? `<span>${esc(m.course)}</span>` : ""}${dep ? `<span>· ${esc(dep.id)}</span>` : ""}</div>
      ${m.desc ? `<span class="muted" style="font-size:13px">${esc(m.desc)}</span>` : ""}
      <span class="hint">${esc(m.byLabel)} · ${ago(m.createdAt)}${m.size ? " · " + (m.size / 1048576).toFixed(1).replace(".", ",") + " MB" : ""}</span>
      ${staff ? `<button class="link-btn" style="color:var(--bad);font-size:13px;justify-self:start" data-act="del-material" data-id="${m.id}">Elimina</button>` : ""}
    </div>
    ${m.url ? `<a class="btn ghost small" href="${esc(m.url)}" target="_blank" rel="noopener">Apri</a>` : ""}
  </article>`;
}
function vMaterials() {
  const q = S.matQ.trim().toLowerCase();
  const list = S.materials.filter(m => (S.matDep === "Tutti" || m.dep === S.matDep) && (!q || (m.title + " " + m.course + " " + m.desc).toLowerCase().includes(q)));
  return `
  <div class="search glass"><input id="mq" type="search" placeholder="Cerca slide, dispense, insegnamenti…" value="${esc(S.matQ)}" aria-label="Cerca materiali"></div>
  <div class="chips" role="group" aria-label="Dipartimento">${["Tutti", ...DEPARTMENTS.map(d => d.id)].map(d => `<button class="chip" data-matdep="${d}" aria-pressed="${d === S.matDep}">${d}</button>`).join("")}</div>
  ${list.length ? list.map(m => vMaterialItem(m)).join("") : `<div class="empty glass">${icon("book")}<h3>${S.materials.length ? "Nessun materiale con questi filtri" : "Ancora nessun materiale"}</h3><p class="muted" style="margin:0;max-width:34ch">Qui trovi slide, dispense ed esercizi caricati da docenti e personale dell'Insubria.</p></div>`}`;
}

/* ---- eventi */
function vEvent(e) {
  const d = new Date(e.date + "T12:00:00");
  return `<article class="event glass">
    <div class="date-badge"><b>${d.getDate()}</b><span>${d.toLocaleDateString("it-IT", { month: "short" })}</span></div>
    <div style="min-width:0;display:grid;gap:4px">
      <div class="meta"><span class="tag uni">${esc(e.city || "Insubria")}</span>${e.time ? `<span>${esc(e.time)}</span>` : ""}${e.place ? `<span>· ${esc(e.place)}</span>` : ""}</div>
      <h3 style="font-size:16.5px">${esc(e.title)}</h3>
      ${e.desc ? `<p class="muted" style="margin:0;font-size:14px">${esc(e.desc)}</p>` : ""}
      <div class="row" style="gap:14px">${e.link ? `<a href="${esc(e.link)}" target="_blank" rel="noopener" style="font-weight:600;font-size:13.5px">Vedi il post →</a>` : ""}${isStaff() ? `<button class="link-btn" style="color:var(--bad);font-size:13.5px" data-act="del-event" data-id="${e.id}">Elimina</button>` : ""}</div>
    </div>
  </article>`;
}
function vEventi() {
  const up = S.events.filter(e => e.date >= todayISO() && (S.evCity === "Tutte" || e.city === S.evCity));
  return `
  <a class="ig glass" href="${IG_EVENTS}" target="_blank" rel="noopener"><span class="logo">${icon("ig")}</span><span style="min-width:0"><b>@insubria_eventi_team</b><br><span class="muted" style="font-size:13.5px">Gli eventi qui sotto arrivano dal profilo Instagram del team.</span></span></a>
  <div class="chips" role="group" aria-label="Sede">${["Tutte", ...CITIES].map(c => `<button class="chip" data-city="${c}" aria-pressed="${c === S.evCity}">${c}</button>`).join("")}</div>
  ${isStaff() ? `<button class="btn ghost" data-act="add-event">${icon("plus", 'width="16" height="16"')}Pubblica un evento</button>` : ""}
  ${up.length ? up.map(vEvent).join("") : `<div class="empty glass">${icon("cal")}<h3>Nessun evento in calendario</h3><p class="muted" style="margin:0;max-width:34ch">Quando il team pubblica un evento, lo trovi qui con data, sede e link al post.</p></div>`}
  <div class="section-h"><h2>Erasmus e internazionale</h2></div>
  <a class="ig glass" href="${ESN}" target="_blank" rel="noopener"><span class="logo" style="background:var(--sky);color:#0b2a55">${icon("globe")}</span><span style="min-width:0"><b>ESN Insubria</b><br><span class="muted" style="font-size:13.5px">ESNcard, programma buddy, gite e serate per studenti internazionali. Via Sant'Abbondio 12, Como.</span></span></a>`;
}

/* ---- assistente */
function vAI() {
  const sug = ["Come prenoto un appello su Esse3?", "Requisiti e scadenze per l'Erasmus", "Quali dipartimenti ci sono a Como?", "Come funziona la ESNcard?", "Come calcolo la base di laurea?", "Dove trovo il piano di studio?"];
  return `
  ${S.chat.length ? "" : `<section class="hero glass">
    <span class="eyebrow">Assistente AI Insubria</span>
    <h1 style="font-size:26px">Chiedi qualsiasi cosa sulla vita in ateneo</h1>
    <p class="muted" style="margin:0">Ti guido tra Esse3, appelli, Erasmus, servizi e sedi, e ti porto alla pagina ufficiale giusta. Per date e scadenze controlla sempre il link che ti indico.</p>
  </section>
  <div class="chips" style="flex-wrap:wrap">${sug.map(s => `<button class="chip" data-ask="${esc(s)}">${esc(s)}</button>`).join("")}</div>`}
  <div class="chat" id="chat">${S.chat.map(m => `<div class="msg ${m.role === "user" ? "me" : "ai glass"}">${m.role === "user" ? esc(m.content) : md(m.content)}</div>`).join("")}${S.busy && !S.streaming ? `<div class="msg ai glass dots" aria-label="Sto pensando"><span></span><span></span><span></span></div>` : ""}</div>
  <form class="composer glass" id="ask-form">
    <textarea id="ask" rows="1" placeholder="Scrivi una domanda…" aria-label="Domanda per l'assistente"></textarea>
    ${S.busy ? `<button type="button" class="icon-btn" data-act="stop" aria-label="Ferma">${icon("stop")}</button>` : `<button class="icon-btn" aria-label="Invia">${icon("send")}</button>`}
  </form>
  ${S.chat.length ? `<button class="link-btn" style="justify-self:center" data-act="reset-chat">Nuova conversazione</button>` : ""}`;
}
function md(src) {
  let h = esc(src);
  h = h.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  h = h.replace(/(^|[\s(])(https?:\/\/[^\s<)]+)/g, (m, pre, url) => { const tail = (url.match(/[.,;:!?]+$/) || [""])[0]; url = url.slice(0, url.length - tail.length); return `${pre}<a href="${url}" target="_blank" rel="noopener">${url}</a>${tail}`; });
  h = h.replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>");
  return h.split(/\n{2,}/).map(block => {
    const lines = block.split("\n");
    if (lines.every(l => /^\s*([-*•]|\d+\.)\s+/.test(l))) return "<ul>" + lines.map(l => "<li>" + l.replace(/^\s*([-*•]|\d+\.)\s+/, "") + "</li>").join("") + "</ul>";
    return "<p>" + lines.join("<br>") + "</p>";
  }).join("");
}
async function ask(text) {
  text = text.trim();
  if (!text || S.busy) return;
  S.chat.push({ role: "user", content: text });
  S.busy = true; S.streaming = false; S.ctl = new AbortController();
  render(true); scrollChat();
  const idx = S.chat.length;
  try {
    const res = await fetch("/api/assistant", { method: "POST", credentials: "include", signal: S.ctl.signal, headers: { "Content-Type": "application/json", "x-ih": "1" }, body: JSON.stringify({ messages: S.chat.slice(-12) }) });
    const reader = res.body.getReader(), dec = new TextDecoder();
    let out = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      out += dec.decode(value, { stream: true });
      if (!S.streaming) { S.streaming = true; S.chat.push({ role: "assistant", content: out }); render(true); }
      else { S.chat[idx].content = out; const all = document.querySelectorAll("#chat .msg.ai"); if (all.length) all[all.length - 1].innerHTML = md(out); }
      scrollChat();
    }
    if (!out) S.chat.push({ role: "assistant", content: "Non ho ricevuto risposta. Riprova." });
  } catch (e) {
    if (e.name !== "AbortError") toast("Risposta interrotta. Riprova.");
  } finally {
    S.busy = false; S.streaming = false; S.ctl = null;
    if (S.tab === "ai") { render(true); scrollChat(); }
  }
}
function scrollChat() { requestAnimationFrame(() => { if (S.chat.length) window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" }); }); }

/* ---- area staff */
const openRequests = () => S.posts.filter(p => p.toStaff && !p.staffAnswerCount && !p.hidden);
function vStaff() {
  if (!isStaff()) return `<div class="empty glass">${icon("shield")}<h3>Area riservata al personale</h3><p class="muted" style="margin:0;max-width:34ch">Docenti e personale accedono con la mail @uninsubria.it.</p></div>`;
  const subs = [["panoramica", "Panoramica"], ["richieste", "Richieste"], ["moderazione", `Moderazione${S.reports.length ? " · " + S.reports.length : ""}`], ["comunicazioni", "Comunicazioni"], ["materiali", "Materiali"], ["faq", "Assistente AI"], ["eventi", "Eventi"]];
  const body = { panoramica: vStaffHome, richieste: vStaffInbox, moderazione: vStaffMod, comunicazioni: vStaffAnns, materiali: vStaffMaterials, faq: vStaffFaq, eventi: vStaffEvents }[S.staffSub]();
  return `${S.profile?.staffRole ? "" : `<div class="banner glass"><div><b>Completa il profilo staff.</b> Ruolo e struttura compaiono nelle risposte in incognito al posto del nome.</div><button class="btn primary small" data-act="profile">Completa</button></div>`}
  <div class="chips" role="group" aria-label="Strumenti staff">${subs.map(([k, t]) => `<button class="chip" data-sub="${k}" aria-pressed="${k === S.staffSub}">${t}</button>`).join("")}</div>
  ${body}`;
}
const ACTION_TEXT = {
  risposta_incognito: "ha risposto in incognito a", risposta_firmata: "ha risposto con il proprio nome a", risposta_eliminata: "ha eliminato una risposta del personale",
  nascosto: "ha nascosto un contenuto", ripristinato: "ha ripristinato un contenuto", segnalazione_chiusa: "ha chiuso una segnalazione",
  sospensione: "ha sospeso un account", riattivazione: "ha riattivato un account", comunicazione: "ha pubblicato", comunicazione_eliminata: "ha eliminato una comunicazione",
  materiale: "ha caricato", materiale_eliminato: "ha eliminato il materiale",
};
function vStaffHome() {
  const counts = {};
  S.posts.forEach(p => (counts[p.area] = (counts[p.area] || 0) + 1));
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const max = top[0]?.[1] || 1;
  const anns = activeAnns();
  const open = openRequests().length;
  return `
  <section class="hero glass">
    <span class="eyebrow">Docenti e personale</span>
    <h1 style="font-size:26px">${open ? `<em>${open}</em> richiest${open === 1 ? "a aspetta" : "e aspettano"} una risposta` : "Nessuna richiesta in attesa"}</h1>
    <div class="kpis four">
      <div class="kpi"><b>${S.reports.length}</b><span>segnalazioni aperte</span></div>
      <div class="kpi"><b>${S.materials.length}</b><span>materiali pubblicati</span></div>
      <div class="kpi"><b>${anns.length}</b><span>comunicazioni attive</span></div>
      <div class="kpi"><b>${anns.filter(a => a.level === "urgente").length}</b><span>urgenti in corso</span></div>
    </div>
  </section>
  <div class="tile-grid">
    <button class="tile glass" style="border:1px solid var(--glass-edge);cursor:pointer" data-act="add-ann" data-level="urgente">${icon("megaphone")}Avviso urgente</button>
    <button class="tile glass" style="border:1px solid var(--glass-edge);cursor:pointer" data-act="add-material">${icon("upload")}Carica materiale</button>
    <button class="tile glass" style="border:1px solid var(--glass-edge);cursor:pointer" data-sub="richieste">${icon("chat")}Rispondi</button>
  </div>
  ${top.length ? `<section class="panel glass stack"><h2 style="font-size:16px">Di cosa si parla in community</h2><div class="bars">${top.map(([a, n]) => `<div><span style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(a)}</span><i style="width:${Math.max(6, n / max * 100)}%"></i><b>${n}</b></div>`).join("")}</div></section>` : ""}
  <section class="panel glass stack"><h2 style="font-size:16px">Attività del team</h2>
    ${S.activity.length ? `<div class="activity">${S.activity.slice(0, 10).map(a => `<div><b>${esc(a.actorName)}</b> ${ACTION_TEXT[a.action] || a.action}${a.detail ? ` "${esc(a.detail)}"` : ""} <span class="muted">· ${ago(a.createdAt)}</span></div>`).join("")}</div>` : `<p class="muted" style="margin:0;font-size:14px">Qui compare chi risponde e chi modera, anche in incognito. Lo vede solo il personale.</p>`}
  </section>`;
}
function vStaffInbox() {
  const lists = { aperte: openRequests(), insubria: S.posts.filter(p => p.uni === UNIS[0] && !p.staffAnswerCount && !p.hidden), tutte: S.posts };
  const list = lists[S.inboxF];
  return `<div class="chips" role="group" aria-label="Filtro richieste">${[["aperte", `Rivolte al personale · ${lists.aperte.length}`], ["insubria", `Insubria senza risposta · ${lists.insubria.length}`], ["tutte", "Tutte"]].map(([k, t]) => `<button class="chip" data-inbox="${k}" aria-pressed="${k === S.inboxF}">${t}</button>`).join("")}</div>
  <p class="hint" style="margin:0">Apri una domanda per rispondere. In incognito gli studenti vedono solo ruolo e struttura.</p>
  ${list.length ? list.map(vPost).join("") : `<div class="empty glass">${icon("chat")}<h3>Tutto in ordine</h3><p class="muted" style="margin:0">Nessuna richiesta in questa lista.</p></div>`}`;
}
function vStaffMod() {
  return `<p class="hint" style="margin:0">Gli studenti possono modificare solo i propri contenuti. Il personale nasconde domande e risposte e sospende gli account; ogni decisione resta nel registro del team.</p>
  <div class="section-h"><h2>Segnalazioni da rivedere</h2></div>
  ${S.reports.length ? S.reports.map(r => `<article class="panel glass stack" style="gap:6px;padding:14px 16px">
      <div class="meta"><span class="tag" style="color:var(--bad)">${r.count} segnalazion${r.count === 1 ? "e" : "i"}</span><span class="tag">${r.targetType === "post" ? "Domanda" : "Risposta"}</span><span>${esc(r.authorName)} · ${ago(r.createdAt)}</span>${r.hidden ? '<span class="tag">Già nascosto</span>' : ""}</div>
      ${r.title ? `<b>${esc(r.title)}</b>` : ""}
      <div class="muted" style="font-size:14px;white-space:pre-wrap;overflow-wrap:anywhere;max-height:7.5em;overflow:hidden">${esc(r.body)}</div>
      <span class="hint">Motivi: ${r.reasons.map(esc).join(" · ")}</span>
      <div class="row" style="flex-wrap:wrap;gap:8px">
        <button class="btn primary small" data-act="hide" data-kind="${r.targetType}" data-id="${r.targetId}">Nascondi</button>
        <button class="btn ghost small" data-act="review" data-kind="${r.targetType}" data-id="${r.targetId}">Va bene così</button>
        ${r.authorBanned ? "" : `<button class="btn ghost small" style="color:var(--bad)" data-act="ban" data-id="${r.authorId}">Sospendi autore</button>`}
      </div>
    </article>`).join("") : `<div class="empty glass">${icon("shield")}<h3>Nessuna segnalazione aperta</h3></div>`}
  <div class="section-h"><h2>Account sospesi</h2></div>
  ${S.bans.length ? `<section class="panel glass activity">${S.bans.map(b => `<div class="row" style="justify-content:space-between"><span><b>${esc(b.name)}</b> <span class="muted">· ${esc(b.reason || "nessun motivo")} · ${ago(b.createdAt)}</span></span><button class="btn ghost small" data-act="unban" data-id="${b.userId}">Riattiva</button></div>`).join("")}</section>` : `<p class="muted" style="margin:0">Nessun account sospeso.</p>`}`;
}
function vStaffAnns() {
  const all = activeAnns(true);
  return `<button class="btn primary" data-act="add-ann">${icon("megaphone", 'width="18" height="18"')}Nuova comunicazione</button>
  <p class="hint" style="margin:0">Ogni comunicazione arriva come notifica sui dispositivi dei destinatari. Quelle fissate restano in cima all'app; quelle urgenti non si possono nascondere fino alla scadenza.</p>
  ${all.length ? all.map(a => vAnn(a, true)).join("") : `<div class="empty glass">${icon("megaphone")}<h3>Nessuna comunicazione</h3><p class="muted" style="margin:0;max-width:34ch">Lezioni annullate, cambi d'aula, chiusure, scadenze di segreteria: pubblicale qui.</p></div>`}`;
}
function vStaffMaterials() {
  return `<button class="btn primary" data-act="add-material">${icon("upload", 'width="18" height="18"')}Carica materiale</button>
  ${S.materials.length ? S.materials.map(m => vMaterialItem(m, true)).join("") : `<div class="empty glass">${icon("book")}<h3>Nessun materiale</h3><p class="muted" style="margin:0;max-width:34ch">Carica PDF, Word, PowerPoint, immagini o video, oppure inserisci un link all'e-learning.</p></div>`}`;
}
function vStaffFaq() {
  return `<section class="panel glass"><b>Risposte verificate per l'assistente</b><p class="muted" style="margin:4px 0 0;font-size:14px">L'Assistente AI usa queste risposte come fonte prioritaria.</p></section>
  <button class="btn primary" data-act="add-faq">${icon("plus", 'width="18" height="18"')}Nuova risposta verificata</button>
  ${S.faq.length ? S.faq.map(f => `<article class="panel glass stack" style="gap:4px;padding:14px 16px"><b>${esc(f.q)}</b><div class="muted" style="font-size:14px;white-space:pre-wrap">${esc(f.a)}</div>${f.link ? `<a href="${esc(f.link)}" target="_blank" rel="noopener" style="font-size:13.5px">${esc(f.link)}</a>` : ""}<span class="hint">${esc(f.byLabel)} · ${ago(f.createdAt)}</span><button class="link-btn" style="color:var(--bad);font-size:13px;justify-self:start" data-act="del-faq" data-id="${f.id}">Elimina</button></article>`).join("") : `<div class="empty glass">${icon("help")}<h3>Nessuna risposta verificata</h3><p class="muted" style="margin:0;max-width:34ch">Esempio: orari della segreteria di Como, come richiedere un certificato, regole per il tirocinio.</p></div>`}`;
}
function vStaffEvents() {
  const up = S.events.filter(e => e.date >= todayISO());
  return `<button class="btn primary" data-act="add-event">${icon("plus", 'width="18" height="18"')}Pubblica un evento</button>${up.length ? up.map(vEvent).join("") : `<div class="empty glass">${icon("cal")}<h3>Nessun evento in calendario</h3></div>`}`;
}

/* ------------------------------------------------------------------ render */
const TITLES = { home: ["Università dell'Insubria", "Ciao!"], libretto: ["Carriera", "Libretto"], community: ["Tutti gli atenei italiani", "Community"], eventi: ["Varese · Como · Busto", "Eventi"], ai: ["Sempre disponibile", "Assistente"], staff: ["Docenti e personale", "Area staff"] };
function render(keepScroll) {
  const v = $("#view");
  const locked = !S.me;
  document.body.classList.toggle("locked", locked);
  const active = document.activeElement?.id;
  const sel = active && document.activeElement.selectionStart;
  const views = { home: vHome, libretto: vLibretto, community: vCommunity, eventi: vEventi, ai: vAI, staff: vStaff };
  v.innerHTML = locked ? vLogin() : vPinned() + views[S.tab]();
  if (!keepScroll) { v.classList.remove("view-in"); void v.offsetWidth; v.classList.add("view-in"); }
  const [eb, tt] = locked ? ["Università dell'Insubria", "Insubria Hub"] : TITLES[S.tab];
  $("#top-eyebrow").textContent = eb;
  $("#top-title").textContent = !locked && S.tab === "home" && S.profile?.firstName ? `Ciao ${S.profile.firstName}!` : tt;
  $("#avatar-btn").textContent = S.profile?.firstName ? (S.profile.firstName[0] + (S.profile.lastName?.[0] || "")).toUpperCase() : "?";
  $('.tabbar [data-tab="staff"]').hidden = !isStaff();
  $(".tabbar").classList.toggle("six", isStaff());
  document.querySelectorAll(".tabbar button").forEach(b => b.setAttribute("aria-current", b.dataset.tab === S.tab ? "page" : "false"));
  if (active) { const el = document.getElementById(active); if (el && el.matches("input,textarea")) { el.focus(); try { el.setSelectionRange(sel, sel); } catch {} } }
}
function go(tab) {
  S.tab = tab; ls.set("tab", tab);
  render(); window.scrollTo({ top: 0 });
  if (tab === "ai") scrollChat();
}

/* ------------------------------------------------------------------ sheet */
function openSheet(html, onClose) {
  $("#sheet-root").innerHTML = `<div class="scrim" data-act="scrim"><div class="sheet" role="dialog" aria-modal="true"><div class="grab"></div>${html}</div></div>`;
  S.onClose = onClose;
  setTimeout(() => $(".sheet input:not([type=hidden]), .sheet textarea, .sheet button")?.focus({ preventScroll: true }), 50);
}
function closeSheet() { $("#sheet-root").innerHTML = ""; const f = S.onClose; S.onClose = null; f?.(); }

const staffLabel = () => (S.profile?.staffRole || "Personale universitario") + (S.profile?.staffDep ? " · " + S.profile.staffDep : "");
function sheetProfile(force) {
  const p = S.profile || {};
  const opt = (arr, val) => arr.map(([v, t]) => `<option value="${esc(v)}" ${v === val ? "selected" : ""}>${esc(t)}</option>`).join("");
  openSheet(`
    <h2>${p.firstName ? "Il tuo profilo" : "Completa il profilo"}</h2>
    <p class="muted" style="margin:0;font-size:13.5px">Accesso con <b>${esc(S.me.email)}</b>${isStaff() ? " · personale dell'ateneo" : ""}. Il cellulare è facoltativo.</p>
    <form class="f" id="profile-form" novalidate>
      <div class="two"><div class="field"><label for="p-first">Nome</label><input id="p-first" required autocomplete="given-name" value="${esc(p.firstName)}"></div>
      <div class="field"><label for="p-last">Cognome</label><input id="p-last" required autocomplete="family-name" value="${esc(p.lastName)}"></div></div>
      <div class="field"><label for="p-phone">Cellulare (facoltativo)</label><input id="p-phone" type="tel" autocomplete="tel" placeholder="+39 ..." value="${esc(p.phone)}"></div>
      <div class="field"><label for="p-uni">Università</label><select id="p-uni">${opt(UNIS.map(u => [u, u]), p.uni || UNIS[0])}</select></div>
      <div class="field"><label for="p-dep">Dipartimento</label><select id="p-dep"><option value="">Scegli…</option>${opt(DEPARTMENTS.map(d => [d.id, `${d.name} (${d.city})`]), p.dep)}<option value="altro" ${p.dep === "altro" ? "selected" : ""}>Altro / altra università</option></select></div>
      <div class="field"><label for="p-course">Corso di laurea</label><input id="p-course" placeholder="Es. Informatica" value="${esc(p.course)}"></div>
      <div class="two"><div class="field"><label for="p-type">Tipo</label><select id="p-type">${opt([["triennale", "Triennale · 180 CFU"], ["magistrale", "Magistrale · 120 CFU"], ["ciclo5", "Ciclo unico · 300 CFU"], ["ciclo6", "Ciclo unico · 360 CFU"]], p.courseType || "triennale")}</select></div>
      <div class="field"><label for="p-year">Anno</label><select id="p-year">${opt([["1", "1°"], ["2", "2°"], ["3", "3°"], ["4", "4°"], ["5", "5°"], ["6", "6°"], ["fc", "Fuori corso"]], p.year || "1")}</select></div></div>
      ${isStaff() ? `<div class="section-h" style="margin-top:6px"><h2 style="font-size:16px">Profilo personale universitario</h2></div>
      <div class="two"><div class="field"><label for="p-srole">Ruolo</label><select id="p-srole"><option value="">Scegli…</option>${opt(STAFF_ROLES.map(r => [r, r]), p.staffRole)}</select></div>
      <div class="field"><label for="p-sdep">Struttura</label><select id="p-sdep"><option value="">Scegli…</option>${opt([...DEPARTMENTS.map(d => [d.id, d.id]), ["Amministrazione", "Amministrazione"]], p.staffDep)}</select></div></div>
      <span class="hint">Nelle risposte in incognito gli studenti vedono solo ruolo e struttura.</span>` : ""}
      <label class="check"><input type="checkbox" id="p-privacy" ${p.privacy ? "checked" : ""}><span>Ho letto l'informativa privacy e acconsento al trattamento dei dati per usare l'app.</span></label>
      <label class="check"><input type="checkbox" id="p-improve" ${p.improve ? "checked" : ""}><span>Facoltativo: uso dei miei dati in forma aggregata per migliorare suggerimenti e assistente.</span></label>
      <p class="hint" id="p-err" style="color:var(--bad)" hidden></p>
      <button class="btn primary">${p.firstName ? "Salva modifiche" : "Salva e continua"}</button>
    </form>
    ${force ? "" : `
    <div class="section-h" style="margin-top:22px"><h2 style="font-size:17px">Notifiche</h2></div>
    ${vPushBox()}
    <div class="section-h" style="margin-top:22px"><h2 style="font-size:17px">Installa l'app</h2></div>
    ${S.installEvt ? `<button class="btn ghost" data-act="install">Installa Insubria Hub su questo dispositivo</button>` : isStandalone() ? `<p class="hint" style="margin:0">L'app è installata su questo dispositivo.</p>` : `<div class="stack hint" style="font-size:13.5px">
      <div><b style="color:var(--ink)">iPhone e iPad:</b> Safari → Condividi → "Aggiungi alla schermata Home".</div>
      <div><b style="color:var(--ink)">Android:</b> Chrome → menu ⋮ → "Installa app".</div>
      <div><b style="color:var(--ink)">Windows e macOS:</b> Chrome o Edge → icona di installazione nella barra degli indirizzi. Safari su Mac → File → "Aggiungi al Dock".</div></div>`}
    <div class="section-h" style="margin-top:22px"><h2 style="font-size:17px">Account e dati</h2></div>
    <div class="stack">
      <a class="btn ghost" href="/api/me/export" download>Scarica una copia dei miei dati</a>
      <button class="btn ghost" data-act="logout">Esci</button>
      <button class="btn ghost" style="color:var(--bad)" data-act="del-account">Elimina il mio account</button>
    </div>
    <button class="btn ghost" style="width:100%;margin-top:14px" data-act="close">Chiudi</button>`}`, force ? () => { if (!S.profile?.firstName) setTimeout(() => sheetProfile(true), 0); } : null);
}
function sheetExam(e) {
  const isNew = !e;
  e = e || { name: "", cfu: 6, grade: "", lode: false, date: todayISO(), status: "passed" };
  openSheet(`
    <h2>${isNew ? "Nuovo esame" : "Modifica esame"}</h2>
    <form class="f" id="exam-form" data-id="${e.id || ""}" novalidate>
      <div class="field"><label for="e-name">Insegnamento</label><input id="e-name" required value="${esc(e.name)}" placeholder="Es. Diritto privato"></div>
      <div class="chips" role="group" aria-label="Stato"><button type="button" class="chip" data-status="passed" aria-pressed="${e.status === "passed"}">Superato</button><button type="button" class="chip" data-status="planned" aria-pressed="${e.status === "planned"}">Da sostenere</button></div>
      <input type="hidden" id="e-status" value="${e.status}">
      <div class="two"><div class="field"><label for="e-cfu">CFU</label><input id="e-cfu" type="number" min="1" max="30" inputmode="numeric" value="${esc(e.cfu)}"></div>
      <div class="field"><label for="e-date">Data</label><input id="e-date" type="date" value="${esc(e.date)}"></div></div>
      <div class="two" id="grade-row" ${e.status === "planned" ? "hidden" : ""}><div class="field"><label for="e-grade">Voto</label><select id="e-grade">${["ID", ...Array.from({ length: 13 }, (_, i) => String(18 + i))].map(v => `<option value="${v}" ${(e.idoneita ? "ID" : String(e.grade)) === v || (!e.grade && !e.idoneita && v === "27") ? "selected" : ""}>${v === "ID" ? "Idoneità" : v}</option>`).join("")}</select></div>
      <label class="check" style="align-self:end;padding-bottom:12px"><input type="checkbox" id="e-lode" ${e.lode ? "checked" : ""}><span>Lode</span></label></div>
      <p class="hint" id="e-err" style="color:var(--bad)" hidden></p>
      <button class="btn primary">${isNew ? "Aggiungi al libretto" : "Salva"}</button>
      ${isNew ? "" : `<button type="button" class="btn ghost" style="color:var(--bad)" data-act="del-exam" data-id="${e.id}">Elimina esame</button>`}
    </form>`);
}
function sheetPost() {
  openSheet(`
    <h2>Nuova domanda</h2>
    <p class="muted" style="margin:0;font-size:13.5px">Visibile a tutti gli studenti della community, di ogni ateneo.</p>
    <form class="f" id="post-form" novalidate>
      <div class="field"><label for="n-title">Titolo</label><input id="n-title" maxlength="120" required placeholder="Es. Come avete preparato Diritto commerciale?"></div>
      <div class="field"><label for="n-body">Testo</label><textarea id="n-body" rows="5" maxlength="3000" required placeholder="Dettagli, docente, materiale che hai già…"></textarea></div>
      <div class="two"><div class="field"><label for="n-uni">Università</label><select id="n-uni">${UNIS.map(u => `<option ${u === (S.profile?.uni || UNIS[0]) ? "selected" : ""}>${esc(u)}</option>`).join("")}</select></div>
      <div class="field"><label for="n-area">Area</label><select id="n-area">${AREAS.map(a => `<option>${esc(a)}</option>`).join("")}</select></div></div>
      <div class="field"><label for="n-subject">Materia (facoltativa)</label><input id="n-subject" maxlength="80" placeholder="Es. Statistica"></div>
      <label class="check"><input type="checkbox" id="n-staff"><span>Chiedi anche a docenti e personale dell'Insubria (appunti, materiale, curiosità)</span></label>
      <p class="hint" id="n-err" style="color:var(--bad)" hidden></p>
      <button class="btn primary">Pubblica</button>
    </form>`);
}
async function loadDetail() {
  if (!S.openPost) return;
  try { S.detail = await api(`/api/posts/${S.openPost}`); drawDetail(); }
  catch (e) { if (e.status === 404) { closeSheet(); toast(e.message); } }
}
async function openPost(id) {
  S.openPost = id; S.detail = null;
  openSheet(`<div id="post-detail"><p class="muted">Carico…</p></div>`, () => { S.openPost = null; S.detail = null; });
  await loadDetail();
}
function drawDetail() {
  const box = $("#post-detail");
  if (!box || !S.detail) return;
  const { post: p, replies, staffAnswers } = S.detail;
  if (!box.dataset.ready) {
    box.dataset.ready = "1";
    box.innerHTML = `
    <div class="meta"><span class="tag uni">${esc(p.uni)}</span><span class="tag">${esc(p.area)}</span>${p.subject ? `<span>${esc(p.subject)}</span>` : ""}</div>
    <h2 style="margin-top:8px">${esc(p.title)}</h2>
    <div class="meta" style="margin-bottom:10px"><span>${esc(p.authorName)} · ${ago(p.createdAt)}</span></div>
    <div style="white-space:pre-wrap;overflow-wrap:anywhere">${esc(p.body)}</div>
    <div id="post-actions"></div>
    <div id="staff-answers"></div>
    ${isStaff() ? `<form class="f" id="staff-answer-form" style="margin-top:14px;padding:14px;border-radius:var(--r-m);border:1px dashed color-mix(in srgb, var(--brand) 50%, transparent)">
      <div class="field"><label for="sa-body">Risposta del personale</label><textarea id="sa-body" rows="4" maxlength="3000" placeholder="Rispondi alla richiesta: appunti, chiarimenti, dove trovare il materiale…"></textarea></div>
      <label class="check"><input type="checkbox" id="sa-anon" checked><span>Rispondi in incognito. Gli studenti vedono solo "${esc(staffLabel())}". Il registro del team conserva chi ha risposto.</span></label>
      <p class="hint" id="sa-err" style="color:var(--bad)" hidden></p>
      <button class="btn primary">Pubblica risposta</button>
    </form>` : ""}
    <div class="section-h" style="margin-top:18px"><h2 style="font-size:17px">Risposte degli studenti</h2></div>
    <div id="replies"></div>
    ${!banned() ? `<form class="composer" id="reply-form" style="position:static;margin-top:10px;border:1px solid var(--hair)"><textarea id="reply" rows="1" maxlength="2000" placeholder="Scrivi una risposta…" aria-label="Risposta"></textarea><button class="icon-btn" aria-label="Invia risposta">${icon("send")}</button></form>` : ""}`;
  }
  $("#post-actions").innerHTML = p.isMine ? `<button class="link-btn" style="color:var(--bad);font-size:13.5px" data-act="del-post" data-id="${p.id}">Elimina la mia domanda</button>`
    : isStaff() ? `<div class="row" style="flex-wrap:wrap;gap:8px;margin-top:10px">
        <button class="btn ghost small" data-act="${p.hidden ? "restore" : "hide"}" data-kind="post" data-id="${p.id}">${p.hidden ? "Ripristina domanda" : "Nascondi domanda"}</button>
        <button class="btn ghost small" style="color:var(--bad)" data-act="${p.authorBanned ? "unban" : "ban"}" data-id="${p.authorId}">${p.authorBanned ? "Riattiva autore" : "Sospendi autore"}</button></div>`
    : `<button class="link-btn" style="color:var(--ink-soft);font-size:13px" data-act="report" data-kind="post" data-id="${p.id}">Segnala ai moderatori</button>`;
  $("#staff-answers").innerHTML = staffAnswers.map(a => `<div class="staff-answer">
    <div class="meta"><span class="tag staff">${a.anon ? "Personale · in incognito" : "Personale"}</span><b style="color:var(--ink)">${esc(a.byLabel)}</b><span>· ${ago(a.createdAt)}</span></div>
    ${isStaff() && a.anon && a.authorName ? `<span class="hint">Scritta da ${esc(a.authorName)} · visibile solo al personale</span>` : !a.anon && a.authorName ? `<span class="hint">${esc(a.authorName)}</span>` : ""}
    <div style="white-space:pre-wrap;overflow-wrap:anywhere">${esc(a.body)}</div>
    ${isStaff() ? `<button class="link-btn" style="color:var(--bad);font-size:13px;justify-self:start" data-act="del-answer" data-id="${a.id}">Elimina risposta</button>` : ""}
  </div>`).join("");
  $("#replies").innerHTML = replies.length ? replies.map(r => `<div class="reply">
    <div class="meta"><b style="color:var(--ink)">${esc(r.authorName)}</b><span>· ${ago(r.createdAt)}</span>${r.hidden ? '<span class="tag" style="color:var(--bad)">Nascosta</span>' : ""}${r.authorBanned ? '<span class="tag" style="color:var(--bad)">Autore sospeso</span>' : ""}</div>
    <div style="white-space:pre-wrap;overflow-wrap:anywhere">${esc(r.body)}</div>
    ${r.isMine ? `<button class="link-btn" style="color:var(--bad);font-size:12.5px;justify-self:start" data-act="del-reply" data-id="${r.id}">Elimina</button>`
      : isStaff() ? `<div class="row" style="gap:12px"><button class="link-btn" style="font-size:12.5px" data-act="${r.hidden ? "restore" : "hide"}" data-kind="reply" data-id="${r.id}">${r.hidden ? "Ripristina" : "Nascondi"}</button>${r.authorBanned ? "" : `<button class="link-btn" style="font-size:12.5px;color:var(--bad)" data-act="ban" data-id="${r.authorId}">Sospendi autore</button>`}</div>`
      : `<button class="link-btn" style="color:var(--ink-soft);font-size:12.5px;justify-self:start" data-act="report" data-kind="reply" data-id="${r.id}">Segnala</button>`}
  </div>`).join("") : `<p class="muted" style="margin:6px 0">Ancora nessuna risposta.</p>`;
}
function sheetReport(kind, id) {
  openSheet(`<h2>Segnala ai moderatori</h2>
    <form class="f" id="report-form" data-kind="${esc(kind)}" data-id="${esc(id)}">
      <div class="chips" style="flex-wrap:wrap" role="group" aria-label="Motivo">${REPORT_REASONS.map((m, i) => `<button type="button" class="chip" data-reason="${m}" aria-pressed="${i === 0}">${m}</button>`).join("")}</div>
      <input type="hidden" id="r-reason" value="${REPORT_REASONS[0]}">
      <p class="hint">Il personale vede la segnalazione, non chi l'ha fatta.</p>
      <button class="btn primary">Invia segnalazione</button>
    </form>`);
}
function sheetBan(userId) {
  openSheet(`<h2>Sospendi autore</h2>
    <p class="muted" style="margin:0;font-size:13.5px">Domande e risposte di questa persona spariscono per tutti e non potrà più scrivere finché non la riattivi.</p>
    <form class="f" id="ban-form" data-uid="${esc(userId)}">
      <div class="field"><label for="b-reason">Motivo (visibile solo al personale)</label><input id="b-reason" maxlength="140" placeholder="Es. insulti ripetuti"></div>
      <button class="btn primary" style="background:var(--bad)">Sospendi</button>
    </form>`);
}
function sheetAnn(level) {
  const opts = [["tutti", "Tutti gli studenti"], ...CITIES.map(c => [c, "Sede di " + c]), ...DEPARTMENTS.map(d => [d.id, d.name])];
  openSheet(`
    <h2>Nuova comunicazione</h2>
    <p class="muted" style="margin:0;font-size:13.5px">Arriva come notifica sui dispositivi dei destinatari che le hanno attivate.</p>
    <form class="f" id="ann-form" novalidate>
      <div class="two"><div class="field"><label for="a-level">Priorità</label><select id="a-level">${Object.keys(LVL).map(l => `<option value="${l}" ${l === (level || "info") ? "selected" : ""}>${LVL_LABEL[l]}</option>`).join("")}</select></div>
      <div class="field"><label for="a-cat">Categoria</label><select id="a-cat">${ANN_CATS.map(c => `<option>${c}</option>`).join("")}</select></div></div>
      <div class="field"><label for="a-title">Titolo</label><input id="a-title" maxlength="120" required placeholder="Es. Lezione di Fisica di giovedì annullata"></div>
      <div class="field"><label for="a-body">Testo</label><textarea id="a-body" rows="4" maxlength="1500"></textarea></div>
      <div class="field"><label for="a-aud">Destinatari</label><select id="a-aud">${opts.map(([v, t]) => `<option value="${esc(v)}">${esc(t)}</option>`).join("")}</select></div>
      <div class="two"><div class="field"><label for="a-exp">Scade il</label><input id="a-exp" type="date" min="${todayISO()}"></div>
      <div class="field"><label for="a-link">Link (facoltativo)</label><input id="a-link" type="url" placeholder="https://www.uninsubria.it/…"></div></div>
      <label class="check"><input type="checkbox" id="a-pin" ${level === "urgente" ? "checked" : ""}><span>Fissa in cima a tutte le schermate dell'app</span></label>
      <p class="hint" id="a-err" style="color:var(--bad)" hidden></p>
      <button class="btn primary">Pubblica e invia notifica</button>
    </form>`);
}
function sheetMaterial() {
  openSheet(`
    <h2>Carica materiale</h2>
    <p class="muted" style="margin:0;font-size:13.5px">PDF, Word, PowerPoint, Excel, immagini, video, testo o ZIP. Oppure un link.</p>
    <form class="f" id="material-form" novalidate>
      <div class="field"><label for="m-file">File</label><input id="m-file" type="file" accept=".pdf,.docx,.pptx,.xlsx,.zip,image/*,video/mp4,video/webm,.txt,.md,.csv"></div>
      <div class="field"><label for="m-link">Oppure link (e-learning, cartella condivisa)</label><input id="m-link" type="url" placeholder="https://elearning.uninsubria.it/…"></div>
      <div class="field"><label for="m-title">Titolo</label><input id="m-title" maxlength="120" required placeholder="Es. Slide lezione 5: equazioni differenziali"></div>
      <div class="two"><div class="field"><label for="m-kind">Tipo</label><select id="m-kind">${MAT_KINDS.map(k => `<option>${k}</option>`).join("")}</select></div>
      <div class="field"><label for="m-dep">Dipartimento</label><select id="m-dep">${DEPARTMENTS.map(d => `<option value="${d.id}" ${d.id === S.profile?.staffDep ? "selected" : ""}>${d.id}</option>`).join("")}</select></div></div>
      <div class="field"><label for="m-course">Insegnamento</label><input id="m-course" maxlength="80" placeholder="Es. Analisi matematica II"></div>
      <div class="field"><label for="m-desc">Note (facoltative)</label><input id="m-desc" maxlength="200"></div>
      <p class="hint" id="m-err" style="color:var(--bad)" hidden></p>
      <button class="btn primary" id="m-submit">Pubblica materiale</button>
    </form>`);
}
function sheetFaq() {
  openSheet(`
    <h2>Risposta verificata</h2>
    <p class="muted" style="margin:0;font-size:13.5px">L'assistente la userà per rispondere agli studenti.</p>
    <form class="f" id="faq-form" novalidate>
      <div class="field"><label for="q-q">Domanda tipica</label><input id="q-q" maxlength="200" required placeholder="Es. Quali sono gli orari della segreteria studenti di Como?"></div>
      <div class="field"><label for="q-a">Risposta</label><textarea id="q-a" rows="5" maxlength="2000" required></textarea></div>
      <div class="field"><label for="q-link">Pagina ufficiale (facoltativa)</label><input id="q-link" type="url" placeholder="https://www.uninsubria.it/…"></div>
      <p class="hint" id="q-err" style="color:var(--bad)" hidden></p>
      <button class="btn primary">Salva risposta</button>
    </form>`);
}
function sheetEvent() {
  openSheet(`
    <h2>Nuovo evento</h2>
    <p class="muted" style="margin:0;font-size:13.5px">Riporta i dati del post di @insubria_eventi_team e incolla il link al post.</p>
    <form class="f" id="event-form" novalidate>
      <div class="field"><label for="v-title">Titolo</label><input id="v-title" required maxlength="100"></div>
      <div class="two"><div class="field"><label for="v-date">Data</label><input id="v-date" type="date" required></div><div class="field"><label for="v-time">Ora</label><input id="v-time" type="time"></div></div>
      <div class="two"><div class="field"><label for="v-city">Sede</label><select id="v-city"><option>Varese</option><option>Como</option><option>Busto Arsizio</option><option>Online</option></select></div><div class="field"><label for="v-place">Luogo</label><input id="v-place" maxlength="80" placeholder="Es. Padiglione Morselli"></div></div>
      <div class="field"><label for="v-link">Link al post Instagram</label><input id="v-link" type="url" placeholder="https://www.instagram.com/p/…"></div>
      <div class="field"><label for="v-desc">Descrizione</label><textarea id="v-desc" rows="3" maxlength="500"></textarea></div>
      <p class="hint" id="v-err" style="color:var(--bad)" hidden></p>
      <button class="btn primary">Pubblica evento</button>
    </form>`);
}

/* ------------------------------------------------------------------ interazioni */
async function act(fn, ok) { try { await fn(); if (ok) toast(ok); } catch (e) { toast(e.message); } }
document.addEventListener("click", async ev => {
  const t = ev.target;
  const q = s => t.closest(s);
  if (q("[data-tab]")) return go(q("[data-tab]").dataset.tab);
  if (q("[data-tab-go]")) return go(q("[data-tab-go]").dataset.tabGo);
  if (q("[data-ask]")) return ask(q("[data-ask]").dataset.ask);
  if (q("[data-seg]")) { S.commSeg = q("[data-seg]").dataset.seg; return render(true); }
  if (q("[data-matdep]")) { S.matDep = q("[data-matdep]").dataset.matdep; return render(true); }
  if (q("[data-sub]")) { S.staffSub = q("[data-sub]").dataset.sub; return render(); }
  if (q("[data-inbox]")) { S.inboxF = q("[data-inbox]").dataset.inbox; return render(true); }
  if (q("[data-area]")) { S.filter.area = q("[data-area]").dataset.area; return render(true); }
  if (q("[data-city]")) { S.evCity = q("[data-city]").dataset.city; return render(true); }
  const rsn = q("[data-reason]");
  if (rsn) { $("#r-reason").value = rsn.dataset.reason; document.querySelectorAll("[data-reason]").forEach(b => b.setAttribute("aria-pressed", b === rsn)); return; }
  const stBtn = q("[data-status]");
  if (stBtn) {
    $("#e-status").value = stBtn.dataset.status;
    document.querySelectorAll("[data-status]").forEach(b => b.setAttribute("aria-pressed", b === stBtn));
    $("#grade-row").hidden = stBtn.dataset.status === "planned";
    return;
  }
  const a = q("[data-act]");
  if (!a) return;
  const name = a.dataset.act, id = a.dataset.id, kind = a.dataset.kind;
  if (name === "scrim" && t !== a) return;
  if ((name.startsWith("del-") || name === "logout") && a.dataset.armed !== "1") {
    ev.preventDefault();
    a.dataset.armed = "1"; a.dataset.label = a.textContent; a.textContent = "Tocca di nuovo per confermare";
    setTimeout(() => { if (a.isConnected) { a.dataset.armed = ""; a.textContent = a.dataset.label; } }, 3500);
    return;
  }
  switch (name) {
    case "scrim": case "close": closeSheet(); break;
    case "profile": if (S.me) sheetProfile(); break;
    case "login-back": S.login.step = "email"; render(); break;
    case "add-exam": sheetExam(); break;
    case "edit-exam": sheetExam(S.exams.find(e => e.id === id)); break;
    case "del-exam": S.exams = S.exams.filter(e => e.id !== id); persistExams(); closeSheet(); render(true); toast("Esame eliminato"); break;
    case "new-post": sheetPost(); break;
    case "open-post": if (!t.closest(".vote")) openPost(id); break;
    case "vote": ev.stopPropagation(); await act(async () => { const p = await api(`/api/posts/${id}/vote`, { method: "POST" }); Object.assign(S.posts.find(x => x.id === id) || {}, p); render(true); }); break;
    case "del-post": await act(async () => { await api(`/api/posts/${id}`, { method: "DELETE" }); closeSheet(); }, "Domanda eliminata"); break;
    case "del-reply": await act(() => api(`/api/replies/${id}`, { method: "DELETE" }), "Risposta eliminata"); break;
    case "report": sheetReport(kind, id); break;
    case "hide": await act(async () => { await api("/api/moderation/hide", { method: "POST", body: { targetType: kind, targetId: id, hidden: true } }); }, "Contenuto nascosto agli studenti"); break;
    case "restore": await act(() => api("/api/moderation/hide", { method: "POST", body: { targetType: kind, targetId: id, hidden: false } }), "Contenuto ripristinato"); break;
    case "review": await act(() => api("/api/moderation/review", { method: "POST", body: { targetType: kind, targetId: id } }), "Segnalazione chiusa"); break;
    case "ban": sheetBan(id); break;
    case "unban": await act(() => api(`/api/moderation/ban/${id}`, { method: "DELETE" }), "Account riattivato"); break;
    case "del-answer": await act(() => api(`/api/staff-answers/${id}`, { method: "DELETE" }), "Risposta eliminata"); break;
    case "add-ann": sheetAnn(a.dataset.level); break;
    case "pin-ann": { const x = S.anns.find(y => y.id === id); await act(() => api(`/api/announcements/${id}`, { method: "PATCH", body: { pinned: !x?.pinned } })); break; }
    case "del-ann": await act(() => api(`/api/announcements/${id}`, { method: "DELETE" }), "Comunicazione eliminata"); break;
    case "dismiss-ann": case "dismiss": S.dismissed = [...S.dismissed, id]; ls.set("dismissed", S.dismissed); render(true); break;
    case "add-material": sheetMaterial(); break;
    case "del-material": await act(() => api(`/api/materials/${id}`, { method: "DELETE" }), "Materiale eliminato"); break;
    case "add-faq": sheetFaq(); break;
    case "del-faq": await act(() => api(`/api/faq/${id}`, { method: "DELETE" }), "Risposta eliminata"); break;
    case "add-event": sheetEvent(); break;
    case "del-event": await act(() => api(`/api/events/${id}`, { method: "DELETE" }), "Evento eliminato"); break;
    case "push-on": await enablePush(); break;
    case "push-off": await disablePush(); break;
    case "push-test": await act(async () => { const r = await api("/api/push/test", { method: "POST" }); toast(r.devices ? "Notifica di prova inviata" : "Nessun dispositivo registrato"); }); break;
    case "install": S.installEvt?.prompt(); S.installEvt = null; break;
    case "logout": await act(async () => { await disablePushQuiet(); await api("/api/auth/logout", { method: "POST" }); location.reload(); }); break;
    case "del-account": await act(async () => { await disablePushQuiet(); await api("/api/me", { method: "DELETE" }); location.reload(); }); break;
    case "stop": S.ctl?.abort(); break;
    case "reset-chat": S.ctl?.abort(); S.chat = []; render(); break;
  }
});
async function disablePushQuiet() {
  try { const sub = await (await navigator.serviceWorker.ready).pushManager.getSubscription(); if (sub) { await api("/api/push/subscribe", { method: "DELETE", body: { endpoint: sub.endpoint } }); await sub.unsubscribe(); } } catch {}
}
document.addEventListener("keydown", ev => {
  if (ev.key === "Escape" && $("#sheet-root").innerHTML) closeSheet();
  if (ev.key === "Enter" && ev.target.matches(".post")) openPost(ev.target.dataset.id);
  if (ev.key === "Enter" && !ev.shiftKey && ev.target.id === "ask") { ev.preventDefault(); const v = ev.target.value; ev.target.value = ""; ask(v); }
});
document.addEventListener("input", ev => {
  const t = ev.target;
  if (t.id === "q") { S.filter.q = t.value; clearTimeout(S.qT); S.qT = setTimeout(() => render(true), 160); }
  if (t.id === "mq") { S.matQ = t.value; clearTimeout(S.qT); S.qT = setTimeout(() => render(true), 160); }
  if (t.id === "sim") { S.simGrade = Number(t.value); const plan = S.exams.find(e => e.status === "planned"); if (plan) $("#sim-out").innerHTML = simOut(stats(), plan, S.simGrade); }
  if (t.matches(".composer textarea")) { t.style.height = "auto"; t.style.height = Math.min(120, t.scrollHeight) + "px"; }
});
document.addEventListener("change", async ev => {
  const t = ev.target;
  if (t.id === "uni-filter") { S.filter.uni = t.value; render(true); }
  if (t.dataset.pref) {
    const prefs = { ...S.push.prefs, [t.dataset.pref]: t.checked };
    try { const r = await api("/api/push/prefs", { method: "PUT", body: { endpoint: S.push.endpoint, prefs } }); S.push.prefs = r.prefs; } catch (e) { t.checked = !t.checked; toast(e.message); }
  }
});
document.addEventListener("submit", async ev => {
  ev.preventDefault();
  const f = ev.target;
  const val = id => ($("#" + id)?.value || "").trim();
  const err = (id, msg) => { const e = $("#" + id); if (e) { e.textContent = msg; e.hidden = false; } else toast(msg); };
  const btn = f.querySelector("button:not([type=button])");
  const busy = on => { if (btn) btn.disabled = on; };
  busy(true);
  try {
    switch (f.id) {
      case "login-email": {
        const email = val("l-email").toLowerCase();
        const r = await api("/api/auth/request", { method: "POST", body: { email } });
        Object.assign(S.login, { step: "code", email, devCode: r.devCode || "" });
        render();
        break;
      }
      case "login-code": {
        await api("/api/auth/verify", { method: "POST", body: { email: S.login.email, code: val("l-code") } });
        await afterLogin();
        break;
      }
      case "ask-form": { const v = val("ask"); $("#ask").value = ""; ask(v); break; }
      case "profile-form": {
        const body = { firstName: val("p-first"), lastName: val("p-last"), phone: val("p-phone"), uni: val("p-uni"), dep: val("p-dep"), course: val("p-course"), courseType: val("p-type"), year: val("p-year"), privacy: $("#p-privacy").checked, improve: $("#p-improve").checked, staffRole: val("p-srole"), staffDep: val("p-sdep") };
        const r = await api("/api/me/profile", { method: "PUT", body });
        const first = !S.profile?.firstName;
        S.me = r.user; S.profile = r.profile;
        S.onClose = null; closeSheet(); render(true);
        toast(first ? "Profilo creato" : "Profilo aggiornato");
        break;
      }
      case "exam-form": {
        const name = val("e-name"), status = val("e-status"), cfu = Number(val("e-cfu")), g = val("e-grade");
        if (!name) return err("e-err", "Scrivi il nome dell'insegnamento.");
        if (!(cfu >= 1 && cfu <= 30)) return err("e-err", "I CFU vanno da 1 a 30.");
        const exam = { id: f.dataset.id || uidGen(), name, cfu, date: val("e-date"), status, idoneita: status === "passed" && g === "ID", grade: status === "passed" && g !== "ID" ? Number(g) : null, lode: status === "passed" && g === "30" && $("#e-lode").checked };
        if (S.demo) S.exams = [];
        const i = S.exams.findIndex(e => e.id === exam.id);
        if (i >= 0) S.exams[i] = exam; else S.exams.push(exam);
        persistExams(); closeSheet(); render(true); toast(i >= 0 ? "Esame aggiornato" : "Esame aggiunto");
        break;
      }
      case "post-form": {
        const body = { title: val("n-title"), body: val("n-body"), uni: val("n-uni"), area: val("n-area"), subject: val("n-subject"), toStaff: $("#n-staff").checked };
        if (body.title.length < 6) return err("n-err", "Il titolo deve avere almeno 6 caratteri.");
        if (body.body.length < 10) return err("n-err", "Aggiungi qualche dettaglio in più nel testo.");
        await api("/api/posts", { method: "POST", body });
        S.filter.uni = body.uni; closeSheet(); toast("Domanda pubblicata");
        break;
      }
      case "reply-form": {
        const body = val("reply");
        if (!body) break;
        await api(`/api/posts/${S.openPost}/replies`, { method: "POST", body: { body } });
        $("#reply").value = "";
        break;
      }
      case "report-form": await api("/api/report", { method: "POST", body: { targetType: f.dataset.kind, targetId: f.dataset.id, reason: val("r-reason") } }); closeSheet(); toast("Segnalazione inviata ai moderatori"); break;
      case "ban-form": await api("/api/moderation/ban", { method: "POST", body: { userId: f.dataset.uid, reason: val("b-reason") } }); closeSheet(); toast("Account sospeso"); break;
      case "staff-answer-form": {
        const body = val("sa-body"), anon = $("#sa-anon").checked;
        if (body.length < 5) return err("sa-err", "Scrivi una risposta di almeno qualche parola.");
        await api(`/api/posts/${S.openPost}/staff-answers`, { method: "POST", body: { body, anon } });
        $("#sa-body").value = ""; toast(anon ? "Risposta pubblicata in incognito" : "Risposta pubblicata");
        break;
      }
      case "ann-form": {
        const r = await api("/api/announcements", { method: "POST", body: { title: val("a-title"), body: val("a-body"), level: val("a-level"), category: val("a-cat"), audience: val("a-aud"), expiresAt: val("a-exp"), link: val("a-link"), pinned: $("#a-pin").checked } });
        closeSheet(); toast(`Comunicazione pubblicata · notifica a ${r.notified} dispositiv${r.notified === 1 ? "o" : "i"}`);
        break;
      }
      case "material-form": {
        const fd = new FormData();
        const file = $("#m-file").files[0];
        if (!file && !val("m-link")) return err("m-err", "Scegli un file oppure inserisci un link.");
        if (file) fd.append("file", file);
        for (const [k, id] of [["link", "m-link"], ["title", "m-title"], ["kind", "m-kind"], ["dep", "m-dep"], ["course", "m-course"], ["desc", "m-desc"]]) fd.append(k, val(id));
        if (btn) btn.textContent = file ? "Carico il file…" : "Pubblico…";
        await api("/api/materials", { method: "POST", form: fd });
        closeSheet(); toast("Materiale pubblicato");
        break;
      }
      case "faq-form": await api("/api/faq", { method: "POST", body: { q: val("q-q"), a: val("q-a"), link: val("q-link") } }); closeSheet(); toast("Risposta verificata salvata"); break;
      case "event-form": await api("/api/events", { method: "POST", body: { title: val("v-title"), date: val("v-date"), time: val("v-time"), city: val("v-city"), place: val("v-place"), link: val("v-link"), desc: val("v-desc") } }); closeSheet(); toast("Evento pubblicato"); break;
    }
  } catch (e) {
    const box = f.querySelector(".hint[id$='-err']");
    if (box) { box.textContent = e.message; box.hidden = false; } else toast(e.message);
    if (f.id === "material-form" && btn) btn.textContent = "Pubblica materiale";
  } finally { busy(false); }
});

/* ------------------------------------------------------------------ deep link dalle notifiche */
function handleLink(hash) {
  if (!hash || !S.me) return;
  const h = hash.replace(/^#/, "");
  if (h.startsWith("post-")) { go("community"); openPost(h.slice(5)); }
  else if (h === "staff-moderazione" && isStaff()) { S.staffSub = "moderazione"; go("staff"); }
  else if (TITLES[h]) go(h);
  history.replaceState(null, "", location.pathname);
}

/* ------------------------------------------------------------------ avvio */
async function afterLogin() {
  const me = await api("/api/me");
  S.me = me.user; S.profile = me.profile;
  if (me.libretto?.exams?.length) { S.exams = me.libretto.exams; S.demo = false; }
  render();
  if (!S.profile.firstName) sheetProfile(true);
  await Promise.all(Object.keys(loaders).map(k => loaders[k]().catch(() => {})));
  S.postsState = S.postsState === "loading" ? "ready" : S.postsState;
  render(true);
  connectStream();
  initPush().then(() => render(true));
  handleLink(location.hash);
}
(async function boot() {
  const t = ls.get("tab"); if (t && TITLES[t]) S.tab = t;
  S.dismissed = ls.get("dismissed") || [];
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
    navigator.serviceWorker.addEventListener("message", e => {
      if (e.data?.type === "open") handleLink(new URL(e.data.url).hash);
      if (e.data?.type === "push" && S.me) { refresh("announcements"); refresh("posts"); }
    });
  }
  addEventListener("beforeinstallprompt", e => { e.preventDefault(); S.installEvt = e; });
  addEventListener("hashchange", () => handleLink(location.hash));
  addEventListener("focus", () => navigator.clearAppBadge?.().catch(() => {}));
  render();
  try { await afterLogin(); } catch { S.me = null; render(); }
})();
