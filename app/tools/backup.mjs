// Backup di Insubria Hub: copia coerente del database (API di backup di SQLite, sicura a server acceso)
// e dei file caricati in BACKUP_DIR/AAAA-MM-GG. Conserva le copie degli ultimi BACKUP_KEEP_DAYS giorni.
// Uso: node tools/backup.mjs         → resta attivo e fa un backup ogni giorno alle BACKUP_AT (ora locale, TZ)
//      node tools/backup.mjs --now   → un backup subito, poi esce
import { DatabaseSync, backup } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";

const DATA_DIR = path.resolve(process.env.DATA_DIR || "data");
const BACKUP_DIR = path.resolve(process.env.BACKUP_DIR || "backup");
const KEEP_DAYS = Number(process.env.BACKUP_KEEP_DAYS || 30);
const [HH, MM] = (process.env.BACKUP_AT || "03:30").split(":").map(Number);

const day = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

async function runBackup() {
  const src = path.join(DATA_DIR, "insubria-hub.sqlite");
  if (!fs.existsSync(src)) { console.log(`[backup] nessun database in ${src}, salto`); return; }
  const dest = path.join(BACKUP_DIR, day(new Date()));
  fs.mkdirSync(dest, { recursive: true });
  const db = new DatabaseSync(src);
  try { await backup(db, path.join(dest, "insubria-hub.sqlite")); } finally { db.close(); }
  const uploads = path.join(DATA_DIR, "uploads");
  if (fs.existsSync(uploads)) fs.cpSync(uploads, path.join(dest, "uploads"), { recursive: true });
  const limit = Date.now() - KEEP_DAYS * 864e5;
  for (const name of fs.readdirSync(BACKUP_DIR)) {
    const p = path.join(BACKUP_DIR, name);
    if (/^\d{4}-\d{2}-\d{2}$/.test(name) && fs.statSync(p).mtimeMs < limit) fs.rmSync(p, { recursive: true, force: true });
  }
  console.log(`[backup] completato in ${dest}`);
}

function msToNext() {
  const now = new Date(), next = new Date(now);
  next.setHours(HH, MM, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);
  return next - now;
}
function schedule() {
  setTimeout(async () => {
    try { await runBackup(); } catch (e) { console.error("[backup] non riuscito:", e.message); }
    schedule();
  }, msToNext());
}

if (process.argv.includes("--now")) await runBackup();
else {
  console.log(`[backup] attivo: ogni giorno alle ${String(HH).padStart(2, "0")}:${String(MM).padStart(2, "0")}, copie in ${BACKUP_DIR}, conservate ${KEEP_DAYS} giorni`);
  schedule();
}
