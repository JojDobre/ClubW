// Umiestnenie: backend/src/utils/email.ts
// Jednoduché odoslanie e-mailu bez šablóny.
//
// Automatické e-maily systému posiela posliSablonu (services/email) -
// ich text sa dá upraviť v administrácii. Toto rozhranie ostáva pre
// e-maily, ktoré šablónu nemajú; aj tie idú cez frontu, takže sa zapíšu
// do E-maily → Odoslané a pri výpadku SMTP sa pošlú neskôr.

import { odosliZaznam, udajeKlubu, zaradDoFronty } from '../services/email/odosielanie';
import { vyrobEmail } from '../services/email/vzhlad';

interface Sprava {
  prijemca: string;
  predmet: string;
  text: string;
  html?: string;
}

/**
 * Odošle e-mail.
 * @returns true, ak odišiel hneď; false, ak čaká vo fronte alebo zlyhal
 */
export const posliEmail = async (sprava: Sprava): Promise<boolean> => {
  try {
    let html = sprava.html ?? null;
    if (!html) {
      // Obyčajný text dostane rovnaký vzhľad ako šablóny (logo, farby klubu)
      const { klub, pata } = await udajeKlubu();
      html = vyrobEmail({ predmet: sprava.predmet, obsah: sprava.text }, {}, klub, { pata }).html;
    }
    const zaznam = await zaradDoFronty({ prijemca: sprava.prijemca, predmet: sprava.predmet, text: sprava.text, html });
    return await odosliZaznam(zaznam);
  } catch (chyba) {
    console.error(`❌ E-mail pre ${sprava.prijemca} sa nepodarilo pripraviť:`, chyba);
    return false;
  }
};
