// Umiestnenie: backend/src/middleware/licencia.ts
// Kontrola platnosti licencie na strane klientskeho webu.
//
// PÔVODNÝ STAV: backend mal v .env premenné LICENSE_KEY a LICENSE_SERVER_URL,
// ale neexistoval kód, ktorý by licenciu overoval. Klub mohol fungovať
// donekonečna bez platnej licencie.
//
// AKO TO FUNGUJE:
//  1. Licencia sa overuje najviac raz za 24 hodín, výsledok sa drží v pamäti.
//     Bez toho by každá požiadavka návštevníka znamenala volanie na server.
//  2. Odpoveď licenčného servera je podpísaná. Podpis overujeme verejným
//     kľúčom z konfigurácie, takže sa nedá podvrhnúť presmerovaním
//     LICENSE_SERVER_URL na vlastný server.
//  3. Ak je licenčný server nedostupný, platí ochranná lehota 7 dní
//     (grace period). Výpadok nášho servera nesmie zhasnúť weby klubov.
//  4. Pri neplatnej licencii sa blokujú len zápisové operácie. Verejný web
//     zostáva čitateľný - klub nemá prísť o návštevníkov kvôli faktúre.

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

// Ako často sa licencia overuje
const INTERVAL_KONTROLY_MS = 24 * 60 * 60 * 1000; // 24 hodín

// Ochranná lehota, počas ktorej web beží aj bez spojenia s licenčným serverom
const OCHRANNA_LEHOTA_MS = 7 * 24 * 60 * 60 * 1000; // 7 dní

// Časový limit na odpoveď licenčného servera
const TIMEOUT_MS = 8000;

// Súbor, do ktorého sa ukladá posledný známy stav licencie.
// PREČO: stav bol pôvodne len v pamäti procesu. Po reštarte servera
// počas výpadku licenčného servera sa údaj o poslednom úspešnom kontakte
// stratil a ochranná lehota sa neuplatnila - klub sa zablokoval presne
// v situácii, na ktorú je lehota určená.
const SUBOR_STAVU = path.join(process.cwd(), '.license-cache.json');

/**
 * Stav licencie držaný v pamäti procesu.
 */
interface StavLicencie {
  platna: boolean;
  dovod: string | null;
  plan: string | null;
  funkcie: string[];
  platnaDo: string | null;
  dniDoVyprsania: number | null;
  // Kedy sa naposledy podarilo spojiť s licenčným serverom
  poslednyUspesnyKontakt: number | null;
  // Kedy prebehol posledný pokus (aj neúspešný)
  poslednyPokus: number;
}

let stav: StavLicencie = {
  platna: false,
  dovod: 'nezistene',
  plan: null,
  funkcie: [],
  platnaDo: null,
  dniDoVyprsania: null,
  poslednyUspesnyKontakt: null,
  poslednyPokus: 0,
};

/**
 * Uloží posledný známy stav licencie na disk.
 *
 * Ukladáme len údaje potrebné pre ochrannú lehotu. Ak zápis zlyhá
 * (napríklad práva na súbor), aplikácia beží ďalej - ide len o zálohu.
 */
const ulozStavNaDisk = (): void => {
  try {
    const naUlozenie = {
      platna: stav.platna,
      plan: stav.plan,
      funkcie: stav.funkcie,
      platnaDo: stav.platnaDo,
      dniDoVyprsania: stav.dniDoVyprsania,
      poslednyUspesnyKontakt: stav.poslednyUspesnyKontakt,
    };
    fs.writeFileSync(SUBOR_STAVU, JSON.stringify(naUlozenie), 'utf8');
  } catch (error: any) {
    console.warn(`⚠️  Stav licencie sa nepodarilo uložiť: ${error.message}`);
  }
};

/**
 * Načíta posledný známy stav licencie z disku.
 *
 * Vďaka tomu prežije ochranná lehota reštart servera. Bez toho by reštart
 * počas výpadku licenčného servera klub okamžite zablokoval.
 *
 * Poznámka k bezpečnosti: súbor obsahuje len časovú značku posledného
 * úspešného overenia. Aj keby ho niekto upravil, ochranná lehota je
 * obmedzená na 7 dní a pri prvom spojení so serverom sa stav prepíše
 * skutočnou odpoveďou.
 */
const nacitajStavZDisku = (): void => {
  try {
    if (!fs.existsSync(SUBOR_STAVU)) return;

    const ulozeny = JSON.parse(fs.readFileSync(SUBOR_STAVU, 'utf8'));

    // Preberáme len časovú značku a popisné údaje. Príznak platna zámerne
    // neobnovujeme - platnosť musí potvrdiť licenčný server, z disku
    // preberáme len podklad pre ochrannú lehotu.
    if (typeof ulozeny.poslednyUspesnyKontakt === 'number') {
      stav.poslednyUspesnyKontakt = ulozeny.poslednyUspesnyKontakt;
      stav.plan = ulozeny.plan ?? null;
      stav.funkcie = Array.isArray(ulozeny.funkcie) ? ulozeny.funkcie : [];
      stav.platnaDo = ulozeny.platnaDo ?? null;
      stav.dniDoVyprsania = ulozeny.dniDoVyprsania ?? null;

      const dniOdKontaktu = Math.floor(
        (Date.now() - ulozeny.poslednyUspesnyKontakt) / (24 * 60 * 60 * 1000)
      );
      console.log(`ℹ️  Načítaný posledný známy stav licencie (kontakt pred ${dniOdKontaktu} dňami)`);
    }
  } catch (error: any) {
    console.warn(`⚠️  Uložený stav licencie sa nepodarilo načítať: ${error.message}`);
  }
};

/**
 * Prevedie objekt na JSON s abecedne zoradenými kľúčmi.
 * Musí zodpovedať rovnakej funkcii na licenčnom serveri, inak by podpis
 * nesedel, hoci údaje sú rovnaké.
 */
const stabilnyJson = (hodnota: unknown): string => {
  if (hodnota === null || typeof hodnota !== 'object') {
    return JSON.stringify(hodnota);
  }
  if (Array.isArray(hodnota)) {
    return `[${hodnota.map(stabilnyJson).join(',')}]`;
  }
  const zaznam = hodnota as Record<string, unknown>;
  return `{${Object.keys(zaznam)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${stabilnyJson(zaznam[k])}`)
    .join(',')}}`;
};

/**
 * Overí podpis odpovede verejným kľúčom.
 */
const overPodpis = (udaje: unknown, podpisBase64: string): boolean => {
  const verejnyKluc = process.env.LICENSE_PUBLIC_KEY;

  if (!verejnyKluc) {
    console.error('⚠️  Chýba LICENSE_PUBLIC_KEY - odpoveď licenčného servera sa nedá overiť');
    return false;
  }

  try {
    const sprava = Buffer.from(stabilnyJson(udaje), 'utf8');
    const kluc = crypto.createPublicKey(verejnyKluc.replace(/\\n/g, '\n'));
    return crypto.verify(null, sprava, kluc, Buffer.from(podpisBase64, 'base64'));
  } catch (error) {
    console.error('⚠️  Podpis odpovede sa nepodarilo overiť:', error);
    return false;
  }
};

/**
 * Spojí sa s licenčným serverom a aktualizuje stav.
 */
export const overLicenciu = async (): Promise<void> => {
  const kluc = process.env.LICENSE_KEY;
  const adresaServera = process.env.LICENSE_SERVER_URL;

  stav.poslednyPokus = Date.now();

  if (!kluc || !adresaServera) {
    stav.platna = false;
    stav.dovod = 'chybajuca_konfiguracia';
    console.error('❌ Chýba LICENSE_KEY alebo LICENSE_SERVER_URL v .env');
    return;
  }

  try {
    // AbortController zabezpečí, že sa nečaká donekonečna
    const prerusenie = new AbortController();
    const casovac = setTimeout(() => prerusenie.abort(), TIMEOUT_MS);

    const odpoved = await fetch(`${adresaServera.replace(/\/+$/, '')}/api/license/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        licenseKey: kluc,
        domena: process.env.CLIENT_DOMAIN || null,
      }),
      signal: prerusenie.signal,
    });

    clearTimeout(casovac);

    const telo: any = await odpoved.json();

    if (!telo?.data || !telo?.podpis) {
      throw new Error('Odpoveď servera nemá očakávaný tvar');
    }

    // Overenie podpisu - bez neho odpoveď ignorujeme
    if (!overPodpis(telo.data, telo.podpis)) {
      stav.platna = false;
      stav.dovod = 'neplatny_podpis';
      console.error('❌ Podpis odpovede licenčného servera je neplatný - odpoveď ignorovaná');
      return;
    }

    // Podpis sedí, môžeme údajom veriť
    stav.platna = telo.data.platna === true;
    stav.dovod = telo.data.dovod ?? null;
    stav.plan = telo.data.plan ?? null;
    stav.funkcie = Array.isArray(telo.data.funkcie) ? telo.data.funkcie : [];
    stav.platnaDo = telo.data.platnaDo ?? null;
    stav.dniDoVyprsania = telo.data.dniDoVyprsania ?? null;
    stav.poslednyUspesnyKontakt = Date.now();

    // Uloženie na disk, aby ochranná lehota prežila reštart servera
    ulozStavNaDisk();

    if (stav.platna) {
      const dni = stav.dniDoVyprsania;
      console.log(`✅ Licencia platná (plán: ${stav.plan}${dni !== null ? `, ostáva ${dni} dní` : ''})`);

      // Upozornenie na blížiace sa vypršanie
      if (dni !== null && dni <= 30) {
        console.warn(`⚠️  Licencia vyprší o ${dni} dní. Kontaktujte dodávateľa.`);
      }
    } else {
      console.error(`❌ Licencia nie je platná. Dôvod: ${stav.dovod}`);
    }
  } catch (error: any) {
    // Server je nedostupný - stav nemeníme, uplatní sa ochranná lehota
    console.warn(`⚠️  Licenčný server je nedostupný (${error.message}). Platí ochranná lehota.`);
  }
};

/**
 * Je licencia použiteľná?
 * Buď je platná, alebo sme v ochrannej lehote po poslednom úspešnom kontakte.
 */
const jeLicenciaPouzitelna = (): { povolene: boolean; dovod: string } => {
  if (stav.platna) {
    return { povolene: true, dovod: 'platna' };
  }

  // Ochranná lehota sa uplatní len vtedy, keď server nie je dostupný.
  // Ak server jasne povedal, že licencia vypršala, lehota neplatí -
  // inak by sa dala zneužiť odpojením od internetu.
  const serverOdpovedal = stav.dovod && stav.dovod !== 'nezistene';
  const jasneZamietnutie = ['vyprsana_licencia', 'licencia_zrusena', 'licencia_pozastavena',
                            'neexistujuca_licencia', 'nespravna_domena'].includes(stav.dovod || '');

  if (serverOdpovedal && jasneZamietnutie) {
    return { povolene: false, dovod: stav.dovod! };
  }

  // Server nedostupný - kontrolujeme ochrannú lehotu
  if (stav.poslednyUspesnyKontakt) {
    const uplynulo = Date.now() - stav.poslednyUspesnyKontakt;
    if (uplynulo < OCHRANNA_LEHOTA_MS) {
      const zostava = Math.ceil((OCHRANNA_LEHOTA_MS - uplynulo) / (24 * 60 * 60 * 1000));
      return { povolene: true, dovod: `ochranna_lehota_${zostava}_dni` };
    }
    return { povolene: false, dovod: 'ochranna_lehota_vyprsala' };
  }

  // Nikdy sa nepodarilo spojiť - nemáme čo predĺžiť
  return { povolene: false, dovod: stav.dovod || 'nezistene' };
};

/**
 * Middleware blokujúci zápisové operácie pri neplatnej licencii.
 *
 * Čítanie (GET, HEAD, OPTIONS) necháme prejsť vždy - verejný web klubu
 * má zostať dostupný aj pri problémoch s licenciou. Blokujeme len zmeny,
 * takže klub nemôže pridávať obsah, kým sa licencia nevyrieši.
 */
export const kontrolaLicencie = (req: Request, res: Response, next: NextFunction): void => {
  // Kontrolu preskočíme, ak je vypnutá (užitočné pri vývoji a testoch)
  if (process.env.LICENSE_CHECK_DISABLED === 'true') {
    next();
    return;
  }

  // Čítanie je vždy povolené
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    next();
    return;
  }

  // Prihlásenie musí fungovať, aby sa admin dostal dnu a videl upozornenie;
  // opätovné overenie licencie je cesta, ako blokovanie zrušiť
  if (req.path.startsWith('/api/auth/') || req.path === '/api/license/check') {
    next();
    return;
  }

  const { povolene, dovod } = jeLicenciaPouzitelna();

  if (povolene) {
    next();
    return;
  }

  res.status(403).json({
    success: false,
    message: 'Licencia nie je platná. Zmeny obsahu sú dočasne zablokované.',
    licencia: {
      dovod,
      platnaDo: stav.platnaDo,
    },
  });
};

/**
 * Spustí pravidelnú kontrolu licencie.
 * Volá sa raz pri štarte servera.
 *
 * @returns funkcia na zastavenie kontroly (užitočné v testoch)
 */
export const spustiKontroluLicencie = (): (() => void) => {
  if (process.env.LICENSE_CHECK_DISABLED === 'true') {
    console.log('ℹ️  Kontrola licencie je vypnutá (LICENSE_CHECK_DISABLED=true)');
    return () => {};
  }

  // Obnovenie posledného známeho stavu z disku.
  // Musí prebehnúť PRED prvým overením, aby ochranná lehota fungovala
  // aj vtedy, keď je licenčný server hneď pri štarte nedostupný.
  nacitajStavZDisku();

  // Prvá kontrola hneď pri štarte
  void overLicenciu();

  // Ďalšie kontroly každých 24 hodín.
  // unref() zabezpečí, že časovač nebráni ukončeniu procesu.
  const casovac = setInterval(() => void overLicenciu(), INTERVAL_KONTROLY_MS);
  casovac.unref();

  return () => clearInterval(casovac);
};

/**
 * Aktuálny stav licencie pre zobrazenie v admin rozhraní.
 */
export const stavLicencie = () => {
  // Pri vypnutej kontrole (vývoj, testy) sa zmeny neblokujú - stav to
  // má povedať, nie ukazovať „neaktívna" pre chýbajúci kľúč
  const { povolene, dovod } =
    process.env.LICENSE_CHECK_DISABLED === 'true'
      ? { povolene: true, dovod: 'vypnuta_kontrola' }
      : jeLicenciaPouzitelna();
  return {
    povolene,
    dovod,
    plan: stav.plan,
    funkcie: stav.funkcie,
    platnaDo: stav.platnaDo,
    dniDoVyprsania: stav.dniDoVyprsania,
    poslednaKontrola: stav.poslednyPokus ? new Date(stav.poslednyPokus).toISOString() : null,
    poslednyUspesnyKontakt: stav.poslednyUspesnyKontakt
      ? new Date(stav.poslednyUspesnyKontakt).toISOString()
      : null,
  };
};

/**
 * Nastavenie stavu pre testy. V bežnej prevádzke sa nepoužíva.
 */
export const _nastavStavPreTesty = (novy: Partial<StavLicencie>): void => {
  stav = { ...stav, ...novy };
};
