// Test di integrazione: avvia il server su un database temporaneo e verifica i flussi principali.
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";

const PORT = 3900 + Math.floor(Math.random() * 90);
const BASE = `http://localhost:${PORT}`;
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "ih-test-"));
const srv = spawn(process.execPath, ["server.js"], { env: { ...process.env, NODE_ENV: "test", PORT: String(PORT), DATA_DIR: dataDir, ADMIN_EMAILS: "" }, stdio: ["ignore", "pipe", "pipe"] });
let log = "";
srv.stdout.on("data", d => (log += d)); srv.stderr.on("data", d => (log += d));
await new Promise((ok, ko) => { const t = setTimeout(() => ko(new Error("server non avviato:\n" + log)), 8000); srv.stdout.on("data", () => { if (log.includes("Insubria Hub su")) { clearTimeout(t); ok(); } }); });

const client = () => {
  let cookie = "";
  return async (p, { method = "GET", body, raw } = {}) => {
    const res = await fetch(BASE + p, { method, headers: { "x-ih": "1", ...(body ? { "Content-Type": "application/json" } : {}), ...(cookie ? { cookie } : {}) }, body: body ? JSON.stringify(body) : undefined });
    const sc = res.headers.get("set-cookie"); if (sc) cookie = sc.split(";")[0];
    const data = res.headers.get("content-type")?.includes("json") ? await res.json() : await res.text();
    if (raw) return { status: res.status, data };
    if (!res.ok) throw Object.assign(new Error(`${method} ${p} → ${res.status} ${JSON.stringify(data)}`), { status: res.status });
    return data;
  };
};
async function login(email, first) {
  const c = client();
  const { devCode } = await c("/api/auth/request", { method: "POST", body: { email } });
  await c("/api/auth/verify", { method: "POST", body: { email, code: devCode } });
  await c("/api/me/profile", { method: "PUT", body: { firstName: first, lastName: "Test", privacy: true, dep: "DISAT", uni: "Insubria (Varese-Como)" } });
  return c;
}
const step = async (name, fn) => { try { await fn(); console.log("✔", name); } catch (e) { console.error("✘", name, "\n ", e.message); process.exitCode = 1; } };
const fakeSub = n => ({ endpoint: `https://push.example.test/sub/${n}`, keys: { p256dh: "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM", auth: "tBHItJI5svbpez7KI4CCXg" } });

try {
  const anna = await login("anna.rossi@studenti.uninsubria.it", "Anna");
  const marco = await login("marco@gmail.com", "Marco");
  const prof = await login("giulia.bianchi@uninsubria.it", "Giulia");

  await step("i ruoli dipendono dal dominio email", async () => {
    assert.equal((await anna("/api/me")).user.role, "student");
    assert.equal((await marco("/api/me")).user.role, "student");
    assert.equal((await prof("/api/me")).user.role, "staff");
  });
  await step("le richieste senza intestazione x-ih vengono rifiutate (CSRF)", async () => {
    const r = await fetch(BASE + "/api/posts", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    assert.equal(r.status, 403);
  });
  await step("codice di accesso errato rifiutato", async () => {
    const c = client();
    await c("/api/auth/request", { method: "POST", body: { email: "x@y.it" } });
    const r = await c("/api/auth/verify", { method: "POST", body: { email: "x@y.it", code: "000000" }, raw: true });
    assert.equal(r.status, 400);
  });

  // dispositivi registrati alle notifiche
  await anna("/api/push/subscribe", { method: "POST", body: { subscription: fakeSub("anna") } });
  await marco("/api/push/subscribe", { method: "POST", body: { subscription: fakeSub("marco"), prefs: { announcements: false } } });
  await prof("/api/push/subscribe", { method: "POST", body: { subscription: fakeSub("prof") } });
  const pushes = async () => (await anna("/api/_test/pushes"));
  const annaId = (await anna("/api/me")).user.id, marcoId = (await marco("/api/me")).user.id, profId = (await prof("/api/me")).user.id;

  let post;
  await step("una domanda rivolta al personale notifica il personale", async () => {
    post = await anna("/api/posts", { method: "POST", body: { title: "Appunti di Analisi II?", body: "Qualcuno ha gli appunti del corso di quest'anno?", uni: "Insubria (Varese-Como)", area: "Matematica", toStaff: true } });
    const p = await pushes();
    assert.ok(p.some(x => x.userId === profId && x.payload.title.includes("richiesta")));
    assert.ok(!p.some(x => x.userId === annaId));
  });
  await step("uno studente non può eliminare la domanda di un altro", async () => {
    const r = await marco(`/api/posts/${post.id}`, { method: "DELETE", raw: true });
    assert.equal(r.status, 403);
  });
  await step("uno studente non può moderare né sospendere", async () => {
    assert.equal((await marco("/api/moderation/hide", { method: "POST", body: { targetType: "post", targetId: post.id }, raw: true })).status, 403);
    assert.equal((await marco("/api/moderation/ban", { method: "POST", body: { userId: annaId }, raw: true })).status, 403);
    assert.equal((await marco("/api/moderation/reports", { raw: true })).status, 403);
  });
  await step("uno studente non può scrivere risposte del personale né comunicazioni", async () => {
    assert.equal((await marco(`/api/posts/${post.id}/staff-answers`, { method: "POST", body: { body: "finta risposta" }, raw: true })).status, 403);
    assert.equal((await marco("/api/announcements", { method: "POST", body: { title: "Falso avviso" }, raw: true })).status, 403);
  });
  await step("risposta in incognito: lo studente non vede chi ha risposto, il personale sì, e l'autore riceve la notifica", async () => {
    await prof(`/api/posts/${post.id}/staff-answers`, { method: "POST", body: { body: "Le trovi su e-learning nella sezione del corso.", anon: true } });
    const seenByStudent = await marco(`/api/posts/${post.id}`);
    const a = seenByStudent.staffAnswers[0];
    assert.equal(a.anon, true);
    assert.equal(a.authorName, null);
    assert.ok(!JSON.stringify(seenByStudent).includes("Giulia"), "il nome del docente non deve comparire nella risposta inviata allo studente");
    const seenByStaff = await prof(`/api/posts/${post.id}`);
    assert.equal(seenByStaff.staffAnswers[0].authorName, "Giulia Test");
    assert.ok((await pushes()).some(x => x.userId === annaId && x.payload.title.includes("personale ha risposto")));
    const act = await prof("/api/staff/activity");
    assert.equal(act[0].action, "risposta_incognito");
  });
  await step("risposta di uno studente: notifica all'autore della domanda", async () => {
    await marco(`/api/posts/${post.id}/replies`, { method: "POST", body: { body: "Io li ho, ti scrivo in privato." } });
    assert.ok((await pushes()).some(x => x.userId === annaId && x.payload.title.includes("Nuova risposta")));
  });
  let bad;
  await step("segnalazione e moderazione: il contenuto nascosto sparisce per gli studenti", async () => {
    bad = await marco("/api/posts", { method: "POST", body: { title: "Vendo tesi già fatte", body: "Contattatemi per tesi pronte a pagamento.", uni: "Insubria (Varese-Como)", area: "Altro" } });
    await anna("/api/report", { method: "POST", body: { targetType: "post", targetId: bad.id, reason: "Spam o pubblicità" } });
    const reports = await prof("/api/moderation/reports");
    assert.equal(reports[0].targetId, bad.id);
    await prof("/api/moderation/hide", { method: "POST", body: { targetType: "post", targetId: bad.id, hidden: true } });
    assert.ok(!(await anna("/api/posts")).some(p => p.id === bad.id));
    assert.equal((await anna(`/api/posts/${bad.id}`, { raw: true })).status, 404);
    assert.ok((await prof("/api/posts")).some(p => p.id === bad.id && p.hidden));
    assert.equal((await prof("/api/moderation/reports")).length, 0);
  });
  await step("account sospeso: non può scrivere e i suoi contenuti spariscono", async () => {
    await prof("/api/moderation/ban", { method: "POST", body: { userId: marcoId, reason: "spam" } });
    assert.equal((await marco("/api/posts", { method: "POST", body: { title: "Ancora spam qui", body: "Contenuto di prova del test.", uni: "Bocconi", area: "Altro" }, raw: true })).status, 403);
    const detail = await anna(`/api/posts/${post.id}`);
    assert.equal(detail.replies.length, 0, "le risposte dell'utente sospeso non sono visibili");
    await prof(`/api/moderation/ban/${marcoId}`, { method: "DELETE" });
    assert.equal((await anna(`/api/posts/${post.id}`)).replies.length, 1);
  });
  await step("il personale non può sospendere un collega", async () => {
    assert.equal((await prof("/api/moderation/ban", { method: "POST", body: { userId: profId }, raw: true })).status, 400);
  });
  await step("comunicazione urgente: notifica a tutti, anche a chi ha disattivato gli avvisi", async () => {
    const before = (await pushes()).length;
    const r = await prof("/api/announcements", { method: "POST", body: { title: "Evacuazione edificio Monte Generoso", body: "Uscite dalle scale B.", level: "urgente", category: "Sicurezza ed emergenze", pinned: true } });
    const p = (await pushes()).slice(before);
    assert.equal(r.notified, 3);
    assert.ok(p.every(x => x.payload.level === "urgente" && x.payload.title.startsWith("URGENTE")));
    assert.ok(p.some(x => x.userId === marcoId), "l'urgente arriva anche a chi ha disattivato gli avvisi");
  });
  await step("comunicazione normale per dipartimento: rispetta preferenze e destinatari", async () => {
    await anna("/api/me/profile", { method: "PUT", body: { firstName: "Anna", lastName: "Test", privacy: true, dep: "DiECO" } });
    const before = (await pushes()).length;
    await prof("/api/announcements", { method: "POST", body: { title: "Cambio aula Fisica", level: "info", category: "Lezioni", audience: "DISAT" } });
    const p = (await pushes()).slice(before).map(x => x.userId);
    assert.ok(!p.includes(annaId), "Anna è di DiECO, non deve riceverla");
    assert.ok(!p.includes(marcoId), "Marco ha disattivato gli avvisi");
    assert.ok(p.includes(profId), "il personale riceve tutte le comunicazioni");
    assert.ok(!(await anna("/api/announcements")).some(a => a.title === "Cambio aula Fisica"));
  });
  await step("preferenze notifiche modificabili", async () => {
    const r = await anna("/api/push/prefs", { method: "PUT", body: { endpoint: fakeSub("anna").endpoint, prefs: { replies: false, events: true } } });
    assert.equal(r.prefs.replies, false); assert.equal(r.prefs.events, true); assert.equal(r.prefs.announcements, true);
  });
  await step("libretto salvato sul server", async () => {
    await anna("/api/me/libretto", { method: "PUT", body: { exams: [{ name: "Microeconomia", cfu: 9, grade: 28, status: "passed", date: "2026-02-10" }] } });
    assert.equal((await anna("/api/me")).libretto.exams[0].grade, 28);
  });
  await step("esportazione e cancellazione dei dati (GDPR)", async () => {
    const exp = await marco("/api/me/export");
    assert.equal(exp.account.email, "marco@gmail.com");
    await marco("/api/me", { method: "DELETE" });
    assert.equal((await marco("/api/me", { raw: true })).status, 401);
    assert.ok(!(await prof("/api/posts")).some(p => p.id === bad.id), "le domande dell'account eliminato spariscono");
  });
  await step("pagine statiche e manifest servite", async () => {
    for (const p of ["/", "/app.js", "/sw.js", "/manifest.webmanifest", "/icons/icon-192.png"]) assert.equal((await fetch(BASE + p)).status, 200, p);
    const csp = (await fetch(BASE + "/")).headers.get("content-security-policy");
    assert.ok(csp.includes("script-src 'self'"));
  });
} finally {
  srv.kill();
  fs.rmSync(dataDir, { recursive: true, force: true });
}
