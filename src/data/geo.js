// Regioni italiane con i capoluoghi/città principali usate come aree di azione
// del negozio. Il compratore, sul sito pubblico, sceglie il venditore più vicino
// confrontando queste aree con la propria città.

export const REGIONS = {
  Abruzzo: ["L'Aquila", 'Pescara', 'Chieti', 'Teramo'],
  Basilicata: ['Potenza', 'Matera'],
  Calabria: ['Catanzaro', 'Reggio Calabria', 'Cosenza', 'Crotone', 'Vibo Valentia'],
  Campania: ['Napoli', 'Salerno', 'Caserta', 'Avellino', 'Benevento'],
  'Emilia-Romagna': ['Bologna', 'Modena', 'Parma', 'Reggio Emilia', 'Ravenna', 'Rimini', 'Ferrara', 'Forlì'],
  'Friuli-Venezia Giulia': ['Trieste', 'Udine', 'Pordenone', 'Gorizia'],
  Lazio: ['Roma', 'Latina', 'Frosinone', 'Viterbo', 'Rieti'],
  Liguria: ['Genova', 'La Spezia', 'Savona', 'Imperia'],
  Lombardia: ['Milano', 'Bergamo', 'Brescia', 'Monza', 'Como', 'Varese', 'Pavia', 'Cremona', 'Mantova', 'Lecco'],
  Marche: ['Ancona', 'Pesaro', 'Macerata', 'Ascoli Piceno'],
  Molise: ['Campobasso', 'Isernia'],
  Piemonte: ['Torino', 'Novara', 'Alessandria', 'Cuneo', 'Asti', 'Biella', 'Vercelli'],
  Puglia: ['Bari', 'Lecce', 'Taranto', 'Foggia', 'Brindisi', 'Barletta'],
  Sardegna: ['Cagliari', 'Sassari', 'Nuoro', 'Oristano', 'Olbia'],
  Sicilia: ['Palermo', 'Catania', 'Messina', 'Siracusa', 'Trapani', 'Ragusa', 'Agrigento'],
  Toscana: ['Firenze', 'Pisa', 'Livorno', 'Siena', 'Lucca', 'Arezzo', 'Prato', 'Grosseto'],
  'Trentino-Alto Adige': ['Trento', 'Bolzano'],
  Umbria: ['Perugia', 'Terni'],
  "Valle d'Aosta": ['Aosta'],
  Veneto: ['Venezia', 'Verona', 'Padova', 'Vicenza', 'Treviso', 'Rovigo', 'Belluno'],
}

export const REGION_NAMES = Object.keys(REGIONS)

/** Elenco piatto { label, region, type } per l'autocomplete delle aree. */
export const AREA_OPTIONS = [
  ...REGION_NAMES.map((r) => ({ type: 'region', name: r, region: r, label: `${r} (tutta la regione)` })),
  ...REGION_NAMES.flatMap((r) =>
    REGIONS[r].map((c) => ({ type: 'city', name: c, region: r, label: `${c} — ${r}` })),
  ),
]

export function regionOfCity(city) {
  return REGION_NAMES.find((r) => REGIONS[r].includes(city)) || ''
}

/** Un'area copre una città se è la città stessa o la regione che la contiene. */
export function areaCovers(area, city) {
  if (!area || !city) return false
  if (area.type === 'city') return area.name === city
  return REGIONS[area.name]?.includes(city) || false
}

// Centro di ogni citta coperta, per posizionare il negozio sulla mappa del sito
// pubblico senza geocodificare l'indirizzo. Gemello di FE/src/lib/geo.ts:
// le due tabelle vanno tenute allineate.
export const CITY_COORDS = {
  "L'Aquila": { lat: 42.35, lng: 13.4 },
  Pescara: { lat: 42.46, lng: 14.21 },
  Chieti: { lat: 42.35, lng: 14.17 },
  Teramo: { lat: 42.66, lng: 13.7 },
  Potenza: { lat: 40.64, lng: 15.81 },
  Matera: { lat: 40.67, lng: 16.6 },
  Catanzaro: { lat: 38.91, lng: 16.59 },
  'Reggio Calabria': { lat: 38.11, lng: 15.65 },
  Cosenza: { lat: 39.3, lng: 16.25 },
  Crotone: { lat: 39.08, lng: 17.12 },
  'Vibo Valentia': { lat: 38.68, lng: 16.1 },
  Napoli: { lat: 40.85, lng: 14.27 },
  Salerno: { lat: 40.68, lng: 14.77 },
  Caserta: { lat: 41.07, lng: 14.33 },
  Avellino: { lat: 40.91, lng: 14.79 },
  Benevento: { lat: 41.13, lng: 14.78 },
  Bologna: { lat: 44.49, lng: 11.34 },
  Modena: { lat: 44.65, lng: 10.93 },
  Parma: { lat: 44.8, lng: 10.33 },
  'Reggio Emilia': { lat: 44.7, lng: 10.63 },
  Ravenna: { lat: 44.42, lng: 12.2 },
  Rimini: { lat: 44.06, lng: 12.57 },
  Ferrara: { lat: 44.84, lng: 11.62 },
  Forlì: { lat: 44.22, lng: 12.04 },
  Trieste: { lat: 45.65, lng: 13.78 },
  Udine: { lat: 46.06, lng: 13.24 },
  Pordenone: { lat: 45.96, lng: 12.66 },
  Gorizia: { lat: 45.94, lng: 13.62 },
  Roma: { lat: 41.9, lng: 12.5 },
  Latina: { lat: 41.47, lng: 12.9 },
  Frosinone: { lat: 41.64, lng: 13.35 },
  Viterbo: { lat: 42.42, lng: 12.1 },
  Rieti: { lat: 42.4, lng: 12.86 },
  Genova: { lat: 44.41, lng: 8.93 },
  'La Spezia': { lat: 44.1, lng: 9.82 },
  Savona: { lat: 44.31, lng: 8.48 },
  Imperia: { lat: 43.89, lng: 8.03 },
  Milano: { lat: 45.46, lng: 9.19 },
  Bergamo: { lat: 45.7, lng: 9.67 },
  Brescia: { lat: 45.54, lng: 10.22 },
  Monza: { lat: 45.58, lng: 9.27 },
  Como: { lat: 45.81, lng: 9.09 },
  Varese: { lat: 45.82, lng: 8.83 },
  Pavia: { lat: 45.19, lng: 9.16 },
  Cremona: { lat: 45.13, lng: 10.02 },
  Mantova: { lat: 45.16, lng: 10.79 },
  Lecco: { lat: 45.86, lng: 9.39 },
  Ancona: { lat: 43.62, lng: 13.51 },
  Pesaro: { lat: 43.91, lng: 12.91 },
  Macerata: { lat: 43.3, lng: 13.45 },
  'Ascoli Piceno': { lat: 42.85, lng: 13.58 },
  Campobasso: { lat: 41.56, lng: 14.66 },
  Isernia: { lat: 41.6, lng: 14.23 },
  Torino: { lat: 45.07, lng: 7.69 },
  Novara: { lat: 45.45, lng: 8.62 },
  Alessandria: { lat: 44.91, lng: 8.62 },
  Cuneo: { lat: 44.39, lng: 7.55 },
  Asti: { lat: 44.9, lng: 8.21 },
  Biella: { lat: 45.56, lng: 8.06 },
  Vercelli: { lat: 45.32, lng: 8.42 },
  Bari: { lat: 41.13, lng: 16.87 },
  Lecce: { lat: 40.35, lng: 18.17 },
  Taranto: { lat: 40.47, lng: 17.24 },
  Foggia: { lat: 41.46, lng: 15.55 },
  Brindisi: { lat: 40.63, lng: 17.94 },
  Barletta: { lat: 41.32, lng: 16.28 },
  Cagliari: { lat: 39.22, lng: 9.12 },
  Sassari: { lat: 40.73, lng: 8.56 },
  Nuoro: { lat: 40.32, lng: 9.33 },
  Oristano: { lat: 39.9, lng: 8.59 },
  Olbia: { lat: 40.92, lng: 9.5 },
  Palermo: { lat: 38.12, lng: 13.36 },
  Catania: { lat: 37.51, lng: 15.08 },
  Messina: { lat: 38.19, lng: 15.55 },
  Siracusa: { lat: 37.08, lng: 15.28 },
  Trapani: { lat: 38.02, lng: 12.54 },
  Ragusa: { lat: 36.93, lng: 14.72 },
  Agrigento: { lat: 37.31, lng: 13.58 },
  Firenze: { lat: 43.77, lng: 11.26 },
  Pisa: { lat: 43.72, lng: 10.4 },
  Livorno: { lat: 43.55, lng: 10.31 },
  Siena: { lat: 43.32, lng: 11.33 },
  Lucca: { lat: 43.84, lng: 10.5 },
  Arezzo: { lat: 43.46, lng: 11.88 },
  Prato: { lat: 43.88, lng: 11.1 },
  Grosseto: { lat: 42.76, lng: 11.11 },
  Trento: { lat: 46.07, lng: 11.12 },
  Bolzano: { lat: 46.5, lng: 11.35 },
  Perugia: { lat: 43.11, lng: 12.39 },
  Terni: { lat: 42.56, lng: 12.65 },
  Aosta: { lat: 45.74, lng: 7.32 },
  Venezia: { lat: 45.44, lng: 12.32 },
  Verona: { lat: 45.44, lng: 10.99 },
  Padova: { lat: 45.41, lng: 11.88 },
  Vicenza: { lat: 45.55, lng: 11.55 },
  Treviso: { lat: 45.67, lng: 12.24 },
  Rovigo: { lat: 45.07, lng: 11.79 },
  Belluno: { lat: 46.14, lng: 12.22 },
}

export function coordsOfCity(city) {
  return CITY_COORDS[city] || null
}

/** Tutte le citta effettivamente raggiunte dalle aree dichiarate. */
export function citiesCovered(areas) {
  const out = new Set()
  for (const area of areas || []) {
    if (area.type === 'city') out.add(area.name)
    else for (const c of REGIONS[area.name] || []) out.add(c)
  }
  return [...out].sort((a, b) => a.localeCompare(b))
}
