// Umiestnenie: backend/src/services/email/odosielanie.ts
// Odosielanie e-mailov cez SMTP s frontou a opakovanými pokusmi.
//
// KAŽDÝ e-mail sa najprv zapíše do email_fronta (záznam v administrácii
// E-maily → Odoslané). Bežné e-maily (heslo, objednávka) sa skúsia poslať
// hneď; keď SMTP server práve nefunguje, ostanú vo fronte a plánovač ich
// skúsi znova (po 1, 5, 15 a 60 minútach, potom ich označí ako chybu).
// Hromadné e-maily odchádzajú len cez plánovač - postupne, podľa limitu
// za minútu, aby ich poskytovateľ nezablokoval.
//
// KDE SÚ NASTAVENIA: E-maily → Nastavenia v administrácii; ak tam SMTP
// server nie je vyplnený, použijú sa premenné SMTP_* zo súboru .env.
// Bez nastavení sa e-mail vo vývoji vypíše do konzoly.

import nodemailer, { type Transporter } from 'nodemailer';
import { Op } from 'sequelize';
import { EmailFronta, EmailKampan, EmailNastavenia, EmailSablona, type ZabezpecenieSmtp } from '../../models/Email';
import NastaveniaKlubu from '../../models/NastaveniaKlubu';
import { desifruj } from '../../utils/sifrovanie';
import { SPOLOCNE_ZNACKY, najdiSablonu } from './sablony';
import { vyrobEmail, type HotovyEmail, type KlubEmailu } from './vzhlad';

export const adresaWebu = () => (process.env.WEB_URL || process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/+$/, '');
export const adresaApi = () => (process.env.API_URL || `${adresaWebu()}/api`).replace(/\/+$/, '');

/** Čakanie pred ďalším pokusom (minúty) - po poslednom je e-mail chybou */
const OPAKOVANIA_MIN = [1, 5, 15, 60];
/** Záznamy staršie ako toto sa mažú (ochrana osobných údajov) */
const UCHOVAT_DNI = 180;

// ===== Konfigurácia SMTP =====

export interface KonfiguraciaSmtp {
  zdroj: 'administracia' | 'env';
  host: string;
  port: number;
  zabezpecenie: ZabezpecenieSmtp;
  pouzivatel: string | null;
  heslo: string | null;
  odosielatel: string;
  /** Holá adresa odosielateľa (bez mena) - pre hlášky o chybe */
  odosielatelEmail: string;
  odpovedatNa: string | null;
}

export interface UdajeSmtp {
  smtp_host?: string | null;
  smtp_port?: number | null;
  smtp_zabezpecenie?: ZabezpecenieSmtp;
  smtp_pouzivatel?: string | null;
  heslo?: string | null;
  odosielatel_meno?: string | null;
  odosielatel_email?: string | null;
  odpovedat_na?: string | null;
}

const odosielatel = (meno: string | null | undefined, email: string) => (meno ? `"${meno.replace(/"/g, "'")}" <${email}>` : email);
const jeAdresa = (s: string | null | undefined): s is string => !!s && /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(s);

/** Konfigurácia z údajov formulára alebo databázy. */
export const konfiguraciaZUdajov = (u: UdajeSmtp, nazovKlubu: string, emailKlubu: string | null): KonfiguraciaSmtp | null => {
  const host = u.smtp_host?.trim();
  if (!host) return null;
  // Prázdny odosielateľ = prihlasovacia schránka. Služby ako Brevo či
  // Mailgun majú prihlasovacie meno, ktoré nie je adresa - vtedy e-mail klubu.
  const prihlasenie = u.smtp_pouzivatel?.trim();
  const email = u.odosielatel_email?.trim() || (jeAdresa(prihlasenie) ? prihlasenie : null) || emailKlubu;
  if (!email) return null;
  return {
    zdroj: 'administracia',
    host,
    port: u.smtp_port || (u.smtp_zabezpecenie === 'ssl' ? 465 : 587),
    zabezpecenie: u.smtp_zabezpecenie || 'auto',
    pouzivatel: u.smtp_pouzivatel?.trim() || null,
    heslo: u.heslo ?? null,
    odosielatel: odosielatel(u.odosielatel_meno?.trim() || nazovKlubu, email),
    odosielatelEmail: email,
    odpovedatNa: u.odpovedat_na?.trim() || emailKlubu,
  };
};

/** Aktuálna konfigurácia: administrácia má prednosť pred .env. */
export const nacitajKonfiguraciu = async (): Promise<KonfiguraciaSmtp | null> => {
  const [n, klub] = await Promise.all([EmailNastavenia.nacitaj(), NastaveniaKlubu.nacitaj()]);
  const zDb = konfiguraciaZUdajov({ ...n.get(), heslo: desifruj(n.smtp_heslo) }, klub?.nazov || 'Klub', klub?.email ?? null);
  if (zDb) return zDb;
  const e = process.env;
  if (!e.SMTP_HOST) return null;
  const odosielatelEnv = e.SMTP_FROM || e.SMTP_USER || klub?.email || '';
  return {
    zdroj: 'env',
    host: e.SMTP_HOST,
    port: parseInt(e.SMTP_PORT || '587', 10),
    zabezpecenie: 'auto',
    pouzivatel: e.SMTP_USER || null,
    heslo: e.SMTP_PASSWORD || null,
    odosielatel: odosielatelEnv,
    odosielatelEmail: odosielatelEnv.match(/<([^>]+)>/)?.[1] ?? odosielatelEnv,
    odpovedatNa: n.odpovedat_na || klub?.email || null,
  };
};

// ===== Prenos (nodemailer) =====

let testovaciPrenos: Pick<Transporter, 'sendMail' | 'verify'> | null = null;
/** Testy podstrčia vlastný prenos namiesto skutočného SMTP. */
export const nastavPrenosPreTesty = (prenos: Pick<Transporter, 'sendMail' | 'verify'> | null) => {
  testovaciPrenos = prenos;
};

const vytvorPrenos = (k: KonfiguraciaSmtp): Pick<Transporter, 'sendMail' | 'verify'> => {
  if (testovaciPrenos) return testovaciPrenos;
  const secure = k.zabezpecenie === 'ssl' || (k.zabezpecenie === 'auto' && k.port === 465);
  return nodemailer.createTransport({
    host: k.host,
    port: k.port,
    secure,
    requireTLS: k.zabezpecenie === 'starttls',
    ignoreTLS: k.zabezpecenie === 'ziadne',
    auth: k.pouzivatel ? { user: k.pouzivatel, pass: k.heslo ?? '' } : undefined,
    connectionTimeout: 15_000,
    greetingTimeout: 10_000,
    socketTimeout: 30_000,
  });
};

/** Overí spojenie a prihlásenie na SMTP server (bez odoslania e-mailu). */
export const overSpojenie = async (k: KonfiguraciaSmtp) => {
  await vytvorPrenos(k).verify();
};

/** Zrozumiteľná hláška pre správcu namiesto technickej chyby SMTP. */
export const popisChybySmtp = (chyba: unknown, k?: KonfiguraciaSmtp | null): string => {
  const e = chyba as { code?: string; command?: string; responseCode?: number; response?: string; message?: string };
  const sprava = String(e?.message || chyba || '');
  // Doslovná odpoveď servera - z nej správca (alebo podpora hostingu) zistí presný dôvod
  const odpoved = String(e?.response || sprava)
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 300);
  if (e?.code === 'EAUTH' || e?.responseCode === 535) return 'Prihlásenie na SMTP server zlyhalo - skontrolujte používateľské meno a heslo';
  if (/wrong version number|ssl3_get_record|unknown protocol/i.test(sprava)) {
    return 'Nesprávne zabezpečenie spojenia - pri porte 465 zvoľte SSL, pri porte 587 STARTTLS';
  }
  if (e?.code === 'ETIMEDOUT' || e?.code === 'ECONNREFUSED' || e?.code === 'ECONNECTION' || e?.code === 'ENOTFOUND' || e?.code === 'ESOCKET') {
    return k
      ? `Nepodarilo sa spojiť so serverom ${k.host}:${k.port} - skontrolujte adresu, port a či spojenie nebráni firewall`
      : 'Nepodarilo sa spojiť so SMTP serverom';
  }
  const prikaz = (e?.command || '').toUpperCase();
  const oOdosielatelovi = /sender|from address|not owned|mismatch|spoof|odesílatel|odosielateľ/i.test(odpoved);
  if (prikaz === 'MAIL FROM' || (oOdosielatelovi && (prikaz === 'RCPT TO' || prikaz === 'DATA' || !prikaz))) {
    const adresa = k?.odosielatelEmail || '?';
    const prihlasenie = k?.pouzivatel;
    if (jeAdresa(prihlasenie) && prihlasenie.toLowerCase() !== adresa.toLowerCase()) {
      return `Server odmietol odosielateľa ${adresa} - pri schránke na hostingu musí byť e-mail odosielateľa rovnaký ako prihlasovacie meno ${prihlasenie} (alebo pole nechajte prázdne). Odpoveď servera: ${odpoved}`;
    }
    return `Server odmietol odosielateľa ${adresa} - adresa musí patriť k schránke, do ktorej sa prihlasujete, alebo k doméne overenej v e-mailovej službe. Odpoveď servera: ${odpoved}`;
  }
  if (prikaz === 'RCPT TO') return `Server odmietol adresu príjemcu. Odpoveď servera: ${odpoved}`;
  if (prikaz === 'DATA') return `Server odmietol e-mail. Odpoveď servera: ${odpoved}`;
  return odpoved || 'Neznáma chyba pri odosielaní';
};

// ===== Fronta =====

interface NovyEmail extends HotovyEmail {
  prijemca: string;
  sablona?: string | null;
  kampanId?: number | null;
  hlavicky?: Record<string, string> | null;
}

/** Zapíše e-mail do fronty (odíde hneď cez odosliZaznam alebo plánovačom). */
export const zaradDoFronty = (e: NovyEmail) =>
  EmailFronta.create({
    prijemca: e.prijemca,
    predmet: e.predmet.slice(0, 255),
    text: e.text,
    html: e.html,
    sablona: e.sablona ?? null,
    kampan_id: e.kampanId ?? null,
    hlavicky: e.hlavicky ?? null,
  });

/**
 * Odošle jeden záznam z fronty.
 * @returns true, ak e-mail odišiel (alebo sa vo vývoji vypísal do konzoly)
 */
export const odosliZaznam = async (zaznam: EmailFronta, konfiguracia?: KonfiguraciaSmtp | null): Promise<boolean> => {
  // Záznam si „zoberieme", aby ho neposlal súčasne aj plánovač alebo iný proces
  const [zobrany] = await EmailFronta.update({ stav: 'odosiela' }, { where: { id: zaznam.id, stav: 'caka' } });
  if (!zobrany) return false;
  // Stav v pamäti zladíme s databázou (inak by sa návrat na „caka" neuložil)
  await zaznam.reload();

  const k = konfiguracia === undefined ? await nacitajKonfiguraciu() : konfiguracia;
  if (!k) {
    if (process.env.NODE_ENV !== 'production') {
      if (process.env.NODE_ENV !== 'test') {
        console.log(`\n📧 ───── E-MAIL (bez SMTP, neodoslaný) ─────\n   Komu:    ${zaznam.prijemca}\n   Predmet: ${zaznam.predmet}\n`);
        console.log(zaznam.text.split('\n').map((r) => '   ' + r).join('\n') + '\n');
      }
      await zaznam.update({ stav: 'konzola', odoslany: new Date(), posledna_chyba: null });
      return true;
    }
    // V produkcii počkáme - správca môže SMTP doplniť a e-mail odíde neskôr
    return naplanujDalsiPokus(zaznam, 'Odosielanie e-mailov nie je nastavené (E-maily → Nastavenia)');
  }

  try {
    await vytvorPrenos(k).sendMail({
      from: k.odosielatel,
      to: zaznam.prijemca,
      replyTo: k.odpovedatNa || undefined,
      subject: zaznam.predmet,
      text: zaznam.text,
      html: zaznam.html || undefined,
      headers: zaznam.hlavicky || undefined,
    });
    await zaznam.update({ stav: 'odoslany', odoslany: new Date(), pokusy: zaznam.pokusy + 1, posledna_chyba: null });
    return true;
  } catch (chyba) {
    console.error(`❌ E-mail pre ${zaznam.prijemca} sa nepodarilo odoslať:`, (chyba as Error)?.message);
    return naplanujDalsiPokus(zaznam, popisChybySmtp(chyba, k));
  }
};

const naplanujDalsiPokus = async (zaznam: EmailFronta, dovod: string): Promise<false> => {
  const pokusy = zaznam.pokusy + 1;
  const cakanie = OPAKOVANIA_MIN[pokusy - 1];
  await zaznam.update(
    cakanie === undefined
      ? { stav: 'chyba', pokusy, posledna_chyba: dovod }
      : { stav: 'caka', pokusy, posledna_chyba: dovod, odoslat_po: new Date(Date.now() + cakanie * 60_000) }
  );
  return false;
};

// ===== Údaje klubu pre vzhľad a spoločné značky =====

export const udajeKlubu = async (): Promise<{ klub: KlubEmailu; znacky: Record<string, string>; pata: string | null }> => {
  const [k, n] = await Promise.all([NastaveniaKlubu.nacitaj(), EmailNastavenia.nacitaj()]);
  const web = adresaWebu();
  const klub: KlubEmailu = {
    nazov: k?.nazov || 'Klub',
    logo: k?.logo ?? null,
    farba: k?.farba_primarna || '#1B5E20',
    farbaKontrast: k?.farba_primarna_kontrast || '#FFFFFF',
    email: k?.email ?? null,
    telefon: k?.telefon ?? null,
    adresa: k?.adresa ?? null,
    web,
  };
  const znacky: Record<string, string> = {
    klub: klub.nazov,
    web,
    klub_email: klub.email ?? '',
    klub_telefon: klub.telefon ?? '',
    rok: String(new Date().getFullYear()),
  };
  return { klub, znacky, pata: n.pata };
};

/** Text šablóny: úprava klubu, inak predvolený. null = šablóna je vypnutá. */
export const textSablony = async (kluc: string): Promise<{ predmet: string; obsah: string; upravena: boolean } | null> => {
  const definicia = najdiSablonu(kluc);
  if (!definicia) throw new Error(`Neznáma šablóna e-mailu: ${kluc}`);
  const uprava = await EmailSablona.findOne({ where: { kluc } });
  if (uprava && !uprava.aktivna && definicia.vypnutelna) return null;
  return uprava ? { predmet: uprava.predmet, obsah: uprava.obsah, upravena: true } : { predmet: definicia.predmet, obsah: definicia.obsah, upravena: false };
};

/**
 * Pošle automatický e-mail podľa šablóny.
 *
 * @param kluc - šablóna (services/email/sablony.ts)
 * @param prijemca - e-mailová adresa
 * @param hodnoty - hodnoty značiek šablóny
 * @returns true, ak e-mail hneď odišiel; false, ak čaká vo fronte, je
 *   šablóna vypnutá alebo sa ho nepodarilo poslať
 */
export const posliSablonu = async (kluc: string, prijemca: string, hodnoty: Record<string, string | number | null | undefined>): Promise<boolean> => {
  try {
    const text = await textSablony(kluc);
    if (!text) return false;
    const { klub, znacky, pata } = await udajeKlubu();
    const vsetky = { ...znacky, ...Object.fromEntries(Object.entries(hodnoty).map(([k, v]) => [k, v == null ? '' : String(v)])) };
    const email = vyrobEmail(text, vsetky, klub, { pata });
    const zaznam = await zaradDoFronty({ ...email, prijemca, sablona: kluc });
    return await odosliZaznam(zaznam);
  } catch (chyba) {
    console.error(`❌ E-mail „${kluc}" pre ${prijemca} sa nepodarilo pripraviť:`, chyba);
    return false;
  }
};

/** Náhľad šablóny s ukážkovými hodnotami (administrácia). */
export const nahladSablony = async (sablona: { predmet: string; obsah: string }, ukazka: Record<string, string>, odhlasenie = false) => {
  const { klub, znacky, pata } = await udajeKlubu();
  return vyrobEmail(sablona, { ...znacky, ...ukazka }, klub, { pata, odhlasenie: odhlasenie ? `${adresaApi()}/email/odhlasit` : null });
};

export { SPOLOCNE_ZNACKY };

// ===== Plánovač =====

let bezi = false;

/**
 * Pošle e-maily, ktorým nadišiel čas (najviac limit za minútu).
 * Exportované kvôli testom a tlačidlu „Poslať teraz".
 */
export const spracujFrontu = async (): Promise<number> => {
  if (bezi) return 0;
  bezi = true;
  try {
    // Záznamy, ktoré ostali „odosiela" po páde procesu, vrátime do fronty
    await EmailFronta.update(
      { stav: 'caka' },
      { where: { stav: 'odosiela', aktualizovany: { [Op.lt]: new Date(Date.now() - 10 * 60_000) } } }
    );
    const nastavenia = await EmailNastavenia.nacitaj();
    const cakajuce = await EmailFronta.findAll({
      where: { stav: 'caka', odoslat_po: { [Op.lte]: new Date() } },
      order: [['odoslat_po', 'ASC'], ['id', 'ASC']],
      limit: nastavenia.limit_za_minutu,
    });
    let odoslane = 0;
    if (cakajuce.length) {
      const k = await nacitajKonfiguraciu();
      for (const z of cakajuce) if (await odosliZaznam(z, k)) odoslane++;
    }

    // Hromadné e-maily, ktorým už nič nečaká, sú odoslané
    const odosielane = await EmailKampan.findAll({ where: { stav: 'odosiela' } });
    for (const kampan of odosielane) {
      const zostava = await EmailFronta.count({ where: { kampan_id: kampan.id, stav: { [Op.in]: ['caka', 'odosiela'] } } });
      if (!zostava) await kampan.update({ stav: 'odoslana' });
    }

    await EmailFronta.destroy({ where: { vytvoreny: { [Op.lt]: new Date(Date.now() - UCHOVAT_DNI * 86_400_000) } } });
    return odoslane;
  } finally {
    bezi = false;
  }
};

export const spustiPlanovacEmailov = () => {
  const krok = () => void spracujFrontu().catch((e) => console.error('Chyba vo fronte e-mailov:', e));
  setTimeout(krok, 15_000);
  setInterval(krok, 60_000);
  console.log('📧 Fronta e-mailov beží (každú minútu)');
};
