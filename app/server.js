import express from "express";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import webpush from "web-push";
import multer from "multer";
import nodemailer from "nodemailer";
import Anthropic from "@anthropic-ai/sdk";
import { openDb } from "./lib/db.js";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const ENV = process.env;
const PROD = ENV.NODE_ENV === "production";
const TEST = ENV.NODE_ENV === "test";
const PORT = Number(ENV.PORT || 3000);
const DATA_DIR = path.resolve(ENV.DATA_DIR || path.join(ROOT, "data"));
const UPLOAD_DIR = path.join(DATA_DIR, "uploads");
const PUBLIC_URL = ENV.PUBLIC_URL || ENV.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;
const listEnv = k => (ENV[k] || "").split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
const ADMIN_EMAILS = listEnv("ADMIN_EMAILS");
const STAFF_EMAILS = listEnv("STAFF_EMAILS");
const STAFF_DOMAINS = listEnv("STAFF_DOMAINS").length ? listEnv("STAFF_DOMAINS") : ["uninsubria.it"];

const db = openDb(DATA_DIR);
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

/* ------------------------------------------------------------------ costanti di dominio */
const DEPARTMENTS = {
  DBSV: { name: "Biotecnologie e scienze della vita", city: "Varese" },
  DiDEC: { name: "Diritto, economia e culture", city: "Como" },
  DiECO: { name: "Economia", city: "Varese" },
  DMC: { name: "Medicina e chirurgia", city: "Varese" },
  DiMIT: { name: "Medicina e innovazione tecnologica", city: "Varese" },
  DISAT: { name: "Scienza e alta tecnologia", city: "Como" },
  DISTA: { name: "Scienze teoriche e applicate", city: "Varese" },
  DiSUIT: { name: "Scienze umane e dell'innovazione per il territorio", city: "Como" },
};
const CITIES = ["Varese", "Como", "Busto Arsizio"];
const LEVELS = ["urgente", "importante", "info"];
const ANN_CATS = ["Lezioni", "Esami e appelli", "Segreteria", "Servizi", "Sicurezza ed emergenze", "Eventi", "Altro"];
const MAT_KINDS = ["Slide", "Dispense", "Esercizi", "Esami passati", "Bibliografia", "Altro"];
const STAFF_ROLES = ["Docente", "Ricercatore/Ricercatrice", "Tutor", "Segreteria studenti", "Personale tecnico-amministrativo"];
const REPORT_REASONS = ["Offensivo", "Spam o pubblicità", "Contenuto copiato o vietato", "Dati personali", "Altro"];
const PUSH_DEFAULTS = { announcements: true, answers: true, replies: true, events: false, requests: true, moderation: true };
const SESSION_DAYS = 60;

/* ------------------------------------------------------------------ utility */
const now = () => Date.now();
const newId = () => crypto.randomBytes(12).toString("base64url");
const sha = s => crypto.createHash("sha256").update(s).digest("hex");
const todayISO = () => new Date().toISOString().slice(0, 10);
const json = s => { try { return JSON.parse(s); } catch { return {}; } };
class HttpError extends Error { constructor(status, message) { super(message); this.status = status; } }
const fail = (status, message) => { throw new HttpError(status, message); };
const str = (v, max, { required = false, label = "campo" } = {}) => {
  const s = typeof v === "string" ? v.trim() : "";
  if (required && !s) fail(400, `Manca il ${label}.`);
  if (s.length > max) fail(400, `Il ${label} supera i ${max} caratteri.`);
  return s;
};
const oneOf = (v, list, fallback) => (list.includes(v) ? v : fallback);
const httpsUrl = (v, label = "link") => {
  const s = str(v, 500, { label });
  if (s && !/^https:\/\/[^\s]+$/i.test(s)) fail(400, `Il ${label} deve iniziare con https://`);
  return s;
};
const isoDate = v => (/^\d{4}-\d{2}-\d{2}$/.test(v || "") ? v : "");
const all = (sql, ...p) => db.prepare(sql).all(...p);
const get = (sql, ...p) => db.prepare(sql).get(...p);
const run = (sql, ...p) => db.prepare(sql).run(...p);
const audit = (actor, action, target = "", detail = "") => run("INSERT INTO audit_log (actor_id, action, target, detail, created_at) VALUES (?,?,?,?,?)", actor, action, target, detail, now());

const displayName = u => (u?.first_name ? `${u.first_name} ${u.last_name ? u.last_name[0] + "." : ""}`.trim() : "Studente");
const staffLabel = u => { const p = json(u.profile); return (p.staffRole || "Personale universitario") + (p.staffDep ? " · " + p.staffDep : ""); };
const isStaff = u => u && (u.role === "staff" || u.role === "admin");
function roleFor(email) {
  if (ADMIN_EMAILS.includes(email)) return "admin";
  if (STAFF_EMAILS.includes(email)) return "staff";
  const domain = email.split("@")[1];
  return STAFF_DOMAINS.includes(domain) ? "staff" : "student";   // @studenti.uninsubria.it resta studente
}

/* ------------------------------------------------------------------ push (Web Push / VAPID) */
let vapid = { publicKey: ENV.VAPID_PUBLIC_KEY, privateKey: ENV.VAPID_PRIVATE_KEY };
if (!vapid.publicKey || !vapid.privateKey) {
  if (PROD) throw new Error("In produzione servono VAPID_PUBLIC_KEY e VAPID_PRIVATE_KEY (genera con: npx web-push generate-vapid-keys)");
  const f = path.join(DATA_DIR, "vapid.json");
  vapid = fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, "utf8")) : webpush.generateVAPIDKeys();
  fs.writeFileSync(f, JSON.stringify(vapid));
}
webpush.setVapidDetails(ENV.VAPID_SUBJECT || "mailto:info@example.com", vapid.publicKey, vapid.privateKey);
const dryRunPushes = [];   // solo NODE_ENV=test: le notifiche vengono registrate invece che inviate

/**
 * Invia una notifica ai dispositivi degli utenti che soddisfano `who(user)` e non hanno disattivato `pref`.
 * Le notifiche urgenti ignorano la preferenza: arrivano sempre.
 */
function notify(who, payload, pref) {
  const rows = all(`SELECT s.*, u.id AS uid, u.role, u.profile, u.banned_at FROM push_subs s JOIN users u ON u.id = s.user_id`);
  const urgent = payload.level === "urgente";
  const targets = rows.filter(r => {
    const prefs = { ...PUSH_DEFAULTS, ...json(r.prefs) };
    return (urgent || !pref || prefs[pref]) && who(r);
  });
  const body = JSON.stringify({ icon: "/icons/icon-192.png", badge: "/icons/badge-96.png", ...payload });
  const opts = { TTL: urgent ? 86400 : 43200, urgency: urgent ? "high" : "normal", ...(payload.tag ? { topic: payload.tag.slice(0, 32).replace(/[^A-Za-z0-9_-]/g, "") } : {}) };
  for (const t of targets) {
    if (TEST) { dryRunPushes.push({ userId: t.uid, payload: JSON.parse(body) }); continue; }
    webpush.sendNotification({ endpoint: t.endpoint, keys: { p256dh: t.p256dh, auth: t.auth } }, body, opts)
      .then(r => { run("UPDATE push_subs SET last_ok = ? WHERE endpoint = ?", now(), t.endpoint); if (!PROD) console.log(`[push] consegnata al servizio push (${r.statusCode}) per ${new URL(t.endpoint).host}`); })
      .catch(err => {
        if (err.statusCode === 404 || err.statusCode === 410) run("DELETE FROM push_subs WHERE endpoint = ?", t.endpoint);
        else console.warn("push non consegnata", err.statusCode || err.message);
      });
  }
  return targets.length;
}
function matchesAudience(userRow, audience) {
  if (!audience || audience === "tutti") return true;
  if (isStaff(userRow)) return true;
  const dep = json(userRow.profile).dep;
  return dep === audience || DEPARTMENTS[dep]?.city === audience;
}

/* ------------------------------------------------------------------ eventi in tempo reale (SSE) */
const streams = new Set();
function broadcast(resource) {
  const line = `event: change\ndata: ${JSON.stringify({ r: resource })}\n\n`;
  for (const res of streams) res.write(line);
}

/* ------------------------------------------------------------------ email */
const mailer = ENV.SMTP_HOST ? nodemailer.createTransport({
  host: ENV.SMTP_HOST, port: Number(ENV.SMTP_PORT || 587), secure: ENV.SMTP_SECURE === "true",
  auth: ENV.SMTP_USER ? { user: ENV.SMTP_USER, pass: ENV.SMTP_PASS } : undefined,
  // timeout brevi: senza, una porta SMTP bloccata (es. piano gratuito Render) lascia l'accesso appeso per 2 minuti
  connectionTimeout: 10e3, greetingTimeout: 10e3, socketTimeout: 20e3,
}) : null;
async function sendCode(email, code) {
  if (!mailer) {
    if (PROD) fail(503, "Invio email non configurato.");
    console.log(`[dev] codice di accesso per ${email}: ${code}`);
    return;
  }
  try {
    await mailer.sendMail({
      from: ENV.MAIL_FROM || ENV.SMTP_USER, to: email,
      subject: `${code} è il tuo codice per Insubria Hub`,
      text: `Il tuo codice di accesso è ${code}. Scade tra 10 minuti.\n\nSe non hai chiesto tu l'accesso, ignora questa email.`,
    });
  } catch (e) {
    console.error(`[email] invio a ${email} non riuscito: ${e.code || ""} ${e.message}`);
    fail(503, "Non riusciamo a inviare l'email con il codice in questo momento. Riprova più tardi.");
  }
}

/* ------------------------------------------------------------------ limiti di frequenza in memoria */
const buckets = new Map();
function limit(key, max, windowMs) {
  const t = now(), b = (buckets.get(key) || []).filter(x => t - x < windowMs);
  if (b.length >= max) fail(429, "Troppe richieste ravvicinate. Riprova tra qualche minuto.");
  b.push(t); buckets.set(key, b);
}

/* ------------------------------------------------------------------ app */
const app = express();
app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use((req, res, next) => {
  res.set({
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    "Content-Security-Policy": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
  });
  if (PROD) res.set("Strict-Transport-Security", "max-age=31536000");
  next();
});
app.use(express.json({ limit: "300kb" }));

// sessione
app.use((req, res, next) => {
  const m = /(?:^|;\s*)ih_session=([^;]+)/.exec(req.headers.cookie || "");
  if (m) {
    const s = get("SELECT * FROM sessions WHERE token_hash = ? AND expires_at > ?", sha(m[1]), now());
    if (s) req.user = get("SELECT * FROM users WHERE id = ?", s.user_id);
  }
  next();
});
// protezione CSRF: le richieste che modificano dati devono arrivare dal nostro frontend
app.use("/api", (req, res, next) => {
  if (!["GET", "HEAD", "OPTIONS"].includes(req.method) && req.get("x-ih") !== "1") return res.status(403).json({ error: "Richiesta non valida." });
  next();
});
const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const needUser = (req, res, next) => (req.user ? next() : res.status(401).json({ error: "Accedi per continuare." }));
const needStaff = (req, res, next) => (isStaff(req.user) ? next() : res.status(403).json({ error: "Riservato a docenti e personale." }));
const needActive = (req, res, next) => (req.user?.banned_at ? res.status(403).json({ error: "Il tuo account è sospeso dai moderatori: puoi leggere ma non scrivere." }) : next());

/* ---------- accesso con codice via email */
app.post("/api/auth/request", wrap(async (req, res) => {
  const email = str(req.body.email, 200, { required: true, label: "indirizzo email" }).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail(400, "Controlla l'email: manca la @ o il dominio.");
  limit("req:" + email, 5, 15 * 60e3);
  limit("ip:" + req.ip, 20, 15 * 60e3);
  const code = String(crypto.randomInt(0, 1e6)).padStart(6, "0");
  run("INSERT INTO login_codes (email, code_hash, expires_at, attempts) VALUES (?,?,?,0) ON CONFLICT(email) DO UPDATE SET code_hash = excluded.code_hash, expires_at = excluded.expires_at, attempts = 0", email, sha(code + email), now() + 10 * 60e3);
  await sendCode(email, code);
  res.json({ ok: true, ...(PROD ? {} : { devCode: code }) });
}));
app.post("/api/auth/verify", wrap(async (req, res) => {
  const email = str(req.body.email, 200, { required: true, label: "indirizzo email" }).toLowerCase();
  const code = str(req.body.code, 6, { required: true, label: "codice" });
  const row = get("SELECT * FROM login_codes WHERE email = ?", email);
  if (!row || row.expires_at < now()) fail(400, "Codice scaduto. Chiedine uno nuovo.");
  if (row.attempts >= 5) fail(429, "Troppi tentativi. Chiedi un nuovo codice.");
  if (!crypto.timingSafeEqual(Buffer.from(sha(code + email)), Buffer.from(row.code_hash))) {
    run("UPDATE login_codes SET attempts = attempts + 1 WHERE email = ?", email);
    fail(400, "Codice errato.");
  }
  run("DELETE FROM login_codes WHERE email = ?", email);
  let user = get("SELECT * FROM users WHERE email = ?", email);
  if (!user) {
    run("INSERT INTO users (id, email, role, created_at) VALUES (?,?,?,?)", newId(), email, roleFor(email), now());
    user = get("SELECT * FROM users WHERE email = ?", email);
  } else if (roleFor(email) !== "student" && user.role === "student") {
    run("UPDATE users SET role = ? WHERE id = ?", roleFor(email), user.id);
  }
  const token = crypto.randomBytes(32).toString("base64url");
  run("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?,?,?)", sha(token), user.id, now() + SESSION_DAYS * 864e5);
  res.cookie("ih_session", token, { httpOnly: true, secure: PROD, sameSite: "lax", maxAge: SESSION_DAYS * 864e5, path: "/" });
  res.json({ ok: true });
}));
app.post("/api/auth/logout", (req, res) => {
  const m = /(?:^|;\s*)ih_session=([^;]+)/.exec(req.headers.cookie || "");
  if (m) run("DELETE FROM sessions WHERE token_hash = ?", sha(m[1]));
  res.clearCookie("ih_session", { path: "/" });
  res.json({ ok: true });
});

/* ---------- profilo e libretto */
const meView = u => ({
  user: { id: u.id, email: u.email, role: u.role, banned: !!u.banned_at, firstName: u.first_name, lastName: u.last_name },
  profile: { ...json(u.profile), firstName: u.first_name, lastName: u.last_name, email: u.email, phone: u.phone },
  libretto: json(u.libretto),
});
app.get("/api/me", needUser, (req, res) => res.json(meView(req.user)));
app.put("/api/me/profile", needUser, wrap(async (req, res) => {
  const b = req.body;
  const firstName = str(b.firstName, 60, { required: true, label: "nome" });
  const lastName = str(b.lastName, 60, { required: true, label: "cognome" });
  const phone = str(b.phone, 20, { label: "cellulare" });
  if (phone && !/^\+?[\d\s]{8,16}$/.test(phone)) fail(400, "Il cellulare può contenere solo cifre, spazi e il prefisso +.");
  if (b.privacy !== true) fail(400, "Per usare l'app serve il consenso all'informativa privacy.");
  const profile = {
    uni: str(b.uni, 80), dep: str(b.dep, 20), course: str(b.course, 80),
    courseType: oneOf(b.courseType, ["triennale", "magistrale", "ciclo5", "ciclo6"], "triennale"),
    year: str(b.year, 4), privacy: true, privacyAt: json(req.user.profile).privacyAt || now(), improve: b.improve === true,
    ...(isStaff(req.user) ? { staffRole: oneOf(b.staffRole, STAFF_ROLES, ""), staffDep: oneOf(b.staffDep, [...Object.keys(DEPARTMENTS), "Amministrazione"], "") } : {}),
  };
  run("UPDATE users SET first_name = ?, last_name = ?, phone = ?, profile = ? WHERE id = ?", firstName, lastName, phone, JSON.stringify(profile), req.user.id);
  res.json(meView(get("SELECT * FROM users WHERE id = ?", req.user.id)));
}));
app.put("/api/me/libretto", needUser, wrap(async (req, res) => {
  const exams = Array.isArray(req.body.exams) ? req.body.exams.slice(0, 120) : fail(400, "Formato del libretto non valido.");
  const clean = exams.map(e => ({
    id: str(e.id, 40) || newId(), name: str(e.name, 120, { required: true, label: "nome dell'esame" }),
    cfu: Math.max(1, Math.min(30, Number(e.cfu) || 0)), date: isoDate(e.date), status: oneOf(e.status, ["passed", "planned"], "passed"),
    grade: Number.isInteger(e.grade) && e.grade >= 18 && e.grade <= 30 ? e.grade : null, lode: e.lode === true && e.grade === 30, idoneita: e.idoneita === true,
  }));
  run("UPDATE users SET libretto = ? WHERE id = ?", JSON.stringify({ exams: clean }), req.user.id);
  res.json({ exams: clean });
}));
// GDPR: esportazione e cancellazione dei propri dati
app.get("/api/me/export", needUser, (req, res) => {
  const u = req.user;
  res.set("Content-Disposition", 'attachment; filename="insubria-hub-dati.json"');
  res.json({
    account: { email: u.email, role: u.role, createdAt: u.created_at }, ...meView(u),
    posts: all("SELECT id, title, body, uni, area, subject, created_at FROM posts WHERE author_id = ?", u.id),
    replies: all("SELECT id, post_id, body, created_at FROM replies WHERE author_id = ?", u.id),
    devices: all("SELECT user_agent, created_at FROM push_subs WHERE user_id = ?", u.id),
  });
});
app.delete("/api/me", needUser, (req, res) => {
  run("DELETE FROM users WHERE id = ?", req.user.id);
  res.clearCookie("ih_session", { path: "/" });
  broadcast("posts");
  res.json({ ok: true });
});

/* ---------- community */
function postView(p, viewer, extra = {}) {
  const author = get("SELECT id, first_name, last_name, banned_at FROM users WHERE id = ?", p.author_id);
  const v = {
    id: p.id, title: p.title, body: p.body, uni: p.uni, area: p.area, subject: p.subject, toStaff: !!p.to_staff,
    createdAt: p.created_at, authorName: displayName(author), isMine: p.author_id === viewer.id,
    votes: get("SELECT COUNT(*) AS n FROM votes WHERE post_id = ?", p.id).n,
    myVote: !!get("SELECT 1 AS x FROM votes WHERE post_id = ? AND user_id = ?", p.id, viewer.id),
    staffAnswerCount: get("SELECT COUNT(*) AS n FROM staff_answers WHERE post_id = ?", p.id).n,
    replyCount: get(`SELECT COUNT(*) AS n FROM replies r JOIN users u ON u.id = r.author_id WHERE r.post_id = ? AND r.hidden = 0 AND u.banned_at IS NULL`, p.id).n,
    ...extra,
  };
  if (isStaff(viewer)) Object.assign(v, { hidden: !!p.hidden, authorId: p.author_id, authorBanned: !!author?.banned_at });
  return v;
}
const visiblePostsSql = viewer => (isStaff(viewer) ? "" : "AND p.hidden = 0 AND u.banned_at IS NULL");
app.get("/api/posts", needUser, (req, res) => {
  const rows = all(`SELECT p.* FROM posts p JOIN users u ON u.id = p.author_id WHERE 1=1 ${visiblePostsSql(req.user)} ORDER BY p.created_at DESC LIMIT 500`);
  res.json(rows.map(p => postView(p, req.user)));
});
app.post("/api/posts", needUser, needActive, wrap(async (req, res) => {
  limit("post:" + req.user.id, 10, 60 * 60e3);
  const title = str(req.body.title, 120, { required: true, label: "titolo" });
  const body = str(req.body.body, 3000, { required: true, label: "testo" });
  if (title.length < 6) fail(400, "Il titolo deve avere almeno 6 caratteri.");
  const id = newId();
  const toStaff = req.body.toStaff === true;
  run("INSERT INTO posts (id, author_id, title, body, uni, area, subject, to_staff, created_at) VALUES (?,?,?,?,?,?,?,?,?)",
    id, req.user.id, title, body, str(req.body.uni, 80, { required: true, label: "ateneo" }), str(req.body.area, 40, { required: true, label: "area" }), str(req.body.subject, 80), toStaff ? 1 : 0, now());
  broadcast("posts");
  if (toStaff) notify(u => isStaff(u) && u.uid !== req.user.id, { title: "Nuova richiesta per il personale", body: title, url: `/#post-${id}`, tag: "req-" + id }, "requests");
  res.status(201).json(postView(get("SELECT * FROM posts WHERE id = ?", id), req.user));
}));
function loadPost(id, viewer) {
  const p = get("SELECT p.*, u.banned_at FROM posts p JOIN users u ON u.id = p.author_id WHERE p.id = ?", id);
  if (!p || (!isStaff(viewer) && (p.hidden || p.banned_at))) fail(404, "Domanda non trovata o rimossa dai moderatori.");
  return p;
}
app.get("/api/posts/:id", needUser, (req, res) => {
  const p = loadPost(req.params.id, req.user);
  const staff = isStaff(req.user);
  const replies = all(`SELECT r.*, u.first_name, u.last_name, u.banned_at FROM replies r JOIN users u ON u.id = r.author_id WHERE r.post_id = ? ${staff ? "" : "AND r.hidden = 0 AND u.banned_at IS NULL"} ORDER BY r.created_at`, p.id)
    .map(r => ({ id: r.id, body: r.body, createdAt: r.created_at, authorName: displayName(r), isMine: r.author_id === req.user.id, ...(staff ? { hidden: !!r.hidden, authorId: r.author_id, authorBanned: !!r.banned_at } : {}) }));
  const answers = all("SELECT a.*, u.first_name, u.last_name FROM staff_answers a LEFT JOIN users u ON u.id = a.author_id WHERE a.post_id = ? ORDER BY a.created_at", p.id)
    .map(a => ({
      id: a.id, body: a.body, anon: !!a.anon, byLabel: a.by_label, createdAt: a.created_at,
      // in incognito il nome non lascia mai il server verso uno studente; il personale lo vede per trasparenza interna
      authorName: !a.anon || staff ? `${a.first_name || ""} ${a.last_name || ""}`.trim() || null : null,
      isMine: staff && a.author_id === req.user.id,
    }));
  res.json({ post: postView(p, req.user), replies, staffAnswers: answers });
});
app.delete("/api/posts/:id", needUser, (req, res) => {
  const p = get("SELECT * FROM posts WHERE id = ?", req.params.id) || fail(404, "Domanda non trovata.");
  if (p.author_id !== req.user.id) fail(403, "Puoi eliminare solo le tue domande. Il personale può nasconderle.");
  run("DELETE FROM posts WHERE id = ?", p.id);
  broadcast("posts");
  res.json({ ok: true });
});
app.post("/api/posts/:id/vote", needUser, needActive, (req, res) => {
  const p = loadPost(req.params.id, req.user);
  if (get("SELECT 1 AS x FROM votes WHERE post_id = ? AND user_id = ?", p.id, req.user.id)) run("DELETE FROM votes WHERE post_id = ? AND user_id = ?", p.id, req.user.id);
  else run("INSERT INTO votes (post_id, user_id) VALUES (?,?)", p.id, req.user.id);
  broadcast("posts");
  res.json(postView(p, req.user));
});
app.post("/api/posts/:id/replies", needUser, needActive, wrap(async (req, res) => {
  limit("reply:" + req.user.id, 30, 60 * 60e3);
  const p = loadPost(req.params.id, req.user);
  const body = str(req.body.body, 2000, { required: true, label: "testo della risposta" });
  const id = newId();
  run("INSERT INTO replies (id, post_id, author_id, body, created_at) VALUES (?,?,?,?,?)", id, p.id, req.user.id, body, now());
  broadcast("posts");
  if (p.author_id !== req.user.id) notify(u => u.uid === p.author_id, { title: "Nuova risposta alla tua domanda", body: `${displayName(req.user)}: ${body.slice(0, 120)}`, url: `/#post-${p.id}`, tag: "reply-" + p.id }, "replies");
  res.status(201).json({ id });
}));
app.delete("/api/replies/:id", needUser, (req, res) => {
  const r = get("SELECT * FROM replies WHERE id = ?", req.params.id) || fail(404, "Risposta non trovata.");
  if (r.author_id !== req.user.id) fail(403, "Puoi eliminare solo le tue risposte.");
  run("DELETE FROM replies WHERE id = ?", r.id);
  broadcast("posts");
  res.json({ ok: true });
});
app.post("/api/report", needUser, wrap(async (req, res) => {
  limit("report:" + req.user.id, 20, 60 * 60e3);
  const type = oneOf(req.body.targetType, ["post", "reply"], null) || fail(400, "Segnalazione non valida.");
  const table = type === "post" ? "posts" : "replies";
  const target = get(`SELECT * FROM ${table} WHERE id = ?`, str(req.body.targetId, 40)) || fail(404, "Contenuto non trovato.");
  if (target.author_id === req.user.id) fail(400, "Non puoi segnalare un tuo contenuto.");
  run("INSERT INTO reports (target_type, target_id, reporter_id, reason, created_at) VALUES (?,?,?,?,?) ON CONFLICT(target_type, target_id, reporter_id) DO UPDATE SET reason = excluded.reason, resolved = 0",
    type, target.id, req.user.id, oneOf(req.body.reason, REPORT_REASONS, "Altro"), now());
  const count = get("SELECT COUNT(*) AS n FROM reports WHERE target_type = ? AND target_id = ? AND resolved = 0", type, target.id).n;
  broadcast("reports");
  if (count === 3) notify(u => isStaff(u), { title: "Contenuto segnalato da 3 studenti", body: (target.title || target.body).slice(0, 120), url: "/#staff-moderazione", tag: "mod-" + target.id }, "moderation");
  res.json({ ok: true });
}));

/* ---------- personale: risposte in incognito e moderazione */
app.post("/api/posts/:id/staff-answers", needUser, needStaff, wrap(async (req, res) => {
  const p = loadPost(req.params.id, req.user);
  const body = str(req.body.body, 3000, { required: true, label: "testo della risposta" });
  const anon = req.body.anon !== false;
  const id = newId();
  run("INSERT INTO staff_answers (id, post_id, author_id, anon, by_label, body, created_at) VALUES (?,?,?,?,?,?,?)", id, p.id, req.user.id, anon ? 1 : 0, staffLabel(req.user), body, now());
  audit(req.user.id, anon ? "risposta_incognito" : "risposta_firmata", p.id, p.title);
  broadcast("posts"); broadcast("activity");
  notify(u => u.uid === p.author_id, { title: "Il personale ha risposto alla tua domanda", body: `${staffLabel(req.user)}: ${body.slice(0, 120)}`, url: `/#post-${p.id}`, tag: "answer-" + p.id }, "answers");
  res.status(201).json({ id });
}));
app.delete("/api/staff-answers/:id", needUser, needStaff, (req, res) => {
  const a = get("SELECT * FROM staff_answers WHERE id = ?", req.params.id) || fail(404, "Risposta non trovata.");
  run("DELETE FROM staff_answers WHERE id = ?", a.id);
  audit(req.user.id, "risposta_eliminata", a.post_id);
  broadcast("posts");
  res.json({ ok: true });
});
app.get("/api/moderation/reports", needUser, needStaff, (req, res) => {
  const groups = all(`SELECT target_type, target_id, COUNT(*) AS n, GROUP_CONCAT(DISTINCT reason) AS reasons, MAX(created_at) AS last FROM reports WHERE resolved = 0 GROUP BY target_type, target_id ORDER BY n DESC, last DESC`);
  res.json(groups.map(g => {
    const t = get(`SELECT x.*, u.first_name, u.last_name, u.banned_at FROM ${g.target_type === "post" ? "posts" : "replies"} x JOIN users u ON u.id = x.author_id WHERE x.id = ?`, g.target_id);
    if (!t) return null;
    return { targetType: g.target_type, targetId: g.target_id, count: g.n, reasons: (g.reasons || "").split(","), title: t.title || "", body: t.body, postId: t.post_id || t.id, hidden: !!t.hidden, authorId: t.author_id, authorName: displayName(t), authorBanned: !!t.banned_at, createdAt: t.created_at };
  }).filter(Boolean));
});
app.post("/api/moderation/hide", needUser, needStaff, (req, res) => {
  const type = oneOf(req.body.targetType, ["post", "reply"], null) || fail(400, "Contenuto non valido.");
  const hidden = req.body.hidden !== false;
  const r = run(`UPDATE ${type === "post" ? "posts" : "replies"} SET hidden = ? WHERE id = ?`, hidden ? 1 : 0, str(req.body.targetId, 40));
  if (!r.changes) fail(404, "Contenuto non trovato.");
  run("UPDATE reports SET resolved = 1 WHERE target_type = ? AND target_id = ?", type, req.body.targetId);
  audit(req.user.id, hidden ? "nascosto" : "ripristinato", `${type}:${req.body.targetId}`);
  broadcast("posts"); broadcast("reports"); broadcast("activity");
  res.json({ ok: true });
});
app.post("/api/moderation/review", needUser, needStaff, (req, res) => {
  run("UPDATE reports SET resolved = 1 WHERE target_type = ? AND target_id = ?", oneOf(req.body.targetType, ["post", "reply"], ""), str(req.body.targetId, 40));
  audit(req.user.id, "segnalazione_chiusa", `${req.body.targetType}:${req.body.targetId}`);
  broadcast("reports"); broadcast("activity");
  res.json({ ok: true });
});
app.post("/api/moderation/ban", needUser, needStaff, (req, res) => {
  const target = get("SELECT * FROM users WHERE id = ?", str(req.body.userId, 40)) || fail(404, "Utente non trovato.");
  if (isStaff(target)) fail(400, "Non puoi sospendere un membro del personale.");
  const reason = str(req.body.reason, 140, { label: "motivo" });
  run("UPDATE users SET banned_at = ?, ban_reason = ?, banned_by = ? WHERE id = ?", now(), reason, req.user.id, target.id);
  audit(req.user.id, "sospensione", target.id, reason);
  broadcast("posts"); broadcast("bans"); broadcast("activity");
  res.json({ ok: true });
});
app.delete("/api/moderation/ban/:userId", needUser, needStaff, (req, res) => {
  run("UPDATE users SET banned_at = NULL, ban_reason = NULL, banned_by = NULL WHERE id = ?", req.params.userId);
  audit(req.user.id, "riattivazione", req.params.userId);
  broadcast("posts"); broadcast("bans"); broadcast("activity");
  res.json({ ok: true });
});
app.get("/api/moderation/bans", needUser, needStaff, (req, res) => {
  res.json(all("SELECT id, first_name, last_name, ban_reason, banned_at FROM users WHERE banned_at IS NOT NULL ORDER BY banned_at DESC")
    .map(u => ({ userId: u.id, name: displayName(u), reason: u.ban_reason || "", createdAt: u.banned_at })));
});
app.get("/api/staff/activity", needUser, needStaff, (req, res) => {
  res.json(all("SELECT a.*, u.first_name, u.last_name FROM audit_log a LEFT JOIN users u ON u.id = a.actor_id ORDER BY a.id DESC LIMIT 40")
    .map(a => ({ action: a.action, target: a.target, detail: a.detail, actorName: `${a.first_name || ""} ${a.last_name || ""}`.trim() || "Un collega", createdAt: a.created_at })));
});

/* ---------- comunicazioni */
const annView = a => ({ id: a.id, title: a.title, body: a.body, level: a.level, category: a.category, audience: a.audience, expiresAt: a.expires_at, link: a.link, pinned: !!a.pinned, byLabel: a.by_label, createdAt: a.created_at });
app.get("/api/announcements", needUser, (req, res) => {
  const rows = all("SELECT * FROM announcements ORDER BY created_at DESC LIMIT 300");
  const t = todayISO();
  res.json(rows.filter(a => isStaff(req.user) || ((!a.expires_at || a.expires_at >= t) && matchesAudience(req.user, a.audience))).map(annView));
});
app.post("/api/announcements", needUser, needStaff, wrap(async (req, res) => {
  const b = req.body;
  const audienceOk = ["tutti", ...CITIES, ...Object.keys(DEPARTMENTS)];
  const a = {
    id: newId(), title: str(b.title, 120, { required: true, label: "titolo" }), body: str(b.body, 1500, { label: "testo" }),
    level: oneOf(b.level, LEVELS, "info"), category: oneOf(b.category, ANN_CATS, "Altro"), audience: oneOf(b.audience, audienceOk, "tutti"),
    expires_at: isoDate(b.expiresAt), link: httpsUrl(b.link), pinned: b.pinned === true ? 1 : 0,
  };
  run("INSERT INTO announcements (id, title, body, level, category, audience, expires_at, link, pinned, by_label, author_id, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
    a.id, a.title, a.body, a.level, a.category, a.audience, a.expires_at, a.link, a.pinned, staffLabel(req.user), req.user.id, now());
  audit(req.user.id, "comunicazione", a.id, `${a.level}: ${a.title}`);
  broadcast("announcements"); broadcast("activity");
  const sent = notify(u => !u.banned_at && matchesAudience(u, a.audience), {
    title: (a.level === "urgente" ? "URGENTE · " : a.level === "importante" ? "Importante · " : "") + a.title,
    body: a.body.slice(0, 180) || a.category, url: "/#home", tag: "ann-" + a.id, level: a.level,
  }, "announcements");
  res.status(201).json({ ...annView(get("SELECT * FROM announcements WHERE id = ?", a.id)), notified: sent });
}));
app.patch("/api/announcements/:id", needUser, needStaff, (req, res) => {
  const r = run("UPDATE announcements SET pinned = ? WHERE id = ?", req.body.pinned === true ? 1 : 0, req.params.id);
  if (!r.changes) fail(404, "Comunicazione non trovata.");
  broadcast("announcements");
  res.json({ ok: true });
});
app.delete("/api/announcements/:id", needUser, needStaff, (req, res) => {
  run("DELETE FROM announcements WHERE id = ?", req.params.id);
  audit(req.user.id, "comunicazione_eliminata", req.params.id);
  broadcast("announcements");
  res.json({ ok: true });
});

/* ---------- materiali */
const ALLOWED_MIME = {
  "application/pdf": "pdf", "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif",
  "video/mp4": "mp4", "video/webm": "webm", "text/plain": "txt", "text/markdown": "md", "text/csv": "csv",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/zip": "zip",
};
const upload = multer({
  storage: multer.diskStorage({ destination: UPLOAD_DIR, filename: (req, file, cb) => cb(null, newId()) }),
  limits: { fileSize: Number(ENV.MAX_UPLOAD_MB || 50) * 1048576, files: 1 },
  fileFilter: (req, file, cb) => (ALLOWED_MIME[file.mimetype] ? cb(null, true) : cb(new HttpError(400, "Formato non supportato. Usa PDF, Office, immagini, video, testo o ZIP."))),
});
const matView = m => ({ id: m.id, title: m.title, kind: m.kind, dep: m.dep, course: m.course, desc: m.descr, link: m.link, byLabel: m.by_label, createdAt: m.created_at, size: m.size, ext: m.file_name ? ALLOWED_MIME[m.mime] || "file" : "link", url: m.file_path ? `/api/materials/${m.id}/file` : m.link });
app.get("/api/materials", needUser, (req, res) => res.json(all("SELECT * FROM materials ORDER BY created_at DESC LIMIT 500").map(matView)));
app.post("/api/materials", needUser, needStaff, upload.single("file"), wrap(async (req, res) => {
  try {
    const b = req.body;
    const link = httpsUrl(b.link);
    if (!req.file && !link) fail(400, "Scegli un file oppure inserisci un link.");
    const id = newId();
    run("INSERT INTO materials (id, title, kind, dep, course, descr, file_name, file_path, mime, size, link, by_label, author_id, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
      id, str(b.title, 120, { required: true, label: "titolo" }), oneOf(b.kind, MAT_KINDS, "Altro"), oneOf(b.dep, Object.keys(DEPARTMENTS), "DISTA"),
      str(b.course, 80), str(b.desc, 200), req.file?.originalname.slice(0, 120) || null, req.file?.filename || null, req.file?.mimetype || null, req.file?.size || null,
      req.file ? "" : link, staffLabel(req.user), req.user.id, now());
    audit(req.user.id, "materiale", id, b.title);
    broadcast("materials");
    res.status(201).json(matView(get("SELECT * FROM materials WHERE id = ?", id)));
  } catch (e) { if (req.file) fs.rm(req.file.path, () => {}); throw e; }
}));
app.get("/api/materials/:id/file", needUser, (req, res) => {
  const m = get("SELECT * FROM materials WHERE id = ?", req.params.id);
  if (!m?.file_path) return res.status(404).json({ error: "File non trovato." });
  const inline = ["application/pdf", "image/png", "image/jpeg", "image/webp", "image/gif", "video/mp4", "video/webm"].includes(m.mime);
  res.set("Content-Type", m.mime);
  res.set("Content-Disposition", `${inline ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(m.file_name)}`);
  res.sendFile(path.join(UPLOAD_DIR, path.basename(m.file_path)));
});
app.delete("/api/materials/:id", needUser, needStaff, (req, res) => {
  const m = get("SELECT * FROM materials WHERE id = ?", req.params.id) || fail(404, "Materiale non trovato.");
  run("DELETE FROM materials WHERE id = ?", m.id);
  if (m.file_path) fs.rm(path.join(UPLOAD_DIR, path.basename(m.file_path)), () => {});
  audit(req.user.id, "materiale_eliminato", m.id, m.title);
  broadcast("materials");
  res.json({ ok: true });
});

/* ---------- FAQ verificate ed eventi */
app.get("/api/faq", needUser, (req, res) => res.json(all("SELECT * FROM faq ORDER BY created_at DESC").map(f => ({ id: f.id, q: f.q, a: f.a, link: f.link, byLabel: f.by_label, createdAt: f.created_at }))));
app.post("/api/faq", needUser, needStaff, (req, res) => {
  const id = newId();
  run("INSERT INTO faq (id, q, a, link, by_label, author_id, created_at) VALUES (?,?,?,?,?,?,?)", id, str(req.body.q, 200, { required: true, label: "domanda" }), str(req.body.a, 2000, { required: true, label: "risposta" }), httpsUrl(req.body.link), staffLabel(req.user), req.user.id, now());
  broadcast("faq");
  res.status(201).json({ id });
});
app.delete("/api/faq/:id", needUser, needStaff, (req, res) => { run("DELETE FROM faq WHERE id = ?", req.params.id); broadcast("faq"); res.json({ ok: true }); });

const eventView = e => ({ id: e.id, title: e.title, date: e.date, time: e.time, city: e.city, place: e.place, link: e.link, desc: e.descr, createdAt: e.created_at });
app.get("/api/events", needUser, (req, res) => res.json(all("SELECT * FROM events ORDER BY date").map(eventView)));
app.post("/api/events", needUser, needStaff, (req, res) => {
  const date = isoDate(req.body.date) || fail(400, "Serve una data valida.");
  const id = newId();
  const title = str(req.body.title, 100, { required: true, label: "titolo" });
  run("INSERT INTO events (id, title, date, time, city, place, link, descr, author_id, created_at) VALUES (?,?,?,?,?,?,?,?,?,?)",
    id, title, date, str(req.body.time, 5), oneOf(req.body.city, [...CITIES, "Online"], "Varese"), str(req.body.place, 80), httpsUrl(req.body.link), str(req.body.desc, 500), req.user.id, now());
  broadcast("events");
  notify(u => !u.banned_at, { title: "Nuovo evento: " + title, body: `${date.split("-").reverse().join("/")} · ${req.body.city || ""}`, url: "/#eventi", tag: "event-" + id }, "events");
  res.status(201).json({ id });
});
app.delete("/api/events/:id", needUser, needStaff, (req, res) => { run("DELETE FROM events WHERE id = ?", req.params.id); broadcast("events"); res.json({ ok: true }); });

/* ---------- notifiche push */
app.get("/api/push/key", (req, res) => res.json({ key: vapid.publicKey }));
app.post("/api/push/subscribe", needUser, (req, res) => {
  const s = req.body.subscription || {};
  const endpoint = str(s.endpoint, 1000, { required: true, label: "endpoint" });
  if (!/^https:\/\//.test(endpoint)) fail(400, "Iscrizione alle notifiche non valida.");
  const p256dh = str(s.keys?.p256dh, 200, { required: true, label: "chiave" }), auth = str(s.keys?.auth, 100, { required: true, label: "chiave" });
  const prefs = { ...PUSH_DEFAULTS, ...(req.body.prefs || {}) };
  run(`INSERT INTO push_subs (endpoint, user_id, p256dh, auth, prefs, user_agent, created_at) VALUES (?,?,?,?,?,?,?)
       ON CONFLICT(endpoint) DO UPDATE SET user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth, prefs = excluded.prefs`,
    endpoint, req.user.id, p256dh, auth, JSON.stringify(prefs), str(req.get("user-agent"), 300), now());
  res.json({ ok: true, prefs });
});
app.put("/api/push/prefs", needUser, (req, res) => {
  const endpoint = str(req.body.endpoint, 1000, { required: true, label: "endpoint" });
  const clean = Object.fromEntries(Object.keys(PUSH_DEFAULTS).map(k => [k, req.body.prefs?.[k] !== false && (req.body.prefs?.[k] === true || PUSH_DEFAULTS[k])]));
  run("UPDATE push_subs SET prefs = ? WHERE endpoint = ? AND user_id = ?", JSON.stringify(clean), endpoint, req.user.id);
  res.json({ ok: true, prefs: clean });
});
app.post("/api/push/status", needUser, (req, res) => {
  const row = get("SELECT prefs FROM push_subs WHERE endpoint = ? AND user_id = ?", str(req.body.endpoint, 1000), req.user.id);
  res.json({ subscribed: !!row, prefs: row ? { ...PUSH_DEFAULTS, ...json(row.prefs) } : PUSH_DEFAULTS });
});
app.delete("/api/push/subscribe", needUser, (req, res) => {
  run("DELETE FROM push_subs WHERE endpoint = ? AND user_id = ?", str(req.body.endpoint, 1000), req.user.id);
  res.json({ ok: true });
});
app.post("/api/push/test", needUser, (req, res) => {
  limit("pushtest:" + req.user.id, 5, 10 * 60e3);
  const n = notify(u => u.uid === req.user.id, { title: "Notifiche attive", body: "Riceverai qui comunicazioni urgenti e risposte alle tue domande.", url: "/#home", tag: "test" });
  res.json({ devices: n });
});
if (TEST) {
  app.get("/api/_test/pushes", (req, res) => res.json(dryRunPushes));
}

/* ---------- aggiornamenti in tempo reale */
app.get("/api/stream", needUser, (req, res) => {
  res.set({ "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive", "X-Accel-Buffering": "no" });
  res.flushHeaders();
  res.write("retry: 5000\n\n");
  streams.add(res);
  const ping = setInterval(() => res.write(": ping\n\n"), 25000);
  req.on("close", () => { clearInterval(ping); streams.delete(res); });
});

/* ---------- assistente AI */
const anthropic = new Anthropic();
const OFFICIAL_LINKS = `- Sito di ateneo: https://www.uninsubria.it
- Servizi web Esse3 (appelli, libretto, tasse, piano carriera): https://www.uninsubria.it/servizi/tutti-i-servizi/servizi-web-esse3
- InfoStudenti: https://www.uninsubria.it/servizi/tutti-i-servizi/infostudenti-servizio-informazioni-gli-studenti
- Piano di studio: https://www.uninsubria.it/formazione/consigli-e-risorse-utili/piano-di-studio
- Orientamento e placement: https://www.uninsubria.it/formazione/consigli-e-risorse-utili/orientamento-e-placement
- Programma Erasmus+: https://www.uninsubria.it/internazionale/mobilita-allestero/programma-erasmus
- Dipartimenti: https://www.uninsubria.it/ricerca/strutture-la-ricerca/dipartimenti
- E-learning: https://elearning.uninsubria.it/
- Mail studenti: https://email.uninsubria.it
- Biblioteca digitale SIBA: https://uninsubria.libguides.com/siba
- ESN Insubria (ESNcard, buddy, eventi per studenti internazionali; Via Sant'Abbondio 12, Como; insubria@esn.it): https://insubria.esn.it
- Eventi studenteschi: Instagram @insubria_eventi_team https://www.instagram.com/insubria_eventi_team/`;
function assistantSystem(u) {
  const p = json(u.profile);
  const exams = json(u.libretto).exams || [];
  const graded = exams.filter(e => e.status === "passed" && Number.isInteger(e.grade));
  const cfu = exams.filter(e => e.status === "passed").reduce((a, e) => a + e.cfu, 0);
  const gc = graded.reduce((a, e) => a + e.cfu, 0);
  const pond = gc ? graded.reduce((a, e) => a + e.grade * e.cfu, 0) / gc : 0;
  const faq = all("SELECT q, a, link FROM faq ORDER BY created_at DESC LIMIT 40");
  const t = todayISO();
  const anns = all("SELECT * FROM announcements ORDER BY created_at DESC LIMIT 50").filter(a => (!a.expires_at || a.expires_at >= t) && matchesAudience(u, a.audience)).slice(0, 10);
  return `Sei l'Assistente AI Insubria, dentro l'app degli studenti dell'Università degli Studi dell'Insubria (sedi a Varese, Como e Busto Arsizio). Rispondi in italiano, con tono amichevole e diretto, in poche frasi o un breve elenco puntato.

Il tuo compito è aiutare lo studente a trovare informazioni sul mondo universitario e guidarlo passo per passo verso la pagina ufficiale giusta. Non hai accesso a internet: non inventare date, scadenze, importi, nomi di docenti o regolamenti. Se servono dati precisi, indica dove trovarli. Se non sai, dillo e suggerisci InfoStudenti.

Fonti ufficiali che puoi citare (usa solo questi link e quelli delle risposte verificate):
${OFFICIAL_LINKS}

Dipartimenti: ${Object.entries(DEPARTMENTS).map(([id, d]) => `${d.name} (${id}, ${d.city})`).join("; ")}.

${faq.length ? `Risposte verificate dal personale dell'ateneo (hanno la priorità):\n${faq.map(f => `- D: ${f.q}\n  R: ${f.a}${f.link ? ` (${f.link})` : ""}`).join("\n")}\n\n` : ""}${anns.length ? `Comunicazioni attive per questo studente:\n${anns.map(a => `- [${a.level}] ${a.title}${a.body ? ": " + a.body.slice(0, 200) : ""}`).join("\n")}\n\n` : ""}Nell'app lo studente ha anche: Libretto (medie, CFU, base di laurea = media ponderata / 30 × 110, simulatore del prossimo voto), Community moderata con tutti gli atenei italiani, Materiali dei docenti, Eventi.

Studente: ${u.first_name || "non indicato"}, ${p.course || "corso non indicato"}${DEPARTMENTS[p.dep] ? `, dipartimento di ${DEPARTMENTS[p.dep].name} (${DEPARTMENTS[p.dep].city})` : ""}, anno ${p.year || "?"}. Libretto: ${cfu} CFU, media ponderata ${pond ? pond.toFixed(2) : "n.d."}.`;
}
app.post("/api/assistant", needUser, wrap(async (req, res) => {
  limit("ai:" + req.user.id, 40, 60 * 60e3);
  const raw = Array.isArray(req.body.messages) ? req.body.messages.slice(-12) : [];
  const messages = raw.filter(m => (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim()).map(m => ({ role: m.role, content: m.content.slice(0, 4000) }));
  while (messages.length && messages[0].role !== "user") messages.shift();
  if (!messages.length || messages[messages.length - 1].role !== "user") fail(400, "Scrivi una domanda.");
  res.set({ "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache", "X-Accel-Buffering": "no" });
  let wrote = false;
  try {
    const stream = anthropic.beta.messages.stream({
      model: ENV.CLAUDE_MODEL || "claude-opus-5-5",
      max_tokens: 4000,
      system: assistantSystem(req.user),
      messages,
      output_config: { effort: "low" },
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
    });
    req.on("close", () => stream.abort());
    for await (const ev of stream) {
      if (ev.type === "content_block_delta" && ev.delta.type === "text_delta") { res.write(ev.delta.text); wrote = true; }
    }
    const final = await stream.finalMessage();
    if (final.stop_reason === "refusal" && !wrote) res.write("Non posso rispondere a questa richiesta. Prova a riformularla o chiedi a InfoStudenti.");
    res.end();
  } catch (e) {
    if (e instanceof Anthropic.APIUserAbortError) return;
    console.error("assistente:", e.status || "", e.message);
    if (!wrote) res.status(e instanceof Anthropic.RateLimitError ? 429 : 503);
    res.end(wrote ? "\n\n(Risposta interrotta. Riprova.)" : "L'assistente non è disponibile in questo momento. Riprova tra poco.");
  }
}));

/* ---------- file statici e gestione errori */
app.use(express.static(path.join(ROOT, "public"), {
  setHeaders: (res, file) => { if (/sw\.js$|index\.html$|manifest/.test(file)) res.set("Cache-Control", "no-cache"); },
}));
app.use("/api", (req, res) => res.status(404).json({ error: "Risorsa non trovata." }));
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) return res.status(400).json({ error: err.code === "LIMIT_FILE_SIZE" ? `Il file supera i ${ENV.MAX_UPLOAD_MB || 50} MB.` : "Caricamento non valido." });
  if (err.type === "entity.too.large") return res.status(413).json({ error: "Contenuto troppo grande." });
  const status = err.status || 500;
  // i messaggi di HttpError sono scritti per l'utente; gli errori imprevisti restano nascosti
  const known = err instanceof HttpError;
  if (status >= 500 && !known) console.error(err);
  res.status(status).json({ error: status >= 500 && !known ? "Errore del server. Riprova." : err.message });
});

setInterval(() => { run("DELETE FROM sessions WHERE expires_at < ?", now()); run("DELETE FROM login_codes WHERE expires_at < ?", now()); }, 3600e3).unref();

export const server = app.listen(PORT, () => console.log(`Insubria Hub su ${PUBLIC_URL} (dati in ${DATA_DIR})`));
