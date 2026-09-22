// Umiestnenie: backend/src/controllers/archivController.ts
//
// ARCHÍV - spoločný pohľad na položky, ktoré boli odstránené mäkko.
//
// PREČO VZNIKOL: všetky archivovateľné entity už mali príznak "aktivity",
// ale žiadny endpoint archivované položky nevracal. Navyše každý dotaz
// v ich controlleroch má natvrdo "aktivity: true" vrátane findOne pri
// úprave, takže archivovaná položka sa nedala ani nájsť, ani obnoviť -
// archivácia bola jednosmerná.
//
// Tento modul rieši obe strany: vylistuje archivované položky naprieč
// entitami a vie ich vrátiť späť. Zámerne nesiaha do pôvodných
// controllerov - tie naďalej vracajú len aktívne záznamy, čo je pre
// verejný web aj bežnú administráciu správne.

import { Request, Response } from 'express';
import { Op } from 'sequelize';
import Team from '../models/Team';
import Player from '../models/Player';
import Staff from '../models/Staff';
import Liga from '../models/Liga';
import Sezona from '../models/Sezona';
import Stadion from '../models/Stadion';

/**
 * Popis jednej archivovateľnej entity.
 *
 * Každá sa archivuje rovnako (aktivity = false), ale líši sa tým, ako sa
 * volá jej položka v zozname a či jej obnova na niečom závisí.
 */
interface TypArchivu {
  /** Model, s ktorým sa pracuje */
  model: any;
  /** Jednotné číslo do hlášok, napríklad „Hráč" */
  nazovJednotne: string;
  /** Pomenovanie položky v zozname */
  popis: (zaznam: any) => string;
  /** Doplňujúci riadok pod názvom, napríklad tím hráča */
  detail?: (zaznam: any) => string | null;
  /** Stĺpec s časom poslednej zmeny - kedy bola položka archivovaná */
  stlpecZmeny: string;
  /**
   * Overí, či sa položka dá obnoviť. Vráti text prekážky, alebo null.
   *
   * Hráča nemá zmysel vrátiť do tímu, ktorý je sám archivovaný - vznikol
   * by aktívny hráč pod neaktívnym tímom, ktorý sa nikde nezobrazí.
   */
  prekazkaObnovy?: (zaznam: any) => Promise<string | null>;
}

const TYPY: Record<string, TypArchivu> = {
  timy: {
    model: Team,
    nazovJednotne: 'Tím',
    popis: (t) => `${t.nazov} (${t.vekova_kategoria})`,
    stlpecZmeny: 'aktualizovany',
  },

  hraci: {
    model: Player,
    nazovJednotne: 'Hráč',
    popis: (h) => `${h.meno} ${h.priezvisko}`,
    detail: (h) => (h.cislo_dresu ? `č. ${h.cislo_dresu}, ${h.pozicia}` : h.pozicia),
    stlpecZmeny: 'aktualizovany',
    prekazkaObnovy: async (h) => {
      const tim = await Team.findByPk(h.tim_id);
      if (!tim) {
        return 'Tím, do ktorého hráč patril, už neexistuje. Najprv hráča prirad k inému tímu.';
      }
      if (!(tim as any).aktivity) {
        return `Tím ${(tim as any).nazov} je archivovaný. Najprv obnov tím, potom hráča.`;
      }
      return null;
    },
  },

  'realizacny-tim': {
    model: Staff,
    nazovJednotne: 'Člen realizačného tímu',
    popis: (r) => `${r.meno} ${r.priezvisko}`,
    detail: (r) => r.funkcia,
    stlpecZmeny: 'aktualizovany',
    prekazkaObnovy: async (r) => {
      // Člen realizačného tímu môže patriť celému klubu (tim_id je null),
      // vtedy nie je na čom závisieť.
      if (!r.tim_id) return null;
      const tim = await Team.findByPk(r.tim_id);
      if (tim && !(tim as any).aktivity) {
        return `Tím ${(tim as any).nazov} je archivovaný. Najprv obnov tím.`;
      }
      return null;
    },
  },

  ligy: {
    model: Liga,
    nazovJednotne: 'Liga',
    popis: (l) => l.nazov,
    detail: (l) => l.sezona,
    stlpecZmeny: 'aktualizovany',
  },

  stadiony: {
    model: Stadion,
    nazovJednotne: 'Štadión',
    popis: (s: any) => s.nazov,
    detail: (s: any) => s.adresa,
    stlpecZmeny: 'aktualizovany',
  },

  sezony: {
    model: Sezona,
    nazovJednotne: 'Sezóna',
    popis: (s) => s.nazov,
    stlpecZmeny: 'aktualizovana',
  },
};

/** Zoznam povolených typov do hlášok. */
const POVOLENE_TYPY = Object.keys(TYPY).join(', ');

/** Prevedie jeden záznam na tvar, ktorý potrebuje zoznam v administrácii. */
const naPolozku = (typ: string, nastavenia: TypArchivu, zaznam: any) => ({
  typ,
  typ_nazov: nastavenia.nazovJednotne,
  id: zaznam.id,
  nazov: nastavenia.popis(zaznam),
  detail: nastavenia.detail ? nastavenia.detail(zaznam) : null,
  archivovane: zaznam[nastavenia.stlpecZmeny] ?? null,
});

/**
 * GET /api/admin/archive
 *
 * Vráti archivované položky. Bez parametra prejde všetky entity,
 * s ?typ=hraci len jednu.
 *
 * Voliteľne ?hladat= filtruje podľa názvu položky.
 */
export const getArchiv = async (req: Request, res: Response): Promise<void> => {
  try {
    const ziadanyTyp = req.query.typ ? String(req.query.typ) : null;

    if (ziadanyTyp && !TYPY[ziadanyTyp]) {
      res.status(400).json({
        success: false,
        message: `Neznámy typ „${ziadanyTyp}". Povolené sú: ${POVOLENE_TYPY}`,
      });
      return;
    }

    const typyNaPrejdenie = ziadanyTyp ? [ziadanyTyp] : Object.keys(TYPY);
    const hladat = req.query.hladat ? String(req.query.hladat).toLowerCase() : null;

    const polozky: any[] = [];
    const pocty: Record<string, number> = {};

    for (const typ of typyNaPrejdenie) {
      const nastavenia = TYPY[typ];

      const zaznamy = await nastavenia.model.findAll({
        where: { aktivity: false },
        order: [[nastavenia.stlpecZmeny, 'DESC']],
      });

      const prevedene = zaznamy
        .map((z: any) => naPolozku(typ, nastavenia, z))
        .filter((p: any) => !hladat || p.nazov.toLowerCase().includes(hladat));

      // Počty popisujú to, čo je naozaj vo výpise - pri hľadaní teda
      // klesnú spolu s ním. Inak by záložky v administrácii ukazovali
      // iné čísla, než koľko položiek pod nimi používateľ vidí.
      pocty[typ] = prevedene.length;
      polozky.push(...prevedene);
    }

    // Najnovšie archivované navrch - používateľ najčastejšie vracia to,
    // čo práve omylom odstránil
    polozky.sort((a, b) => {
      const casA = a.archivovane ? new Date(a.archivovane).getTime() : 0;
      const casB = b.archivovane ? new Date(b.archivovane).getTime() : 0;
      return casB - casA;
    });

    res.json({
      success: true,
      data: polozky,
      pocet: polozky.length,
      pocty_podla_typu: pocty,
      message: polozky.length
        ? `V archíve je ${polozky.length} položiek`
        : 'Archív je prázdny',
    });
  } catch (error) {
    console.error('Chyba pri načítaní archívu:', error);
    res.status(500).json({ success: false, message: 'Chyba servera pri načítaní archívu' });
  }
};

/**
 * POST /api/admin/archive/:typ/:id/restore
 *
 * Vráti archivovanú položku späť medzi aktívne.
 */
export const obnovPolozku = async (req: Request, res: Response): Promise<void> => {
  try {
    const { typ, id } = req.params;
    const nastavenia = TYPY[typ];

    if (!nastavenia) {
      res.status(400).json({
        success: false,
        message: `Neznámy typ „${typ}". Povolené sú: ${POVOLENE_TYPY}`,
      });
      return;
    }

    const cislo = Number(id);
    if (!Number.isInteger(cislo) || cislo < 1) {
      res.status(400).json({ success: false, message: 'ID musí byť kladné celé číslo' });
      return;
    }

    const zaznam = await nastavenia.model.findByPk(cislo);

    if (!zaznam) {
      res.status(404).json({
        success: false,
        message: `${nastavenia.nazovJednotne} s ID ${cislo} neexistuje`,
      });
      return;
    }

    if (zaznam.aktivity) {
      res.status(409).json({
        success: false,
        message: `${nastavenia.nazovJednotne} „${nastavenia.popis(zaznam)}" nie je archivovaný`,
      });
      return;
    }

    if (nastavenia.prekazkaObnovy) {
      const prekazka = await nastavenia.prekazkaObnovy(zaznam);
      if (prekazka) {
        res.status(409).json({ success: false, message: prekazka });
        return;
      }
    }

    await zaznam.update({ aktivity: true });

    res.json({
      success: true,
      data: naPolozku(typ, nastavenia, zaznam),
      message: `${nastavenia.nazovJednotne} „${nastavenia.popis(zaznam)}" bol obnovený`,
    });
  } catch (error) {
    console.error('Chyba pri obnove položky z archívu:', error);
    res.status(500).json({ success: false, message: 'Chyba servera pri obnove položky' });
  }
};

/**
 * DELETE /api/admin/archive/:typ/:id
 *
 * Trvalé odstránenie archivovanej položky. Vyžaduje, aby položka už
 * v archíve bola - natvrdo sa nikdy nemaže niečo, čo je ešte aktívne.
 */
export const zmazTrvalo = async (req: Request, res: Response): Promise<void> => {
  try {
    const { typ, id } = req.params;
    const nastavenia = TYPY[typ];

    if (!nastavenia) {
      res.status(400).json({
        success: false,
        message: `Neznámy typ „${typ}". Povolené sú: ${POVOLENE_TYPY}`,
      });
      return;
    }

    const cislo = Number(id);
    if (!Number.isInteger(cislo) || cislo < 1) {
      res.status(400).json({ success: false, message: 'ID musí byť kladné celé číslo' });
      return;
    }

    const zaznam = await nastavenia.model.findByPk(cislo);

    if (!zaznam) {
      res.status(404).json({
        success: false,
        message: `${nastavenia.nazovJednotne} s ID ${cislo} neexistuje`,
      });
      return;
    }

    // Poistka proti omylu: trvalo zmazať sa dá len to, čo je v archíve.
    if (zaznam.aktivity) {
      res.status(409).json({
        success: false,
        message: `${nastavenia.nazovJednotne} „${nastavenia.popis(zaznam)}" je aktívny. ` +
          'Najprv ho archivuj, až potom sa dá zmazať natrvalo.',
      });
      return;
    }

    const nazov = nastavenia.popis(zaznam);
    await zaznam.destroy();

    res.json({
      success: true,
      message: `${nastavenia.nazovJednotne} „${nazov}" bol natrvalo zmazaný`,
    });
  } catch (error: any) {
    // Cudzie kľúče môžu trvalé zmazanie odmietnuť - napríklad hráč,
    // ktorý má zapísané štatistiky zo zápasov
    if (error?.name === 'SequelizeForeignKeyConstraintError') {
      res.status(409).json({
        success: false,
        message: 'Položku nemožno zmazať natrvalo - viažu sa na ňu ďalšie záznamy ' +
          '(napríklad štatistiky zo zápasov). V archíve môže zostať bez obmedzenia.',
      });
      return;
    }

    console.error('Chyba pri trvalom mazaní položky:', error);
    res.status(500).json({ success: false, message: 'Chyba servera pri mazaní položky' });
  }
};
