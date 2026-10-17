// Prova end-to-end con Chrome reale: uno studente attiva le notifiche, il personale pubblica un avviso urgente,
// la notifica passa dal servizio push del browser e arriva al service worker.
// Uso: node test/e2e-push.mjs   (richiede Google Chrome installato; CHROME_PATH per un percorso diverso)
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const CHROME = process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = 4100 + Math.floor(Math.random() * 50), DBG = 9300 + Math.floor(Math.random() * 50);
const BASE = `http://localhost:${PORT}`;
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ih-e2e-"));
const shotDir = process.env.SHOT_DIR || tmp;
const sleep = ms => new Promise(r => setTimeout(r, ms));

const srv = spawn(process.execPath, ["server.js"], { env: { ...process.env, NODE_ENV: "development", PORT: String(PORT), DATA_DIR: path.join(tmp, "data") }, stdio: ["ignore", "pipe", "pipe"] });
let log = ""; srv.stdout.on("data", d => (log += d)); srv.stderr.on("data", d => (log += d));
while (!log.includes("Insubria Hub su")) await sleep(100);

async function session(email, first) {
  let cookie = "";
  const call = async (p, body, method = "POST") => {
    const r = await fetch(BASE + p, { method, headers: { "x-ih": "1", "Content-Type": "application/json", ...(cookie ? { cookie } : {}) }, body: JSON.stringify(body) });
    const sc = r.headers.get("set-cookie"); if (sc) cookie = sc.split(";")[0];
    return r.json();
  };
  const { devCode } = await call("/api/auth/request", { email });
  await call("/api/auth/verify", { email, code: devCode });
  await call("/api/me/profile", { firstName: first, lastName: "Prova", privacy: true, dep: "DISAT", uni: "Insubria (Varese-Como)" }, "PUT");
  return { cookie, call };
}
const student = await session("sara.verdi@studenti.uninsubria.it", "Sara");
const staff = await session("docente.prova@uninsubria.it", "Paolo");
await staff.call("/api/me/profile", { firstName: "Paolo", lastName: "Prova", privacy: true, staffRole: "Docente", staffDep: "DISAT" }, "PUT");

const chrome = spawn(CHROME, [...(process.env.HEADFUL ? ["--window-position=-2400,0", "--window-size=420,900"] : ["--headless=new"]), `--remote-debugging-port=${DBG}`, `--user-data-dir=${path.join(tmp, "chrome")}`, "--no-first-run", "--no-default-browser-check", "about:blank"], { stdio: "ignore" });
let wsUrl;
for (let i = 0; i < 50 && !wsUrl; i++) { try { wsUrl = (await (await fetch(`http://127.0.0.1:${DBG}/json/version`)).json()).webSocketDebuggerUrl; } catch { await sleep(200); } }
const ws = new WebSocket(wsUrl);
await new Promise(r => ws.addEventListener("open", r, { once: true }));
let seq = 0; const pending = new Map();
ws.addEventListener("message", e => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } });
const cdp = (method, params = {}, sessionId) => new Promise(r => { const id = ++seq; pending.set(id, r); ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) })); });
const evaluate = async (sid, expression) => (await cdp("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true }, sid)).result?.result?.value;

const result = { ok: false };
try {
  await cdp("Browser.grantPermissions", { origin: BASE, permissions: ["notifications"] });
  const { result: { targetId } } = await cdp("Target.createTarget", { url: "about:blank" });
  const { result: { sessionId: sid } } = await cdp("Target.attachToTarget", { targetId, flatten: true });
  await cdp("Network.enable", {}, sid);
  await cdp("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 2, mobile: true }, sid);
  const [name, value] = student.cookie.split("=");
  await cdp("Network.setCookie", { name, value, domain: "localhost", path: "/", httpOnly: true }, sid);
  await cdp("Page.navigate", { url: BASE + "/" }, sid);
  await sleep(3500);
  // il permesso è già concesso dal test, quindi si attiva dal profilo come farebbe chi ha già detto sì al browser
  await evaluate(sid, `document.querySelector('#avatar-btn').click(), true`);
  await sleep(500);
  result.buttonInProfile = await evaluate(sid, `!!document.querySelector('.sheet [data-act="push-on"]')`);
  await evaluate(sid, `document.querySelector('.sheet [data-act="push-on"]')?.click(), true`);
  for (let i = 0; i < 30 && !result.endpoint; i++) { await sleep(500); result.endpoint = await evaluate(sid, `navigator.serviceWorker.ready.then(r => r.pushManager.getSubscription()).then(s => s && s.endpoint)`); }
  const shot1 = await cdp("Page.captureScreenshot", { format: "png" }, sid);
  fs.writeFileSync(path.join(shotDir, "e2e-home-studente.png"), Buffer.from(shot1.result.data, "base64"));
  if (!result.endpoint) throw new Error("iscrizione push non riuscita");
  await evaluate(sid, `window.__pushes = []; navigator.serviceWorker.addEventListener("message", e => { if (e.data?.type === "push") window.__pushes.push(e.data.title); }); true`);
  await sleep(800);
  const ann = await staff.call("/api/announcements", { title: "Aula 3 chiusa per guasto", body: "La lezione di oggi si sposta in Aula Magna.", level: "urgente", category: "Lezioni", pinned: true });
  result.notified = ann.notified;
  for (let i = 0; i < 80 && !result.received?.length; i++) { await sleep(500); result.received = await evaluate(sid, `navigator.serviceWorker.ready.then(r => r.getNotifications()).then(n => n.map(x => ({ title: x.title, body: x.body, requireInteraction: x.requireInteraction })))`); }
  await evaluate(sid, `document.querySelector('[data-act="close"]')?.click(), true`);
  await sleep(1500);
  const shot2 = await cdp("Page.captureScreenshot", { format: "png" }, sid);
  fs.writeFileSync(path.join(shotDir, "e2e-avviso-in-cima.png"), Buffer.from(shot2.result.data, "base64"));
  result.swReceived = await evaluate(sid, `window.__pushes`);
  result.ok = !!result.received?.some(n => n.title.includes("Aula 3 chiusa"));
} catch (e) { result.error = e.message; }
finally {
  console.log(JSON.stringify({ ...result, endpoint: result.endpoint ? new URL(result.endpoint).host : null, screenshots: shotDir }, null, 2));
  ws.close(); chrome.kill(); srv.kill();
  if (!result.ok) { console.error(log.slice(-2000)); process.exitCode = 1; }
}
