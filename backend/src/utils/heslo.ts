// Umiestnenie: backend/src/utils/heslo.ts
// Kontrola sily hesla.
//
// PREČO: pôvodná požiadavka bola minimálne 6 znakov bez ďalších podmienok.
// Heslo "123456" tak prešlo, hoci je v každom zozname najčastejších hesiel.
// Pri účtoch, ktoré spravujú obsah klubu a osobné údaje mládežníkov,
// je to málo.
//
// Zámerne NEvyžadujeme striedanie veľkých písmen, číslic a znakov za každú
// cenu - takéto pravidlá vedú k heslám typu "Heslo1!" a lepené na monitor.
// Namiesto toho stavíme na dĺžku a odmietame zjavne slabé voľby.

// Minimálna dĺžka. Pri dlhom hesle sú ďalšie podmienky zbytočné.
const MIN_DLZKA = 10;

// Ak má heslo aspoň toľko znakov, prejde bez ďalších podmienok
// (dlhá zapamätateľná fráza je bezpečnejšia než krátka zložitá zmes)
const DLZKA_BEZ_PODMIENOK = 16;

// Najčastejšie heslá a slová viazané na tento projekt.
// Porovnáva sa malými písmenami a bez diakritiky.
const ZAKAZANE = [
  'password', 'heslo', '123456', '12345678', '123456789', '1234567890',
  'qwerty', 'qwertz', 'asdfgh', 'iloveyou', 'admin', 'administrator',
  'welcome', 'vitajte', 'letmein', 'monkey', 'dragon', 'football',
  'futbal', 'clubw', 'slovan', 'sparta', 'slavia', 'zilina', 'trnava',
];

/**
 * Odstráni diakritiku a prevedie na malé písmená.
 * Bez toho by "Heslo" a "hesló" prešli ako rôzne reťazce.
 */
const normalizuj = (text: string): string =>
  text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

/**
 * Zistí, či heslo obsahuje príliš dlhú postupnosť rovnakých znakov
 * alebo jednoduchú sekvenciu (abc, 123, qwerty).
 */
const maJednoduchuPostupnost = (heslo: string): boolean => {
  const h = normalizuj(heslo);

  // Štyri a viac rovnakých znakov za sebou (aaaa, 1111)
  if (/(.)\1{3,}/.test(h)) return true;

  // Rastúca alebo klesajúca sekvencia dĺžky 5 a viac (abcde, 54321)
  let rastuca = 1;
  let klesajuca = 1;
  for (let i = 1; i < h.length; i++) {
    const rozdiel = h.charCodeAt(i) - h.charCodeAt(i - 1);
    rastuca = rozdiel === 1 ? rastuca + 1 : 1;
    klesajuca = rozdiel === -1 ? klesajuca + 1 : 1;
    if (rastuca >= 5 || klesajuca >= 5) return true;
  }

  return false;
};

/**
 * Overí silu hesla.
 *
 * @param heslo - navrhované heslo
 * @param kontext - údaje používateľa, ktoré heslo nesmie obsahovať
 *                  (meno, e-mail) - inak sa dá ľahko uhádnuť
 * @returns zoznam chýb; prázdne pole znamená, že heslo vyhovuje
 */
export const overSiluHesla = (
  heslo: unknown,
  kontext: { meno?: string; email?: string } = {}
): string[] => {
  const chyby: string[] = [];

  if (typeof heslo !== 'string' || heslo.length === 0) {
    return ['Heslo je povinné'];
  }

  if (heslo.length < MIN_DLZKA) {
    chyby.push(`Heslo musí mať aspoň ${MIN_DLZKA} znakov`);
  }

  // Horná hranica - bcrypt spracuje len prvých 72 bajtov,
  // dlhšie heslo by vytváralo falošný pocit bezpečia
  if (heslo.length > 72) {
    chyby.push('Heslo môže mať najviac 72 znakov');
  }

  const h = normalizuj(heslo);

  // Zakázané slová kontrolujeme vždy, aj pri dlhom hesle
  for (const zakazane of ZAKAZANE) {
    if (h.includes(zakazane)) {
      chyby.push(`Heslo nesmie obsahovať bežné slovo "${zakazane}"`);
      break;
    }
  }

  // Heslo nesmie obsahovať meno ani časť e-mailu
  if (kontext.meno) {
    const meno = normalizuj(kontext.meno);
    for (const cast of meno.split(/\s+/)) {
      if (cast.length >= 3 && h.includes(cast)) {
        chyby.push('Heslo nesmie obsahovať vaše meno');
        break;
      }
    }
  }

  if (kontext.email) {
    const castPredZavinacom = normalizuj(kontext.email).split('@')[0];
    if (castPredZavinacom.length >= 3 && h.includes(castPredZavinacom)) {
      chyby.push('Heslo nesmie obsahovať vašu e-mailovú adresu');
    }
  }

  if (maJednoduchuPostupnost(heslo)) {
    chyby.push('Heslo nesmie obsahovať jednoduché postupnosti (napríklad 12345 alebo aaaa)');
  }

  // Dostatočne dlhé heslo už ďalšie podmienky spĺňať nemusí
  if (heslo.length >= DLZKA_BEZ_PODMIENOK) {
    return chyby;
  }

  // Pri kratšom hesle vyžadujeme aspoň tri druhy znakov
  const druhy = [
    /[a-z]/.test(heslo),
    /[A-Z]/.test(heslo),
    /[0-9]/.test(heslo),
    /[^a-zA-Z0-9]/.test(heslo),
  ].filter(Boolean).length;

  if (druhy < 3) {
    chyby.push(
      `Heslo kratšie ako ${DLZKA_BEZ_PODMIENOK} znakov musí obsahovať aspoň tri z týchto skupín: ` +
      'malé písmená, veľké písmená, číslice, špeciálne znaky. ' +
      'Alebo použite dlhšiu zapamätateľnú frázu.'
    );
  }

  return chyby;
};
