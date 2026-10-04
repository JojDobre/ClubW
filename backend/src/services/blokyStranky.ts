// Umiestnenie: backend/src/services/blokyStranky.ts
//
// BLOKY STRÁNOK
//
// Stránka môže okrem textu z editora obsahovať bloky - časovú os histórie,
// karty osôb (vedenie klubu), čísla, galériu, otázky a odpovede a ďalšie.
// Blok je JSON { id, typ, data, polozky?, pozadie?, skryty? }. Tu sa
// každý blok pred uložením overí a očistí podľa schémy jeho typu:
//  - neznámy typ, zlý odkaz, obrázok alebo video = chyba (ChybaBlokovError),
//  - texty sa orežú na maximálnu dĺžku, HTML sa vyčistí proti XSS,
//  - polia, ktoré schéma nepozná, sa zahodia.
// Zobrazenie blokov rieši šablóna webu (@clubw/jadro, BlokyStranky).

import { sanitizeContent } from '../utils/sanitize';
import { idZUrl, vimeoIdZUrl } from './youtube';

type Pole =
  | { typ: 'text'; max: number }
  | { typ: 'html' }
  | { typ: 'obrazok' }
  | { typ: 'odkaz' }
  | { typ: 'cislo'; min: number; max: number }
  | { typ: 'vyber'; moznosti: string[] }
  | { typ: 'prepinac' }
  /** Tabuľka: { hlavicka: string[], riadky: string[][] } */
  | { typ: 'tabulka' };

interface SchemaBloku {
  polia: Record<string, Pole>;
  polozky?: { max: number; polia: Record<string, Pole> };
}

const T = (max: number): Pole => ({ typ: 'text', max });
const NADPIS = T(150);
const UVOD = T(600);
const STLPCE: Pole = { typ: 'vyber', moznosti: ['2', '3', '4'] };
const ZAROVNANIE: Pole = { typ: 'vyber', moznosti: ['vlavo', 'stred'] };
/** Výber tímu, ligy… - 0 alebo prázdne = predvolený (hlavný tím, liga hlavného tímu) */
const ID: Pole = { typ: 'cislo', min: 0, max: 1_000_000 };
const MAX_STLPCOV_TABULKY = 8;
const MAX_RIADKOV_TABULKY = 100;

export const SCHEMA_BLOKOV: Record<string, SchemaBloku> = {
  text: { polia: { html: { typ: 'html' } } },
  nadpis: { polia: { stitok: T(60), nadpis: NADPIS, text: UVOD, zarovnanie: { typ: 'vyber', moznosti: ['vlavo', 'stred'] } } },
  casova_os: {
    polia: { nadpis: NADPIS, uvod: UVOD },
    polozky: { max: 60, polia: { rok: T(20), nadpis: NADPIS, text: T(1500), obrazok: { typ: 'obrazok' } } },
  },
  osoby: {
    polia: { nadpis: NADPIS, uvod: UVOD, stlpce: STLPCE, vzhlad: { typ: 'vyber', moznosti: ['karty', 'kompaktne'] } },
    polozky: { max: 60, polia: { foto: { typ: 'obrazok' }, meno: T(100), funkcia: T(100), text: T(600), email: T(150), telefon: T(40) } },
  },
  karty: {
    polia: { nadpis: NADPIS, uvod: UVOD, stlpce: STLPCE, vzhlad: { typ: 'vyber', moznosti: ['klasicke', 'prekryv', 'vodorovne', 'jednoduche', 'klub'] } },
    polozky: { max: 24, polia: { obrazok: { typ: 'obrazok' }, nadpis: NADPIS, text: T(600), odkaz: { typ: 'odkaz' }, tlacidlo: T(40) } },
  },
  cisla: {
    polia: { nadpis: NADPIS },
    polozky: { max: 8, polia: { hodnota: T(20), popis: T(80) } },
  },
  obrazok_text: {
    polia: {
      obrazok: { typ: 'obrazok' }, stitok: T(60), nadpis: NADPIS, html: { typ: 'html' },
      strana: { typ: 'vyber', moznosti: ['vlavo', 'vpravo'] }, tlacidlo: T(40), odkaz: { typ: 'odkaz' },
    },
  },
  galeria: {
    polia: { nadpis: NADPIS, stlpce: STLPCE },
    polozky: { max: 60, polia: { obrazok: { typ: 'obrazok' }, popis: T(150) } },
  },
  citat: { polia: { text: T(1000), autor: T(100), funkcia: T(100), foto: { typ: 'obrazok' } } },
  vyzva: { polia: { nadpis: NADPIS, text: UVOD, tlacidlo: T(40), odkaz: { typ: 'odkaz' }, obrazok: { typ: 'obrazok' } } },
  faq: {
    polia: { nadpis: NADPIS },
    polozky: { max: 40, polia: { otazka: T(200), odpoved: T(3000) } },
  },
  uspechy: {
    polia: { nadpis: NADPIS },
    polozky: { max: 60, polia: { rok: T(20), nazov: NADPIS, popis: T(200) } },
  },
  video: { polia: { nadpis: NADPIS, url: T(300), popis: T(200) } },
  mapa: { polia: { nadpis: NADPIS, adresa: T(200) } },
  formular: { polia: { slug: T(100) } },
  clanky: { polia: { nadpis: NADPIS, pocet: { typ: 'cislo', min: 1, max: 12 }, rubrika: T(100), vzhlad: { typ: 'vyber', moznosti: ['karty', 'zoznam'] } } },
  zapasy: {
    polia: { nadpis: NADPIS, tim_id: { typ: 'cislo', min: 0, max: 1_000_000 }, rezim: { typ: 'vyber', moznosti: ['program', 'vysledky'] }, pocet: { typ: 'cislo', min: 1, max: 12 } },
  },
  partneri: { polia: { nadpis: NADPIS } },
  // Automatické bloky s údajmi klubu (aj ako sekcie úvodnej stránky šablóny)
  tabulka_ligy: { polia: { nadpis: NADPIS, liga_id: ID, kompaktna: { typ: 'prepinac' } } },
  strelci: { polia: { nadpis: NADPIS, liga_id: ID, typ: { typ: 'vyber', moznosti: ['gol', 'asistencia'] }, pocet: { typ: 'cislo', min: 1, max: 20 } } },
  statistiky_timu: { polia: { nadpis: NADPIS, tim_id: ID } },
  hraci: { polia: { nadpis: NADPIS, tim_id: ID, pocet: { typ: 'cislo', min: 1, max: 40 } } },
  videa: { polia: { nadpis: NADPIS, pocet: { typ: 'cislo', min: 1, max: 12 } } },
  galerie: { polia: { nadpis: NADPIS, pocet: { typ: 'cislo', min: 1, max: 12 } } },
  produkty: { polia: { nadpis: NADPIS, pocet: { typ: 'cislo', min: 1, max: 12 } } },
  udalosti: { polia: { nadpis: NADPIS, pocet: { typ: 'cislo', min: 1, max: 12 } } },
  tlacidla: {
    polia: { nadpis: NADPIS, vzhlad: { typ: 'vyber', moznosti: ['klasicke', 'obrazkove', 'velke'] }, zarovnanie: ZAROVNANIE, stlpce: { typ: 'vyber', moznosti: ['2', '3', '4'] } },
    polozky: {
      max: 12,
      polia: { text: T(60), popis: T(200), odkaz: { typ: 'odkaz' }, obrazok: { typ: 'obrazok' }, styl: { typ: 'vyber', moznosti: ['hlavne', 'obrys', 'tmave'] }, nove_okno: { typ: 'prepinac' } },
    },
  },
  podmenu: {
    polia: { rezim: { typ: 'vyber', moznosti: ['automaticke', 'vlastne'] }, prilepene: { typ: 'prepinac' } },
    polozky: { max: 20, polia: { text: T(60), odkaz: { typ: 'odkaz' } } },
  },
  tabulka: { polia: { nadpis: NADPIS, popis: UVOD, tabulka: { typ: 'tabulka' }, pruhovana: { typ: 'prepinac' } } },
  stlpce: { polia: { pocet: { typ: 'vyber', moznosti: ['2', '3'] }, html1: { typ: 'html' }, html2: { typ: 'html' }, html3: { typ: 'html' } } },
  kroky: {
    polia: { nadpis: NADPIS, uvod: UVOD },
    polozky: { max: 12, polia: { nadpis: NADPIS, text: T(600) } },
  },
  vyhody: {
    polia: { nadpis: NADPIS, uvod: UVOD, stlpce: STLPCE },
    polozky: { max: 24, polia: { nadpis: NADPIS, text: T(400) } },
  },
  cennik: {
    polia: { nadpis: NADPIS, uvod: UVOD },
    polozky: {
      max: 6,
      polia: { nazov: T(80), cena: T(30), obdobie: T(40), vyhody: T(1500), tlacidlo: T(40), odkaz: { typ: 'odkaz' }, zvyraznene: { typ: 'prepinac' } },
    },
  },
  oddelovac: { polia: { styl: { typ: 'vyber', moznosti: ['ciara', 'medzera'] }, velkost: { typ: 'vyber', moznosti: ['mala', 'stredna', 'velka'] } } },
  kontakt: { polia: { nadpis: NADPIS, text: UVOD, mapa: { typ: 'prepinac' }, fakturacne: { typ: 'prepinac' } } },
  stadion: { polia: { stadion_id: { typ: 'cislo', min: 0, max: 1_000_000 }, text: { typ: 'html' }, mapa: { typ: 'prepinac' } } },
  registracia: { polia: { nadpis: NADPIS, text: UVOD, typ: { typ: 'vyber', moznosti: ['vyber', 'fanusik', 'clen'] } } },
  dve_percenta: {
    polia: {
      nadpis: NADPIS, text: UVOD, prijimatel: T(200), ico: T(20), pravna_forma: T(80), sidlo: T(200),
      termin: T(60), tlacivo: { typ: 'odkaz' }, poznamka: T(600),
    },
  },
};

export const MAX_BLOKOV = 60;
const POZADIA = ['biele', 'sive', 'tmave'];
const VZOR_ODKAZU = /^(\/(?!\/)|https?:\/\/|mailto:|tel:|#)/i;
const VZOR_OBRAZKA = /^(\/(?!\/)|https?:\/\/)/i;

/** Chyba v blokoch - správa ide priamo používateľovi (400). */
export class ChybaBlokovError extends Error {}

/** Riadiace znaky preč, orezanie na dĺžku - React text pri zobrazení escapuje sám. */
const cistyText = (hodnota: unknown, max: number): string =>
  typeof hodnota === 'string' || typeof hodnota === 'number'
    ? String(hodnota).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim().slice(0, max)
    : '';

const ocistiPole = (pole: Pole, hodnota: unknown, poradie: number): unknown => {
  switch (pole.typ) {
    case 'text':
      return cistyText(hodnota, pole.max);
    case 'html':
      return sanitizeContent(cistyText(hodnota, 50_000));
    case 'obrazok': {
      const adresa = cistyText(hodnota, 500);
      if (adresa && !VZOR_OBRAZKA.test(adresa)) throw new ChybaBlokovError(`${poradie}. blok: adresa obrázka musí začínať / alebo https://`);
      return adresa || null;
    }
    case 'odkaz': {
      const adresa = cistyText(hodnota, 500);
      if (adresa && !VZOR_ODKAZU.test(adresa)) {
        throw new ChybaBlokovError(`${poradie}. blok: odkaz musí začínať / (stránka webu), https://, mailto: alebo tel:`);
      }
      return adresa || null;
    }
    case 'cislo': {
      const cislo = Number(hodnota);
      if (!Number.isFinite(cislo) || hodnota === '' || hodnota === null || hodnota === undefined) return null;
      return Math.min(pole.max, Math.max(pole.min, Math.round(cislo)));
    }
    case 'vyber':
      return pole.moznosti.includes(String(hodnota)) ? String(hodnota) : pole.moznosti[0];
    case 'prepinac':
      return hodnota === true;
    case 'tabulka': {
      const t = hodnota && typeof hodnota === 'object' ? (hodnota as { hlavicka?: unknown; riadky?: unknown }) : {};
      const hlavicka = (Array.isArray(t.hlavicka) ? t.hlavicka : []).slice(0, MAX_STLPCOV_TABULKY).map((h) => cistyText(h, 100));
      const stlpcov = Math.max(1, hlavicka.length);
      const riadky = (Array.isArray(t.riadky) ? t.riadky : [])
        .slice(0, MAX_RIADKOV_TABULKY)
        .map((r) => Array.from({ length: stlpcov }, (_, i) => cistyText(Array.isArray(r) ? r[i] : '', 300)));
      return { hlavicka: hlavicka.length ? hlavicka : [''], riadky };
    }
  }
};

const ocistiUdaje = (polia: Record<string, Pole>, vstup: unknown, poradie: number) => {
  const zdroj = vstup && typeof vstup === 'object' ? (vstup as Record<string, unknown>) : {};
  const vysledok: Record<string, unknown> = {};
  for (const [kluc, pole] of Object.entries(polia)) vysledok[kluc] = ocistiPole(pole, zdroj[kluc], poradie);
  return vysledok;
};

export interface BlokStranky {
  id: string;
  typ: string;
  data: Record<string, unknown>;
  polozky?: Array<Record<string, unknown>>;
  pozadie: string;
  skryty: boolean;
}

/**
 * Overí a očistí bloky stránky. Prázdny vstup = žiadne bloky.
 * @throws ChybaBlokovError so správou pre používateľa
 */
export const ocistiBloky = (vstup: unknown): BlokStranky[] => {
  if (vstup === null || vstup === undefined || vstup === '') return [];
  if (!Array.isArray(vstup) || vstup.length > MAX_BLOKOV) {
    throw new ChybaBlokovError(`Bloky stránky musia byť zoznam (najviac ${MAX_BLOKOV})`);
  }
  const pouzite = new Set<string>();
  return vstup.map((surovy, i) => {
    const poradie = i + 1;
    const b = surovy && typeof surovy === 'object' ? (surovy as Record<string, unknown>) : {};
    const typ = String(b.typ ?? '');
    const schema = SCHEMA_BLOKOV[typ];
    const nazovTypu = typ.slice(0, 40);
    if (!schema) throw new ChybaBlokovError(`Neznámy typ bloku: ${nazovTypu}`);

    // Identifikátor bloku (kľúč pri zobrazení) - vlastný, ak je platný a jedinečný
    let id = typeof b.id === 'string' && /^[a-z0-9-]{1,40}$/i.test(b.id) ? b.id : `b${poradie}`;
    while (pouzite.has(id)) id = `${id}-${poradie}`;
    pouzite.add(id);

    const data = ocistiUdaje(schema.polia, b.data, poradie);
    if (typ === 'video' && data.url) {
      const url = String(data.url);
      const youtube = idZUrl(url);
      const vimeo = youtube ? null : vimeoIdZUrl(url);
      if (!youtube && !vimeo) throw new ChybaBlokovError(`${poradie}. blok: video musí byť odkaz na YouTube alebo Vimeo`);
      data.platforma = youtube ? 'youtube' : 'vimeo';
      data.video_id = youtube || vimeo;
    }

    const blok: BlokStranky = {
      id,
      typ,
      data,
      pozadie: POZADIA.includes(String(b.pozadie)) ? String(b.pozadie) : 'biele',
      skryty: b.skryty === true,
    };
    if (schema.polozky) {
      const polozky = Array.isArray(b.polozky) ? b.polozky.slice(0, schema.polozky.max) : [];
      blok.polozky = polozky.map((p) => ocistiUdaje(schema.polozky!.polia, p, poradie));
    }
    return blok;
  });
};

/** Čistý text blokov - popis pre vyhľadávače, keď stránka nemá vlastný text. */
export const textBlokov = (bloky: BlokStranky[] | null | undefined): string => {
  const casti: string[] = [];
  // Len textové polia podľa schémy (nie výber, odkazy ani obrázky)
  const texty = (polia: Record<string, Pole>, udaje: Record<string, unknown>) =>
    Object.entries(polia)
      .filter(([kluc, pole]) => (pole.typ === 'text' || pole.typ === 'html') && !['url', 'email', 'telefon', 'slug', 'rubrika'].includes(kluc))
      .map(([kluc]) => udaje[kluc])
      .filter((h): h is string => typeof h === 'string' && h.length > 0)
      .map((h) => h.replace(/<[^>]*>/g, ' '));
  for (const b of bloky ?? []) {
    const schema = SCHEMA_BLOKOV[b.typ];
    if (b.skryty || !schema) continue;
    casti.push(...texty(schema.polia, b.data ?? {}));
    if (schema.polozky) for (const p of b.polozky ?? []) casti.push(...texty(schema.polozky.polia, p));
  }
  return casti.join(' ').replace(/\s+/g, ' ').trim();
};
