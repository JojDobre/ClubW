// Umiestnenie: backend/src/utils/email.ts
// Odosielanie e-mailov.
//
// Zámerne jednoduché rozhranie - projekt zatiaľ posiela len obnovu hesla,
// neskôr pribudnú oznamy pre rodičov (Fáza 6). Konkrétny poskytovateľ
// (SMTP, SendGrid, Resend) sa dá vymeniť bez zásahu do controllerov.
//
// AK NIE JE NASTAVENÉ ODOSIELANIE: obsah správy sa vypíše do konzoly.
// Vo vývoji je to praktické (odkaz na obnovu hesla je hneď po ruke),
// v produkcii sa navyše zaloguje výstraha, aby si nikto nemyslel,
// že e-maily odchádzajú.

interface Sprava {
  prijemca: string;
  predmet: string;
  text: string;
  html?: string;
}

/**
 * Je odosielanie e-mailov nastavené?
 */
export const jeEmailNastaveny = (): boolean =>
  Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD);

/**
 * Odošle e-mail.
 *
 * @param sprava - príjemca, predmet a obsah
 * @returns true, ak sa správu podarilo odovzdať na odoslanie
 */
export const posliEmail = async (sprava: Sprava): Promise<boolean> => {
  if (!jeEmailNastaveny()) {
    if (process.env.NODE_ENV === 'production') {
      console.error(
        '❌ Odosielanie e-mailov nie je nastavené (chýbajú SMTP_HOST, SMTP_USER, SMTP_PASSWORD). ' +
        'Správa nebola odoslaná pre: ' + sprava.prijemca
      );
      return false;
    }

    // Vývojový režim - obsah vypíšeme, aby sa dalo pokračovať v práci
    console.log('\n📧 ───── E-MAIL (vývojový režim, neodoslaný) ─────');
    console.log(`   Komu:     ${sprava.prijemca}`);
    console.log(`   Predmet:  ${sprava.predmet}`);
    console.log('   ─────────────────────────────────────────────');
    console.log(sprava.text.split('\n').map((r) => '   ' + r).join('\n'));
    console.log('   ─────────────────────────────────────────────\n');
    return true;
  }

  try {
    // nodemailer načítavame až tu, aby bol voliteľnou závislosťou -
    // inštalácie bez odosielania e-mailov ho nepotrebujú
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const nodemailer = require('nodemailer');

    const prenos = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      // Port 465 používa šifrovanie od začiatku spojenia,
      // ostatné porty prechádzajú na šifrovanie cez STARTTLS
      secure: process.env.SMTP_PORT === '465',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });

    await prenos.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: sprava.prijemca,
      subject: sprava.predmet,
      text: sprava.text,
      html: sprava.html,
    });

    return true;
  } catch (error: any) {
    console.error(`❌ E-mail sa nepodarilo odoslať (${sprava.prijemca}):`, error.message);
    return false;
  }
};
