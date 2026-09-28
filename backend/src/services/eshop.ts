// Umiestnenie: backend/src/services/eshop.ts
// Logika e-shopu: nastavenia obchodu, kontrola vlastností produktu,
// výpočet ceny, vytvorenie objednávky so skladom, vrátenie na sklad,
// e-maily a príprava platobnej brány.
//
// CENY POČÍTA VŽDY SERVER. Košík z prehliadača posiela len produkty,
// počty a zvolené vlastnosti - ceny, príplatky, dopravu a poplatky
// dopočíta server z databázy, takže sa nedajú podvrhnúť.
//
// PLATOBNÁ BRÁNA (príprava): spôsob platby typu „brana" má HTML/JS kód
// od poskytovateľa (tlačidlo, formulár). Po objednávke sa kód ukáže
// zákazníkovi so značkami nahradenými údajmi objednávky ({{suma}},
// {{vs}}...). Web ho vkladá do izolovaného rámca (sandbox), takže
// nemá prístup k prihláseniu ani k zvyšku webu. O zaplatení dá brána
// vedieť na adresu oznámenia s tajným kľúčom (viď oznamenieOPlatbe).

import crypto from 'crypto';
import { Op, Transaction } from 'sequelize';
import sequelize from '../config/database';
import NastaveniaKlubu from '../models/NastaveniaKlubu';
import {
  EshopDorucenie,
  EshopObjednavka,
  EshopPlatba,
  EshopPolozka,
  EshopProdukt,
  suma,
  type HodnotaVlastnosti,
  type VlastnostProduktu,
  type ZvolenaVlastnost,
} from '../models/Eshop';
import { posliEmail } from '../utils/email';
import { sanitizePlainText } from '../utils/sanitize';

/** Chyba, ktorú treba ukázať zákazníkovi alebo správcovi (HTTP 400/409). */
export class ChybaEshopu extends Error {
  constructor(message: string, public stav = 400) {
    super(message);
  }
}

// ===== Nastavenia obchodu =====

export interface NastaveniaEshopu {
  zapnuty: boolean;
  /** Mena cien (ISO kód, napr. EUR, CZK) */
  mena: string;
  /** Kam chodia oznámenia o nových objednávkach (inak e-mail klubu) */
  email_objednavok: string | null;
  /** Odkaz na obchodné podmienky - zákazník ich musí odsúhlasiť */
  podmienky_url: string | null;
  /** Text na stránke po odoslaní objednávky */
  text_potvrdenia: string | null;
  predvolena_krajina: string;
  /** Najnižšia hodnota tovaru v objednávke (0 = bez obmedzenia) */
  minimalna_objednavka: number;
}

export const PREDVOLENE_NASTAVENIA: NastaveniaEshopu = {
  zapnuty: false,
  mena: 'EUR',
  email_objednavok: null,
  podmienky_url: null,
  text_potvrdenia: null,
  predvolena_krajina: 'Slovensko',
  minimalna_objednavka: 0,
};

export const nastaveniaEshopu = async (): Promise<NastaveniaEshopu> => {
  const n = ((await NastaveniaKlubu.nacitaj()).nastavenia_eshopu || {}) as Partial<NastaveniaEshopu>;
  return {
    ...PREDVOLENE_NASTAVENIA,
    ...n,
    zapnuty: n.zapnuty === true,
    mena: typeof n.mena === 'string' && /^[A-Z]{3}$/.test(n.mena) ? n.mena : 'EUR',
    minimalna_objednavka: Math.max(0, suma(n.minimalna_objednavka)),
  };
};

/** Overí a uloží nastavenia obchodu z administrácie. */
export const ulozNastaveniaEshopu = async (vstup: any): Promise<NastaveniaEshopu> => {
  const nastavenia = await NastaveniaKlubu.nacitaj();
  const sucasne = await nastaveniaEshopu();
  const text = (h: unknown, max: number) => {
    const t = sanitizePlainText(String(h ?? '')).trim().slice(0, max);
    return t || null;
  };
  const nove: NastaveniaEshopu = { ...sucasne };
  if (vstup.zapnuty !== undefined) nove.zapnuty = vstup.zapnuty === true;
  if (vstup.mena !== undefined) {
    const mena = String(vstup.mena || '').trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(mena)) throw new ChybaEshopu('Mena musí byť trojpísmenový kód, napríklad EUR');
    nove.mena = mena;
  }
  if (vstup.email_objednavok !== undefined) {
    const email = text(vstup.email_objednavok, 150);
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ChybaEshopu('E-mail pre objednávky nie je platný');
    nove.email_objednavok = email;
  }
  if (vstup.podmienky_url !== undefined) {
    const url = text(vstup.podmienky_url, 255);
    if (url && !/^(\/|https?:\/\/)/.test(url)) throw new ChybaEshopu('Odkaz na obchodné podmienky musí začínať / alebo https://');
    nove.podmienky_url = url;
  }
  if (vstup.text_potvrdenia !== undefined) nove.text_potvrdenia = text(vstup.text_potvrdenia, 2000);
  if (vstup.predvolena_krajina !== undefined) nove.predvolena_krajina = text(vstup.predvolena_krajina, 80) || 'Slovensko';
  if (vstup.minimalna_objednavka !== undefined) {
    const min = Number(vstup.minimalna_objednavka || 0);
    if (!Number.isFinite(min) || min < 0) throw new ChybaEshopu('Najnižšia objednávka nemôže byť záporná');
    nove.minimalna_objednavka = suma(min);
  }
  nastavenia.nastavenia_eshopu = { ...nove };
  nastavenia.changed('nastavenia_eshopu', true);
  await nastavenia.save();
  return nove;
};

// ===== Pomôcky =====

/** „Dres domáci 2026" → „dres-domaci-2026" */
export const slugZNazvu = (nazov: string): string =>
  nazov
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]+/g, ' ')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 150) || 'polozka';

/** Nepoužitý slug - pri zhode pridá -2, -3... */
export const volnySlug = async (
  model: { findOne: (o: any) => Promise<any> },
  zaklad: string,
  okremId?: number
): Promise<string> => {
  const slug = slugZNazvu(zaklad);
  for (let i = 1; i < 500; i++) {
    const kandidat = i === 1 ? slug : `${slug}-${i}`;
    const existuje = await model.findOne({ where: { slug: kandidat, ...(okremId ? { id: { [Op.ne]: okremId } } : {}) } });
    if (!existuje) return kandidat;
  }
  return `${slug}-${Date.now()}`;
};

const nahodneId = () => crypto.randomBytes(6).toString('hex');
const cisloAleboNull = (h: unknown): number | null => {
  if (h === null || h === undefined || h === '') return null;
  const n = Number(h);
  return Number.isFinite(n) ? n : NaN;
};

/**
 * Overí a znormalizuje vlastnosti produktu z administrácie. Doplní
 * chýbajúce id, aby sa hodnoty dali spoľahlivo priradiť ku skladu
 * aj po premenovaní.
 */
export const ocistiVlastnosti = (vstup: unknown): VlastnostProduktu[] => {
  if (vstup === null || vstup === undefined) return [];
  if (!Array.isArray(vstup)) throw new ChybaEshopu('Vlastnosti produktu musia byť zoznam');
  if (vstup.length > 10) throw new ChybaEshopu('Produkt môže mať najviac 10 vlastností');
  return vstup.map((v: any) => {
    const nazov = sanitizePlainText(String(v?.nazov ?? '')).trim().slice(0, 60);
    if (!nazov) throw new ChybaEshopu('Každá vlastnosť musí mať názov (napríklad Veľkosť)');
    const typ = v?.typ === 'text' ? 'text' : 'vyber';
    const priplatok = cisloAleboNull(v?.priplatok) ?? 0;
    if (Number.isNaN(priplatok) || priplatok < 0) throw new ChybaEshopu(`Príplatok vlastnosti „${nazov}" nie je platný`);
    const maxDlzka = cisloAleboNull(v?.max_dlzka);
    if (Number.isNaN(maxDlzka as number) || (maxDlzka !== null && (maxDlzka < 1 || maxDlzka > 200))) {
      throw new ChybaEshopu(`Najväčšia dĺžka textu pri „${nazov}" musí byť 1 až 200 znakov`);
    }
    const hodnoty: HodnotaVlastnosti[] =
      typ === 'text'
        ? []
        : (Array.isArray(v?.hodnoty) ? v.hodnoty : []).map((h: any) => {
            const nazovHodnoty = sanitizePlainText(String(h?.nazov ?? '')).trim().slice(0, 60);
            if (!nazovHodnoty) throw new ChybaEshopu(`Vlastnosť „${nazov}" má prázdnu hodnotu`);
            const priplatokHodnoty = cisloAleboNull(h?.priplatok) ?? 0;
            if (Number.isNaN(priplatokHodnoty) || priplatokHodnoty < 0) {
              throw new ChybaEshopu(`Príplatok hodnoty „${nazovHodnoty}" nie je platný`);
            }
            const sklad = cisloAleboNull(h?.sklad);
            if (Number.isNaN(sklad as number) || (sklad !== null && (sklad < 0 || !Number.isInteger(sklad)))) {
              throw new ChybaEshopu(`Sklad hodnoty „${nazovHodnoty}" musí byť celé číslo 0 alebo viac`);
            }
            return {
              id: typeof h?.id === 'string' && /^[a-z0-9-]{1,40}$/i.test(h.id) ? h.id : nahodneId(),
              nazov: nazovHodnoty,
              priplatok: suma(priplatokHodnoty),
              sklad,
            };
          });
    if (typ === 'vyber' && hodnoty.length === 0) throw new ChybaEshopu(`Vlastnosť „${nazov}" potrebuje aspoň jednu hodnotu`);
    if (hodnoty.length > 50) throw new ChybaEshopu(`Vlastnosť „${nazov}" môže mať najviac 50 hodnôt`);
    const mena = new Set<string>();
    for (const h of hodnoty) {
      const kluc = h.nazov.toLowerCase();
      if (mena.has(kluc)) throw new ChybaEshopu(`Vlastnosť „${nazov}" má hodnotu „${h.nazov}" dvakrát`);
      mena.add(kluc);
    }
    return {
      id: typeof v?.id === 'string' && /^[a-z0-9-]{1,40}$/i.test(v.id) ? v.id : nahodneId(),
      nazov,
      typ,
      povinna: typ === 'vyber' ? true : v?.povinna === true,
      hodnoty,
      priplatok: typ === 'text' ? suma(priplatok) : 0,
      max_dlzka: typ === 'text' ? maxDlzka ?? 40 : null,
    } as VlastnostProduktu;
  });
};

/** Zvolené vlastnosti v košíku: { [vlastnost_id]: hodnota_id alebo text } */
export type Volby = Record<string, string>;

/**
 * Cena jedného kusu so zvolenými vlastnosťami a ich popis do objednávky.
 *
 * @throws ChybaEshopu - chýba povinná voľba, neznáma hodnota, dlhý text
 */
export const vypocitajPolozku = (produkt: EshopProdukt, volby: Volby = {}) => {
  let cena = suma(produkt.cena);
  const zvolene: ZvolenaVlastnost[] = [];
  for (const v of produkt.vlastnosti || []) {
    const vstup = typeof volby[v.id] === 'string' ? volby[v.id].trim() : '';
    if (v.typ === 'vyber') {
      const hodnota = v.hodnoty.find((h) => h.id === vstup);
      if (!hodnota) throw new ChybaEshopu(`Vyberte „${v.nazov}" pri produkte ${produkt.nazov}`);
      cena += suma(hodnota.priplatok);
      zvolene.push({ vlastnost_id: v.id, nazov: v.nazov, hodnota: hodnota.nazov, hodnota_id: hodnota.id });
    } else {
      const textVolby = sanitizePlainText(vstup).trim();
      if (!textVolby) {
        if (v.povinna) throw new ChybaEshopu(`Vyplňte „${v.nazov}" pri produkte ${produkt.nazov}`);
        continue;
      }
      if (v.max_dlzka && textVolby.length > v.max_dlzka) {
        throw new ChybaEshopu(`„${v.nazov}" môže mať najviac ${v.max_dlzka} znakov`);
      }
      cena += suma(v.priplatok);
      zvolene.push({ vlastnost_id: v.id, nazov: v.nazov, hodnota: textVolby, hodnota_id: null });
    }
  }
  return { cena_za_kus: suma(cena), vlastnosti: zvolene };
};

// ===== Objednávka =====

export interface VstupObjednavky {
  polozky: Array<{ produkt_id: number; pocet: number; volby?: Volby }>;
  meno: string;
  email: string;
  telefon?: string | null;
  ulica?: string | null;
  mesto?: string | null;
  psc?: string | null;
  krajina?: string | null;
  poznamka?: string | null;
  dorucenie_id: number;
  platba_id: number;
  suhlas_podmienky?: boolean;
}

const MAX_POLOZIEK = 30;
const MAX_KUSOV = 99;

/** Zníži alebo zvýši sklad produktu a hodnôt vlastností (v transakcii). */
const upravSklad = async (
  produkt: EshopProdukt,
  pocet: number,
  hodnotyIds: string[],
  smer: -1 | 1,
  transakcia: Transaction
) => {
  const zmeny: any = {};
  if (produkt.sklad !== null && produkt.sklad !== undefined) zmeny.sklad = Math.max(0, produkt.sklad + smer * pocet);
  if (hodnotyIds.length) {
    let zmenene = false;
    const vlastnosti = (produkt.vlastnosti || []).map((v) => ({
      ...v,
      hodnoty: v.hodnoty.map((h) => {
        if (!hodnotyIds.includes(h.id) || h.sklad === null || h.sklad === undefined) return h;
        zmenene = true;
        return { ...h, sklad: Math.max(0, h.sklad + smer * pocet) };
      }),
    }));
    if (zmenene) zmeny.vlastnosti = vlastnosti;
  }
  if (Object.keys(zmeny).length) {
    produkt.set(zmeny);
    if (zmeny.vlastnosti) produkt.changed('vlastnosti', true);
    await produkt.save({ transaction: transakcia });
  }
};

const text = (h: unknown, max: number): string | null => {
  const t = sanitizePlainText(String(h ?? '')).trim().slice(0, max);
  return t || null;
};

/**
 * Vytvorí objednávku: prepočíta ceny, overí sklad a zníži ho, vytvorí
 * číslo objednávky a variabilný symbol. Všetko v jednej transakcii so
 * zamknutými produktmi - dve súčasné objednávky neprepíšu sklad.
 */
export const vytvorObjednavku = async (vstup: VstupObjednavky): Promise<EshopObjednavka> => {
  const nastavenia = await nastaveniaEshopu();
  if (!nastavenia.zapnuty) throw new ChybaEshopu('Obchod je momentálne zatvorený', 403);

  const meno = text(vstup.meno, 150);
  const email = text(vstup.email, 150)?.toLowerCase() ?? null;
  if (!meno || meno.length < 2) throw new ChybaEshopu('Zadajte meno a priezvisko');
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ChybaEshopu('Zadajte platný e-mail');
  if (nastavenia.podmienky_url && vstup.suhlas_podmienky !== true) {
    throw new ChybaEshopu('Pred odoslaním objednávky potvrďte súhlas s obchodnými podmienkami');
  }

  const polozkyVstup = Array.isArray(vstup.polozky) ? vstup.polozky : [];
  if (polozkyVstup.length === 0) throw new ChybaEshopu('Košík je prázdny');
  if (polozkyVstup.length > MAX_POLOZIEK) throw new ChybaEshopu(`Objednávka môže mať najviac ${MAX_POLOZIEK} položiek`);
  for (const p of polozkyVstup) {
    if (!Number.isInteger(Number(p?.produkt_id)) || Number(p.produkt_id) < 1) throw new ChybaEshopu('Neplatný produkt v košíku');
    const pocet = Number(p?.pocet);
    if (!Number.isInteger(pocet) || pocet < 1 || pocet > MAX_KUSOV) throw new ChybaEshopu(`Počet kusov musí byť 1 až ${MAX_KUSOV}`);
  }

  const vytvorena = await sequelize.transaction(async (t) => {
    const idProduktov = [...new Set(polozkyVstup.map((p) => Number(p.produkt_id)))];
    const produkty = await EshopProdukt.findAll({
      where: { id: idProduktov, aktivny: true },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    const podlaId = new Map(produkty.map((p) => [p.id, p]));

    // Ceny a požadované množstvá (produkt spolu, hodnoty vlastností spolu)
    const riadky: Array<{
      produkt: EshopProdukt;
      pocet: number;
      cena_za_kus: number;
      vlastnosti: ZvolenaVlastnost[];
    }> = [];
    const kusovProduktu = new Map<number, number>();
    const kusovHodnoty = new Map<string, number>();
    for (const p of polozkyVstup) {
      const produkt = podlaId.get(Number(p.produkt_id));
      if (!produkt) throw new ChybaEshopu('Niektorý produkt v košíku už nie je v ponuke - obnovte košík', 409);
      const pocet = Number(p.pocet);
      const { cena_za_kus, vlastnosti } = vypocitajPolozku(produkt, p.volby || {});
      riadky.push({ produkt, pocet, cena_za_kus, vlastnosti });
      kusovProduktu.set(produkt.id, (kusovProduktu.get(produkt.id) ?? 0) + pocet);
      for (const v of vlastnosti) {
        if (v.hodnota_id) {
          const kluc = `${produkt.id}:${v.vlastnost_id}:${v.hodnota_id}`;
          kusovHodnoty.set(kluc, (kusovHodnoty.get(kluc) ?? 0) + pocet);
        }
      }
    }

    // Sklad
    for (const [id, pocet] of kusovProduktu) {
      const produkt = podlaId.get(id)!;
      if (produkt.sklad !== null && produkt.sklad < pocet) {
        throw new ChybaEshopu(
          produkt.sklad <= 0
            ? `${produkt.nazov} je vypredaný`
            : `${produkt.nazov}: na sklade zostáva už len ${produkt.sklad} ks`,
          409
        );
      }
    }
    for (const [kluc, pocet] of kusovHodnoty) {
      const [id, vlastnostId, hodnotaId] = kluc.split(':');
      const produkt = podlaId.get(Number(id))!;
      const hodnota = produkt.vlastnosti.find((v) => v.id === vlastnostId)?.hodnoty.find((h) => h.id === hodnotaId);
      if (hodnota && hodnota.sklad !== null && hodnota.sklad < pocet) {
        throw new ChybaEshopu(
          hodnota.sklad <= 0
            ? `${produkt.nazov} (${hodnota.nazov}) je vypredaný`
            : `${produkt.nazov} (${hodnota.nazov}): na sklade zostáva už len ${hodnota.sklad} ks`,
          409
        );
      }
    }

    const medzisucet = suma(riadky.reduce((s, r) => s + r.cena_za_kus * r.pocet, 0));
    if (nastavenia.minimalna_objednavka > 0 && medzisucet < nastavenia.minimalna_objednavka) {
      throw new ChybaEshopu(`Najnižšia hodnota objednávky je ${nastavenia.minimalna_objednavka} ${nastavenia.mena}`);
    }

    // Doručenie a platba
    const dorucenie = await EshopDorucenie.findOne({ where: { id: Number(vstup.dorucenie_id) || 0, aktivny: true }, transaction: t });
    if (!dorucenie) throw new ChybaEshopu('Vyberte spôsob doručenia');
    const platba = await EshopPlatba.findOne({ where: { id: Number(vstup.platba_id) || 0, aktivny: true }, transaction: t });
    if (!platba) throw new ChybaEshopu('Vyberte spôsob platby');
    if (!platba.povolenaPre(dorucenie.id)) throw new ChybaEshopu(`Platbu „${platba.nazov}" nemožno použiť s doručením „${dorucenie.nazov}"`);

    const adresa = {
      ulica: text(vstup.ulica, 200),
      mesto: text(vstup.mesto, 100),
      psc: text(vstup.psc, 20),
      krajina: text(vstup.krajina, 80) || nastavenia.predvolena_krajina,
    };
    const telefon = text(vstup.telefon, 40);
    if (dorucenie.vyzaduje_adresu) {
      if (!adresa.ulica || !adresa.mesto || !adresa.psc) throw new ChybaEshopu('Pri tomto doručení vyplňte ulicu, mesto a PSČ');
      if (!telefon) throw new ChybaEshopu('Pri doručení na adresu zadajte telefón pre kuriéra');
    }

    const dorucenieCena = dorucenie.cenaPre(medzisucet);
    const poplatok = suma(platba.poplatok);
    const spolu = suma(medzisucet + dorucenieCena + poplatok);

    // Číslo objednávky: rok + poradie v roku (20260001). Zámok v transakcii,
    // aby dve súčasné objednávky nedostali rovnaké číslo.
    await sequelize.query('SELECT pg_advisory_xact_lock(73217)', { transaction: t });
    const rok = new Date().getFullYear();
    const [[{ pocet }]] = (await sequelize.query(
      `SELECT COUNT(*)::int AS pocet FROM "eshop_objednavky" WHERE "cislo" LIKE :vzor`,
      { replacements: { vzor: `${rok}%` }, transaction: t }
    )) as any;
    const cislo = `${rok}${String(pocet + 1).padStart(4, '0')}`;

    const objednavka = await EshopObjednavka.create(
      {
        cislo,
        token: crypto.randomBytes(24).toString('hex'),
        meno,
        email,
        telefon,
        ...adresa,
        poznamka: text(vstup.poznamka, 1000),
        dorucenie_id: dorucenie.id,
        dorucenie_nazov: dorucenie.nazov,
        dorucenie_cena: dorucenieCena,
        platba_id: platba.id,
        platba_nazov: platba.nazov,
        platba_typ: platba.typ,
        platba_poplatok: poplatok,
        medzisucet,
        spolu,
        mena: nastavenia.mena,
        variabilny_symbol: cislo,
      },
      { transaction: t }
    );

    for (const r of riadky) {
      await EshopPolozka.create(
        {
          objednavka_id: objednavka.id,
          produkt_id: r.produkt.id,
          nazov: r.produkt.nazov,
          kod: r.produkt.kod,
          vlastnosti: r.vlastnosti,
          cena_za_kus: r.cena_za_kus,
          pocet: r.pocet,
          spolu: suma(r.cena_za_kus * r.pocet),
        },
        { transaction: t }
      );
      await upravSklad(r.produkt, r.pocet, r.vlastnosti.map((v) => v.hodnota_id).filter((h): h is string => Boolean(h)), -1, t);
    }

    return objednavka;
  });

  const plna = (await EshopObjednavka.findByPk(vytvorena.id, { include: [{ model: EshopPolozka, as: 'polozky' }] }))!;
  // E-maily neblokujú odpoveď - objednávka je platná aj keď e-mail neodíde
  void posliEmailyObjednavky(plna).catch((e) => console.error('E-mail k objednávke sa nepodarilo odoslať:', e));
  return plna;
};

/** Pri zrušení objednávky vráti kusy na sklad (len raz). */
export const vratNaSklad = async (objednavka: EshopObjednavka, t: Transaction): Promise<void> => {
  if (objednavka.sklad_vrateny) return;
  const polozky = await EshopPolozka.findAll({ where: { objednavka_id: objednavka.id }, transaction: t });
  for (const p of polozky) {
    if (!p.produkt_id) continue;
    const produkt = await EshopProdukt.findByPk(p.produkt_id, { transaction: t, lock: t.LOCK.UPDATE });
    if (!produkt) continue;
    await upravSklad(produkt, p.pocet, (p.vlastnosti || []).map((v) => v.hodnota_id).filter((h): h is string => Boolean(h)), 1, t);
  }
  objednavka.sklad_vrateny = true;
  await objednavka.save({ transaction: t });
};

// ===== Texty pre zákazníka =====

const HTML_ZNAKY: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const escapuj = (s: string) => s.replace(/[&<>"']/g, (z) => HTML_ZNAKY[z]);

/** Adresa webu pre odkazy v e-mailoch a návrat z platobnej brány. */
export const adresaWebu = () => (process.env.WEB_URL || process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/+$/, '');
export const adresaApi = () => (process.env.API_URL || `${adresaWebu()}/api`).replace(/\/+$/, '');

/** Hodnoty značiek {{...}} pre pokyny k platbe a kód platobnej brány. */
export const znackyObjednavky = async (o: EshopObjednavka) => {
  const klub = await NastaveniaKlubu.nacitaj();
  const spolu = suma(o.spolu);
  return {
    cislo: o.cislo,
    vs: o.variabilny_symbol,
    suma: spolu.toFixed(2),
    suma_text: spolu.toLocaleString('sk-SK', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    suma_centy: String(Math.round(spolu * 100)),
    mena: o.mena,
    meno: o.meno,
    email: o.email,
    telefon: o.telefon || '',
    iban: klub.iban || '',
    klub: klub.nazov,
    popis: `Objednávka ${o.cislo}`,
    navrat_url: `${adresaWebu()}/objednavka/${o.token}`,
    oznamenie_url: o.platba_id ? `${adresaApi()}/eshop/platby/${o.platba_id}/oznamenie` : '',
  } as Record<string, string>;
};

/** Nahradí značky {{nazov}}; pri HTML sa hodnoty escapujú. */
export const nahradZnacky = (sablona: string, hodnoty: Record<string, string>, html = false): string =>
  sablona.replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (cele, nazov: string) => {
    const hodnota = hodnoty[nazov.toLowerCase()];
    if (hodnota === undefined) return cele;
    return html ? escapuj(hodnota) : hodnota;
  });

/** Objednávka tak, ako ju vidí zákazník cez tajný odkaz. */
export const verejnaObjednavka = async (o: EshopObjednavka) => {
  const polozky = o.polozky ?? (await EshopPolozka.findAll({ where: { objednavka_id: o.id }, order: [['id', 'ASC']] }));
  const nastavenia = await nastaveniaEshopu();
  const platba = o.platba_id ? await EshopPlatba.findByPk(o.platba_id) : null;
  const znacky = await znackyObjednavky(o);
  const caka = o.stav_platby === 'neuhradena' && o.stav !== 'zrusena';
  return {
    cislo: o.cislo,
    stav: o.stav,
    stav_platby: o.stav_platby,
    vytvorena: o.vytvorena,
    meno: o.meno,
    email: o.email,
    telefon: o.telefon,
    ulica: o.ulica,
    mesto: o.mesto,
    psc: o.psc,
    krajina: o.krajina,
    poznamka: o.poznamka,
    dorucenie_nazov: o.dorucenie_nazov,
    dorucenie_cena: suma(o.dorucenie_cena),
    platba_nazov: o.platba_nazov,
    platba_typ: o.platba_typ,
    platba_poplatok: suma(o.platba_poplatok),
    medzisucet: suma(o.medzisucet),
    spolu: suma(o.spolu),
    mena: o.mena,
    variabilny_symbol: o.variabilny_symbol,
    polozky: polozky.map((p) => p.toJSON()),
    text_potvrdenia: nastavenia.text_potvrdenia,
    // Pokyny k platbe (napr. IBAN a VS) - len kým nie je zaplatené
    pokyny: caka && platba?.pokyny ? nahradZnacky(platba.pokyny, znacky) : null,
    // Kód platobnej brány - web ho vloží do izolovaného rámca
    brana_html: caka && platba?.typ === 'brana' && platba.brana_html ? nahradZnacky(platba.brana_html, znacky, true) : null,
  };
};

const cenaText = (h: unknown, mena: string) =>
  `${suma(h).toLocaleString('sk-SK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${mena === 'EUR' ? '€' : mena}`;

const suhrnObjednavky = (o: EshopObjednavka) =>
  [
    ...(o.polozky ?? []).map(
      (p) =>
        `• ${p.nazov}${p.vlastnosti?.length ? ` (${p.vlastnosti.map((v) => `${v.nazov}: ${v.hodnota}`).join(', ')})` : ''} - ${p.pocet} × ${cenaText(p.cena_za_kus, o.mena)}`
    ),
    '',
    `Tovar: ${cenaText(o.medzisucet, o.mena)}`,
    `Doručenie (${o.dorucenie_nazov}): ${cenaText(o.dorucenie_cena, o.mena)}`,
    ...(suma(o.platba_poplatok) > 0 ? [`Platba (${o.platba_nazov}): ${cenaText(o.platba_poplatok, o.mena)}`] : [`Platba: ${o.platba_nazov}`]),
    `Spolu: ${cenaText(o.spolu, o.mena)}`,
  ].join('\n');

/** Potvrdenie zákazníkovi a oznámenie klubu o novej objednávke. */
export const posliEmailyObjednavky = async (o: EshopObjednavka) => {
  const klub = await NastaveniaKlubu.nacitaj();
  const nastavenia = await nastaveniaEshopu();
  const platba = o.platba_id ? await EshopPlatba.findByPk(o.platba_id) : null;
  const pokyny = platba?.pokyny ? nahradZnacky(platba.pokyny, await znackyObjednavky(o)) : null;
  const odkaz = `${adresaWebu()}/objednavka/${o.token}`;

  await posliEmail({
    prijemca: o.email,
    predmet: `Objednávka ${o.cislo} - ${klub.nazov}`,
    text: [
      `Dobrý deň ${o.meno},`,
      '',
      `ďakujeme za objednávku č. ${o.cislo}.`,
      '',
      suhrnObjednavky(o),
      ...(pokyny ? ['', pokyny] : []),
      '',
      `Stav objednávky: ${odkaz}`,
      '',
      klub.nazov,
    ].join('\n'),
  });

  const spravca = nastavenia.email_objednavok || klub.email;
  if (spravca) {
    await posliEmail({
      prijemca: spravca,
      predmet: `Nová objednávka ${o.cislo} (${cenaText(o.spolu, o.mena)})`,
      text: [
        `Nová objednávka č. ${o.cislo} od ${o.meno} <${o.email}>${o.telefon ? `, ${o.telefon}` : ''}.`,
        '',
        suhrnObjednavky(o),
        ...(o.ulica ? ['', `Adresa: ${o.ulica}, ${o.psc} ${o.mesto}, ${o.krajina ?? ''}`] : []),
        ...(o.poznamka ? ['', `Poznámka: ${o.poznamka}`] : []),
        '',
        `Administrácia: ${adresaWebu()}/admin/eshop/objednavky/${o.id}`,
      ].join('\n'),
    });
  }
};

export const NAZVY_STAVOV: Record<string, string> = {
  nova: 'prijatá',
  potvrdena: 'potvrdená',
  pripravena: 'pripravená na odovzdanie',
  odoslana: 'odoslaná',
  vybavena: 'vybavená',
  zrusena: 'zrušená',
};

/** Zákazníkovi dá vedieť o zmene stavu objednávky (ak to správca zvolí). */
export const posliZmenuStavu = async (o: EshopObjednavka) => {
  const klub = await NastaveniaKlubu.nacitaj();
  await posliEmail({
    prijemca: o.email,
    predmet: `Objednávka ${o.cislo} je ${NAZVY_STAVOV[o.stav] ?? o.stav}`,
    text: [
      `Dobrý deň ${o.meno},`,
      '',
      `vaša objednávka č. ${o.cislo} je teraz ${NAZVY_STAVOV[o.stav] ?? o.stav}.`,
      ...(o.stav_platby === 'uhradena' ? ['Platbu sme prijali, ďakujeme.'] : []),
      '',
      `Stav objednávky: ${adresaWebu()}/objednavka/${o.token}`,
      '',
      klub.nazov,
    ].join('\n'),
  });
};

// ===== Oznámenie od platobnej brány =====

/**
 * Brána oznámi výsledok platby na POST /api/eshop/platby/:id/oznamenie
 * s tajným kľúčom (hlavička X-ClubW-Kluc alebo pole kluc) a číslom
 * objednávky alebo variabilným symbolom. Opakované oznámenie nič nepokazí.
 */
export const oznamenieOPlatbe = async (
  platbaId: number,
  kluc: string,
  udaje: { cislo?: string; vs?: string; stav?: string; referencia?: string }
) => {
  const platba = await EshopPlatba.findByPk(platbaId);
  if (!platba || platba.typ !== 'brana' || !platba.brana_kluc) throw new ChybaEshopu('Spôsob platby neexistuje', 404);
  const ocakavany = Buffer.from(platba.brana_kluc);
  const prijaty = Buffer.from(String(kluc || ''));
  if (ocakavany.length !== prijaty.length || !crypto.timingSafeEqual(ocakavany, prijaty)) {
    throw new ChybaEshopu('Neplatný kľúč oznámenia', 401);
  }
  const identifikator = String(udaje.cislo || udaje.vs || '').trim();
  if (!identifikator) throw new ChybaEshopu('Chýba číslo objednávky alebo variabilný symbol');
  const objednavka = await EshopObjednavka.findOne({
    where: { platba_id: platba.id, [Op.or]: [{ cislo: identifikator }, { variabilny_symbol: identifikator }] },
  });
  if (!objednavka) throw new ChybaEshopu('Objednávka sa nenašla', 404);

  const stav = String(udaje.stav || '').toLowerCase();
  const zaplatene = ['uhradena', 'zaplatena', 'paid', 'ok', 'success', 'completed'].includes(stav);
  if (zaplatene && objednavka.stav_platby !== 'uhradena') {
    objednavka.stav_platby = 'uhradena';
    objednavka.uhradena = new Date();
    if (objednavka.stav === 'nova') objednavka.stav = 'potvrdena';
  }
  if (udaje.referencia) objednavka.platba_referencia = String(udaje.referencia).slice(0, 120);
  await objednavka.save();
  return { objednavka, zaplatene };
};

/** Nový tajný kľúč pre oznámenia platobnej brány. */
export const novyKlucBrany = () => crypto.randomBytes(24).toString('hex');
