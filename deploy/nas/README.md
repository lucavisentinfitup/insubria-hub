# Insubria Hub sul NAS

L'app gira in Docker sul NAS di casa (QNAP "Casacloud", 192.168.1.2) e si raggiunge da internet con Cloudflare Tunnel. I dati restano sul NAS e sul router non si apre nessuna porta.

| Servizio | Cosa fa |
|---|---|
| `app` | Server Node. Database e file caricati in `./data`. In rete locale risponde su `http://192.168.1.2:3210`. |
| `backup` | Ogni notte alle 3:30 copia database e file in `./backup/AAAA-MM-GG`, tenendo gli ultimi 30 giorni. |
| `tunnel` | Collega il NAS a Cloudflare e pubblica l'app in HTTPS sul tuo dominio. Parte solo con `--profile tunnel`. |

L'immagine `ghcr.io/lucavisentinfitup/insubria-hub` viene costruita da GitHub a ogni commit su `main`, per processori Intel/AMD e ARM. Sul NAS non si compila nulla.

## Preparare il QNAP (una volta)

1. **App Center**: installa **Container Station**, che fornisce Docker e Docker Compose.
2. **Pannello di controllo → Rete e servizi file → Telnet/SSH**: attiva **Consenti connessione SSH**.
3. Crea la cartella `/share/Container/insubria-hub` e copiaci `docker-compose.yml` e `.env.example`.

## Avvio in rete locale

```bash
cd /share/Container/insubria-hub
cp .env.example .env    # compila VAPID, Brevo, Anthropic; PUBLIC_URL=http://192.168.1.2:3210 per ora
docker compose up -d
docker compose ps
```

## Pubblicazione su internet

1. Su [one.dash.cloudflare.com](https://one.dash.cloudflare.com) apri **Networks → Tunnels → Create a tunnel → Cloudflared** e copia il token.
2. In **Public Hostname** aggiungi il sottodominio (per esempio `app.tuodominio.it`), servizio **HTTP**, URL `app:3000`.
3. Nel `.env` imposta `CLOUDFLARE_TUNNEL_TOKEN` e `PUBLIC_URL=https://app.tuodominio.it`, poi:

```bash
docker compose --profile tunnel up -d
```

## Aggiornare l'app

```bash
docker compose pull && docker compose --profile tunnel up -d
```

## Backup e ripristino

Un backup subito: `docker compose exec backup node tools/backup.mjs --now`

Ripristino:

```bash
docker compose stop app
cp backup/AAAA-MM-GG/insubria-hub.sqlite data/insubria-hub.sqlite
rm -f data/insubria-hub.sqlite-wal data/insubria-hub.sqlite-shm
cp -a backup/AAAA-MM-GG/uploads data/
docker compose start app
```

Per avere una copia anche fuori casa, aggiungi la cartella `backup` a **Hybrid Backup Sync** di QNAP.
