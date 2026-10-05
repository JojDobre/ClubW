// Umiestnenie: frontend/e2e/demo-data.mjs
//
// Naplní prázdnu databázu ukážkovými dátami pre testy v prehliadači:
// tím klubu, súťaž s tabuľkou (aj s veľmi dlhým názvom tímu), zápasy,
// rubriku a články. Opakované spustenie nič nezdvojí.
//
//   E2E_API=http://localhost:3100 E2E_EMAIL=... E2E_HESLO=... node e2e/demo-data.mjs

const API = (process.env.E2E_API || 'http://localhost:3000').replace(/\/$/, '');
const email = process.env.E2E_EMAIL;
const heslo = process.env.E2E_HESLO;
if (!email || !heslo) {
  console.error('Nastavte E2E_EMAIL a E2E_HESLO (účet administrátora).');
  process.exit(1);
}

const prihlasenie = await (
  await fetch(`${API}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, heslo }) })
).json();
if (!prihlasenie.success) throw new Error(`Prihlásenie zlyhalo: ${prihlasenie.message}`);
const H = { 'Content-Type': 'application/json', Authorization: `Bearer ${prihlasenie.data.token}` };

/** Zavolá API a pri chybe skončí s výpisom - zlé demo dáta = zlý test. */
const api = async (metoda, cesta, telo) => {
  const r = await fetch(API + cesta, { method: metoda, headers: H, body: telo ? JSON.stringify(telo) : undefined });
  const json = await r.json().catch(() => ({}));
  if (!r.ok || json.success === false) {
    throw new Error(`${metoda} ${cesta} → ${r.status}: ${json.message ?? ''} ${JSON.stringify(json.errors ?? '')}`);
  }
  return json.data;
};
const zoznam = async (cesta) => {
  const d = await api('GET', cesta);
  return Array.isArray(d) ? d : (d?.items ?? d?.clanky ?? d?.articles ?? []);
};

// ===== Tím klubu =====
let tim = (await zoznam('/api/teams')).find((t) => t.nazov === 'FK Dolina');
tim ??= await api('POST', '/api/teams', { nazov: 'FK Dolina', typ: 'muzi', vekova_kategoria: 'seniori' });

// ===== Súťaž s tabuľkou =====
let liga = (await zoznam('/api/leagues')).find((l) => l.nazov === '5. liga Západ');
liga ??= await api('POST', '/api/leagues', { nazov: '5. liga Západ', sezona: '2026/2027', typ: 'sutaz', format: 'tabulka', tim_id: tim.id });
const tabulka = await api('GET', `/api/leagues/${liga.id}/table`);
if (!tabulka.length) {
  const timy = [
    { tim_id: tim.id },
    // Veľmi dlhý názov - tabuľka na mobile ho musí skrátiť a body ukázať
    { custom_tim_nazov: 'TJ Slovan Riverton nad Hronom – Dolné Vestenice' },
    { custom_tim_nazov: 'FK Rača' },
    { custom_tim_nazov: 'ŠK Lozorno' },
    { custom_tim_nazov: 'OFK Kostolište' },
    { custom_tim_nazov: 'TJ Záhorie' },
  ];
  await api('PUT', `/api/leagues/${liga.id}/table`, {
    tabulka_data: timy.map((t, i) => ({
      ...t,
      pozicia: i + 1,
      zapasy: 9,
      vitazstva: 7 - i,
      remizy: 1,
      prehry: 1 + i,
      goly_za: 22 - i * 2,
      goly_proti: 8 + i,
      body: 22 - i * 2,
      forma: 'WWDLW',
    })),
  });
}

// ===== Zápasy: dva odohrané, dva budúce =====
const zapasy = await zoznam('/api/matches?limit=50');
if (zapasy.length < 4) {
  const den = 24 * 3600 * 1000;
  const zapas = (posun, hostia, skore) => ({
    liga_id: liga.id,
    datum_cas: new Date(Date.now() + posun * den).toISOString(),
    domaci_tim_id: tim.id,
    hostujuci_tim_nazov: hostia,
    ...(skore ? { goly_domaci: skore[0], goly_hostia: skore[1], status: 'ukonceny' } : {}),
  });
  for (const z of [zapas(-14, 'FK Rača', [2, 1]), zapas(-7, 'ŠK Lozorno', [1, 1]), zapas(5, 'OFK Kostolište'), zapas(12, 'TJ Záhorie')]) {
    await api('POST', '/api/matches', z);
  }
}

// ===== Rubrika a články =====
let rubrika = (await zoznam('/api/categories')).find((k) => k.nazov === 'Novinky');
rubrika ??= await api('POST', '/api/admin/categories', { nazov: 'Novinky', popis: 'Správy z klubu' });
const clanky = await zoznam('/api/articles?limit=20');
if (clanky.length < 3) {
  const nazvy = ['Výhra nad Račou', 'Remíza v Lozorne', 'Príprava na víkendový zápas'];
  for (const nazov of nazvy) {
    await api('POST', '/api/admin/articles', {
      nazov,
      excerpt: `${nazov} - krátky súhrn pre test.`,
      obsah: `<p>${nazov}. Text článku pre test v prehliadači, aby mal dostatočnú dĺžku.</p>`,
      kategoria_id: rubrika.id,
      status: 'published',
    });
  }
}

console.log(`Demo dáta pripravené: tím ${tim.id}, liga ${liga.id}`);
