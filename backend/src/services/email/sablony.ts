// Umiestnenie: backend/src/services/email/sablony.ts
// Automatické e-maily systému a ich predvolené texty.
//
// Klub môže v administrácii (E-maily → Šablóny) zmeniť predmet a text
// každého e-mailu alebo ho vypnúť; zmeny sa ukladajú do email_sablony.
// Tu je zoznam e-mailov, značky, ktoré sa do nich dajú vložiť, a texty,
// ktoré platia, kým ich klub nezmení.
//
// Zápis textu (rovnaký pre šablóny aj hromadné e-maily):
//   {{meno}}                 značka - nahradí sa hodnotou
//   prázdny riadok           nový odsek
//   **tučné**                tučné písmo
//   [Text](adresa)           odkaz; sám na riadku = tlačidlo
//   ![popis](adresa)         obrázok
//   - položka                odrážka
// Názvy, popisy a značky pre administráciu sú vo frontende
// (pages/admin/emaily/sablonyPopis.ts), aby sa dali preložiť.

export type SkupinaSablony = 'administracia' | 'formulare' | 'eshop' | 'fanusikovia';

export interface DefiniciaSablony {
  kluc: string;
  skupina: SkupinaSablony;
  /** Komu ide: klub (správca) alebo človek, ktorého sa týka */
  komu: 'klub' | 'pouzivatel' | 'zakaznik' | 'fanusik';
  /** Dá sa vypnúť? (odkazy na heslo vypnúť nejde - bez nich sa nikto neprihlási) */
  vypnutelna: boolean;
  /** Značky, ktoré šablóna pozná (okrem spoločných) */
  znacky: string[];
  predmet: string;
  obsah: string;
  /** Ukážkové hodnoty pre náhľad a skúšobný e-mail */
  ukazka: Record<string, string>;
}

/** Značky dostupné vo všetkých e-mailoch. */
export const SPOLOCNE_ZNACKY = ['klub', 'web', 'klub_email', 'klub_telefon', 'rok'];

export const SABLONY: DefiniciaSablony[] = [
  {
    kluc: 'heslo_admin',
    skupina: 'administracia',
    komu: 'pouzivatel',
    vypnutelna: false,
    znacky: ['meno', 'odkaz', 'platnost_minut'],
    predmet: 'Obnova hesla do administrácie - {{klub}}',
    obsah:
      'Dobrý deň {{meno}},\n\n' +
      'pre nastavenie nového hesla do administrácie kliknite na tlačidlo:\n\n' +
      '[Nastaviť nové heslo]({{odkaz}})\n\n' +
      'Odkaz platí {{platnost_minut}} minút a dá sa použiť len raz.\n\n' +
      'Ak ste o obnovu hesla nežiadali, túto správu ignorujte - vaše heslo zostáva nezmenené.',
    ukazka: { meno: 'Jana', odkaz: 'https://www.klub.sk/obnova-hesla?token=ukazka', platnost_minut: '60' },
  },
  {
    kluc: 'formular_odpoved',
    skupina: 'formulare',
    komu: 'klub',
    vypnutelna: true,
    znacky: ['formular', 'odpovede', 'odkaz_admin'],
    predmet: 'Nový vyplnený formulár: {{formular}}',
    obsah:
      'Prišla nová odpoveď na formulár „{{formular}}“.\n\n' +
      '{{odpovede}}\n\n' +
      '[Všetky odpovede v administrácii]({{odkaz_admin}})',
    ukazka: { formular: 'Prihláška do mládeže', odpovede: 'Meno: Peter Malý\nRočník: 2015\nTelefón: 0900 123 456', odkaz_admin: 'https://www.klub.sk/admin/formulare/1/odpovede' },
  },
  {
    kluc: 'objednavka_zakaznik',
    skupina: 'eshop',
    komu: 'zakaznik',
    vypnutelna: false,
    znacky: ['meno', 'cislo', 'suhrn', 'spolu', 'pokyny', 'odkaz'],
    predmet: 'Objednávka {{cislo}} - {{klub}}',
    obsah:
      'Dobrý deň {{meno}},\n\n' +
      'ďakujeme za objednávku č. **{{cislo}}**.\n\n' +
      '{{suhrn}}\n\n' +
      '{{pokyny}}\n\n' +
      '[Stav objednávky]({{odkaz}})\n\n' +
      '{{klub}}',
    ukazka: {
      meno: 'Martin',
      cislo: '2026-0042',
      suhrn: '• Dres domáci (Veľkosť: L) - 1 × 49,90 €\n\nTovar: 49,90 €\nDoručenie (Kuriér): 4,90 €\nPlatba: Bankový prevod\nSpolu: 54,80 €',
      spolu: '54,80 €',
      pokyny: 'Sumu uhraďte na účet SK31 1200 0000 1987 4263 7541, variabilný symbol 20260042.',
      odkaz: 'https://www.klub.sk/objednavka/ukazka',
    },
  },
  {
    kluc: 'objednavka_klub',
    skupina: 'eshop',
    komu: 'klub',
    vypnutelna: true,
    znacky: ['cislo', 'meno', 'email', 'telefon', 'suhrn', 'spolu', 'adresa', 'poznamka', 'odkaz_admin'],
    predmet: 'Nová objednávka {{cislo}} ({{spolu}})',
    obsah:
      'Nová objednávka č. **{{cislo}}** od {{meno}} ({{email}}, {{telefon}}).\n\n' +
      '{{suhrn}}\n\n' +
      'Adresa: {{adresa}}\n\n' +
      'Poznámka: {{poznamka}}\n\n' +
      '[Otvoriť objednávku]({{odkaz_admin}})',
    ukazka: {
      cislo: '2026-0042',
      meno: 'Martin Kováč',
      email: 'martin@example.sk',
      telefon: '0900 123 456',
      suhrn: '• Dres domáci (Veľkosť: L) - 1 × 49,90 €\n\nSpolu: 54,80 €',
      spolu: '54,80 €',
      adresa: 'Hlavná 1, 900 01 Dolina, Slovensko',
      poznamka: 'Prosím doručiť poobede.',
      odkaz_admin: 'https://www.klub.sk/admin/eshop/objednavky/42',
    },
  },
  {
    kluc: 'objednavka_stav',
    skupina: 'eshop',
    komu: 'zakaznik',
    vypnutelna: true,
    znacky: ['meno', 'cislo', 'stav', 'platba', 'odkaz'],
    predmet: 'Objednávka {{cislo}} je {{stav}}',
    obsah:
      'Dobrý deň {{meno}},\n\n' +
      'vaša objednávka č. {{cislo}} je teraz **{{stav}}**.\n\n' +
      '{{platba}}\n\n' +
      '[Stav objednávky]({{odkaz}})\n\n' +
      '{{klub}}',
    ukazka: { meno: 'Martin', cislo: '2026-0042', stav: 'odoslaná', platba: 'Platbu sme prijali, ďakujeme.', odkaz: 'https://www.klub.sk/objednavka/ukazka' },
  },
  {
    kluc: 'fanusik_registracia_klub',
    skupina: 'fanusikovia',
    komu: 'klub',
    vypnutelna: true,
    znacky: ['meno', 'priezvisko', 'email', 'telefon', 'typ', 'text_spravy', 'odkaz_admin'],
    predmet: 'Nová registrácia: {{meno}} {{priezvisko}} ({{typ}})',
    obsah:
      'Na webe sa zaregistroval nový záujemca o členstvo.\n\n' +
      '- Meno: {{meno}} {{priezvisko}}\n' +
      '- E-mail: {{email}}\n' +
      '- Telefón: {{telefon}}\n' +
      '- Typ: {{typ}}\n\n' +
      '{{text_spravy}}\n\n' +
      '[Schváliť v administrácii]({{odkaz_admin}})',
    ukazka: {
      meno: 'Peter',
      priezvisko: 'Nový',
      email: 'peter@example.sk',
      telefon: '0900 111 222',
      typ: 'člen klubu',
      text_spravy: 'Rád by som sa zapojil aj ako dobrovoľník.',
      odkaz_admin: 'https://www.klub.sk/admin/fanusikovia',
    },
  },
  {
    kluc: 'fanusik_schvalenie',
    skupina: 'fanusikovia',
    komu: 'fanusik',
    vypnutelna: true,
    znacky: ['meno', 'cislo_karty', 'odkaz'],
    predmet: '{{klub}}: registrácia bola schválená',
    obsah:
      'Dobrý deň {{meno}},\n\n' +
      'vaša registrácia v klube {{klub}} bola schválená. Vitajte!\n\n' +
      'Vaše číslo členskej karty je **{{cislo_karty}}**. Po prihlásení nájdete kartu s QR kódom aj výhody pre členov.\n\n' +
      '[Otvoriť Môj klub]({{odkaz}})',
    ukazka: { meno: 'Peter', cislo_karty: '2026-00042', odkaz: 'https://www.klub.sk/moj-klub' },
  },
  {
    kluc: 'fanusik_pozvanka',
    skupina: 'fanusikovia',
    komu: 'fanusik',
    vypnutelna: false,
    znacky: ['meno', 'email', 'odkaz'],
    predmet: '{{klub}}: váš účet na webe',
    obsah:
      'Dobrý deň {{meno}},\n\n' +
      '{{klub}} vám pripravil účet na webe. Nájdete v ňom svoju členskú kartu a výhody pre členov.\n\n' +
      '[Nastaviť heslo]({{odkaz}})\n\n' +
      'Odkaz platí 7 dní. Prihlasovací e-mail: {{email}}',
    ukazka: { meno: 'Peter', email: 'peter@example.sk', odkaz: 'https://www.klub.sk/moj-klub/heslo?token=ukazka' },
  },
  {
    kluc: 'fanusik_heslo',
    skupina: 'fanusikovia',
    komu: 'fanusik',
    vypnutelna: false,
    znacky: ['meno', 'odkaz'],
    predmet: '{{klub}}: nastavenie hesla',
    obsah:
      'Dobrý deň {{meno}},\n\n' +
      'dostali sme žiadosť o nové heslo k vášmu účtu na webe {{klub}}.\n\n' +
      '[Nastaviť nové heslo]({{odkaz}})\n\n' +
      'Odkaz platí 2 hodiny. Ak ste o zmenu nežiadali, správu ignorujte - heslo ostane bez zmeny.',
    ukazka: { meno: 'Peter', odkaz: 'https://www.klub.sk/moj-klub/heslo?token=ukazka' },
  },
  {
    kluc: 'fanusik_zruseny_klub',
    skupina: 'fanusikovia',
    komu: 'klub',
    vypnutelna: true,
    znacky: ['meno', 'priezvisko', 'email', 'cislo_karty'],
    predmet: 'Zrušený účet fanúšika: {{meno}} {{priezvisko}}',
    obsah: '{{meno}} {{priezvisko}} ({{email}}, karta {{cislo_karty}}) zrušil(a) svoj účet na webe. Údaje boli zmazané.',
    ukazka: { meno: 'Peter', priezvisko: 'Nový', email: 'peter@example.sk', cislo_karty: '2026-00042' },
  },
];

/** Značky hromadných e-mailov (údaje adresáta). */
export const ZNACKY_KAMPANE = ['meno', 'priezvisko', 'cislo_karty', 'typ_clenstva', 'clenstvo_do'];
export const UKAZKA_KAMPANE: Record<string, string> = {
  meno: 'Peter',
  priezvisko: 'Nový',
  cislo_karty: '2026-00042',
  typ_clenstva: 'člen klubu',
  clenstvo_do: '30. 6. 2027',
};

export const najdiSablonu = (kluc: string): DefiniciaSablony | undefined => SABLONY.find((s) => s.kluc === kluc);
