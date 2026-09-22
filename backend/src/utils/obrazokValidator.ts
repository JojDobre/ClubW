// Umiestnenie: backend/src/utils/obrazokValidator.ts
//
// VALIDÁCIA ODKAZOV NA OBRÁZKY
//
// PREČO VZNIKOL: modely používali Sequelize validátor `isUrl: true`,
// ktorý prijíma len úplnú adresu (https://...). Projekt ale ukladá
// obrázky ako RELATÍVNE cesty (/uploads/media/2026/09/foto.jpg), takže
// nastaviť logo tímu alebo titulný obrázok galérie z nahratého súboru
// skončilo na „Validation isUrl failed".
//
// Galéria sa to pokúšala obísť zápisom `isUrl: false`, lenže Sequelize
// takto validátor NEVYPNE - stále ho spustí a hodnotu `false` mu len
// podá ako argument. Chyba teda nastala aj tam.
//
// Tento validátor prijíma oboje: nahratý súbor aj externú adresu.

/** Povolené prípony obrázkov pri relatívnej ceste. */
const PRIPONY = /\.(jpe?g|png|webp|gif|svg|avif)$/i;

/**
 * Overí odkaz na obrázok.
 *
 * Prijíma:
 *   - relatívnu cestu do uploads, napríklad /uploads/media/2026/09/a.jpg
 *   - úplnú adresu http(s)://...
 *
 * @param hodnota - kontrolovaná hodnota (prázdna je v poriadku)
 * @throws keď hodnota nie je ani jedno z toho
 */
export const overOdkazNaObrazok = (hodnota: unknown): void => {
  if (hodnota === null || hodnota === undefined || hodnota === '') return;

  const text = String(hodnota).trim();

  // Nahratý súbor - relatívna cesta do uploads
  if (text.startsWith('/uploads/')) {
    if (text.includes('..')) {
      throw new Error('Cesta k obrázku nesmie obsahovať ".."');
    }
    return;
  }

  // Externá adresa
  if (/^https?:\/\/.+/i.test(text)) return;

  throw new Error(
    'Obrázok musí byť nahratý súbor (cesta začínajúca /uploads/) ' +
    'alebo úplná adresa začínajúca http:// či https://'
  );
};

/**
 * Prísnejšia verzia pre polia, kde má byť naozaj obrázok.
 *
 * Relatívna cesta musí mať príponu obrázka; externá adresa sa
 * nekontroluje, lebo môže ísť cez presmerovanie bez prípony.
 */
export const overObrazkovySubor = (hodnota: unknown): void => {
  overOdkazNaObrazok(hodnota);

  if (hodnota === null || hodnota === undefined || hodnota === '') return;

  const text = String(hodnota).trim();
  if (text.startsWith('/uploads/') && !PRIPONY.test(text)) {
    throw new Error('Súbor nemá príponu obrázka (jpg, png, webp, gif, svg, avif)');
  }
};
