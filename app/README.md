# Insubria Hub

Web app installabile per studenti e personale dell'Università dell'Insubria: libretto, community moderata aperta a tutti gli atenei italiani, comunicazioni con notifiche push, materiali didattici, eventi e assistente AI.

## Avvio in locale

```bash
npm install
npm run dev          # http://localhost:3000
```

In sviluppo il codice di accesso compare a schermo e nel terminale, e le chiavi per le notifiche vengono generate da sole in `data/vapid.json`. Un indirizzo `@uninsubria.it` entra come personale, uno `@studenti.uninsubria.it` o personale come studente.

## Test

```bash
npm test                     # 18 controlli su permessi, moderazione, incognito, notifiche, GDPR
HEADFUL=1 node test/e2e-push.mjs   # notifica vera in Chrome: iscrizione, invio via FCM, consegna al service worker
```

## Notifiche

Lo standard è Web Push con chiavi VAPID: un solo invio raggiunge il centro notifiche di ogni sistema.

| Dispositivo | Requisito |
|---|---|
| Android | Chrome, Edge, Firefox o Samsung Internet. Funziona anche senza installare l'app. |
| iPhone e iPad | iOS/iPadOS 16.4 o successivo, app aggiunta alla schermata Home da Safari, notifiche attivate dal pulsante nell'app. |
| macOS | Safari 16+, Chrome, Edge o Firefox. Le notifiche arrivano nel Centro Notifiche. |
| Windows | Chrome, Edge o Firefox. Le notifiche arrivano nel Centro notifiche di Windows. |

Le comunicazioni urgenti arrivano sempre e restano a schermo finché non vengono aperte. Le altre categorie (avvisi, risposte del personale, risposte degli studenti, eventi, richieste e segnalazioni per lo staff) si attivano o disattivano per dispositivo.

## Messa online

Serve un dominio HTTPS (obbligatorio per service worker e notifiche), un server Node 22.13+ con disco persistente e le variabili di `.env.example`:

- `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY`: `npx web-push generate-vapid-keys`. Non cambiarle dopo il lancio, altrimenti tutte le iscrizioni alle notifiche vanno rifatte.
- SMTP per inviare i codici di accesso.
- `ANTHROPIC_API_KEY` per l'assistente.

`render.yaml` crea il servizio su Render con disco da 5 GB; il `Dockerfile` va bene per qualunque hosting con volumi.

## Struttura

- `server.js`: API, ruoli, moderazione, invio notifiche, assistente (Claude, streaming).
- `lib/db.js`: schema SQLite (`node:sqlite`, nessuna dipendenza nativa).
- `public/`: interfaccia (`app.js`, `styles.css`), service worker (`sw.js`), manifest e icone.
- `tools/make-icons.mjs`: rigenera le icone PNG.
