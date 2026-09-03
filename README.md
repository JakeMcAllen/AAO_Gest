# Gestionale venditori — Allena Arredamenti

Applicazione con cui un negozio gestisce la propria presenza sul marketplace:
apre l'attività, aggancia i prodotti al **catalogo condiviso**, decide
disponibilità, fotografie, caratteristiche, listino e servizi, e controlla chi
può riutilizzare i suoi contenuti.

React 19 + **Material UI 6**, Vite. Stessa identità visiva del sito pubblico
(rosso/bianco, editoriale, angoli netti) tradotta nei token MUI in
[`src/theme.js`](src/theme.js).

```bash
cd Gestionale
npm install
npm run dev        # http://localhost:5174
```

Senza `.env` parte in **modalità demo**: dataset di esempio (4 negozi, 10
prodotti, 13 proposte di vendita, permessi e segnalazioni) salvato in
localStorage, con le stesse regole di dominio della versione cloud. Per puntare
ad AWS, copia `.env.example` in `.env` e imposta `VITE_DATA_MODE=cloud` con
`VITE_API_BASE_URL`.

## L'idea portante: catalogo condiviso, offerte separate

Un prodotto (es. *Moroso — Divano Tulip 3 posti*) esiste **una sola volta** sulla
piattaforma. Il primo negozio che lo inserisce ne crea la scheda; tutti gli altri
non lo ricreano, ci agganciano una **proposta di vendita** con le proprie
condizioni. Il compratore vede una scheda sola con N venditori e sceglie in base
a zona, prezzo e servizi.

```
CatalogProduct ──1:N── Listing         una per negozio: prezzi, stock, servizi
       │
       └────────1:N── ProductImage     di proprietà del negozio che l'ha caricata
                            │
                   Listing ─N:N─┘      per riferimento, con ruolo copertina/galleria
```

I duplicati sono impediti da una **chiave di catalogo** (`marchio + nome`
normalizzati). In demo il controllo è nell'adapter; in cloud è una
`TransactWriteItems` con un item guardia `KEY#<catalogKey>` e
`attribute_not_exists`, quindi regge anche due inserimenti in parallelo.
Mentre si compila la scheda nuova il gestionale cerca in tempo reale duplicati
esatti (bloccanti) e simili (avviso), offrendo il collegamento alla scheda già
presente.

## Cosa si può fare

**Negozio** — `/negozio`, wizard di apertura in `/benvenuto`
Nome, slogan, descrizione, contatti, sede e **aree di operatività**: città
singole o regioni intere, combinabili. Le aree decidono a quale compratore il
negozio viene proposto; il riepilogo mostra quante città vengono effettivamente
raggiunte.

Sotto le aree, due riquadri che il sito pubblico legge al momento dell'acquisto:

- **Trasporto, montaggio e altri servizi** — trasporto, montaggio, consegna al
  piano, rilievo misure, ritiro dell'usato, garanzia estesa. Ognuno con modalità
  di prezzo (fisso, %, a unità, su preventivo, incluso), importo e nota. Il
  riquadro chiude con la riga che il compratore leggerà accanto al nome del
  negozio.
- **Quando consegni** — giorni della settimana, preavviso, consegne al giorno,
  orizzonte di prenotazione e chiusure per ferie. Chiude con la prima data che
  verrebbe proposta a chi ordina oggi. Togliere tutti i giorni significa
  *chiuso*, e viene rispettato: il compratore non vedrà date.

La città posiziona il negozio sulla mappa dei venditori del sito pubblico, senza
che nessuno debba inserire coordinate.

**Ordini ricevuti** — `/ordini`
Gli acquisti pagati sul marketplace che riguardano questo negozio: una consegna
per ordine, con le sole righe di sua competenza. Ordinati **per data di
consegna** anziché per data d'ordine, perché la domanda operativa è «cosa carico
sul furgone, e quando». Schede *Da confermare* / *In consegna* / *Tutti*,
ricerca per ordine, cliente, città o mobile, e quattro contatori in testa. Il
badge in navigazione conta gli ordini che aspettano una risposta.

Ogni consegna mostra i pulsanti giusti per il suo stato: *Accetta*, *Riprogramma*
o *Rifiuta* quando è ancora da confermare; *Segna come consegnata* dopo
l'accettazione; un semplice avviso «in attesa che il cliente risponda» dopo aver
riproposto una data — nessuna azione doppia. *Riprogramma* propone solo date che
il calendario del negozio accetta davvero, con i giorni di consegna mostrati
come promemoria; *Rifiuta* richiede sempre un motivo, perché è quello che il
cliente legge in chat. Ogni cambio di stato scrive da solo un messaggio di
servizio nella conversazione con il cliente (vedi *Chat*, sotto) — non serve
avvisarlo a parte.

**Chat** — un pulsante su ogni consegna
Una conversazione per consegna, condivisa con il cliente sul sito pubblico:
messaggi scritti a mano più i messaggi di servizio automatici (nuovo ordine,
accettata, rifiutata con il motivo, data riproposta, risposta del cliente,
consegnata). Le due parti leggono la stessa cronologia. Aprire la conversazione
azzera i propri non letti.

**Prodotti** — `/prodotti`, editor in `/prodotti/:id`
Sei schede, con salvataggio automatico e una checklist di pubblicazione:

| Scheda | Contenuto |
|---|---|
| Disponibilità | **pezzi in magazzino** (con soglia di riordino) oppure **rivenditore autorizzato** (disponibilità illimitata per un periodo, con avviso di scadenza) |
| Fotografie | proprie, generiche del catalogo, concesse su permesso; ruolo **copertina** (versione leggera per la card) o **galleria** (pagina prodotto), ordinamento |
| Caratteristiche | materiali e finiture con sovrapprezzo; personalizzazioni (scelta, misura, testo, sì/no) con supplemento |
| Listino | modello preimpostato o **da zero** con colonne proprie; importazione della struttura da un altro listino |
| Servizi | montaggio, consegna al piano, rilievo e progettazione, ritiro dell'usato, garanzia estesa |
| Pubblicazione | requisiti mancanti e anteprima della card pubblica |

**Fotografie e diritti**
Ogni foto resta del negozio che l'ha caricata. Marcandola *generica* la mette a
disposizione di tutti i venditori di quel prodotto; altrimenti resta privata e
gli altri vedono un lucchetto con «Chiedi il permesso». Da ogni file si ricavano
due derivate: `cover` (max 640 px, qualità 55%) per le card e `full` (max
1600 px, qualità 85%) per la pagina prodotto.

**Permessi** — `/permessi`
Richieste ricevute e inviate, con ambiti separati (fotografie, descrizioni,
struttura del listino, configurazione servizi), nota di risposta e scadenza
facoltativa. Il permesso è sempre esplicito e revocabile: senza concessione
attiva il contenuto non è utilizzabile, e la revoca ha effetto immediato.

**Segnalazioni** — `/segnalazioni`
Da catalogo, pagina prodotto o singola foto si segnala un contenuto altrui con
motivo e **commento obbligatorio** (min. 20 caratteri). Le segnalazioni vivono
in una tabella dedicata e si consultano divise fra *inviate* e *ricevute*, con
filtro di stato (aperta, in esame, risolta, respinta) e nota di esito.

## Struttura

```
Gestionale/
├── src/
│   ├── domain.js            modello, enum e regole di dominio condivise
│   ├── theme.js             tema MUI
│   ├── api/
│   │   ├── client.js        sceglie l'adapter in base a VITE_DATA_MODE
│   │   ├── media.js         ridimensionamento immagini lato client
│   │   ├── local/           adapter demo (localStorage + IndexedDB)
│   │   └── http/            adapter cloud (API Gateway)
│   ├── components/          editor riusabili + primitive di interfaccia
│   ├── data/                regioni/città italiane, dataset demo
│   ├── pages/               una pagina per rotta
│   └── state/               sessione, notifiche, hook di caricamento
├── lambda/                  handler delle 5 nuove rotte
└── infra/gestionale.tf      tabelle, bucket, Lambda e rotte aggiuntive
```

I due adapter espongono la **stessa superficie**: le pagine non sanno se stanno
leggendo da localStorage o da DynamoDB, e le regole di dominio (unicità,
permessi, proprietà dei contenuti) sono applicate in entrambi.

## Persistenza su AWS

`infra/gestionale.tf` è **additivo** rispetto alla configurazione esistente in
`Terraform/`: riusa `local.prefix`, il ruolo IAM delle Lambda e l'HTTP API già
definiti, senza modificarli.

| Tabella | Chiave | Indici |
|---|---|---|
| `catalog-products` | `id` | `catalogKey-index`, `category-index` |
| `product-images` | `imageId` | `imageProductId-index`, `ownerStoreId-index` |
| `listings` | `storeId` + `productId` | `productId-index` |
| `content-permissions` | `id` | `ownerStoreId-index`, `requesterStoreId-index` |
| `content-reports` | `id` | `targetOwnerStoreId-index`, `reporterStoreId-index`, `reportStatus-index` |

Bucket `allena-dev-media-<account_id>` per le fotografie, accesso pubblico
bloccato: il browser carica le derivate con una **PUT prefirmata** e le rilegge
con URL GET firmate a scadenza.

```
products/<productId>/<imageId>/full.webp
products/<productId>/<imageId>/cover.webp
```

Rotte aggiunte all'API: `/catalog`, `/media`, `/listings`, `/permissions`,
`/reports`.

### Deploy

```bash
cd Gestionale/lambda/media && npm install --omit=dev
cd ../listings && npm install --omit=dev
cp ../../infra/gestionale.tf ../../../Terraform/
cd ../../../Terraform && terraform init && terraform apply
```

> Il runtime `nodejs20.x` include i client dell'AWS SDK v3 ma **non**
> `@aws-sdk/s3-request-presigner`: le due Lambda che firmano URL hanno un
> `package.json` proprio e vanno installate prima di `terraform apply`, perché
> `archive_file` comprime la cartella così com'è. Le altre tre non hanno
> dipendenze.

## Scelte di usabilità

- **Il percorso corretto è quello più comodo.** «Aggiungi prodotto» apre prima
  la ricerca nel catalogo condiviso e solo dopo la creazione di una scheda nuova:
  agganciarsi a una scheda esistente costa un clic, crearne una duplicata è
  impossibile.
- **Niente pulsante Salva nell'editor.** Le modifiche si scrivono da sole dopo
  800 ms, con indicatore di stato; se si chiude la pagina con scritture in volo
  il browser avvisa.
- **Le azioni distruttive si annullano invece di essere confermate.** Togliere un
  prodotto dal negozio mostra un «Annulla» per otto secondi; il dialogo di
  conferma resta solo dove il ripristino non è possibile.
- **Le conseguenze sono scritte dove si decide.** Ogni editor chiude con la frase
  che il compratore leggerà: la disponibilità, il «da 3.200 €», l'anteprima della
  card prima di pubblicare.
- **Tre stati sempre espliciti** — caricamento, errore con «Riprova», vuoto con
  l'azione che lo risolve — resi da un unico componente (`AsyncBlock`).
- La panoramica raccoglie in un solo elenco *tutto ciò che blocca una vendita*:
  accordi di rivendita in scadenza, scorte sotto soglia, permessi da valutare,
  segnalazioni aperte, bozze non pubblicate.

## Da fare prima della produzione

- L'accesso è una **selezione di negozio**, non un'autenticazione: va agganciato
  allo stesso layer del sito pubblico (oggi token base64 demo, in prospettiva
  Cognito/JWT) e le Lambda devono ricavare `storeId` dal token invece che dal
  corpo della richiesta.
- Le foto non passano da moderazione automatica né da un CDN: per il traffico
  reale serve CloudFront davanti al bucket con URL firmate a lunga scadenza.
- Il sito pubblico legge ancora `allena-dev-products` (un prodotto per negozio):
  va portato su `listings` + `catalog-products` per mostrare più venditori sulla
  stessa scheda. Nel frattempo il checkout risolve i venditori per **copertura
  territoriale e categoria**, non per proposta di vendita: chi copre la città del
  compratore e tratta quella categoria compare sulla mappa, con i servizi e il
  calendario dichiarati qui.
- Gli ordini ricevuti arrivano da `GET /orders/store/{storeId}` del marketplace,
  che verifica il token ma resta il token demo del punto precedente: in modalità
  cloud il gestionale se lo procura da solo al cambio di negozio, chiamando
  `/auth/login` con l'email del negozio (`bridgeMarketplaceAuth`, in
  `SessionProvider.jsx`). Funziona solo se quell'email esiste già come utente sul
  marketplace (i negozi demo seminati lo sono); un negozio aperto qui e mai
  esistito là riceve un token con lo `storeId` sbagliato e non vede i propri
  ordini finché non viene agganciata un'autenticazione vera.
