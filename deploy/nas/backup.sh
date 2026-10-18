#!/bin/sh
# Backup notturno di Insubria Hub: copia coerente del database (sqlite3 .backup funziona anche a server acceso)
# e dei file caricati. Tiene le copie degli ultimi 30 giorni.
set -e
d=/backup/$(date +%F)
mkdir -p "$d"
sqlite3 /data/insubria-hub.sqlite ".backup '$d/insubria-hub.sqlite'"
[ -d /data/uploads ] && cp -a /data/uploads "$d/"
find /backup -mindepth 1 -maxdepth 1 -type d -mtime +30 -exec rm -rf {} +
echo "backup completato in $d"
