// Umiestnenie: backend/scripts/stranka-vsetky-bloky.mjs
//
// Vytvorí (alebo prepíše) skrytú stránku /vsetky-bloky so všetkými blokmi
// stránok a ich variantmi. Nadpis každého bloku je jeho názov, takže sa
// dá rýchlo skontrolovať, ako aktívna šablóna zobrazuje každý blok.
//
// Použitie:
//   ADMIN_EMAIL=admin@klub.sk ADMIN_HESLO=... node backend/scripts/stranka-vsetky-bloky.mjs
//   (voliteľne API_URL=https://web-klubu.sk, predvolene http://localhost:3000)
//
// Obrázky berie z knižnice médií, ligu, tím a štadión z prvých záznamov.

const API = (process.env.API_URL || 'http://localhost:3000').replace(/\/$/, '');
const email = process.env.ADMIN_EMAIL;
const heslo = process.env.ADMIN_HESLO;
if (!email || !heslo) {
  console.error('Nastavte ADMIN_EMAIL a ADMIN_HESLO (účet administrátora).');
  process.exit(1);
}
const lg = await (await fetch(`${API}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, heslo }) })).json();
if (!lg.success) {
  console.error('Prihlásenie zlyhalo:', lg.message);
  process.exit(1);
}
const H = { 'Content-Type': 'application/json', Authorization: `Bearer ${lg.data.token}` };
const j = async (m, u, b) => { const r = await fetch(API + u, { method: m, headers: H, body: b ? JSON.stringify(b) : undefined }); return r.json(); };
const prvy = async (u) => ((await j('GET', u)).data ?? [])[0]?.id ?? 0;

// Ukážkový formulár pre blok Formulár
const formy = await j('GET', '/api/admin/forms');
let form = (formy.data?.formulare ?? formy.data ?? []).find?.((f) => f.slug === 'ukazkovy-formular');
if (!form) {
  const f = await j('POST', '/api/admin/forms', { nazov: 'Ukážkový formulár', slug: 'ukazkovy-formular', polia: [
    { nazov: 'Meno', typ: 'text', povinne: true }, { nazov: 'E-mail', typ: 'email', povinne: true }, { nazov: 'Správa', typ: 'textarea' } ] });
  console.log('formular', f.success, f.message);
}

const media = (await j('GET', '/api/admin/media?typ=obrazok&limit=8')).data ?? [];
const IMG = Array.from({ length: 5 }, (_, i) => media.length ? media[i % media.length].cesta : '');
const LIGA = await prvy('/api/leagues');
const TIM = await prvy('/api/teams');
const STADION = await prvy('/api/stadiums');
const L = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Klub podporuje mládež aj dospelých hráčov.';
let n = 0;
const b = (typ, data, extra = {}) => ({ id: `vb-${++n}`, typ, data, pozadie: 'biele', skryty: false, ...extra });
const html = (nazov, pozn = '') => `<h2>${nazov}</h2><p>${L} ${pozn}</p><p>Druhý odsek s <strong>tučným textom</strong>, <a href="/clanky">odkazom</a> a zoznamom:</p><ul><li>Prvá položka</li><li>Druhá položka</li></ul>`;
const karty = (k = 3) => Array.from({ length: k }, (_, i) => ({ obrazok: IMG[i], nadpis: `Karta ${i + 1}`, text: L, odkaz: '/clanky', tlacidlo: 'Viac' }));

const bloky = [
  b('nadpis', { stitok: 'Blok', nadpis: 'Nadpis sekcie', text: 'Blok „Nadpis sekcie“ – štítok, nadpis a krátky úvod. Nižšie sú všetky bloky stránky, nadpis každého je jeho názov.', zarovnanie: 'vlavo' }),
  b('text', { html: html('Text – biele pozadie') }),
  b('text', { html: html('Text – sivé pozadie') }, { pozadie: 'sive' }),
  b('text', { html: html('Text – tmavé pozadie') }, { pozadie: 'tmave' }),
  b('stlpce', { pocet: '2', html1: '<h3>Text v stĺpcoch – 2 stĺpce</h3><p>' + L + '</p>', html2: '<h3>Druhý stĺpec</h3><p>' + L + '</p>' }),
  b('stlpce', { pocet: '3', html1: '<h3>Text v stĺpcoch – 3 stĺpce</h3><p>' + L + '</p>', html2: '<h3>Druhý</h3><p>' + L + '</p>', html3: '<h3>Tretí</h3><p>' + L + '</p>' }),
  b('obrazok_text', { obrazok: IMG[0], stitok: 'Obrázok vľavo', nadpis: 'Obrázok s textom – vľavo', html: '<p>' + L + '</p>', strana: 'vlavo', tlacidlo: 'Zistiť viac', odkaz: '/o-klube' }),
  b('obrazok_text', { obrazok: IMG[1], stitok: 'Obrázok vpravo', nadpis: 'Obrázok s textom – vpravo', html: '<p>' + L + '</p>', strana: 'vpravo', tlacidlo: 'Zistiť viac', odkaz: '/o-klube' }, { pozadie: 'sive' }),
  b('karty', { nadpis: 'Karty – klasické', uvod: 'Obrázok nad textom.', stlpce: '3', vzhlad: 'klasicke' }, { polozky: karty() }),
  b('karty', { nadpis: 'Karty – text cez obrázok', stlpce: '3', vzhlad: 'prekryv' }, { polozky: karty() }),
  b('karty', { nadpis: 'Karty – vodorovné', stlpce: '2', vzhlad: 'vodorovne' }, { polozky: karty(2) }),
  b('karty', { nadpis: 'Karty – jednoduché (tmavé pozadie)', stlpce: '3', vzhlad: 'jednoduche' }, { polozky: karty(), pozadie: 'tmave' }),
  b('karty', { nadpis: 'Odkaz klubu (Karty – vzhľad klub)', stlpce: '3', vzhlad: 'klub' }, { polozky: ['História', 'Legendy', 'Trofeje'].map((x, i) => ({ obrazok: IMG[i], nadpis: x, odkaz: '/o-klube', tlacidlo: 'Objaviť' })) }),
  b('osoby', { nadpis: 'Karty osôb – veľké karty', stlpce: '4', vzhlad: 'karty' }, { polozky: ['Ján Novák', 'Peter Kováč', 'Eva Malá', 'Marek Horváth'].map((m, i) => ({ foto: IMG[i], meno: m, funkcia: ['Predseda', 'Tréner', 'Sekretárka', 'Kustód'][i], text: 'Krátky popis osoby.', email: 'info@klub.sk', telefon: '+421 900 000 000' })) }),
  b('osoby', { nadpis: 'Karty osôb – kompaktné', stlpce: '3', vzhlad: 'kompaktne' }, { polozky: ['Ján Novák', 'Peter Kováč', 'Eva Malá'].map((m, i) => ({ foto: IMG[i], meno: m, funkcia: 'Výbor klubu', email: 'info@klub.sk' })), pozadie: 'sive' }),
  b('cisla', { nadpis: 'Čísla' }, { polozky: [['1923', 'rok založenia'], ['350', 'členov'], ['14', 'tímov'], ['12', 'trofejí']].map(([h, p]) => ({ hodnota: h, popis: p })) }),
  b('cisla', { nadpis: 'Čísla – tmavé pozadie' }, { polozky: [['1923', 'rok založenia'], ['350', 'členov'], ['14', 'tímov']].map(([h, p]) => ({ hodnota: h, popis: p })), pozadie: 'tmave' }),
  b('casova_os', { nadpis: 'Časová os / história', uvod: 'Najdôležitejšie míľniky klubu.' }, { polozky: [['1923', 'Založenie klubu'], ['1968', 'Postup do krajskej súťaže'], ['2024', 'Nový štadión']].map(([r, x], i) => ({ rok: r, nadpis: x, text: L, obrazok: i === 1 ? IMG[2] : '' })) }),
  b('uspechy', { nadpis: 'Úspechy a trofeje' }, { polozky: [['2024', 'Víťaz okresného pohára', 'Finále 3:1'], ['2019', 'Postup do 5. ligy', ''], ['2015', 'Majster regiónu', 'Dorast U19']].map(([r, x, p]) => ({ rok: r, nazov: x, popis: p })) }),
  b('galeria', { nadpis: 'Galéria obrázkov', stlpce: '4' }, { polozky: IMG.concat(IMG.slice(0, 3)).map((o, i) => ({ obrazok: o, popis: `Fotka ${i + 1}` })) }),
  b('citat', { text: 'Citát – futbal je o srdci, nie o výsledkoch. Každý zápas hráme pre našich fanúšikov.', autor: 'Filip Horváth', funkcia: 'Kapitán', foto: IMG[3] }, { pozadie: 'sive' }),
  b('vyzva', { nadpis: 'Výzva s tlačidlom', text: 'Pridajte sa k nám – nábor nových hráčov prebieha celý rok.', tlacidlo: 'Prihlásiť sa', odkaz: '/registracia', obrazok: IMG[4] }),
  b('faq', { nadpis: 'Otázky a odpovede' }, { polozky: [['Kedy sú tréningy?', 'V utorok a štvrtok o 17:00.'], ['Koľko stojí členstvo?', 'Ročný príspevok je 60 €.'], ['Kde parkovať?', 'Pri štadióne je bezplatné parkovisko.']].map(([o, a]) => ({ otazka: o, odpoved: a })) }),
  b('tlacidla', { nadpis: 'Tlačidlá a dlaždice – klasické', vzhlad: 'klasicke', zarovnanie: 'vlavo', stlpce: '3' }, { polozky: [['Vstupenky', 'hlavne'], ['Permanentky', 'obrys'], ['Kontakt', 'tmave']].map(([t, s]) => ({ text: t, styl: s, odkaz: '/kontakt' })) }),
  b('tlacidla', { nadpis: 'Tlačidlá a dlaždice – obrázkové', vzhlad: 'obrazkove', zarovnanie: 'vlavo', stlpce: '3' }, { polozky: ['Mládež', 'A-tím', 'Fanshop'].map((t, i) => ({ text: t, popis: 'Krátky popis dlaždice', obrazok: IMG[i], odkaz: '/clanky' })) }),
  b('tlacidla', { nadpis: 'Tlačidlá a dlaždice – veľké', vzhlad: 'velke', zarovnanie: 'vlavo', stlpce: '4' }, { polozky: ['Zápasy', 'Tabuľka', 'Súpiska', 'Galéria'].map((t, i) => ({ text: t, popis: 'Popis', styl: ['hlavne', 'obrys', 'tmave', 'hlavne'][i], odkaz: '/matches' })) }),
  b('kroky', { nadpis: 'Postup v krokoch', uvod: 'Ako sa stať členom klubu.' }, { polozky: [['Vyplňte prihlášku', 'Online cez formulár.'], ['Príďte na tréning', 'Prvý tréning je zdarma.'], ['Zaplaťte príspevok', 'Prevodom alebo v hotovosti.']].map(([x, t]) => ({ nadpis: x, text: t })) }),
  b('vyhody', { nadpis: 'Výhody a vlastnosti', stlpce: '3' }, { polozky: [['Kvalifikovaní tréneri', 'Licencia UEFA B.'], ['Moderný areál', 'Umelá tráva a osvetlenie.'], ['Priateľská komunita', 'Akcie pre celé rodiny.']].map(([x, t]) => ({ nadpis: x, text: t })), pozadie: 'sive' }),
  b('cennik', { nadpis: 'Cenník / balíčky', uvod: 'Permanentky na sezónu.' }, { polozky: [['Základná', '40 €', 'sezóna', 'Vstup na domáce zápasy', false], ['Fanúšik', '70 €', 'sezóna', 'Vstup na zápasy\nŠál zdarma\nZľava vo fanshope', true], ['VIP', '150 €', 'sezóna', 'Miesto na tribúne\nParkovanie\nVIP salónik', false]].map(([nz, c, o, v, z]) => ({ nazov: nz, cena: c, obdobie: o, vyhody: v, tlacidlo: 'Kúpiť', odkaz: '/obchod', zvyraznene: z })) }),
  b('tabulka', { nadpis: 'Tabuľka', popis: 'Rozpis tréningov.', pruhovana: true, tabulka: { hlavicka: ['Tím', 'Deň', 'Čas', 'Ihrisko'], riadky: [['A-tím', 'Utorok', '18:00', 'Hlavné'], ['U19', 'Streda', '17:00', 'Tréningové'], ['U15', 'Štvrtok', '16:30', 'Umelá tráva']] } }),
  b('nadpis', { stitok: 'Blok nižšie', nadpis: 'Oddeľovač – čiara', text: '', zarovnanie: 'vlavo' }),
  b('oddelovac', { styl: 'ciara', velkost: 'stredna' }),
  b('nadpis', { stitok: 'Blok nižšie', nadpis: 'Podmenu stránky', text: '', zarovnanie: 'vlavo' }),
  b('podmenu', { rezim: 'vlastne', prilepene: false }, { polozky: [['Podmenu stránky', '#vb-1'], ['Karty', '#vb-9'], ['Zápasy', '#vb-40']].map(([t, o]) => ({ text: t, odkaz: o })) }),
  b('video', { nadpis: 'Video', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', popis: 'Popis videa pod prehrávačom.' }),
  b('mapa', { nadpis: 'Mapa', adresa: 'Športová 12, Bratislava' }),
  b('nadpis', { stitok: 'Blok nižšie', nadpis: 'Formulár', text: 'Vložený formulár „Ukážkový formulár“.', zarovnanie: 'vlavo' }),
  b('formular', { slug: 'ukazkovy-formular' }),
  b('clanky', { nadpis: 'Najnovšie články – karty', pocet: 3, rubrika: '', vzhlad: 'karty', odkaz_vsetky: true, text_odkazu: 'Všetky články' }),
  b('clanky', { nadpis: 'Najnovšie články – zoznam', pocet: 3, rubrika: '', vzhlad: 'zoznam', odkaz_vsetky: true }, { pozadie: 'sive' }),
  b('zapasy', { nadpis: 'Zápasy – najbližšie', tim_id: 0, rezim: 'program', pocet: 3, odkaz_vsetky: true }),
  b('zapasy', { nadpis: 'Zápasy – posledné výsledky', tim_id: 0, rezim: 'vysledky', pocet: 3, odkaz_vsetky: true }),
  b('tabulka_ligy', { nadpis: 'Tabuľka súťaže', liga_id: LIGA, kompaktna: false, odkaz_vsetky: true }),
  b('strelci', { nadpis: 'Najlepší strelci', liga_id: LIGA, typ: 'gol', pocet: 5, odkaz_vsetky: true }),
  b('statistiky_timu', { nadpis: 'Sezóna v číslach', tim_id: TIM, odkaz_vsetky: true }, { pozadie: 'sive' }),
  b('hraci', { nadpis: 'Káder', tim_id: TIM, pocet: 8, odkaz_vsetky: true }),
  b('udalosti', { nadpis: 'Udalosti z kalendára', pocet: 4, odkaz_vsetky: true }),
  b('videa', { nadpis: 'Najnovšie videá', pocet: 3, odkaz_vsetky: true }),
  b('galerie', { nadpis: 'Najnovšie fotogalérie', pocet: 3, odkaz_vsetky: true }),
  b('produkty', { nadpis: 'Produkty fanshopu', pocet: 4, odkaz_vsetky: true }),
  b('partneri', { nadpis: 'Partneri', odkaz_vsetky: true }),
  b('kontakt', { nadpis: 'Kontaktné údaje', text: 'Napíšte nám alebo sa zastavte v klubovej kancelárii.', mapa: true, fakturacne: true }),
  b('stadion', { stadion_id: STADION, text: '<h2>Štadión</h2><p>' + L + '</p>', mapa: true }, { pozadie: 'sive' }),
  b('registracia', { nadpis: 'Registrácia fanúšika / člena', text: 'Staňte sa súčasťou klubu.', typ: 'vyber' }),
  b('dve_percenta', { nadpis: '2 % z dane', text: 'Podporte náš klub 2 % z vašich daní.', prijimatel: 'FK Dolina o. z.', ico: '12345678', pravna_forma: 'Občianske združenie', sidlo: 'Športová 12, Bratislava', termin: '30. apríla', tlacivo: '/dokumenty', poznamka: 'Ďakujeme za podporu!' }),
  b('nadpis', { stitok: 'Blok nižšie', nadpis: 'Oddeľovač – medzera (veľká)', text: '', zarovnanie: 'vlavo' }),
  b('oddelovac', { styl: 'medzera', velkost: 'velka' }),
];
console.log('blokov', bloky.length);

const zoznam = await j('GET', '/api/admin/pages?limit=200');
const existuje = (zoznam.data?.stranky ?? zoznam.data?.pages ?? zoznam.data ?? []).find?.((s) => s.slug === 'vsetky-bloky');
const telo = { nazov: 'Všetky bloky', slug: 'vsetky-bloky', obsah: '', publikovany: true, v_menu: false, bloky };
const r = existuje ? await j('PUT', `/api/admin/pages/${existuje.id}`, telo) : await j('POST', '/api/admin/pages', telo);
console.log(existuje ? 'upravena' : 'vytvorena', r.success, r.message, JSON.stringify(r.errors ?? '').slice(0, 300));
