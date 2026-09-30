// Umiestnenie: backend/migrations/20260930000004-predlohy-stranok.js
//
// Pripravené stránky z blokov: Kontakt, Štadión, Nábor detí, 2 % dane
// a Časté otázky. Vzniknú ako KONCEPTY (nezverejnené) a len vtedy, ak
// klub stránku s rovnakou adresou ešte nemá - existujúci obsah sa nikdy
// neprepíše. Údaje klubu (kontakt, IČO, štadión) bloky berú z nastavení,
// texty si klub upraví a stránku zverejní v administrácii.

'use strict';

const STRANKY = [
  {
    slug: 'kontakt',
    nazov: 'Kontakt',
    meta_description: 'Kontaktné údaje klubu, adresa, mapa a kontaktné osoby.',
    bloky: [
      { id: 'kontakt-uvod', typ: 'nadpis', data: { stitok: 'Kontakt', nadpis: 'Spojte sa s nami', text: 'Máte otázku k zápasom, členstvu alebo tréningom detí? Napíšte nám alebo zavolajte.', zarovnanie: 'vlavo' } },
      { id: 'kontakt-udaje', typ: 'kontakt', data: { nadpis: '', text: '', mapa: true, fakturacne: true } },
      {
        id: 'kontakt-osoby', typ: 'osoby', data: { nadpis: 'Kontaktné osoby', uvod: '', stlpce: '3', vzhlad: 'kompaktne' },
        polozky: [
          { meno: 'Meno Priezvisko', funkcia: 'Predseda klubu', email: '', telefon: '' },
          { meno: 'Meno Priezvisko', funkcia: 'Sekretár', email: '', telefon: '' },
          { meno: 'Meno Priezvisko', funkcia: 'Mládež', email: '', telefon: '' },
        ],
      },
    ],
  },
  {
    slug: 'stadion',
    nazov: 'Štadión',
    meta_description: 'Náš štadión - adresa, kapacita, vybavenie a ako sa k nám dostať.',
    bloky: [
      { id: 'stadion-uvod', typ: 'nadpis', data: { stitok: 'Náš domov', nadpis: 'Štadión', text: '', zarovnanie: 'vlavo' } },
      { id: 'stadion-udaje', typ: 'stadion', data: { stadion_id: null, text: '<p>Popíšte históriu štadióna, vstupy pre fanúšikov a parkovanie.</p>', mapa: true } },
      {
        id: 'stadion-vybavenie', typ: 'vyhody', data: { nadpis: 'Vybavenie', uvod: '', stlpce: '4' },
        polozky: [
          { nadpis: 'Tribúna', text: 'Kryté miesta na sedenie pre fanúšikov.' },
          { nadpis: 'Parkovisko', text: 'Bezplatné parkovanie pri štadióne.' },
          { nadpis: 'Občerstvenie', text: 'Bufet počas domácich zápasov.' },
          { nadpis: 'Šatne', text: 'Šatne a sprchy pre domácich aj hostí.' },
        ],
      },
      { id: 'stadion-vyzva', typ: 'vyzva', data: { nadpis: 'Príďte na najbližší zápas', text: 'Pozrite si program domácich zápasov.', tlacidlo: 'Program zápasov', odkaz: '/matches' } },
    ],
  },
  {
    slug: 'nabor-deti',
    nazov: 'Nábor detí',
    meta_description: 'Prihláste dieťa do futbalu - kategórie, tréningy a ako sa prihlásiť.',
    bloky: [
      { id: 'nabor-uvod', typ: 'nadpis', data: { stitok: 'Nábor', nadpis: 'Pridaj sa k nám!', text: 'Hľadáme chlapcov a dievčatá, ktorí chcú hrať futbal. Prvé tréningy sú bezplatné a nie je potrebná žiadna skúsenosť.', zarovnanie: 'vlavo' } },
      {
        id: 'nabor-preco', typ: 'vyhody', data: { nadpis: 'Prečo práve k nám', uvod: '', stlpce: '3' },
        polozky: [
          { nadpis: 'Kvalifikovaní tréneri', text: 'Deti trénujú tréneri s licenciou.' },
          { nadpis: 'Hra na prvom mieste', text: 'Tréningy sú zábavné a primerané veku.' },
          { nadpis: 'Kamaráti a zápasy', text: 'Turnaje a súťaže počas celej sezóny.' },
        ],
      },
      {
        id: 'nabor-kategorie', typ: 'tabulka',
        data: {
          nadpis: 'Kategórie a tréningy', popis: '', pruhovana: true,
          tabulka: {
            hlavicka: ['Kategória', 'Ročník narodenia', 'Tréningy', 'Tréner'],
            riadky: [['Prípravka', '2019 - 2020', 'Po, St 16:00', ''], ['U9', '2017 - 2018', 'Po, St 16:30', ''], ['U11', '2015 - 2016', 'Ut, Št 16:30', ''], ['U13', '2013 - 2014', 'Ut, Št 17:00', '']],
          },
        },
      },
      {
        id: 'nabor-kroky', typ: 'kroky', data: { nadpis: 'Ako sa prihlásiť', uvod: '' },
        polozky: [
          { nadpis: 'Príďte na tréning', text: 'Stačí športové oblečenie a fľaša s vodou.' },
          { nadpis: 'Vyskúšajte si to', text: 'Prvé tréningy sú bezplatné.' },
          { nadpis: 'Prihláška', text: 'Tréner vám dá prihlášku a informácie o príspevkoch.' },
        ],
      },
      {
        id: 'nabor-faq', typ: 'faq', data: { nadpis: 'Časté otázky rodičov' },
        polozky: [
          { otazka: 'Od koľkých rokov môže dieťa začať?', odpoved: 'Do prípravky prijímame deti od 5 rokov.' },
          { otazka: 'Koľko stojí členstvo?', odpoved: 'Výšku príspevku vám povie tréner kategórie.' },
        ],
      },
      { id: 'nabor-vyzva', typ: 'vyzva', data: { nadpis: 'Máte otázky?', text: 'Ozvite sa nám, radi poradíme.', tlacidlo: 'Kontakt', odkaz: '/kontakt' } },
    ],
  },
  {
    slug: '2-percenta',
    nazov: '2 % z dane',
    meta_description: 'Podporte klub 2 % (3 %) z dane - údaje o prijímateľovi a postup.',
    bloky: [
      { id: 'dane-uvod', typ: 'nadpis', data: { stitok: 'Podporte nás', nadpis: 'Darujte klubu 2 % z dane', text: 'Nestojí vás to nič navyše - časť dane, ktorú aj tak zaplatíte, poputuje na rozvoj mládeže a klubu.', zarovnanie: 'vlavo' } },
      { id: 'dane-udaje', typ: 'dve_percenta', data: { nadpis: 'Údaje o prijímateľovi', text: '', prijimatel: '', ico: '', pravna_forma: 'Občianske združenie', sidlo: '', termin: 'do 30. apríla', tlacivo: null, poznamka: 'Ak ste v uplynulom roku odpracovali ako dobrovoľník aspoň 40 hodín, môžete poukázať 3 %.' } },
      {
        id: 'dane-kroky', typ: 'kroky', data: { nadpis: 'Ako na to', uvod: '' },
        polozky: [
          { nadpis: 'Požiadajte o potvrdenie', text: 'Zamestnávateľ vám vystaví Potvrdenie o zaplatení dane.' },
          { nadpis: 'Vyplňte vyhlásenie', text: 'Do Vyhlásenia o poukázaní podielu zaplatenej dane uveďte naše údaje.' },
          { nadpis: 'Odovzdajte na daňovom úrade', text: 'Vyhlásenie aj potvrdenie doručte na daňový úrad alebo elektronicky.' },
        ],
      },
      { id: 'dane-vyzva', typ: 'vyzva', data: { nadpis: 'Ďakujeme za podporu!', text: 'Vaše 2 % pomáhajú deťom hrať futbal.', tlacidlo: 'Naša mládež', odkaz: '/teams' } },
    ],
  },
  {
    slug: 'caste-otazky',
    nazov: 'Časté otázky',
    meta_description: 'Odpovede na najčastejšie otázky o klube, zápasoch a členstve.',
    bloky: [
      { id: 'faq-uvod', typ: 'nadpis', data: { stitok: 'Pomoc', nadpis: 'Časté otázky', text: '', zarovnanie: 'vlavo' } },
      {
        id: 'faq-otazky', typ: 'faq', data: { nadpis: '' },
        polozky: [
          { otazka: 'Koľko stojí vstupné na zápas?', odpoved: 'Aktuálne vstupné nájdete pri každom zápase v programe.' },
          { otazka: 'Ako sa stanem členom klubu?', odpoved: 'Vyplňte registráciu na stránke Registrácia, klub vás bude kontaktovať.' },
          { otazka: 'Kde sa dá zakúpiť klubové oblečenie?', odpoved: 'V našom fanshope na webe alebo počas domácich zápasov.' },
          { otazka: 'Ako prihlásim dieťa na tréning?', odpoved: 'Všetky informácie nájdete na stránke Nábor detí.' },
        ],
      },
      { id: 'faq-vyzva', typ: 'vyzva', data: { nadpis: 'Nenašli ste odpoveď?', text: 'Napíšte nám, radi pomôžeme.', tlacidlo: 'Kontakt', odkaz: '/kontakt' } },
    ],
  },
];

module.exports = {
  STRANKY,

  async up(queryInterface) {
    for (const s of STRANKY) {
      const [existuje] = await queryInterface.sequelize.query(`SELECT id FROM "pages" WHERE "slug" = :slug`, { replacements: { slug: s.slug } });
      if (existuje.length > 0) continue;
      await queryInterface.sequelize.query(
        `INSERT INTO "pages" ("nazov", "slug", "obsah", "bloky", "v_menu", "poradie_menu", "publikovany", "meta_title", "meta_description", "vytvoreny", "aktualizovany")
         VALUES (:nazov, :slug, '', CAST(:bloky AS JSONB), false, 10, false, :nazov, :meta, NOW(), NOW())`,
        { replacements: { nazov: s.nazov, slug: s.slug, bloky: JSON.stringify(s.bloky.map((b) => ({ pozadie: 'biele', skryty: false, ...b }))), meta: s.meta_description } }
      );
    }
  },

  async down(queryInterface) {
    // Zmažú sa len nezverejnené a neupravené predlohy
    for (const s of STRANKY) {
      await queryInterface.sequelize.query(`DELETE FROM "pages" WHERE "slug" = :slug AND "publikovany" = false AND "vytvoreny" = "aktualizovany"`, { replacements: { slug: s.slug } });
    }
  },
};
