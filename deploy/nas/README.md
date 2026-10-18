# Insubria Hub sul NAS

L'app gira in Docker sul NAS di casa e si raggiunge da internet con Cloudflare Tunnel. I dati restano sul NAS e sul router non si apre nessuna porta.

| Servizio | Cosa fa |
|---|---|
| `app` | Server Node. Database e file caricati in `./data`. |
| `tunnel` | Collega il NAS a Cloudflare e pubblica l'app in HTTPS sul tuo dominio. |
| `backup` | Ogni notte alle 3:30 copia database e file in `./backup/AAAA-MM-GG`, tenendo gli ultimi 30 giorni. |

## Cosa serve

- Un NAS con Docker e Docker Compose (Synology con Container Manager, QNAP con Container Station, Unraid, TrueNAS o un mini PC Linux).
- Un dominio gestito su Cloudflare (il piano gratuito basta).

## 1. Tunnel Cloudflare

1. Su [one.dash.cloudflare.com](https://one.dash.cloudflare.com) apri **Networks → Tunnels → Create a tunnel**, scegli **Cloudflared** e dagli un nome (per esempio `insubria-hub`).
2. Copia il **token** che compare nel comando di installazione (la lunga stringa dopo `--token`).
3. In **Public Hostname** aggiungi il sottodominio (per esempio `app.tuodominio.it`). Come servizio scegli **HTTP** e come URL `app:3000`.

## 2. File sul NAS

Copia sul NAS l'intero repository (serve la cartella `app` per costruire l'immagine), poi entra in `deploy/nas`:

```bash
cp .env.example .env
```

Compila `.env`:
- `PUBLIC_URL`: lo stesso indirizzo del tunnel.
- `CLOUDFLARE_TUNNEL_TOKEN`: il token del passo 1.
- Le chiavi VAPID, Brevo e Anthropic: gli stessi valori impostati su Render.

## 3. Avvio

```bash
docker compose up -d --build
docker compose ps
```

Su Synology puoi fare la stessa cosa da **Container Manager → Progetto → Crea**, indicando la cartella `deploy/nas`.

## Aggiornare l'app

```bash
git pull
docker compose up -d --build app
```

## Ripristinare un backup

```bash
docker compose stop app
cp backup/AAAA-MM-GG/insubria-hub.sqlite data/insubria-hub.sqlite
rm -f data/insubria-hub.sqlite-wal data/insubria-hub.sqlite-shm
cp -a backup/AAAA-MM-GG/uploads data/
docker compose start app
```

Per avere una copia anche fuori casa, aggiungi la cartella `backup` a Hyper Backup (Synology) o a un'altra sincronizzazione verso il cloud.
