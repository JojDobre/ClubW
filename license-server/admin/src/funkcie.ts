// Umiestnenie: license-server/admin/src/funkcie.ts
//
// Katalóg funkcií, ktoré rozpozná web klubu (ClubW CMS). Funkcie sa píšu
// do poľa „Funkcie“ plánu alebo licencie a web podľa nich povolí časti
// systému. Neznámu funkciu web ignoruje.
//
// Pri novej šablóne v priečinku sablony/ ju treba doplniť sem - test
// tests/funkcie.test.ts na to upozorní.

export interface FunkciaLicencie {
  kod: string;
  nazov: string;
  popis: string;
}

export interface SkupinaFunkcii {
  nazov: string;
  popis: string;
  funkcie: FunkciaLicencie[];
}

/** Šablóny dodané so systémom okrem Základnej (tá je vždy povolená). */
export const SABLONY: Array<{ slug: string; nazov: string }> = [
  { slug: 'klubova', nazov: 'Klubová' },
  { slug: 'moderna', nazov: 'Moderná' },
  { slug: 'stadion', nazov: 'Štadión' },
  { slug: 'bento', nazov: 'Dynamic Football Bento' },
  { slug: 'kronika', nazov: 'Kronika' },
  { slug: 'elita', nazov: 'Elita' },
  { slug: 'tribuna', nazov: 'Tribúna' },
  { slug: 'derby', nazov: 'Derby' },
  { slug: 'arena', nazov: 'Aréna' },
  { slug: 'pulz', nazov: 'Pulz' },
];

export const FUNKCIE_LICENCIE: SkupinaFunkcii[] = [
  {
    nazov: 'Šablóny webu',
    popis:
      'Bez týchto funkcií má klub zo šablón dodaných so systémom len Základnú. Vlastné šablóny, ktoré si klub sám nahrá, licencia neobmedzuje. ' +
      'Keď licencia šablónu prestane povoľovať, web sa prepne na Základnú a nastavenia šablóny ostanú uložené pre prípad obnovenia.',
    funkcie: [
      { kod: 'sablony:vsetky', nazov: 'Všetky šablóny', popis: 'Povolí všetky šablóny dodané so systémom, aj tie, ktoré pribudnú v nových verziách.' },
      ...SABLONY.map((s) => ({ kod: `sablona:${s.slug}`, nazov: s.nazov, popis: `Povolí šablónu ${s.nazov}.` })),
    ],
  },
];
