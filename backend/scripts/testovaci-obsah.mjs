// Umiestnenie: backend/scripts/testovaci-obsah.mjs
//
// Naplní web klubu kompletným testovacím obsahom cez API:
//   - knižnica médií (štylizované fotky, portréty, erby, logá, produkty, PDF)
//   - sezóna a štadión
//   - 6 tímov (A-tím, B-tím, ženy, U19, U15, U11) s hráčmi a realizačným tímom
//   - vedenie klubu
//   - súťaž pre každý tím s tabuľkou
//   - odohrané zápasy (skóre, góly, asistencie, karty, striedania, zostava,
//     priebeh) a zápasy v programe
//   - rubriky a články (aj správy zo zápasov, koncept a naplánovaný článok)
//   - fotogalérie, videá, udalosti v kalendári, turnaj s pavúkom
//   - partneri s úrovňami, dokumenty, anketa, komentáre
//   - fanshop (kategórie, produkty s veľkosťami, doprava a platby)
//   - stránky O klube a Kontakt, menu (len keď je prázdne)
//   - nakoniec stránku /vsetky-bloky (skript stranka-vsetky-bloky.mjs)
//
// Použitie (z priečinka backend, beží backend):
//   ADMIN_EMAIL=admin@klub.sk ADMIN_HESLO=... npm run testovaci-obsah
//   (voliteľne API_URL=https://web-klubu.sk, predvolene http://localhost:3000)
//
// Opakované spustenie nič nezdvojí - čo už existuje (podľa názvu), preskočí.
// Je to obsah na testovanie, nie na ostrý web: názvy klubov sú vymyslené.

import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import * as kresli from './testovaci-obsah-obrazky.mjs';

const API = (process.env.API_URL || 'http://localhost:3000').replace(/\/$/, '');
const email = process.env.ADMIN_EMAIL;
const heslo = process.env.ADMIN_HESLO;
if (!email || !heslo) {
  console.error('Nastavte ADMIN_EMAIL a ADMIN_HESLO (účet administrátora).');
  process.exit(1);
}

const prihlasenie = await (
  await fetch(`${API}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, heslo }) })
).json();
if (!prihlasenie.success) {
  console.error('Prihlásenie zlyhalo:', prihlasenie.message);
  process.exit(1);
}
const TOKEN = prihlasenie.data.token;
const H = { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` };

// ===================================================================
// Pomocné funkcie
// ===================================================================

/** Zavolá API a pri chybe skončí s výpisom - polovičný obsah by mätel. */
const api = async (metoda, cesta, telo) => {
  const r = await fetch(API + cesta, { method: metoda, headers: H, body: telo ? JSON.stringify(telo) : undefined });
  const json = await r.json().catch(() => ({}));
  if (!r.ok || json.success === false) {
    throw new Error(`${metoda} ${cesta} → ${r.status}: ${json.message ?? ''} ${JSON.stringify(json.errors ?? '')}`);
  }
  return json.data;
};

/** Nepovinná časť - chyba sa len vypíše a pokračuje sa ďalej. */
const skus = async (popis, fn) => {
  try {
    return await fn();
  } catch (e) {
    console.warn(`  ! ${popis}: ${e.message}`);
    return null;
  }
};

/** Vytiahne zoznam z odpovede (pole, alebo objekt s poľom vo vnútri). */
const naZoznam = (d) => {
  if (Array.isArray(d)) return d;
  if (d && typeof d === 'object') return Object.values(d).find(Array.isArray) ?? [];
  return [];
};
const zoznam = async (cesta) => naZoznam(await api('GET', cesta));

/** Nájde záznam podľa názvu alebo ho vytvorí. */
const najdiAleboVytvor = async (existujuce, nazov, vytvor, pole = 'nazov') => {
  const najdeny = existujuce.find((x) => x[pole] === nazov);
  if (najdeny) return { zaznam: najdeny, novy: false };
  const zaznam = await vytvor();
  existujuce.push(zaznam);
  return { zaznam, novy: true };
};

const rnd = kresli.nahodne(2026);
const nahodneCele = (od, po) => od + Math.floor(rnd() * (po - od + 1));
const vyber = (pole) => pole[Math.floor(rnd() * pole.length)];
const zamiesaj = (pole) => {
  const p = [...pole];
  for (let i = p.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [p[i], p[j]] = [p[j], p[i]];
  }
  return p;
};

const DEN = 24 * 3600 * 1000;
/** Dátum o `posun` dní od dneška v danom čase (miestny čas). */
const datum = (posun, hodiny = 12, minuty = 0) => {
  const d = new Date(Date.now() + posun * DEN);
  d.setHours(hodiny, minuty, 0, 0);
  return d;
};
const iso = (d) => d.toISOString();
const isoDen = (d) => {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};
/** Počet dní do najbližšej soboty (aspoň 1). */
const doSoboty = (() => {
  const dnes = new Date().getDay();
  const n = (6 - dnes + 7) % 7;
  return n === 0 ? 7 : n;
})();

const kroky = [];
const krok = (nazov) => {
  console.log(`\n▸ ${nazov}`);
  kroky.push(nazov);
};

// ===================================================================
// Klub a tímy (pevné zadanie)
// ===================================================================

const KLUB = 'FK Dolina';
const FARBA = '#17803d';
const DRUHA = '#ffffff';

const TIMY = [
  { kluc: 'a', nazov: 'FK Dolina', typ: 'muzi', vek: 'seniori', poradie: 1, hracov: 22, portrety: true, zeny: false,
    popis: 'A-tím mužov - vlajková loď klubu, hrá 4. ligu Západ.', liga: '4. liga Západ', pocetTimov: 14, odohrane: 9, program: 5, sila: 0.62, cas: [15, 0] },
  { kluc: 'b', nazov: 'FK Dolina B', typ: 'muzi', vek: 'seniori', poradie: 2, hracov: 16, portrety: false, zeny: false,
    popis: 'Rezerva A-tímu, priestor pre mladých hráčov po doraste.', liga: '7. liga Dolina – sever', pocetTimov: 12, odohrane: 5, program: 3, sila: 0.5, cas: [13, 0] },
  { kluc: 'z', nazov: 'FK Dolina ženy', typ: 'zeny', vek: 'seniori', poradie: 3, hracov: 18, portrety: true, zeny: true,
    popis: 'Ženský tím, druhá liga žien Západ.', liga: '2. liga žien Západ', pocetTimov: 10, odohrane: 5, program: 3, sila: 0.58, cas: [11, 0] },
  { kluc: 'u19', nazov: 'FK Dolina U19', typ: 'mladez', vek: 'U19', poradie: 4, hracov: 18, portrety: false, zeny: false,
    popis: 'Starší dorast - most medzi mládežou a dospelým futbalom.', liga: 'III. liga dorastu U19', pocetTimov: 12, odohrane: 5, program: 3, sila: 0.55, cas: [10, 30] },
  { kluc: 'u15', nazov: 'FK Dolina U15', typ: 'mladez', vek: 'U15', poradie: 5, hracov: 16, portrety: false, zeny: false,
    popis: 'Starší žiaci, krajská súťaž.', liga: 'Krajská liga žiakov U15', pocetTimov: 10, odohrane: 4, program: 3, sila: 0.52, cas: [10, 0] },
  { kluc: 'u11', nazov: 'FK Dolina U11', typ: 'mladez', vek: 'U11', poradie: 6, hracov: 12, portrety: false, zeny: false,
    popis: 'Prípravka - radosť z hry je na prvom mieste.', liga: 'Prípravka U11 – skupina A', pocetTimov: 8, odohrane: 4, program: 2, sila: 0.5, cas: [9, 30] },
];

/** Vymyslení súperi A-tímu - s erbami, posledný má schválne dlhý názov. */
const SUPERI_A = [
  ['FK Brezovec', 'FKB', '#1e4fa8', '#ffd400'], ['TJ Slovan Javorina', 'TJS', '#0d47a1', '#ffffff'],
  ['ŠK Kamenec', 'ŠKK', '#b71c1c', '#ffffff'], ['OFK Lúčky', 'OFK', '#f57c00', '#1b1b1b'],
  ['MFK Podhorie', 'MFK', '#4a148c', '#ffffff'], ['TJ Družstevník Hôrky', 'TJD', '#2e7d32', '#ffeb3b'],
  ['FC Riečany', 'FCR', '#c62828', '#1b1b1b'], ['ŠK Topoľnica', 'ŠKT', '#00838f', '#ffffff'],
  ['FK Lipová', 'FKL', '#6d4c41', '#ffffff'], ['TJ Sokol Medzibrodie', 'SOK', '#283593', '#e53935'],
  ['OŠK Záhradná', 'OŠK', '#9e9d24', '#1b1b1b'], ['FK Kremenec', 'FKK', '#37474f', '#ff7043'],
  ['TJ Iskra Vyšná Rovňa – Dolné Vestenice', 'TJI', '#ad1457', '#ffffff'],
];
const OBCE = ['Brezovec', 'Javorina', 'Kamenec', 'Lúčky', 'Podhorie', 'Hôrky', 'Riečany', 'Topoľnica', 'Lipová', 'Medzibrodie',
  'Záhradná', 'Kremenec', 'Vyšná Rovňa', 'Bukovina', 'Dubnica Horná', 'Jelšovce', 'Pieskovec', 'Stráne'];
const PREDPONY = ['FK', 'TJ', 'ŠK', 'OFK', 'MFK', 'OŠK'];

const MENA_M = ['Martin', 'Peter', 'Tomáš', 'Jakub', 'Lukáš', 'Michal', 'Marek', 'Filip', 'Adam', 'Matej', 'Samuel', 'Dominik',
  'Patrik', 'Róbert', 'Juraj', 'Erik', 'Daniel', 'Šimon', 'Oliver', 'Kristián', 'Denis', 'Richard', 'Viktor', 'Boris', 'Andrej'];
const PRIEZVISKA_M = ['Novák', 'Kováč', 'Horváth', 'Varga', 'Tóth', 'Baláž', 'Molnár', 'Lukáč', 'Kollár', 'Hudák', 'Polák', 'Krajčí',
  'Gajdoš', 'Šimko', 'Bartoš', 'Mráz', 'Urban', 'Kučera', 'Hlavatý', 'Bielik', 'Švec', 'Ondruš', 'Hrušovský', 'Valach', 'Jurčo',
  'Fekete', 'Sloboda', 'Benko', 'Pavlík', 'Kubala'];
const MENA_Z = ['Lucia', 'Simona', 'Natália', 'Kristína', 'Veronika', 'Petra', 'Michaela', 'Laura', 'Nina', 'Ema', 'Sofia',
  'Barbora', 'Tamara', 'Zuzana', 'Viktória', 'Klára', 'Diana', 'Alžbeta'];
const PRIEZVISKA_Z = ['Nováková', 'Kováčová', 'Horváthová', 'Vargová', 'Tóthová', 'Balážová', 'Molnárová', 'Kollárová',
  'Hudáková', 'Poláková', 'Šimková', 'Bartošová', 'Urbanová', 'Švecová', 'Mrázová', 'Benková', 'Pavlíková', 'Kubalová'];

const meno = (zeny) => ({ meno: vyber(zeny ? MENA_Z : MENA_M), priezvisko: vyber(zeny ? PRIEZVISKA_Z : PRIEZVISKA_M) });

/** Rozloženie pozícií v kádri danej veľkosti. */
const pozicieKadra = (n) => {
  const brankari = n >= 16 ? 3 : 2;
  const zvysok = n - brankari;
  const obrancovia = Math.round(zvysok * 0.35);
  const zaloznici = Math.round(zvysok * 0.38);
  return [
    ...Array(brankari).fill('brankar'),
    ...Array(obrancovia).fill('obranca'),
    ...Array(zaloznici).fill('zaloznik'),
    ...Array(zvysok - obrancovia - zaloznici).fill('utocnik'),
  ];
};

/** Roky narodenia podľa vekovej kategórie. */
const rokyNarodenia = { seniori: [1991, 2005], U19: [2007, 2008], U15: [2011, 2012], U11: [2015, 2016] };

// ===================================================================
// 1. Knižnica médií
// ===================================================================

krok('Knižnica médií');

const media = new Map(); // nazov → { id, cesta }
for (let offset = 0; ; offset += 200) {
  const strana = await zoznam(`/api/admin/media?hladat=test-&limit=200&offset=${offset}`);
  for (const m of strana) media.set(m.nazov, m);
  if (strana.length < 200) break;
}

/** Súbory, ktoré treba nahrať: nazov → { buffer, typ, pripona } */
const naNahranie = [];
const potrebujem = (nazov, pripona, typ, vyrob) => {
  if (!media.has(nazov)) naNahranie.push({ nazov, pripona, typ, vyrob });
};

// Fotky na články a galérie
const MOTIVY = [
  ['zapas', 'den'], ['oslava', 'noc'], ['trening', 'sumrak'], ['fanusikovia', 'noc'], ['mladez', 'den'], ['zapas', 'noc'],
  ['stadion', 'den'], ['trofej', 'den'], ['zapas', 'sumrak'], ['trening', 'den'], ['oslava', 'den'], ['mladez', 'sumrak'],
  ['fanusikovia', 'sumrak'], ['stadion', 'noc'], ['zapas', 'den'], ['oslava', 'sumrak'],
];
const SUPAR_FARBY = ['#c62828', '#1e4fa8', '#f57c00', '#4a148c', '#00838f', '#37474f'];
const FOTKY = [];
for (let i = 0; i < 32; i++) {
  const [motiv, obloha] = MOTIVY[i % MOTIVY.length];
  const nazov = `test-fotka-${String(i + 1).padStart(2, '0')}`;
  FOTKY.push(nazov);
  potrebujem(nazov, 'jpg', 'image/jpeg', () =>
    kresli.naJpeg(kresli.fotka({ semienko: 100 + i, motiv, obloha, farba: FARBA, supar: SUPAR_FARBY[i % SUPAR_FARBY.length] })),
  );
}
// Erby: náš klub a súperi A-tímu
potrebujem('test-erb-fk-dolina', 'png', 'image/png', () => kresli.naPng(kresli.erb({ skratka: 'FKD', farba: FARBA, druha: DRUHA })));
SUPERI_A.forEach(([, skratka, f1, f2], i) =>
  potrebujem(`test-erb-${i + 1}`, 'png', 'image/png', () => kresli.naPng(kresli.erb({ skratka, farba: f1, druha: f2, tvar: i }))),
);
// Logá partnerov
const PARTNERI = [
  ['Stavby Horák', '#e65100', 'Generálny partner', 'Stavebná firma, ktorá postavila novú tribúnu.'],
  ['Dolinská pekáreň', '#8d6e63', 'Hlavný partner', 'Pečivo pre hráčov aj fanúšikov v bufete.'],
  ['AutoServis Mráz', '#1565c0', 'Hlavný partner', 'Klubový autobus jazdí vďaka nim.'],
  ['Obec Dolina', '#2e7d32', 'Hlavný partner', 'Obec podporuje mládež a údržbu areálu.'],
  ['Elektro Kubala', '#f9a825', 'Partner', 'Osvetlenie hlavného ihriska.'],
  ['Kaviareň Na rohu', '#6d4c41', 'Partner', 'Miesto stretnutí po zápasoch.'],
  ['Fyzio Plus', '#00897b', 'Partner', 'Starostlivosť o zdravie hráčov.'],
  ['Rádio Dolina FM', '#c2185b', 'Mediálny partner', 'Priame prenosy domácich zápasov.'],
];
PARTNERI.forEach(([nazov, farba], i) =>
  potrebujem(`test-logo-${i + 1}`, 'png', 'image/png', () => kresli.naPng(kresli.logoPartnera({ nazov, farba, ikona: i }))),
);
// Produkty
const PRODUKTY = [
  { nazov: 'Domáci dres 2026/2027', typ: 'dres', kat: 'Dresy', cena: 59.9, povodna: null, sklad: 40, odporucany: true, velkosti: true, potlac: true, farba: FARBA, druha: DRUHA,
    kratky: 'Oficiálny domáci dres v klubových farbách.', popis: '<p>Ľahký priedušný materiál, klubový erb a logo generálneho partnera. Na želanie s menom a číslom.</p><ul><li>100 % recyklovaný polyester</li><li>Strih regular</li></ul>' },
  { nazov: 'Vonkajší dres 2026/2027', typ: 'dres', kat: 'Dresy', cena: 54.9, povodna: 64.9, sklad: 25, odporucany: true, velkosti: true, potlac: true, farba: '#ffffff', druha: FARBA,
    kratky: 'Biely vonkajší dres - teraz v zľave.', popis: '<p>Vonkajšia sada pre sezónu 2026/2027. Zelené detaily, rovnaký strih ako domáci dres.</p>' },
  { nazov: 'Tréningová mikina', typ: 'mikina', kat: 'Oblečenie', cena: 44.9, povodna: null, sklad: 30, odporucany: false, velkosti: true, potlac: false, farba: '#1f2633', druha: FARBA,
    kratky: 'Teplá mikina s kapucňou.', popis: '<p>Mikina, v ktorej trénuje A-tím. Vrecko na zips a vyšívaný erb.</p>' },
  { nazov: 'Šál FK Dolina', typ: 'sal', kat: 'Doplnky', cena: 14.9, povodna: null, sklad: 120, odporucany: true, velkosti: false, potlac: false, farba: FARBA, druha: DRUHA,
    kratky: 'Pletený šál do každého počasia.', popis: '<p>Obojstranný pletený šál, dĺžka 140 cm.</p>' },
  { nazov: 'Zimná čiapka', typ: 'ciapka', kat: 'Doplnky', cena: 12.9, povodna: 15.9, sklad: 60, odporucany: false, velkosti: false, potlac: false, farba: FARBA, druha: DRUHA,
    kratky: 'Čiapka s brmbolcom.', popis: '<p>Teplá pletená čiapka s vyšívaným erbom.</p>' },
  { nazov: 'Hrnček s erbom', typ: 'hrncek', kat: 'Doplnky', cena: 8.9, povodna: null, sklad: 0, odporucany: false, velkosti: false, potlac: false, farba: FARBA, druha: DRUHA,
    kratky: 'Keramický hrnček 330 ml - momentálne vypredaný.', popis: '<p>Do umývačky riadu aj do mikrovlnky.</p>' },
  { nazov: 'Lopta FK Dolina', typ: 'lopta', kat: 'Doplnky', cena: 24.9, povodna: null, sklad: 18, odporucany: false, velkosti: false, potlac: false, farba: FARBA, druha: DRUHA,
    kratky: 'Tréningová lopta, veľkosť 5.', popis: '<p>Šitá lopta vhodná na trávu aj umelú trávu.</p>' },
  { nazov: 'Klubová vlajka', typ: 'vlajka', kat: 'Doplnky', cena: 19.9, povodna: null, sklad: 15, odporucany: false, velkosti: false, potlac: false, farba: FARBA, druha: DRUHA,
    kratky: 'Vlajka 150 × 90 cm.', popis: '<p>Na tribúnu aj na balkón.</p>' },
];
PRODUKTY.forEach((p, i) =>
  potrebujem(`test-produkt-${i + 1}`, 'jpg', 'image/jpeg', () => kresli.naJpeg(kresli.produkt({ typ: p.typ, farba: p.farba, druha: p.druha }))),
);
// Portréty (A-tím a ženy) a realizačný tím
for (let i = 1; i <= 22; i++) {
  potrebujem(`test-hrac-a-${i}`, 'jpg', 'image/jpeg', () => kresli.naJpeg(kresli.portret({ cislo: i, farba: FARBA, semienko: 300 + i })));
}
for (let i = 1; i <= 18; i++) {
  potrebujem(`test-hrac-z-${i}`, 'jpg', 'image/jpeg', () => kresli.naJpeg(kresli.portret({ cislo: i, farba: FARBA, semienko: 500 + i })));
}
for (let i = 1; i <= 8; i++) {
  potrebujem(`test-rt-${i}`, 'jpg', 'image/jpeg', () => kresli.naJpeg(kresli.portret({ farba: FARBA, semienko: 700 + i, oblek: true })));
}
// Dokumenty
const DOKUMENTY = [
  { subor: 'test-dok-stanovy', nazov: 'Stanovy klubu', kat: 'Klubové dokumenty', popis: 'Platné znenie stanov občianskeho združenia.',
    text: ['Článok 1 - Názov a sídlo. Občianske združenie FK Dolina má sídlo na Športovej ulici 12.', 'Článok 2 - Cieľ. Cieľom združenia je rozvoj futbalu detí, mládeže a dospelých v obci a okolí.', 'Článok 3 - Členstvo. Členom sa môže stať každý, kto súhlasí so stanovami a zaplatí členský príspevok.'] },
  { subor: 'test-dok-prihlaska', nazov: 'Prihláška za člena klubu', kat: 'Prihlášky a tlačivá', popis: 'Vyplňte a odovzdajte v klubovej kancelárii.',
    text: ['Meno a priezvisko: ..................................', 'Dátum narodenia: ..................................', 'Podpis: ..................................'] },
  { subor: 'test-dok-gdpr', nazov: 'Súhlas so spracovaním osobných údajov', kat: 'Prihlášky a tlačivá', popis: 'Tlačivo pre rodičov hráčov mládeže.',
    text: ['Súhlasím so spracovaním osobných údajov môjho dieťaťa na účely registrácie v klube a v zväze.'] },
  { subor: 'test-dok-vyrocna', nazov: 'Výročná správa 2025', kat: 'Výročné správy', popis: 'Hospodárenie a športové výsledky za rok 2025.',
    text: ['V roku 2025 klub registroval 186 hráčov v šiestich družstvách.', 'Príjmy klubu tvorili členské príspevky, dotácia obce a príspevky partnerov.'] },
];
DOKUMENTY.forEach((d) => potrebujem(d.subor, 'pdf', 'application/pdf', async () => kresli.pdf(d.nazov, d.text)));

// Nahrávanie po desiatich
for (let i = 0; i < naNahranie.length; i += 10) {
  const davka = naNahranie.slice(i, i + 10);
  const fd = new FormData();
  for (const s of davka) {
    const buffer = await s.vyrob();
    fd.append('subory', new Blob([buffer], { type: s.typ }), `${s.nazov}.${s.pripona}`);
  }
  const r = await fetch(`${API}/api/admin/media/upload`, { method: 'POST', headers: { Authorization: `Bearer ${TOKEN}` }, body: fd });
  const json = await r.json().catch(() => ({}));
  if (!r.ok || !json.success) throw new Error(`Nahrávanie médií zlyhalo: ${json.message ?? r.status}`);
  for (const m of naZoznam(json.data)) media.set(m.nazov, m);
}
console.log(`  nahraté: ${naNahranie.length}, spolu testových súborov: ${media.size}`);

const cesta = (nazov) => media.get(nazov)?.cesta ?? null;
const fotkaC = (i) => cesta(FOTKY[i % FOTKY.length]);
const velkostKb = (nazov) => Math.max(1, Math.round(Number(media.get(nazov)?.velkost ?? 1024) / 1024));

// ===================================================================
// 2. Sezóna a štadión
// ===================================================================

krok('Sezóna a štadión');

const rokSezony = new Date().getMonth() >= 6 ? new Date().getFullYear() : new Date().getFullYear() - 1;
const NAZOV_SEZONY = `${rokSezony}/${rokSezony + 1}`;
const sezony = await zoznam('/api/seasons');
const { zaznam: sezona } = await najdiAleboVytvor(sezony, NAZOV_SEZONY, () =>
  api('POST', '/api/admin/seasons', { nazov: NAZOV_SEZONY, zaciatok: `${rokSezony}-07-01`, koniec: `${rokSezony + 1}-06-30` }),
);
if (!sezony.some((s) => s.aktualna)) await api('POST', `/api/admin/seasons/${sezona.id}/set-current`);
console.log(`  sezóna ${NAZOV_SEZONY} (id ${sezona.id})`);

const stadiony = await zoznam('/api/stadiums');
const { zaznam: stadion } = await najdiAleboVytvor(stadiony, 'Štadión Pod Hájom', () =>
  api('POST', '/api/stadiums', {
    nazov: 'Štadión Pod Hájom', adresa: 'Športová 12, Dolina', kapacita: 1800, fotka: cesta('test-fotka-07'),
    poznamka: 'Hlavné ihrisko s prírodnou trávou, osvetlenie, kryté sedenie pre 450 divákov, umelá tráva na tréningy.',
  }),
);

// ===================================================================
// 3. Tímy, hráči, realizačný tím
// ===================================================================

krok('Tímy, hráči a realizačný tím');

const timyApi = await zoznam('/api/teams');
const ERB = cesta('test-erb-fk-dolina');
for (const t of TIMY) {
  const { zaznam, novy } = await najdiAleboVytvor(timyApi, t.nazov, () =>
    api('POST', '/api/teams', {
      nazov: t.nazov, typ: t.typ, vekova_kategoria: t.vek, popis: t.popis, stadion_id: stadion.id,
      sezona_id: sezona.id, logo: ERB, farba_prva: FARBA, farba_druha: DRUHA, poradie: t.poradie,
    }),
  );
  t.id = zaznam.id;
  if (!novy && !zaznam.logo) await api('PUT', `/api/teams/${t.id}`, { logo: ERB });
}

for (const t of TIMY) {
  t.hraci = await zoznam(`/api/players?tim_id=${t.id}`);
  if (t.hraci.length >= 11) continue;
  const pozicie = pozicieKadra(t.hracov);
  const [rokOd, rokDo] = rokyNarodenia[t.vek];
  const pouziteMena = new Set(t.hraci.map((h) => `${h.meno} ${h.priezvisko}`));
  for (let i = 0; i < pozicie.length; i++) {
    let m = meno(t.zeny);
    while (pouziteMena.has(`${m.meno} ${m.priezvisko}`)) m = meno(t.zeny);
    pouziteMena.add(`${m.meno} ${m.priezvisko}`);
    const cislo = i === 0 ? 1 : i + 1;
    if (t.hraci.some((h) => Number(h.cislo_dresu) === cislo)) continue;
    const dospely = t.vek === 'seniori';
    const hrac = await api('POST', '/api/players', {
      ...m,
      tim_id: t.id,
      sezona_id: sezona.id,
      pozicia: pozicie[i],
      cislo_dresu: cislo,
      datum_narodenia: `${nahodneCele(rokOd, rokDo)}-${String(nahodneCele(1, 12)).padStart(2, '0')}-${String(nahodneCele(1, 28)).padStart(2, '0')}`,
      narodnost: rnd() < 0.85 ? 'Slovensko' : vyber(['Česko', 'Maďarsko', 'Ukrajina', 'Srbsko']),
      vyska: dospely ? nahodneCele(t.zeny ? 158 : 172, t.zeny ? 180 : 194) : t.vek === 'U19' ? nahodneCele(168, 190) : t.vek === 'U15' ? nahodneCele(150, 175) : nahodneCele(130, 150),
      vaha: dospely ? nahodneCele(t.zeny ? 52 : 66, t.zeny ? 72 : 92) : t.vek === 'U19' ? nahodneCele(58, 82) : t.vek === 'U15' ? nahodneCele(40, 62) : nahodneCele(30, 42),
      fotka: t.portrety ? cesta(`test-hrac-${t.kluc}-${cislo}`) : null,
      datum_pripojenia: `${nahodneCele(2015, 2025)}-07-01`,
    });
    t.hraci.push(hrac);
  }
  console.log(`  ${t.nazov}: ${t.hraci.length} hráčov`);
}

const staffApi = await zoznam('/api/staff');
const RT = [
  ['a', 'Hlavný tréner', 'UEFA A licencia'], ['a', 'Asistent trénera', 'UEFA B licencia'], ['a', 'Tréner brankárov', 'Licencia trénera brankárov'],
  ['a', 'Kondičný tréner', 'Mgr. telesnej výchovy'], ['a', 'Fyzioterapeut', 'Fyzioterapia'], ['a', 'Vedúci mužstva', null],
  ['b', 'Hlavný tréner', 'UEFA B licencia'], ['z', 'Hlavná trénerka', 'UEFA B licencia'], ['z', 'Asistent trénera', 'UEFA C licencia'],
  ['u19', 'Hlavný tréner', 'UEFA B licencia'], ['u15', 'Hlavný tréner', 'UEFA C licencia'], ['u11', 'Trénerka prípravky', 'Grassroots C licencia'],
  [null, 'Predseda klubu', null], [null, 'Športový riaditeľ', null], [null, 'Sekretár klubu', null], [null, 'Šéftréner mládeže', 'UEFA A licencia'],
];
let rtFotka = 0;
for (const [kluc, funkcia, kvalifikacia] of RT) {
  const tim = kluc ? TIMY.find((t) => t.kluc === kluc) : null;
  const uz = staffApi.some((s) => s.funkcia === funkcia && (s.tim_id ?? null) === (tim?.id ?? null));
  if (uz) continue;
  const zena = /trénerka/i.test(funkcia);
  const m = meno(zena);
  const fotka = kluc === 'a' || !kluc ? cesta(`test-rt-${(rtFotka++ % 8) + 1}`) : null;
  staffApi.push(
    await api('POST', '/api/staff', {
      ...m, funkcia, kvalifikacia, tim_id: tim?.id ?? null, sezona_id: sezona.id, fotka,
      email: `${staffApi.length + 1}.${m.priezvisko.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')}@fkdolina.example`,
      telefon: `+421 9${nahodneCele(10, 49)} ${nahodneCele(100, 999)} ${nahodneCele(100, 999)}`,
      datum_narodenia: `${nahodneCele(1965, 1992)}-0${nahodneCele(1, 9)}-1${nahodneCele(0, 9)}`,
      poradie: RT.indexOf(RT.find((r) => r[1] === funkcia)) + 1,
    }),
  );
}
console.log(`  realizačný tím a vedenie: ${staffApi.length} osôb`);

// ===================================================================
// 4. Súťaže s tabuľkami
// ===================================================================

krok('Súťaže a tabuľky');

/** Súperi pre daný tím (A-tím má pevných, ostatní vygenerovaných). */
const superiTimu = (t) => {
  if (t.kluc === 'a') return SUPERI_A.slice(0, t.pocetTimov - 1).map(([nazov], i) => ({ nazov, logo: cesta(`test-erb-${i + 1}`) }));
  const pripona = { b: ' B', z: ' ženy', u19: ' U19', u15: ' U15', u11: ' U11' }[t.kluc];
  const obce = zamiesaj(OBCE).slice(0, t.pocetTimov - 1);
  return obce.map((o, i) => ({ nazov: `${PREDPONY[i % PREDPONY.length]} ${o}${pripona}`, logo: null }));
};

const ligyApi = await zoznam('/api/leagues');
for (const t of TIMY) {
  const { zaznam } = await najdiAleboVytvor(ligyApi, t.liga, () =>
    api('POST', '/api/leagues', {
      nazov: t.liga, sezona: NAZOV_SEZONY, sezona_id: sezona.id, typ: 'sutaz', format: 'tabulka', tim_id: t.id,
      pocet_timov: t.pocetTimov, zobrazit_formu: true, farba: FARBA,
      popis: `${t.liga}, ročník ${NAZOV_SEZONY}.`,
    }),
  );
  t.liga_id = zaznam.id;
  const tabulka = await api('GET', `/api/leagues/${t.liga_id}/table`);
  t.superi = superiTimu(t);
  if (naZoznam(tabulka).length) {
    // Súperov z existujúcej tabuľky použijeme aj pre zápasy
    const zTabulky = naZoznam(tabulka).filter((r) => r.custom_tim_nazov).map((r) => ({ nazov: r.custom_tim_nazov, logo: r.custom_tim_logo ?? null }));
    if (zTabulky.length) t.superi = zTabulky;
    continue;
  }
  const kola = t.odohrane;
  const riadky = [{ tim_id: t.id, sila: t.sila + 0.08 }, ...t.superi.map((s) => ({ custom_tim_nazov: s.nazov, custom_tim_logo: s.logo, sila: 0.3 + rnd() * 0.5 }))]
    .map((r) => {
      let v = 0, rm = 0, p = 0, gz = 0, gp = 0;
      const forma = [];
      for (let k = 0; k < kola; k++) {
        const x = rnd();
        if (x < r.sila * 0.8) { v++; gz += nahodneCele(1, 4); gp += nahodneCele(0, 1); forma.push('W'); }
        else if (x < r.sila * 0.8 + 0.22) { rm++; const g = nahodneCele(0, 2); gz += g; gp += g; forma.push('D'); }
        else { p++; gz += nahodneCele(0, 1); gp += nahodneCele(1, 3); forma.push('L'); }
      }
      const { sila, ...zvysok } = r;
      return { ...zvysok, zapasy: kola, vitazstva: v, remizy: rm, prehry: p, goly_za: gz, goly_proti: gp, body: v * 3 + rm, forma: forma.slice(-5).join('') };
    })
    .sort((a, b) => b.body - a.body || b.goly_za - b.goly_proti - (a.goly_za - a.goly_proti) || b.goly_za - a.goly_za)
    .map((r, i) => ({ ...r, pozicia: i + 1 }));
  await api('PUT', `/api/leagues/${t.liga_id}/table`, { tabulka_data: riadky });
  console.log(`  ${t.liga}: ${riadky.length} tímov, náš tím ${riadky.findIndex((r) => r.tim_id === t.id) + 1}.`);
}

// ===================================================================
// 5. Zápasy - odohrané so štatistikami a program
// ===================================================================

krok('Zápasy, štatistiky, zostavy a priebeh');

const KOMENTARE = [
  'Veľká šanca, strela tesne vedľa žrde.', 'Brankár zneškodnil nebezpečnú strelu z hranice šestnástky.',
  'Rohový kop, hlavička nad bránku.', 'Tlak hostí sa stupňuje, domáci sa bránia hlboko.',
  'Krásna kombinácia cez stred, centr však nenašiel adresáta.', 'Hra je prerušená, ošetrenie hráča.',
  'Priamy kop z 20 metrov skončil v múre.', 'Diváci povzbudzujú, atmosféra na tribúne je výborná.',
];
const ROZHODCOVIA = ['Ján Kováčik', 'Pavol Ďurica', 'Igor Matúš', 'Rastislav Hornák', 'Milan Šebo', 'Dušan Kmeť'];
const pocetZapasov = { odohrane: 0, program: 0 };
const odohraneA = [];

const menoHraca = (h) => `${h.meno} ${h.priezvisko}`;

for (const t of TIMY) {
  const existujuce = await zoznam(`/api/matches?liga_id=${t.liga_id}&limit=100`);
  if (existujuce.length) {
    if (t.kluc === 'a') odohraneA.push(...existujuce.filter((z) => z.status === 'ukonceny'));
    continue;
  }
  const superi = zamiesaj(t.superi);
  const vsetky = t.odohrane + t.program;
  for (let k = 1; k <= vsetky; k++) {
    const odohrany = k <= t.odohrane;
    const posun = odohrany ? doSoboty - 7 * (t.odohrane - k + 1) : doSoboty + 7 * (k - t.odohrane - 1);
    const doma = k % 2 === 1;
    const supar = superi[(k - 1) % superi.length];
    const [hod, min] = t.cas;
    const telo = {
      liga_id: t.liga_id,
      datum_cas: iso(datum(posun + (t.kluc === 'a' && !doma ? 1 : 0), hod, min)),
      kolo: String(k),
      typ_zapasu: doma ? 'doma' : 'vonku',
      ...(doma
        ? { domaci_tim_id: t.id, hostujuci_tim_nazov: supar.nazov, stadion_id: stadion.id }
        : { domaci_tim_nazov: supar.nazov, hostujuci_tim_id: t.id, miesto: `Ihrisko ${supar.nazov.replace(/ (B|ženy|U\d+)$/, '')}` }),
      ...(supar.logo ? { supier_logo: supar.logo } : {}),
      rozhodca: vyber(ROZHODCOVIA),
    };
    let nase = 0;
    let ich = 0;
    if (odohrany) {
      const x = rnd();
      if (x < t.sila) { nase = nahodneCele(1, 4); ich = nahodneCele(0, nase - 1); }
      else if (x < t.sila + 0.2) { nase = ich = nahodneCele(0, 2); }
      else { ich = nahodneCele(1, 3); nase = nahodneCele(0, ich - 1); }
      Object.assign(telo, {
        status: 'ukonceny',
        goly_domaci: doma ? nase : ich,
        goly_hostia: doma ? ich : nase,
        pocet_divakov: t.kluc === 'a' ? nahodneCele(120, 640) : nahodneCele(20, 160),
      });
    }
    const zapas = await api('POST', '/api/matches', telo);
    pocetZapasov[odohrany ? 'odohrane' : 'program']++;
    if (!odohrany) continue;

    // --- Zostava ---
    const strana = doma ? 'domaci' : 'hostia';
    const kader = zamiesaj(t.hraci);
    const brankar = kader.find((h) => h.pozicia === 'brankar') ?? kader[0];
    const hraciPola = kader.filter((h) => h !== brankar && h.pozicia !== 'brankar');
    const pocetZakladnych = Math.min(11, t.hraci.length - 3);
    const zakladni = [brankar, ...hraciPola.slice(0, pocetZakladnych - 1)];
    const lavicka = hraciPola.slice(pocetZakladnych - 1, pocetZakladnych + 4);
    const kapitan = zakladni.find((h) => h.pozicia === 'obranca') ?? zakladni[1];

    // --- Striedania ---
    const striedania = lavicka.slice(0, Math.min(3, lavicka.length)).map((prichadza, i) => ({
      prichadza, odchadza: zakladni[zakladni.length - 1 - i], minuta: nahodneCele(55, 85),
    }));
    const naIhrisku = (h, minuta) => {
      const von = striedania.find((s) => s.odchadza === h);
      const dnu = striedania.find((s) => s.prichadza === h);
      if (dnu) return minuta >= dnu.minuta;
      if (von) return minuta < von.minuta;
      return zakladni.includes(h);
    };
    const minutyHraca = (h) => {
      const von = striedania.find((s) => s.odchadza === h);
      const dnu = striedania.find((s) => s.prichadza === h);
      if (dnu) return 90 - dnu.minuta;
      if (von) return von.minuta;
      return zakladni.includes(h) ? 90 : null;
    };
    await api('PUT', `/api/matches/${zapas.id}/lineup`, {
      zostava: [
        ...zakladni.map((h) => ({ strana, hrac_id: h.id, zaradenie: 'zakladna', odohrane_minuty: minutyHraca(h), kapitan: h === kapitan })),
        ...lavicka.map((h) => ({ strana, hrac_id: h.id, zaradenie: 'lavicka', odohrane_minuty: minutyHraca(h) })),
      ],
    });

    // --- Štatistiky: góly, asistencie, karty, striedania ---
    const statistiky = [];
    const priebeh = [{ minuta: 0, text: 'Výkop zápasu.' }];
    const minuty = zamiesaj(Array.from({ length: 88 }, (_, i) => i + 2)).slice(0, nase + ich).sort((a, b) => a - b);
    const poradieGolov = zamiesaj([...Array(nase).fill('nas'), ...Array(ich).fill('ich')]);
    const vahy = { utocnik: 5, zaloznik: 3, obranca: 1, brankar: 0 };
    poradieGolov.forEach((kto, i) => {
      const minuta = minuty[i];
      if (kto === 'nas') {
        const kandidati = [...zakladni, ...lavicka].filter((h) => naIhrisku(h, minuta) && h.pozicia !== 'brankar');
        const vazene = kandidati.flatMap((h) => Array(vahy[h.pozicia] ?? 1).fill(h));
        const strelec = vyber(vazene.length ? vazene : kandidati);
        statistiky.push({ typ: 'gol', hrac_id: strelec.id, minuta });
        const asistent = rnd() < 0.7 ? vyber(kandidati.filter((h) => h !== strelec)) : null;
        if (asistent) statistiky.push({ typ: 'asistencia', hrac_id: asistent.id, minuta });
      } else {
        const m = meno(t.zeny);
        statistiky.push({ typ: 'gol', hostujuci_hrac_meno: `${m.meno} ${m.priezvisko}`, hostujuci_hrac_cislo: nahodneCele(7, 23), minuta });
      }
    });
    for (let i = 0; i < nahodneCele(0, 3); i++) {
      const minuta = nahodneCele(10, 89);
      const hrac = vyber(zakladni.filter((h) => naIhrisku(h, minuta)));
      statistiky.push({ typ: 'zlta_karta', hrac_id: hrac.id, minuta });
    }
    for (const s of striedania) {
      statistiky.push({ typ: 'striedanie', hrac_id: s.prichadza.id, striedany_hrac_id: s.odchadza.id, minuta: s.minuta });
    }
    await api('PUT', `/api/matches/${zapas.id}/statistics`, { statistiky });

    // --- Priebeh zápasu (A-tím a ženy) ---
    // Len komentár - góly, karty a striedania šablóna doplní zo štatistík
    if (t.kluc === 'a' || t.kluc === 'z') {
      for (const text of zamiesaj(KOMENTARE).slice(0, nahodneCele(2, 4))) priebeh.push({ minuta: nahodneCele(5, 88), text });
      priebeh.push({ minuta: 45, text: 'Polčas.' });
      priebeh.push({ minuta: 90, text: `Koniec zápasu, konečné skóre ${doma ? `${nase}:${ich}` : `${ich}:${nase}`}.` });
      priebeh.sort((a, b) => a.minuta - b.minuta);
      await api('PUT', `/api/matches/${zapas.id}/events`, { udalosti: priebeh });
    }
    if (t.kluc === 'a') odohraneA.push({ ...zapas, _supar: supar.nazov, _nase: nase, _ich: ich, _doma: doma, _statistiky: statistiky, _hraci: t.hraci });
  }
  console.log(`  ${t.nazov}: ${t.odohrane} odohraných, ${t.program} v programe`);
}
console.log(`  nové zápasy: ${pocetZapasov.odohrane} odohraných, ${pocetZapasov.program} v programe`);

// ===================================================================
// 6. Rubriky a články
// ===================================================================

krok('Rubriky a články');

const rubrikyApi = await zoznam('/api/categories');
const RUBRIKY = {};
for (const [nazov, popis] of [
  ['Novinky', 'Správy z klubu'], ['A-tím', 'Zápasy a dianie okolo A-tímu'], ['Mládež', 'Prípravka, žiaci a dorast'],
  ['Ženy', 'Ženský futbal v klube'], ['Rozhovory', 'Rozhovory s hráčmi a trénermi'], ['Klub', 'Klub, areál a fanúšikovia'],
]) {
  const { zaznam } = await najdiAleboVytvor(rubrikyApi, nazov, () => api('POST', '/api/admin/categories', { nazov, popis }));
  RUBRIKY[nazov] = zaznam.id;
}

const clankyApi = [];
for (let page = 1; ; page++) {
  const strana = await zoznam(`/api/admin/articles?limit=100&page=${page}`);
  clankyApi.push(...strana);
  if (strana.length < 100) break;
}
const timPodla = (kluc) => TIMY.find((t) => t.kluc === kluc)?.id ?? null;
const P = (...odseky) => odseky.map((o) => (o.startsWith('<') ? o : `<p>${o}</p>`)).join('\n');

const CLANKY = [
  { nazov: `Nová sezóna ${NAZOV_SEZONY} je tu: čo nás čaká`, rubrika: 'Klub', posun: -48, featured: true, tagy: ['sezóna', 'klub'],
    perex: 'Šesť družstiev, nový tréner A-tímu a zrekonštruovaná tribúna. Prinášame prehľad všetkého, čo sezóna prinesie.',
    obsah: P('Klub vstupuje do sezóny so šiestimi družstvami - od prípravky až po A-tím mužov. Po prvý raz v histórii máme aj ženský tím v druhej lige.',
      '<h2>Ciele A-tímu</h2>', 'A-tím chce útočiť na prvú päťku tabuľky 4. ligy Západ a ďalej dávať priestor odchovancom.',
      '<ul><li>A-tím: prvá päťka tabuľky</li><li>Dorast: udržať sa v III. lige</li><li>Prípravka: čo najviac detí na ihrisku</li></ul>',
      '<blockquote>„Chceme, aby si fanúšikovia každú sobotu odniesli zo štadióna dobrý pocit.“ - predseda klubu</blockquote>') },
  { nazov: 'Do kádra A-tímu prichádzajú traja noví hráči', rubrika: 'A-tím', tim: 'a', posun: -45, tagy: ['prestupy'],
    perex: 'Káder posilnili skúsený stredopoliar, rýchly krídelník a mladý brankár z dorastu.',
    obsah: P('Počas leta sa tréner rozhodol posilniť stred poľa a krídla. Všetci traja noví hráči absolvovali celú letnú prípravu.',
      'Mladý brankár prichádza z nášho dorastu a bude dvojkou za skúsenou jednotkou.', 'Hráčom želáme veľa úspechov v novom drese!') },
  { nazov: 'Rozhovor s trénerom: Chceme hrať aktívny futbal', rubrika: 'Rozhovory', tim: 'a', posun: -41, featured: true, tagy: ['rozhovor', 'tréner'],
    perex: 'Hlavný tréner A-tímu o príprave, hernom štýle a o tom, prečo verí mladým hráčom.',
    obsah: P('<h2>Ako hodnotíte letnú prípravu?</h2>', 'Bola náročná, ale chalani ju zvládli výborne. Odohrali sme päť prípravných zápasov a videl som progres.',
      '<h2>Aký futbal chcete hrať?</h2>', 'Aktívny, s presingom a rýchlym prechodom do útoku. Nechceme čakať na chyby súpera, chceme ich vynútiť.',
      '<h2>Odkaz pre fanúšikov?</h2>', 'Príďte nás podporiť. Na domácom ihrisku chceme byť nepríjemným súperom pre každého.') },
  { nazov: 'Nábor detí do prípravky – príďte si zahrať', rubrika: 'Mládež', tim: 'u11', posun: -38, tagy: ['nábor', 'mládež'],
    perex: 'Hľadáme chlapcov a dievčatá vo veku 5 až 10 rokov. Tréningy sú dvakrát týždenne na umelej tráve.',
    obsah: P('Nábor prebieha každý utorok a štvrtok o 16:30 na umelej tráve v areáli štadióna.', 'Stačí si priniesť športové oblečenie, halovú alebo turfovú obuv a fľašu s vodou.',
      '<h3>Čo deti čaká</h3>', '<ol><li>Hry s loptou a pohybová príprava</li><li>Turnaje prípraviek</li><li>Letný kemp</li></ol>') },
  { nazov: 'Ženy vstúpili do sezóny víťazne', rubrika: 'Ženy', tim: 'z', posun: -34, tagy: ['ženy'],
    perex: 'Náš ženský tím zvládol úvodné kolo druhej ligy a potvrdil dobrú formu z prípravy.',
    obsah: P('Zápas mal od začiatku jasného favorita. Dievčatá kontrolovali loptu a súperky pustili k strele len zriedka.', 'Trénerka chválila najmä disciplínu v obrane a rýchle kombinácie.') },
  { nazov: 'Rekonštrukcia tribúny je hotová', rubrika: 'Klub', posun: -30, tagy: ['štadión', 'areál'],
    perex: 'Fanúšikovia budú sedieť pod novou strechou. Na tribúnu pribudlo 450 sedadiel v klubových farbách.',
    obsah: P('Rekonštrukcia trvala štyri mesiace a financovala ju obec spolu s partnermi klubu.', 'Okrem strechy a sedadiel pribudli nové šatne pre rozhodcov a bezbariérový vstup.',
      '<h2>Poďakovanie</h2>', 'Ďakujeme všetkým partnerom a dobrovoľníkom, ktorí pri rekonštrukcii pomáhali.') },
  { nazov: 'Dorastenci postúpili do štvrťfinále pohára', rubrika: 'Mládež', tim: 'u19', posun: -26, tagy: ['dorast', 'pohár'],
    perex: 'Starší dorast zvládol pohárové osemfinále po penaltách a teší sa na ďalšieho súpera.',
    obsah: P('Po 90 minútach bolo skóre nerozhodné 2:2. V penaltovom rozstrele sa vyznamenal náš brankár, ktorý chytil dva pokutové kopy.') },
  { nazov: 'Kapitán pred derby: Rozhodnú detaily', rubrika: 'Rozhovory', tim: 'a', posun: -22, tagy: ['rozhovor', 'derby'],
    perex: 'Kapitán A-tímu o atmosfére pred derby, o šatni a o tom, čo tímu chýba.',
    obsah: P('Derby je pre nás najdôležitejší zápas jesene. Každý v šatni vie, čo to znamená pre fanúšikov.', 'Musíme byť sústredení od prvej minúty. Rozhodnú štandardné situácie a disciplína.') },
  { nazov: 'Permanentky na jesennú časť v predaji', rubrika: 'Klub', posun: -19, tagy: ['vstupenky'],
    perex: 'Permanentka na všetky domáce zápasy A-tímu stojí 25 eur, deti do 15 rokov majú vstup zadarmo.',
    obsah: P('Permanentky kúpite v klubovej kancelárii alebo pred každým domácim zápasom pri pokladni.', '<table><thead><tr><th>Typ</th><th>Cena</th></tr></thead><tbody><tr><td>Dospelí</td><td>25 €</td></tr><tr><td>Študenti a dôchodcovia</td><td>15 €</td></tr><tr><td>Deti do 15 rokov</td><td>zadarmo</td></tr></tbody></table>') },
  { nazov: 'Letný kemp mládeže v číslach', rubrika: 'Mládež', posun: -16, tagy: ['kemp', 'mládež'],
    perex: '84 detí, 5 dní, 12 trénerov a nespočetne veľa gólov. Takto vyzeral letný kemp.',
    obsah: P('Kemp sa niesol v znamení futbalu, ale aj výletov a súťaží. Deti si odniesli diplomy a klubové tričká.', 'Ďakujeme rodičom za dôveru a trénerom za obetavú prácu.') },
  { nazov: 'Fanúšikovia, ďakujeme za podporu!', rubrika: 'Novinky', posun: -12, tagy: ['fanúšikovia'],
    perex: 'Na poslednom domácom zápase prišlo vyše 600 divákov - najviac za posledné tri roky.',
    obsah: P('Atmosféra bola fantastická. Fanúšikovia pripravili choreografiu a spievali celý zápas.', 'Ďakujeme a tešíme sa na vás aj pri ďalších zápasoch.') },
  { nazov: `Nové dresy pre sezónu ${NAZOV_SEZONY}`, rubrika: 'Novinky', posun: -9, featured: true, tagy: ['fanshop', 'dresy'],
    perex: 'Domáci dres je tradične zelený, vonkajší biely. Oba si môžete kúpiť vo fanshope aj s menom a číslom.',
    obsah: P('Dresy navrhli fanúšikovia v súťaži, do ktorej prišlo viac ako 40 návrhov.', '<p><a href="/obchod">Pozrite si fanshop</a> a vyberte si svoju veľkosť.</p>') },
  { nazov: 'Trénerka žien: Dievčatá urobili obrovský pokrok', rubrika: 'Rozhovory', tim: 'z', posun: -6, tagy: ['rozhovor', 'ženy'],
    perex: 'Hlavná trénerka ženského tímu o tom, ako sa za rok zmenil ženský futbal v klube.',
    obsah: P('Pred rokom sme začínali s desiatimi hráčkami, dnes ich máme osemnásť a ďalšie pribúdajú.', 'Najväčší pokrok vidím v taktickej disciplíne a v sebavedomí na lopte.') },
  { nazov: 'Brigáda na štadióne – hľadáme dobrovoľníkov', rubrika: 'Klub', posun: -3, tagy: ['brigáda', 'dobrovoľníci'],
    perex: 'V sobotu ráno upraceme areál pred zimou. Každá pomocná ruka je vítaná, guláš je zabezpečený.',
    obsah: P('Stretneme sa o 9:00 pri hlavnej bráne. Náradie zabezpečí klub, stačí pracovné oblečenie.') },
  { nazov: 'Zápasový program na najbližšie týždne', rubrika: 'Novinky', posun: -1, tagy: ['program'],
    perex: 'Prehľad zápasov všetkých našich družstiev. Prídite povzbudiť!',
    obsah: P('Kompletný program nájdete v sekcii <a href="/matches">Zápasy</a> a v <a href="/calendar">kalendári</a>.') },
  { nazov: 'Plán zimnej prípravy (koncept)', rubrika: 'A-tím', tim: 'a', posun: 0, status: 'draft', tagy: ['príprava'],
    perex: 'Koncept - zatiaľ nepublikovaný článok na test administrácie.',
    obsah: P('Zimná príprava začne v polovici januára. Termíny prípravných zápasov doplníme.') },
  { nazov: 'Pozvánka na výročnú členskú schôdzu', rubrika: 'Klub', posun: 3, status: 'scheduled', tagy: ['schôdza'],
    perex: 'Naplánovaný článok - zverejní sa sám o tri dni.',
    obsah: P('Výročná členská schôdza sa uskutoční v klubovni. Program: správa o činnosti, hospodárenie, voľby.') },
];

let noveClanky = 0;
const vytvorClanok = async (c, i) => {
  if (clankyApi.some((x) => x.nazov === c.nazov)) return clankyApi.find((x) => x.nazov === c.nazov);
  const clanok = await api('POST', '/api/admin/articles', {
    nazov: c.nazov,
    excerpt: c.perex,
    obsah: c.obsah,
    obrazok: c.obrazok ?? fotkaC(i),
    kategoria_id: RUBRIKY[c.rubrika],
    tim_id: c.tim ? timPodla(c.tim) : null,
    status: c.status ?? 'published',
    publikovany_datum: iso(datum(c.posun, 9 + (i % 8), (i * 7) % 60)),
    featured: Boolean(c.featured),
    komentare_povolene: true,
    tags: c.tagy ?? [],
    meta_description: c.perex.slice(0, 160),
  });
  clankyApi.push(clanok);
  noveClanky++;
  return clanok;
};
for (const [i, c] of CLANKY.entries()) await vytvorClanok(c, i);

// Správy z posledných troch zápasov A-tímu, prepojené so zápasom
const reporty = odohraneA.filter((z) => z._supar).slice(-3);
for (const [i, z] of reporty.entries()) {
  const vysledok = z._nase > z._ich ? 'vyhral' : z._nase < z._ich ? 'prehral' : 'remizoval';
  const skore = z._doma ? `${z._nase}:${z._ich}` : `${z._ich}:${z._nase}`;
  const nazov = {
    vyhral: `A-tím zdolal ${z._supar} ${skore}`,
    prehral: `Prehra s ${z._supar} ${skore}, tím sa chce rýchlo zdvihnúť`,
    remizoval: `Remíza ${skore} so ${z._supar}`,
  }[vysledok];
  const strelci = z._statistiky.filter((s) => s.typ === 'gol' && s.hrac_id)
    .map((s) => `${menoHraca(z._hraci.find((h) => h.id === s.hrac_id))} (${s.minuta}.)`);
  const clanok = await vytvorClanok({
    nazov, rubrika: 'A-tím', tim: 'a', posun: Math.round((new Date(z.datum_cas) - Date.now()) / DEN) + 1, tagy: ['A-tím', 'zápas'],
    featured: i === reporty.length - 1,
    perex: `${z._doma ? 'Doma' : 'Vonku'} sme ${{ vyhral: 'zvíťazili', prehral: 'prehrali', remizoval: 'remizovali' }[vysledok]} ${skore}. ${strelci.length ? `Góly: ${strelci.join(', ')}.` : 'Gól sme nestrelili.'}`,
    obsah: P(`Zápas ${z.kolo ? `${z.kolo}. kola ` : ''}proti ${z._supar} sledovalo ${z.pocet_divakov ?? 'vyše 100'} divákov.`,
      strelci.length ? `Za náš tím skórovali: ${strelci.join(', ')}.` : 'Napriek tlaku sa nám nepodarilo skórovať.',
      '<h2>Hlas trénera</h2>', vysledok === 'vyhral' ? '„Som spokojný s nasadením aj s výsledkom. Chalani hrali ako tím.“' : '„Musíme sa z toho poučiť a v ďalšom zápase ukázať reakciu.“'),
    obrazok: fotkaC(i * 5 + (vysledok === 'vyhral' ? 1 : 0)),
  }, 40 + i);
  await skus('prepojenie článku so zápasom', () => api('PUT', `/api/matches/${z.id}`, { clanok_id: clanok.id }));
}
console.log(`  nové články: ${noveClanky}, spolu: ${clankyApi.length}`);

// Komentáre pod prvými článkami
await skus('komentáre', async () => {
  const prvy = clankyApi.find((c) => c.nazov.startsWith('Nová sezóna'));
  if (!prvy) return;
  const existujuce = naZoznam(await api('GET', `/api/comments/clanok/${prvy.id}`));
  if (existujuce.length) return;
  for (const [autor, obsah] of [['Jozef', 'Držím palce, nech sa darí celú sezónu!'], ['Mária', 'Super, že máme aj ženský tím. Prídeme povzbudiť.'], ['Tibor', 'Kedy bude v predaji permanentka?']]) {
    await api('POST', '/api/comments', { clanok_id: prvy.id, autor_meno: autor, obsah });
  }
});

// ===================================================================
// 7. Fotogalérie
// ===================================================================

krok('Fotogalérie');

const galerieApi = await zoznam('/api/admin/galleries?limit=100');
const GALERIE = [
  { nazov: 'Domáci zápas A-tímu', tim: 'a', fotky: [0, 5, 8, 14, 1, 10, 3], zapas: reporty.at(-1)?.id },
  { nazov: 'Letný kemp mládeže', tim: 'u11', fotky: [4, 11, 20, 27, 9, 2] },
  { nazov: 'Ženy – jesenná časť', tim: 'z', fotky: [16, 17, 21, 24, 30] },
  { nazov: 'Tréning pod svetlami', tim: 'a', fotky: [2, 9, 18, 25, 13, 29] },
  { nazov: 'Fanúšikovia na tribúne', tim: null, fotky: [3, 12, 19, 28, 6] },
  { nazov: 'Nová tribúna', tim: null, fotky: [6, 13, 22, 23] },
];
for (const g of GALERIE) {
  if (galerieApi.some((x) => x.nazov === g.nazov)) continue;
  const galeria = await api('POST', '/api/admin/galleries', {
    // Galéria patrí len jednému objektu - zápas má prednosť pred tímom
    nazov: g.nazov, popis: `Fotky: ${g.nazov.toLowerCase()}.`, zobrazit_na_webe: true,
    ...(g.zapas ? { zapas_id: g.zapas } : { tim_id: g.tim ? timPodla(g.tim) : null }),
  });
  const ids = g.fotky.map((i) => media.get(FOTKY[i % FOTKY.length])?.id).filter(Boolean);
  await api('POST', `/api/admin/galleries/${galeria.id}/images/from-media`, { media_ids: ids });
  if (g.zapas) await skus('prepojenie galérie so zápasom', () => api('PUT', `/api/matches/${g.zapas}`, { fotogaleria_id: galeria.id }));
  console.log(`  ${g.nazov}: ${ids.length} fotiek`);
}

// ===================================================================
// 8. Videá
// ===================================================================

krok('Videá');

// Krátke filmy Blender Foundation (licencia CC BY) - verejne dostupné
// videá, ktoré sa dajú vložiť; názvy a náhľady zadáme sami.
const videaApi = await zoznam('/api/videos?limit=100');
const VIDEA = [
  { nazov: 'Zostrih: A-tím – víkendový zápas', url: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ', kategoria: 'Zostrihy', dlzka: 634, fotka: 0 },
  { nazov: 'Rozhovor s trénerom po zápase', url: 'https://www.youtube.com/watch?v=eRsGyueVLvQ', kategoria: 'Rozhovory', dlzka: 888, fotka: 2 },
  { nazov: 'Klub TV: deň s prípravkou', url: 'https://www.youtube.com/watch?v=R6MlUcmOul8', kategoria: 'Klub TV', dlzka: 734, fotka: 4 },
  { nazov: 'Najkrajšie góly jesene', url: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ&t=60', kategoria: 'Zostrihy', dlzka: 412, fotka: 1 },
];
for (const v of VIDEA) {
  if (videaApi.some((x) => x.nazov === v.nazov)) continue;
  await api('POST', '/api/videos', {
    nazov: v.nazov, url: v.url, kategoria: v.kategoria, dlzka: v.dlzka, nahlad: fotkaC(v.fotka),
    popis: `${v.nazov}. Ukážkové video na test (krátky film Blender Foundation, CC BY).`, publikovane: true,
  });
}
console.log(`  videí: ${VIDEA.length}`);

// ===================================================================
// 9. Kalendár - tréningy a klubové udalosti
// ===================================================================

krok('Udalosti v kalendári');

const udalostiApi = await zoznam('/api/calendar/events?limit=200');
const UDALOSTI = [
  { nazov: 'Tréning A-tímu', tim: 'a', posun: -12, od: '17:30', do: '19:00', opakovanie: 'tyzdenne', doDni: 90, miesto: 'Štadión Pod Hájom' },
  { nazov: 'Tréning A-tímu (streda)', tim: 'a', posun: -10, od: '17:30', do: '19:00', opakovanie: 'tyzdenne', doDni: 90, miesto: 'Umelá tráva' },
  { nazov: 'Tréning žien', tim: 'z', posun: -11, od: '18:00', do: '19:30', opakovanie: 'tyzdenne', doDni: 90, miesto: 'Umelá tráva' },
  { nazov: 'Tréning prípravky', tim: 'u11', posun: -9, od: '16:30', do: '17:30', opakovanie: 'tyzdenne', doDni: 90, miesto: 'Umelá tráva' },
  { nazov: 'Brigáda na štadióne', posun: doSoboty, od: '09:00', do: '13:00', miesto: 'Štadión Pod Hájom', popis: 'Upratovanie areálu pred zimou. Guláš zabezpečený.' },
  { nazov: 'Nábor detí do prípravky', tim: 'u11', posun: 4, od: '16:30', do: '18:00', miesto: 'Umelá tráva', popis: 'Pre deti vo veku 5 – 10 rokov.' },
  { nazov: 'Výročná členská schôdza', posun: 18, od: '18:00', do: '20:00', miesto: 'Klubovňa', popis: 'Správa o činnosti, hospodárenie a voľby výboru.' },
  { nazov: 'Mikulášsky turnaj prípraviek', tim: 'u11', posun: 55, od: '09:00', do: '14:00', miesto: 'Športová hala Dolina' },
  { nazov: 'Letný futbalový kemp', posun: -70, od: '08:00', do: '16:00', miesto: 'Štadión Pod Hájom', opakovanie: 'denne', doDni: -66, popis: 'Päťdňový kemp pre deti.' },
];
for (const u of UDALOSTI) {
  if (udalostiApi.some((x) => x.nazov === u.nazov)) continue;
  await api('POST', '/api/calendar/events', {
    nazov: u.nazov, popis: u.popis ?? null, miesto: u.miesto, tim_id: u.tim ? timPodla(u.tim) : null,
    datum: isoDen(datum(u.posun)), cas_od: u.od, cas_do: u.do,
    opakovanie: u.opakovanie ?? 'ziadne', opakovanie_do: u.opakovanie ? isoDen(datum(u.doDni)) : null,
  });
}
console.log(`  udalostí: ${UDALOSTI.length}`);

// ===================================================================
// 10. Turnaj s pavúkom
// ===================================================================

krok('Turnaj');

await skus('turnaj', async () => {
  const turnaje = await zoznam('/api/tournaments?limit=100');
  const NAZOV = `Zimný turnaj o pohár starostu ${rokSezony + 1}`;
  if (turnaje.some((x) => x.nazov === NAZOV)) return;
  const turnaj = await api('POST', '/api/tournaments', {
    nazov: NAZOV, typ: 'single_elimination', status: 'prebiehajuci', ma_tretie_miesto: true, zobrazit_na_webe: true,
    datum_start: isoDen(datum(-20)), datum_koniec: isoDen(datum(25)), logo: cesta('test-fotka-08'),
    popis: 'Tradičný turnaj ôsmich tímov vyraďovacím systémom. Finále na Štadióne Pod Hájom.',
  });
  const timy = [{ tim_id: timPodla('a') }, ...SUPERI_A.slice(0, 7).map(([nazov], i) => ({ nazov, logo: cesta(`test-erb-${i + 1}`) }))];
  await api('POST', `/api/tournaments/${turnaj.id}/bracket/generate`, { timy });
  // Štvrťfinále a prvé semifinále odohrané, druhé semifinále a finále čakajú
  for (const kod of ['k1z1', 'k1z2', 'k1z3', 'k1z4', 'k2z1']) {
    const a = nahodneCele(0, 4);
    let b = nahodneCele(0, 3);
    if (a === b) b = (b + 1) % 5;
    await api('PATCH', `/api/tournaments/${turnaj.id}/bracket/match/${kod}`, { skore_domaci: a, skore_hostia: b });
  }
  console.log(`  ${NAZOV}: pavúk 8 tímov, odohrané štvrťfinále a jedno semifinále`);
});

// ===================================================================
// 11. Partneri, dokumenty, anketa
// ===================================================================

krok('Partneri, dokumenty a anketa');

const urovneApi = await zoznam('/api/sponsor-levels');
const UROVNE = {};
for (const [i, [nazov, velkost]] of [['Generálny partner', 'velke'], ['Hlavný partner', 'stredne'], ['Partner', 'male'], ['Mediálny partner', 'male']].entries()) {
  const { zaznam } = await najdiAleboVytvor(urovneApi, nazov, () => api('POST', '/api/sponsor-levels', { nazov, velkost_loga: velkost, poradie: i + 1 }));
  UROVNE[nazov] = zaznam.id;
}
const sponzoriApi = await zoznam('/api/sponsors?limit=100');
for (const [i, [nazov, , uroven, popis]] of PARTNERI.entries()) {
  await najdiAleboVytvor(sponzoriApi, nazov, () =>
    api('POST', '/api/sponsors', {
      nazov, popis, uroven_id: UROVNE[uroven], logo: cesta(`test-logo-${i + 1}`), web_url: 'https://example.com', poradie: i + 1, aktivity: true,
    }),
  );
}
console.log(`  partnerov: ${PARTNERI.length}`);

const katDokApi = await zoznam('/api/document-categories');
const KAT_DOK = {};
for (const [i, nazov] of ['Klubové dokumenty', 'Prihlášky a tlačivá', 'Výročné správy'].entries()) {
  const { zaznam } = await najdiAleboVytvor(katDokApi, nazov, () => api('POST', '/api/document-categories', { nazov, poradie: i + 1 }));
  KAT_DOK[nazov] = zaznam.id;
}
const dokumentyApi = await zoznam('/api/documents?limit=100');
for (const [i, d] of DOKUMENTY.entries()) {
  await najdiAleboVytvor(dokumentyApi, d.nazov, () =>
    api('POST', '/api/documents', {
      nazov: d.nazov, popis: d.popis, subor_url: cesta(d.subor), typ_suboru: 'pdf', velkost_kb: velkostKb(d.subor),
      kategoria_id: KAT_DOK[d.kat], kategoria: d.kat, verejny: true, poradie: i + 1, aktivity: true,
    }),
  );
}
console.log(`  dokumentov: ${DOKUMENTY.length}`);

await skus('anketa', async () => {
  const ankety = await zoznam('/api/polls?limit=50');
  const otazka = 'Kto bol podľa vás hráčom mesiaca?';
  if (ankety.some((a) => a.otazka === otazka)) return;
  const kandidati = (TIMY[0].hraci ?? []).filter((h) => h.pozicia !== 'brankar').slice(0, 4);
  await api('POST', '/api/polls', {
    otazka, otvorena: true, publikovana: true, platna_od: isoDen(datum(-5)), platna_do: isoDen(datum(20)),
    moznosti: kandidati.map((h, i) => ({ id: `m${i + 1}`, text: menoHraca(h), hlasy: nahodneCele(5, 60) })),
  });
});

// ===================================================================
// 12. Fanshop
// ===================================================================

krok('Fanshop');

const katEshopApi = await zoznam('/api/admin/eshop/kategorie');
const KAT_ESHOP = {};
for (const [i, nazov] of ['Dresy', 'Oblečenie', 'Doplnky'].entries()) {
  const { zaznam } = await najdiAleboVytvor(katEshopApi, nazov, () => api('POST', '/api/admin/eshop/kategorie', { nazov, poradie: i + 1 }));
  KAT_ESHOP[nazov] = zaznam.id;
}
const produktyApi = await zoznam('/api/admin/eshop/produkty?limit=200');
for (const [i, p] of PRODUKTY.entries()) {
  await najdiAleboVytvor(produktyApi, p.nazov, () =>
    api('POST', '/api/admin/eshop/produkty', {
      nazov: p.nazov, kratky_popis: p.kratky, popis: p.popis, cena: p.cena, povodna_cena: p.povodna,
      obrazok: cesta(`test-produkt-${i + 1}`), kategoria_id: KAT_ESHOP[p.kat], sklad: p.sklad,
      odporucany: p.odporucany, aktivny: true, poradie: i + 1, kod: `FKD-${String(i + 1).padStart(3, '0')}`,
      vlastnosti: [
        ...(p.velkosti ? [{ nazov: 'Veľkosť', typ: 'vyber', hodnoty: ['S', 'M', 'L', 'XL', 'XXL'].map((v) => ({ nazov: v, priplatok: v === 'XXL' ? 2 : 0 })) }] : []),
        ...(p.potlac ? [{ nazov: 'Meno a číslo na chrbte', typ: 'text', priplatok: 10, max_dlzka: 20 }] : []),
      ],
    }),
  );
}
console.log(`  produktov: ${PRODUKTY.length}`);

await skus('doprava a platby', async () => {
  const dorucenia = await zoznam('/api/admin/eshop/dorucenia');
  if (!dorucenia.length) {
    dorucenia.push(await api('POST', '/api/admin/eshop/dorucenia', { nazov: 'Osobný odber na štadióne', popis: 'V klubovej kancelárii počas domácich zápasov.', cena: 0, vyzaduje_adresu: false, aktivny: true, poradie: 1 }));
    dorucenia.push(await api('POST', '/api/admin/eshop/dorucenia', { nazov: 'Kuriér', popis: 'Doručenie do 3 pracovných dní.', cena: 4.9, zadarmo_od: 60, vyzaduje_adresu: true, aktivny: true, poradie: 2 }));
  }
  const platby = await zoznam('/api/admin/eshop/platby');
  if (!platby.length) {
    await api('POST', '/api/admin/eshop/platby', { nazov: 'Bankový prevod', typ: 'prevod', poplatok: 0, aktivny: true, poradie: 1, pokyny: 'Číslo účtu a variabilný symbol dostanete v potvrdení objednávky.' });
    await api('POST', '/api/admin/eshop/platby', { nazov: 'Dobierka', typ: 'dobierka', poplatok: 1.5, aktivny: true, poradie: 2, dorucenia: dorucenia.filter((d) => d.vyzaduje_adresu).map((d) => d.id) });
    await api('POST', '/api/admin/eshop/platby', { nazov: 'Hotovosť pri odbere', typ: 'hotovost', poplatok: 0, aktivny: true, poradie: 3, dorucenia: dorucenia.filter((d) => !d.vyzaduje_adresu).map((d) => d.id) });
  }
});

// ===================================================================
// 13. Stránky a menu
// ===================================================================

krok('Stránky a menu');

const strankyApi = naZoznam(await api('GET', '/api/admin/pages?limit=200'));
let blokId = 0;
const blok = (typ, data, extra = {}) => ({ id: `to-${++blokId}`, typ, data, pozadie: 'biele', skryty: false, ...extra });
const STRANKY = [
  {
    nazov: 'O klube', slug: 'o-klube',
    bloky: [
      blok('nadpis', { stitok: 'O nás', nadpis: `${KLUB} – futbal pre celú dolinu`, text: 'Od roku 1931 hráme futbal na rovnakom mieste pod hájom. Dnes máme šesť družstiev a vyše 180 hráčov.', zarovnanie: 'vlavo' }),
      blok('obrazok', { obrazok: fotkaC(6), popis: 'Štadión Pod Hájom po rekonštrukcii', sirka: 'plna', pomer: '21-9' }),
      blok('obrazok_text', { obrazok: fotkaC(4), stitok: 'Mládež', nadpis: 'Vychovávame vlastných hráčov', html: '<p>Polovica kádra A-tímu prešla našou mládežou. Deti trénujú pod vedením licencovaných trénerov.</p>', strana: 'vlavo', tlacidlo: 'Nábor detí', odkaz: '/teams' }),
      blok('obrazok_text', { obrazok: fotkaC(3), stitok: 'Fanúšikovia', nadpis: 'Tribúna plná domácich', html: '<p>Na domáce zápasy chodí v priemere 350 divákov. Permanentka na jeseň stojí 25 eur.</p>', strana: 'vpravo', tlacidlo: 'Program zápasov', odkaz: '/matches' }, { pozadie: 'sive' }),
      blok('hraci', { nadpis: 'Káder A-tímu', tim_id: timPodla('a'), pocet: 8, odkaz_vsetky: true }),
    ],
  },
  {
    nazov: 'Kontakt', slug: 'kontakt',
    bloky: [
      blok('nadpis', { stitok: 'Kontakt', nadpis: 'Napíšte nám', text: 'Klubová kancelária je otvorená v pondelok a štvrtok 16:00 – 18:00 a počas domácich zápasov.', zarovnanie: 'vlavo' }),
      blok('kontakt', { nadpis: 'Kontaktné údaje', text: 'Športová 12, Dolina', mapa: true, fakturacne: true }),
      blok('stadion', { stadion_id: stadion.id, text: '<h2>Ako sa k nám dostanete</h2><p>Autobusová zastávka Dolina, ihrisko je 200 metrov od nej. Parkovanie pri hlavnej bráne.</p>', mapa: true }, { pozadie: 'sive' }),
    ],
  },
];
for (const s of STRANKY) {
  if (strankyApi.some((x) => x.slug === s.slug)) continue;
  strankyApi.push(await api('POST', '/api/admin/pages', { nazov: s.nazov, slug: s.slug, obsah: '', publikovany: true, v_menu: true, bloky: s.bloky }));
}

await skus('menu', async () => {
  const menu = naZoznam(await api('GET', '/api/admin/menu'));
  if (menu.length) {
    console.log('  menu už existuje - nemením ho');
    return;
  }
  const polozka = (telo) => api('POST', '/api/admin/menu', { aktivity: true, ...telo });
  const stranka = (slug) => strankyApi.find((x) => x.slug === slug)?.id;
  await polozka({ nazov: 'Novinky', typ: 'url', url: '/clanky', poradie: 1 });
  const klub = await polozka({ nazov: 'Klub', typ: 'nadpis', poradie: 2 });
  await polozka({ nazov: 'O klube', typ: 'stranka', stranka_id: stranka('o-klube'), rodic_id: klub.id, poradie: 1 });
  await polozka({ nazov: 'Partneri', typ: 'url', url: '/sponzori', rodic_id: klub.id, poradie: 2 });
  await polozka({ nazov: 'Dokumenty', typ: 'url', url: '/dokumenty', rodic_id: klub.id, poradie: 3 });
  await polozka({ nazov: 'Kontakt', typ: 'stranka', stranka_id: stranka('kontakt'), rodic_id: klub.id, poradie: 4 });
  const timy = await polozka({ nazov: 'Tímy', typ: 'url', url: '/teams', poradie: 3 });
  for (const [i, t] of TIMY.entries()) await polozka({ nazov: t.nazov, typ: 'url', url: `/teams/${t.id}`, rodic_id: timy.id, poradie: i + 1 });
  const zapasy = await polozka({ nazov: 'Zápasy', typ: 'url', url: '/matches', poradie: 4 });
  await polozka({ nazov: 'Súťaže', typ: 'url', url: '/leagues', rodic_id: zapasy.id, poradie: 1 });
  await polozka({ nazov: 'Kalendár', typ: 'url', url: '/calendar', rodic_id: zapasy.id, poradie: 2 });
  await polozka({ nazov: 'Turnaje', typ: 'url', url: '/turnaje', rodic_id: zapasy.id, poradie: 3 });
  await polozka({ nazov: 'Štatistiky', typ: 'url', url: '/stats', rodic_id: zapasy.id, poradie: 4 });
  const media = await polozka({ nazov: 'Médiá', typ: 'url', url: '/galleries', poradie: 5 });
  await polozka({ nazov: 'Fotogalérie', typ: 'url', url: '/galleries', rodic_id: media.id, poradie: 1 });
  await polozka({ nazov: 'Videá', typ: 'url', url: '/videa', rodic_id: media.id, poradie: 2 });
  await polozka({ nazov: 'Fanshop', typ: 'url', url: '/obchod', poradie: 6 });
  console.log('  vytvorené menu s podmenu');
});

// ===================================================================
// 14. Stránka so všetkými blokmi
// ===================================================================

krok('Stránka /vsetky-bloky');
const skript = fileURLToPath(new URL('./stranka-vsetky-bloky.mjs', import.meta.url));
const beh = spawnSync(process.execPath, [skript], { stdio: 'inherit', env: { ...process.env, API_URL: API, ADMIN_TOKEN: TOKEN } });
if (beh.status !== 0) console.warn('  ! stránku so všetkými blokmi sa nepodarilo vytvoriť');

console.log(`\nHotovo. Testovací obsah je pripravený na ${API}.`);
console.log('Vyskúšajte napríklad /, /teams, /matches, /leagues, /clanky, /galleries, /obchod, /o-klube a /vsetky-bloky.');
