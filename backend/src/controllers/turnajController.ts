// Umiestnenie: backend/src/controllers/turnajController.ts
//
// TURNAJE - SKUPINY A PAVÚK
//
// Turnaj je samostatná súťaž (mládežnícky turnaj, pohár). Hrá sa buď len
// vyraďovací pavúk, alebo najprv skupiny (každý s každým, tabuľka)
// a postupujúci zo skupín idú do pavúka.
//
// Zápas nášho tímu v skupine aj v pavúku sa dá prepojiť so zápasom zo
// sekcie Zápasy (zapas_id) - výsledok sa potom berie odtiaľ a netreba
// ho zapisovať dvakrát. Ostatné zápasy turnaja sú len výsledky.
//
// TVAR PAVÚKA (pavuk_struktura):
//   {
//     "kola": [
//       { "nazov": "Semifinále", "poradie": 1, "zapasy": [
//           { "kod": "k1z1",
//             "domaci":  { "nazov": "Alfa", "tim_id": 3, "logo": null },
//             "hostia":  { "nazov": "Beta", "tim_id": null, "logo": null },
//             "skore_domaci": null, "skore_hostia": null, "vitaz": null,
//             "postupuje_do": "k2z1", "postupuje_ako": "domaci",
//             "porazeny_do": "o3", "porazeny_ako": "domaci",
//             "zapas_id": null }
//       ]}
//     ],
//     "o_tretie": { "kod": "o3", ... }        // zápas o 3. miesto, ak sa hrá
//   }
//
// TVAR SKUPÍN (skupiny_struktura):
//   {
//     "postupuju": 2,
//     "skupiny": [
//       { "nazov": "A", "timy": [ {nazov, tim_id, logo}, ... ],
//         "zapasy": [ { "kod": "A1", "kolo": 1, "domaci": 0, "hostia": 1,
//                       "skore_domaci": null, "skore_hostia": null, "zapas_id": null } ] }
//     ]
//   }
//   domaci / hostia sú indexy do poľa timy.
//
// Kódy zápasov sú stabilné, takže výsledok sa dá zapísať bez ohľadu na
// poradie v poli a posun víťaza vie, kam presne ho zapísať.

import { Request, Response } from 'express';
import LigaTurnaj from '../models/LigaTurnaj';
import Team from '../models/Team';
import Zapas from '../models/Zapas';

/** Názvy kôl podľa počtu zápasov v nich. */
const NAZVY_KOL: Record<number, string> = {
  1: 'Finále',
  2: 'Semifinále',
  4: 'Štvrťfinále',
  8: 'Osemfinále',
  16: 'Šestnásťfinále',
};

/** Body v skupine. */
const BODY_VYHRA = 3;
const BODY_REMIZA = 1;

export interface TimVPavuku {
  nazov: string;
  tim_id: number | null;
  logo: string | null;
}

interface ZapasPavuka {
  kod: string;
  domaci: TimVPavuku | null;
  hostia: TimVPavuku | null;
  skore_domaci: number | null;
  skore_hostia: number | null;
  vitaz: 'domaci' | 'hostia' | null;
  postupuje_do: string | null;
  postupuje_ako: 'domaci' | 'hostia' | null;
  /** Porazený semifinalista ide do zápasu o 3. miesto */
  porazeny_do?: string | null;
  porazeny_ako?: 'domaci' | 'hostia' | null;
  /** Prepojený zápas zo sekcie Zápasy */
  zapas_id?: number | null;
}

interface KoloPavuka {
  nazov: string;
  poradie: number;
  zapasy: ZapasPavuka[];
}

interface Pavuk {
  kola: KoloPavuka[];
  o_tretie?: ZapasPavuka | null;
}

interface ZapasSkupiny {
  kod: string;
  kolo: number;
  domaci: number;
  hostia: number;
  skore_domaci: number | null;
  skore_hostia: number | null;
  zapas_id?: number | null;
}

interface Skupina {
  nazov: string;
  timy: TimVPavuku[];
  zapasy: ZapasSkupiny[];
}

interface Skupiny {
  postupuju: number;
  skupiny: Skupina[];
}

export interface RiadokSkupiny {
  poradie: number;
  tim: TimVPavuku;
  zapasy: number;
  vyhry: number;
  remizy: number;
  prehry: number;
  goly_za: number;
  goly_proti: number;
  body: number;
  postupuje: boolean;
}

// ===== Pomocné funkcie =====

/** Načíta turnaj, alebo pošle chybovú odpoveď. */
const najdiTurnaj = async (req: Request, res: Response): Promise<LigaTurnaj | null> => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    res.status(400).json({ success: false, message: 'ID turnaja musí byť kladné celé číslo' });
    return null;
  }

  const turnaj = await LigaTurnaj.findOne({ where: { id, aktivity: true } });
  if (!turnaj) {
    res.status(404).json({ success: false, message: 'Turnaj nebol nájdený' });
    return null;
  }

  return turnaj;
};

/** Prečíta pavúka z uloženého textu. */
const nacitajPavuka = (turnaj: LigaTurnaj): Pavuk => {
  if (!turnaj.pavuk_struktura) return { kola: [] };
  try {
    const data = JSON.parse(turnaj.pavuk_struktura);
    return Array.isArray(data?.kola) ? data : { kola: [] };
  } catch {
    return { kola: [] };
  }
};

/** Prečíta skupiny z uloženého textu. */
const nacitajSkupiny = (turnaj: LigaTurnaj): Skupiny => {
  if (!turnaj.skupiny_struktura) return { postupuju: 2, skupiny: [] };
  try {
    const data = JSON.parse(turnaj.skupiny_struktura);
    return Array.isArray(data?.skupiny) ? data : { postupuju: 2, skupiny: [] };
  } catch {
    return { postupuju: 2, skupiny: [] };
  }
};

/** Najbližšia mocnina dvojky, ktorá pokryje počet tímov. */
const naMocninuDvoch = (pocet: number): number => {
  let velkost = 1;
  while (velkost < pocet) velkost *= 2;
  return velkost;
};

/**
 * Poradie nasadených v pavúku, aby sa najlepší stretli až na konci.
 * Pre 8: [1, 8, 4, 5, 2, 7, 3, 6] - 1. nasadený hrá s 8., víťaz s 4./5. …
 */
export const poradieNasadenia = (velkost: number): number[] => {
  let poradie = [1];
  while (poradie.length < velkost) {
    const n = poradie.length * 2 + 1;
    poradie = poradie.flatMap((x) => [x, n - x]);
  }
  return poradie;
};

/** Prevedie tímy z tela požiadavky na tímy pavúka (náš tím z databázy alebo text). */
const pripravTimy = async (vstup: any[]): Promise<{ timy: TimVPavuku[]; chyba: string | null }> => {
  const naseId = vstup
    .map((t: any) => Number(t?.tim_id))
    .filter((id: number) => Number.isInteger(id) && id > 0);

  const naseTimy = naseId.length ? await Team.findAll({ where: { id: naseId } }) : [];
  const podlaId = new Map(naseTimy.map((t) => [t.id, t]));

  const timy: TimVPavuku[] = [];
  for (const t of vstup) {
    const id = Number(t?.tim_id);
    const nas = Number.isInteger(id) ? podlaId.get(id) : undefined;
    if (nas) {
      timy.push({ nazov: nas.nazov, tim_id: nas.id, logo: nas.logo });
      continue;
    }
    const nazov = String(t?.nazov || '').trim().slice(0, 120);
    if (!nazov) return { timy, chyba: 'Každý tím musí mať názov alebo platné tim_id' };
    timy.push({ nazov, tim_id: null, logo: t?.logo ? String(t.logo) : null });
  }

  // Ten istý tím dvakrát by rozbil tabuľku aj pavúk
  const kluce = timy.map((t) => (t.tim_id ? `id:${t.tim_id}` : `n:${t.nazov.toLowerCase()}`));
  if (new Set(kluce).size !== kluce.length) {
    return { timy, chyba: 'Tím je v zozname uvedený viackrát' };
  }

  return { timy, chyba: null };
};

const klucTimu = (t: TimVPavuku | null | undefined) =>
  t ? (t.tim_id ? `id:${t.tim_id}` : `n:${t.nazov.toLowerCase()}`) : '';

/** Nájde zápas v pavúku podľa kódu (aj zápas o 3. miesto). */
const najdiZapas = (pavuk: Pavuk, kod: string): ZapasPavuka | null => {
  if (pavuk.o_tretie?.kod === kod) return pavuk.o_tretie;
  for (const kolo of pavuk.kola) {
    const zapas = kolo.zapasy.find((z) => z.kod === kod);
    if (zapas) return zapas;
  }
  return null;
};

/**
 * Zapíše víťaza zápasu do nasledujúceho kola (a porazeného semifinalistu
 * do zápasu o 3. miesto).
 */
const posunVitaza = (pavuk: Pavuk, zapas: ZapasPavuka): void => {
  if (!zapas.vitaz) return;
  const vitaz = zapas.vitaz === 'domaci' ? zapas.domaci : zapas.hostia;
  const porazeny = zapas.vitaz === 'domaci' ? zapas.hostia : zapas.domaci;

  if (zapas.postupuje_do && zapas.postupuje_ako) {
    const dalsi = najdiZapas(pavuk, zapas.postupuje_do);
    if (dalsi) dalsi[zapas.postupuje_ako] = vitaz;
  }
  if (zapas.porazeny_do && zapas.porazeny_ako) {
    const o3 = najdiZapas(pavuk, zapas.porazeny_do);
    if (o3) o3[zapas.porazeny_ako] = porazeny;
  }
};

/**
 * Vytvorí pavúka z tímov zoradených podľa miesta v pavúku (dvojice idú
 * za sebou: 1. vs 2., 3. vs 4. …). null = voľný žreb.
 */
const vytvorPavuka = (obsadenie: (TimVPavuku | null)[], sTretimMiestom: boolean): Pavuk => {
  const velkost = naMocninuDvoch(Math.max(obsadenie.length, 2));
  const miesta = [...obsadenie];
  while (miesta.length < velkost) miesta.push(null);

  const kola: KoloPavuka[] = [];
  let pocetZapasov = velkost / 2;
  let cisloKola = 1;
  // Zápas o 3. miesto má zmysel od semifinále (aspoň 4 tímy)
  const tretie = sTretimMiestom && velkost >= 4;

  while (pocetZapasov >= 1) {
    const zapasy: ZapasPavuka[] = [];
    for (let i = 0; i < pocetZapasov; i++) {
      const dalsieKolo = cisloKola + 1;
      const postupujeDo = pocetZapasov > 1 ? `k${dalsieKolo}z${Math.floor(i / 2) + 1}` : null;
      const ako: 'domaci' | 'hostia' = i % 2 === 0 ? 'domaci' : 'hostia';
      const jeSemifinale = pocetZapasov === 2;

      zapasy.push({
        kod: `k${cisloKola}z${i + 1}`,
        domaci: cisloKola === 1 ? miesta[i * 2] : null,
        hostia: cisloKola === 1 ? miesta[i * 2 + 1] : null,
        skore_domaci: null,
        skore_hostia: null,
        vitaz: null,
        postupuje_do: postupujeDo,
        postupuje_ako: postupujeDo ? ako : null,
        porazeny_do: tretie && jeSemifinale ? 'o3' : null,
        porazeny_ako: tretie && jeSemifinale ? ako : null,
        zapas_id: null,
      });
    }
    kola.push({ nazov: NAZVY_KOL[pocetZapasov] || `${cisloKola}. kolo`, poradie: cisloKola, zapasy });
    pocetZapasov = pocetZapasov / 2;
    cisloKola++;
  }

  const pavuk: Pavuk = { kola };
  if (tretie) {
    pavuk.o_tretie = {
      kod: 'o3', domaci: null, hostia: null, skore_domaci: null, skore_hostia: null,
      vitaz: null, postupuje_do: null, postupuje_ako: null, zapas_id: null,
    };
  }

  // Voľné žreby: tím bez súpera postupuje hneď. Kolá postupne - voľný
  // žreb môže pri nepárnom počte vzniknúť aj v ďalšom kole.
  for (const kolo of pavuk.kola) {
    for (const zapas of kolo.zapasy) {
      if (zapas.vitaz) continue;
      if (zapas.domaci && !zapas.hostia && kolo.poradie === 1) {
        zapas.vitaz = 'domaci';
        posunVitaza(pavuk, zapas);
      } else if (!zapas.domaci && zapas.hostia && kolo.poradie === 1) {
        zapas.vitaz = 'hostia';
        posunVitaza(pavuk, zapas);
      }
    }
  }

  return pavuk;
};

/** Rozpis „každý s každým" (kruhová metóda). */
export const rozpisSkupiny = (pocetTimov: number): Array<{ kolo: number; domaci: number; hostia: number }> => {
  const indexy: (number | null)[] = Array.from({ length: pocetTimov }, (_, i) => i);
  if (indexy.length % 2 === 1) indexy.push(null);
  const n = indexy.length;
  const zapasy: Array<{ kolo: number; domaci: number; hostia: number }> = [];

  for (let kolo = 0; kolo < n - 1; kolo++) {
    for (let i = 0; i < n / 2; i++) {
      const a = indexy[i];
      const b = indexy[n - 1 - i];
      if (a === null || b === null) continue;
      // Striedame domácich, aby jeden tím nebol stále „doma"
      zapasy.push(kolo % 2 === 0 ? { kolo: kolo + 1, domaci: a, hostia: b } : { kolo: kolo + 1, domaci: b, hostia: a });
    }
    // Rotácia - prvý zostáva, ostatní sa posunú
    indexy.splice(1, 0, indexy.pop()!);
  }
  return zapasy;
};

/** Tabuľka skupiny z odohraných zápasov. */
export const tabulkaSkupiny = (skupina: Skupina, postupuju: number): RiadokSkupiny[] => {
  const riadky = skupina.timy.map((tim) => ({
    poradie: 0, tim, zapasy: 0, vyhry: 0, remizy: 0, prehry: 0, goly_za: 0, goly_proti: 0, body: 0, postupuje: false,
  }));

  for (const z of skupina.zapasy) {
    if (z.skore_domaci === null || z.skore_hostia === null) continue;
    const d = riadky[z.domaci];
    const h = riadky[z.hostia];
    if (!d || !h) continue;
    d.zapasy++; h.zapasy++;
    d.goly_za += z.skore_domaci; d.goly_proti += z.skore_hostia;
    h.goly_za += z.skore_hostia; h.goly_proti += z.skore_domaci;
    if (z.skore_domaci > z.skore_hostia) { d.vyhry++; h.prehry++; d.body += BODY_VYHRA; }
    else if (z.skore_domaci < z.skore_hostia) { h.vyhry++; d.prehry++; h.body += BODY_VYHRA; }
    else { d.remizy++; h.remizy++; d.body += BODY_REMIZA; h.body += BODY_REMIZA; }
  }

  riadky.sort(
    (a, b) =>
      b.body - a.body ||
      b.goly_za - b.goly_proti - (a.goly_za - a.goly_proti) ||
      b.goly_za - a.goly_za ||
      a.tim.nazov.localeCompare(b.tim.nazov, 'sk')
  );
  riadky.forEach((r, i) => {
    r.poradie = i + 1;
    r.postupuje = i < postupuju;
  });
  return riadky;
};

/** Stav, keď je finále dohrané - víťaz, druhý, tretí. */
const vyhodnotFinale = (pavuk: Pavuk): Record<string, any> => {
  const finale = pavuk.kola[pavuk.kola.length - 1]?.zapasy[0];
  if (!finale?.vitaz) return {};

  const vitaz = finale.vitaz === 'domaci' ? finale.domaci : finale.hostia;
  const druhy = finale.vitaz === 'domaci' ? finale.hostia : finale.domaci;
  const o3 = pavuk.o_tretie;
  const treti = o3?.vitaz ? (o3.vitaz === 'domaci' ? o3.domaci : o3.hostia) : null;

  return {
    // Keď sa hrá o 3. miesto, turnaj končí až po ňom
    status: !o3 || o3.vitaz ? 'ukonceny' : 'prebiehajuci',
    vitaz_id: vitaz?.tim_id ?? null,
    druhy_id: druhy?.tim_id ?? null,
    treti_id: treti?.tim_id ?? null,
    vitaz_nazov: vitaz?.nazov ?? null,
  };
};

/**
 * Prenesie výsledky z prepojených zápasov (sekcia Zápasy) do skupín
 * a pavúka. Vráti true, ak sa niečo zmenilo.
 *
 * Strana sa určí podľa nášho tímu: tím pavúka s tim_id rovným domácemu
 * tímu zápasu dostane domáce góly - aj keď je v pavúku zapísaný ako hosť.
 */
const synchronizujPrepojene = async (skupiny: Skupiny, pavuk: Pavuk): Promise<boolean> => {
  const zapasyPavuka = [...pavuk.kola.flatMap((k) => k.zapasy), ...(pavuk.o_tretie ? [pavuk.o_tretie] : [])];
  const ids = [
    ...skupiny.skupiny.flatMap((s) => s.zapasy.map((z) => z.zapas_id)),
    ...zapasyPavuka.map((z) => z.zapas_id),
  ].filter((id): id is number => Number.isInteger(id) && (id as number) > 0);
  if (ids.length === 0) return false;

  const zapasy = await Zapas.findAll({ where: { id: ids, aktivity: true } });
  const podlaId = new Map(zapasy.map((z) => [z.id, z]));

  /** Skóre z pohľadu (domáci, hostia) pavúka/skupiny. */
  const skore = (zapas: Zapas, domaci: TimVPavuku | null, hostia: TimVPavuku | null): [number, number] | null => {
    if (zapas.goly_domaci == null || zapas.goly_hostia == null) return null;
    const otocit =
      (domaci?.tim_id && domaci.tim_id === zapas.hostujuci_tim_id) ||
      (hostia?.tim_id && hostia.tim_id === zapas.domaci_tim_id);
    return otocit ? [zapas.goly_hostia, zapas.goly_domaci] : [zapas.goly_domaci, zapas.goly_hostia];
  };

  let zmena = false;

  for (const s of skupiny.skupiny) {
    for (const z of s.zapasy) {
      const zapas = z.zapas_id ? podlaId.get(z.zapas_id) : undefined;
      if (!zapas) continue;
      const vysledok = skore(zapas, s.timy[z.domaci], s.timy[z.hostia]);
      if (vysledok && (vysledok[0] !== z.skore_domaci || vysledok[1] !== z.skore_hostia)) {
        [z.skore_domaci, z.skore_hostia] = vysledok;
        zmena = true;
      }
    }
  }

  // Pavúk po kolách - posunutý víťaz môže byť súčasťou ďalšieho prepojeného zápasu
  for (const z of zapasyPavuka) {
    const zapas = z.zapas_id ? podlaId.get(z.zapas_id) : undefined;
    if (!zapas || !z.domaci || !z.hostia) continue;
    const vysledok = skore(zapas, z.domaci, z.hostia);
    if (!vysledok || (vysledok[0] === z.skore_domaci && vysledok[1] === z.skore_hostia)) continue;
    [z.skore_domaci, z.skore_hostia] = vysledok;
    // Pri remíze v prepojenom zápase (penalty) postupujúceho určí admin
    z.vitaz = vysledok[0] > vysledok[1] ? 'domaci' : vysledok[1] > vysledok[0] ? 'hostia' : z.vitaz;
    posunVitaza(pavuk, z);
    zmena = true;
  }

  return zmena;
};

/** Celý turnaj pre klienta - skupiny s tabuľkami a pavúk. */
const naVystup = (turnaj: LigaTurnaj, skupiny: Skupiny, pavuk: Pavuk) => ({
  ...turnaj.toJSON(),
  skupiny: {
    postupuju: skupiny.postupuju,
    skupiny: skupiny.skupiny.map((s) => ({ ...s, tabulka: tabulkaSkupiny(s, skupiny.postupuju) })),
  },
  pavuk,
});

/** Overí prepojenie so zápasom; vráti null (bez prepojenia), číslo, alebo chybu. */
const overPrepojenie = async (hodnota: unknown): Promise<{ id: number | null } | { chyba: string }> => {
  if (hodnota === null || hodnota === '' || hodnota === undefined) return { id: null };
  const id = Number(hodnota);
  if (!Number.isInteger(id) || id < 1) return { chyba: 'Neplatné ID zápasu' };
  const zapas = await Zapas.findOne({ where: { id, aktivity: true } });
  if (!zapas) return { chyba: 'Prepojený zápas neexistuje' };
  return { id };
};

const skoreZTela = (telo: any): { domaci: number | null; hostia: number | null } | { chyba: string } => {
  const prazdne = (v: unknown) => v === null || v === '' || v === undefined;
  if (prazdne(telo.skore_domaci) && prazdne(telo.skore_hostia)) return { domaci: null, hostia: null };
  const d = Number(telo.skore_domaci);
  const h = Number(telo.skore_hostia);
  if (!Number.isInteger(d) || !Number.isInteger(h) || d < 0 || h < 0 || d > 99 || h > 99) {
    return { chyba: 'Skóre musí byť celé číslo 0 – 99 pre oba tímy' };
  }
  return { domaci: d, hostia: h };
};

// ===== Endpointy =====

/**
 * GET /api/tournaments/:id
 * Turnaj so skupinami (vrátane tabuliek) a pavúkom. Výsledky prepojených
 * zápasov sa pri čítaní prenesú zo sekcie Zápasy.
 */
export const getTurnaj = async (req: Request, res: Response): Promise<void> => {
  try {
    const turnaj = await najdiTurnaj(req, res);
    if (!turnaj) return;

    const jeRedaktor = ['admin', 'redaktor'].includes(String((req as any).user?.rola || ''));
    if (!turnaj.zobrazit_na_webe && !jeRedaktor) {
      res.status(404).json({ success: false, message: 'Turnaj nebol nájdený' });
      return;
    }

    const skupiny = nacitajSkupiny(turnaj);
    const pavuk = nacitajPavuka(turnaj);

    if (await synchronizujPrepojene(skupiny, pavuk)) {
      await turnaj.update({
        skupiny_struktura: JSON.stringify(skupiny),
        pavuk_struktura: JSON.stringify(pavuk),
        ...vyhodnotFinale(pavuk),
      });
    }

    res.json({ success: true, data: naVystup(turnaj, skupiny, pavuk) });
  } catch (error) {
    console.error('Chyba pri načítaní turnaja:', error);
    res.status(500).json({ success: false, message: 'Chyba servera pri načítaní turnaja' });
  }
};

/** GET /api/tournaments/:id/bracket - len pavúk (staršie rozhranie). */
export const getPavuk = async (req: Request, res: Response): Promise<void> => {
  try {
    const turnaj = await najdiTurnaj(req, res);
    if (!turnaj) return;

    res.json({
      success: true,
      data: {
        turnaj_id: turnaj.id,
        nazov: turnaj.nazov,
        typ: turnaj.typ,
        status: turnaj.status,
        pavuk: nacitajPavuka(turnaj),
      },
    });
  } catch (error) {
    console.error('Chyba pri načítaní pavúka:', error);
    res.status(500).json({ success: false, message: 'Chyba servera pri načítaní pavúka' });
  }
};

/**
 * PUT /api/tournaments/:id/groups
 * Nastaví skupiny a vygeneruje rozpis „každý s každým".
 *
 * Telo: { "postupuju": 2, "skupiny": [ { "nazov": "A", "timy": [ {tim_id} | {nazov, logo} ] } ] }
 *
 * Zápasy dvojíc, ktoré v skupine zostali, si ponechajú výsledok.
 */
export const nastavSkupiny = async (req: Request, res: Response): Promise<void> => {
  try {
    const turnaj = await najdiTurnaj(req, res);
    if (!turnaj) return;

    const vstup = Array.isArray(req.body?.skupiny) ? req.body.skupiny : null;
    if (!vstup || vstup.length === 0 || vstup.length > 16) {
      res.status(400).json({ success: false, message: 'Zadajte 1 až 16 skupín' });
      return;
    }

    const postupuju = Number(req.body.postupuju ?? 2);
    if (!Number.isInteger(postupuju) || postupuju < 0 || postupuju > 8) {
      res.status(400).json({ success: false, message: 'Počet postupujúcich zo skupiny musí byť 0 – 8' });
      return;
    }

    const povodne = nacitajSkupiny(turnaj);
    const vysledkyDvojic = new Map<string, ZapasSkupiny & { dk: string; hk: string }>();
    for (const s of povodne.skupiny) {
      for (const z of s.zapasy) {
        const dk = klucTimu(s.timy[z.domaci]);
        const hk = klucTimu(s.timy[z.hostia]);
        vysledkyDvojic.set([dk, hk].sort().join('|'), { ...z, dk, hk });
      }
    }

    const skupiny: Skupina[] = [];
    const vsetkyKluce = new Set<string>();

    for (let i = 0; i < vstup.length; i++) {
      const nazov = String(vstup[i]?.nazov || String.fromCharCode(65 + i)).trim().slice(0, 30);
      const { timy, chyba } = await pripravTimy(Array.isArray(vstup[i]?.timy) ? vstup[i].timy : []);
      if (chyba) {
        res.status(400).json({ success: false, message: `Skupina ${nazov}: ${chyba}` });
        return;
      }
      if (timy.length < 2 || timy.length > 16) {
        res.status(400).json({ success: false, message: `Skupina ${nazov} musí mať 2 až 16 tímov` });
        return;
      }
      for (const t of timy) {
        const k = klucTimu(t);
        if (vsetkyKluce.has(k)) {
          res.status(400).json({ success: false, message: `Tím ${t.nazov} je vo viacerých skupinách` });
          return;
        }
        vsetkyKluce.add(k);
      }

      const zapasy: ZapasSkupiny[] = rozpisSkupiny(timy.length).map((r, j) => {
        const dk = klucTimu(timy[r.domaci]);
        const hk = klucTimu(timy[r.hostia]);
        const stary = vysledkyDvojic.get([dk, hk].sort().join('|'));
        // Výsledok ponecháme v správnej orientácii
        const rovnako = stary?.dk === dk;
        return {
          kod: `${nazov}${j + 1}`,
          kolo: r.kolo,
          domaci: r.domaci,
          hostia: r.hostia,
          skore_domaci: stary ? (rovnako ? stary.skore_domaci : stary.skore_hostia) : null,
          skore_hostia: stary ? (rovnako ? stary.skore_hostia : stary.skore_domaci) : null,
          zapas_id: stary?.zapas_id ?? null,
        };
      });

      skupiny.push({ nazov, timy, zapasy });
    }

    const noveSkupiny: Skupiny = { postupuju, skupiny };
    await turnaj.update({
      skupiny_struktura: JSON.stringify(noveSkupiny),
      pocet_skupin: Math.max(2, Math.min(8, skupiny.length)),
      pocet_postupujucich: postupuju > 0 ? Math.min(16, postupuju) : null,
      pocet_timov: Math.max(2, Math.min(64, vsetkyKluce.size)),
      status: turnaj.status === 'pripravuje' ? 'prebiehajuci' : turnaj.status,
    });

    res.json({
      success: true,
      data: naVystup(turnaj, noveSkupiny, nacitajPavuka(turnaj)),
      message: `Skupiny uložené (${skupiny.length}, spolu ${vsetkyKluce.size} tímov)`,
    });
  } catch (error) {
    console.error('Chyba pri nastavení skupín:', error);
    res.status(500).json({ success: false, message: 'Chyba servera pri nastavení skupín' });
  }
};

/**
 * PATCH /api/tournaments/:id/groups/match/:kod
 * Výsledok zápasu v skupine. Telo: { skore_domaci, skore_hostia, zapas_id }
 * Prázdne skóre výsledok zmaže.
 */
export const zapisVysledokSkupiny = async (req: Request, res: Response): Promise<void> => {
  try {
    const turnaj = await najdiTurnaj(req, res);
    if (!turnaj) return;

    const skupiny = nacitajSkupiny(turnaj);
    const zapas = skupiny.skupiny.flatMap((s) => s.zapasy).find((z) => z.kod === String(req.params.kod));
    if (!zapas) {
      res.status(404).json({ success: false, message: `Zápas „${req.params.kod}" v skupinách nie je` });
      return;
    }

    if (req.body.zapas_id !== undefined) {
      const prepojenie = await overPrepojenie(req.body.zapas_id);
      if ('chyba' in prepojenie) {
        res.status(400).json({ success: false, message: prepojenie.chyba });
        return;
      }
      zapas.zapas_id = prepojenie.id;
    }

    if (req.body.skore_domaci !== undefined || req.body.skore_hostia !== undefined) {
      const skore = skoreZTela(req.body);
      if ('chyba' in skore) {
        res.status(400).json({ success: false, message: skore.chyba });
        return;
      }
      zapas.skore_domaci = skore.domaci;
      zapas.skore_hostia = skore.hostia;
    }

    const pavuk = nacitajPavuka(turnaj);
    await synchronizujPrepojene(skupiny, pavuk);
    await turnaj.update({ skupiny_struktura: JSON.stringify(skupiny) });

    res.json({ success: true, data: naVystup(turnaj, skupiny, pavuk), message: 'Výsledok uložený' });
  } catch (error) {
    console.error('Chyba pri zápise výsledku skupiny:', error);
    res.status(500).json({ success: false, message: 'Chyba servera pri zápise výsledku' });
  }
};

/**
 * POST /api/tournaments/:id/bracket/generate
 * Vygeneruje pavúka zo zoznamu tímov. Poradie v zozname = nasadenie
 * (1. je najsilnejší): 1. hrá s posledným, voľné žreby dostanú najlepšie
 * nasadení. Pre náhodný žreb stačí zoznam zamiešať.
 * Telo: { timy: [...], ma_tretie_miesto?: bool }
 */
export const generujPavuka = async (req: Request, res: Response): Promise<void> => {
  try {
    const turnaj = await najdiTurnaj(req, res);
    if (!turnaj) return;

    const vstup = Array.isArray(req.body.timy) ? req.body.timy : [];
    if (vstup.length < 2) {
      res.status(400).json({ success: false, message: 'Turnaj potrebuje aspoň dva tímy' });
      return;
    }
    if (vstup.length > 64) {
      res.status(400).json({ success: false, message: 'Pavúk zvládne najviac 64 tímov' });
      return;
    }

    const { timy, chyba } = await pripravTimy(vstup);
    if (chyba) {
      res.status(400).json({ success: false, message: chyba });
      return;
    }

    const sTretim = req.body.ma_tretie_miesto ?? turnaj.ma_tretie_miesto;
    // Voľné žreby dostanú najlepšie nasadení: poradie podľa nasadenia
    const velkost = naMocninuDvoch(timy.length);
    const obsadenie = poradieNasadenia(velkost).map((nasadenie) => timy[nasadenie - 1] ?? null);
    const pavuk = vytvorPavuka(obsadenie, Boolean(sTretim));

    await turnaj.update({
      pavuk_struktura: JSON.stringify(pavuk),
      ma_tretie_miesto: Boolean(sTretim),
      pocet_timov: timy.length,
      aktualna_faza: pavuk.kola[0].nazov,
      celkove_fazy: pavuk.kola.map((k) => k.nazov),
      status: 'prebiehajuci',
      vitaz_id: null, druhy_id: null, treti_id: null, vitaz_nazov: null,
    });

    res.json({
      success: true,
      data: naVystup(turnaj, nacitajSkupiny(turnaj), pavuk),
      message: `Pavúk vygenerovaný pre ${timy.length} tímov (${pavuk.kola.length} kôl)`,
    });
  } catch (error) {
    console.error('Chyba pri generovaní pavúka:', error);
    res.status(500).json({ success: false, message: 'Chyba servera pri generovaní pavúka' });
  }
};

/**
 * POST /api/tournaments/:id/bracket/from-groups
 * Pavúk z postupujúcich zo skupín. Víťazi skupín sú nasadení vyššie
 * a v prvom kole nehrajú s tímom z vlastnej skupiny (A1–B2, B1–A2 …).
 */
export const pavukZoSkupin = async (req: Request, res: Response): Promise<void> => {
  try {
    const turnaj = await najdiTurnaj(req, res);
    if (!turnaj) return;

    const skupiny = nacitajSkupiny(turnaj);
    if (skupiny.skupiny.length === 0 || skupiny.postupuju < 1) {
      res.status(400).json({ success: false, message: 'Turnaj nemá skupiny s postupujúcimi' });
      return;
    }

    const neodohrane = skupiny.skupiny.flatMap((s) => s.zapasy).filter((z) => z.skore_domaci === null).length;
    if (neodohrane > 0 && req.body?.aj_neodohrane !== true) {
      res.status(409).json({
        success: false,
        message: `V skupinách je ešte ${neodohrane} zápasov bez výsledku. Dohrajte ich, alebo potvrďte vytvorenie pavúka aj tak.`,
        data: { neodohrane },
      });
      return;
    }

    // Nasadenie: najprv všetci prví, potom druhí… (v poradí skupín)
    const tabulky = skupiny.skupiny.map((s) => tabulkaSkupiny(s, skupiny.postupuju));
    const nasadeni: Array<{ tim: TimVPavuku; skupina: number }> = [];
    for (let miesto = 0; miesto < skupiny.postupuju; miesto++) {
      tabulky.forEach((t, si) => {
        if (t[miesto]) nasadeni.push({ tim: t[miesto].tim, skupina: si });
      });
    }
    if (nasadeni.length < 2) {
      res.status(400).json({ success: false, message: 'Do pavúka postupujú menej ako dva tímy' });
      return;
    }

    // Klasické nasadenie 1. vs posledný: pri dvoch skupinách A1–B2, B1–A2,
    // pri štyroch A1–D2, B1–C2… Víťazi skupín sa stretnú najskôr vo finále.
    const velkost = naMocninuDvoch(nasadeni.length);
    const obsadenie = poradieNasadenia(velkost).map((n) => nasadeni[n - 1]?.tim ?? null);

    // Ak by v prvom kole hrali dvaja z tej istej skupiny, vymeníme súperov
    const skupinaTimu = new Map(nasadeni.map((n) => [klucTimu(n.tim), n.skupina]));
    for (let i = 0; i + 1 < obsadenie.length; i += 2) {
      const a = obsadenie[i];
      const b = obsadenie[i + 1];
      if (!a || !b || skupinaTimu.get(klucTimu(a)) !== skupinaTimu.get(klucTimu(b))) continue;
      for (let j = i + 2; j + 1 < obsadenie.length; j += 2) {
        const c = obsadenie[j + 1];
        if (c && skupinaTimu.get(klucTimu(c)) !== skupinaTimu.get(klucTimu(a)) &&
            skupinaTimu.get(klucTimu(obsadenie[j])) !== skupinaTimu.get(klucTimu(b))) {
          obsadenie[i + 1] = c;
          obsadenie[j + 1] = b;
          break;
        }
      }
    }

    const pavuk = vytvorPavuka(obsadenie, turnaj.ma_tretie_miesto);
    await turnaj.update({
      pavuk_struktura: JSON.stringify(pavuk),
      aktualna_faza: pavuk.kola[0].nazov,
      celkove_fazy: pavuk.kola.map((k) => k.nazov),
      status: 'prebiehajuci',
      vitaz_id: null, druhy_id: null, treti_id: null, vitaz_nazov: null,
    });

    res.json({
      success: true,
      data: naVystup(turnaj, skupiny, pavuk),
      message: `Pavúk vytvorený z ${nasadeni.length} postupujúcich`,
    });
  } catch (error) {
    console.error('Chyba pri vytváraní pavúka zo skupín:', error);
    res.status(500).json({ success: false, message: 'Chyba servera pri vytváraní pavúka' });
  }
};

/**
 * PATCH /api/tournaments/:id/bracket/match/:kod
 * Výsledok zápasu v pavúku a postup víťaza.
 *
 * Telo: { skore_domaci, skore_hostia, vitaz?, zapas_id? }
 *   - pri remíze treba „vitaz" (penalty)
 *   - { vitaz } bez skóre = postup bez výsledku (kontumácia)
 *   - zapas_id prepojí zápas zo sekcie Zápasy - výsledok sa berie odtiaľ
 */
export const zapisVysledok = async (req: Request, res: Response): Promise<void> => {
  try {
    const turnaj = await najdiTurnaj(req, res);
    if (!turnaj) return;

    const pavuk = nacitajPavuka(turnaj);
    const zapas = najdiZapas(pavuk, String(req.params.kod));

    if (!zapas) {
      res.status(404).json({ success: false, message: `Zápas s kódom „${req.params.kod}" v pavúku nie je` });
      return;
    }

    if (req.body.zapas_id !== undefined) {
      const prepojenie = await overPrepojenie(req.body.zapas_id);
      if ('chyba' in prepojenie) {
        res.status(400).json({ success: false, message: prepojenie.chyba });
        return;
      }
      zapas.zapas_id = prepojenie.id;
    }

    const posielaVysledok =
      req.body.skore_domaci !== undefined || req.body.skore_hostia !== undefined || req.body.vitaz !== undefined;

    if (posielaVysledok) {
      if (!zapas.domaci || !zapas.hostia) {
        res.status(409).json({
          success: false,
          message: 'Zápas ešte nemá oboch súperov - najprv dohrajte predchádzajúce kolo',
        });
        return;
      }

      const skore = skoreZTela(req.body);
      if ('chyba' in skore) {
        res.status(400).json({ success: false, message: skore.chyba });
        return;
      }

      zapas.skore_domaci = skore.domaci;
      zapas.skore_hostia = skore.hostia;

      if (skore.domaci !== null && skore.hostia !== null && skore.domaci !== skore.hostia) {
        zapas.vitaz = skore.domaci > skore.hostia ? 'domaci' : 'hostia';
      } else if (req.body.vitaz === 'domaci' || req.body.vitaz === 'hostia') {
        zapas.vitaz = req.body.vitaz;
      } else if (skore.domaci !== null) {
        res.status(400).json({
          success: false,
          message: 'Pri nerozhodnom výsledku vyberte, kto postupuje (napr. po penaltách)',
        });
        return;
      } else {
        zapas.vitaz = null;
      }

      posunVitaza(pavuk, zapas);
    }

    await synchronizujPrepojene(nacitajSkupiny(turnaj), pavuk);
    const zaver = vyhodnotFinale(pavuk);

    await turnaj.update({ pavuk_struktura: JSON.stringify(pavuk), ...zaver });

    res.json({
      success: true,
      data: naVystup(turnaj, nacitajSkupiny(turnaj), pavuk),
      message: zaver.status === 'ukonceny' ? 'Výsledok zapísaný, turnaj je ukončený' : 'Výsledok zapísaný',
    });
  } catch (error) {
    console.error('Chyba pri zápise výsledku:', error);
    res.status(500).json({ success: false, message: 'Chyba servera pri zápise výsledku' });
  }
};

/**
 * PUT /api/tournaments/:id/bracket
 * Uloží celý pavúk naraz - pre ručné úpravy (výmena tímu v prvom kole).
 */
export const ulozPavuka = async (req: Request, res: Response): Promise<void> => {
  try {
    const turnaj = await najdiTurnaj(req, res);
    if (!turnaj) return;

    const pavuk = req.body.pavuk ?? req.body;

    if (!pavuk || !Array.isArray(pavuk.kola)) {
      res.status(400).json({ success: false, message: 'Pavúk musí mať pole „kola"' });
      return;
    }
    if (pavuk.kola.length > 10) {
      res.status(400).json({ success: false, message: 'Pavúk môže mať najviac 10 kôl' });
      return;
    }

    // Kódy zápasov musia byť jedinečné - inak by sa výsledok zapísal inam
    const kody = new Set<string>();
    const vsetky = [...pavuk.kola.flatMap((k: any) => (Array.isArray(k.zapasy) ? k.zapasy : [null])), ...(pavuk.o_tretie ? [pavuk.o_tretie] : [])];
    for (const zapas of vsetky) {
      if (!zapas) {
        res.status(400).json({ success: false, message: 'Každé kolo musí mať pole „zapasy"' });
        return;
      }
      if (!zapas.kod) {
        res.status(400).json({ success: false, message: 'Každý zápas musí mať kód' });
        return;
      }
      if (kody.has(zapas.kod)) {
        res.status(400).json({ success: false, message: `Kód zápasu „${zapas.kod}" je použitý viackrát` });
        return;
      }
      kody.add(zapas.kod);
    }

    await turnaj.update({
      pavuk_struktura: JSON.stringify(pavuk),
      celkove_fazy: pavuk.kola.map((k: any) => k.nazov || ''),
    });

    res.json({
      success: true,
      data: naVystup(turnaj, nacitajSkupiny(turnaj), pavuk),
      message: 'Pavúk bol uložený',
    });
  } catch (error) {
    console.error('Chyba pri ukladaní pavúka:', error);
    res.status(500).json({ success: false, message: 'Chyba servera pri ukladaní pavúka' });
  }
};

/** DELETE /api/tournaments/:id/bracket - zruší pavúka (napr. pred novým žrebom). */
export const zmazPavuka = async (req: Request, res: Response): Promise<void> => {
  const turnaj = await najdiTurnaj(req, res);
  if (!turnaj) return;
  await turnaj.update({ pavuk_struktura: null, vitaz_id: null, druhy_id: null, treti_id: null, vitaz_nazov: null });
  res.json({ success: true, data: naVystup(turnaj, nacitajSkupiny(turnaj), { kola: [] }), message: 'Pavúk bol zrušený' });
};
