// Umiestnenie: backend/src/middleware/presmerovania.ts
//
// VYKONANIE PRESMEROVANÍ
//
// Samotná tabuľka presmerovaní by bola na nič, keby ich nikto
// nevykonával. Tento middleware sa pozrie na prichádzajúcu cestu a ak
// pre ňu existuje záznam, pošle návštevníka na novú adresu.
//
// Zoznam sa drží v pamäti a obnovuje sa raz za minútu. Presmerovaní
// býva pár desiatok a menia sa zriedka, takže dotaz do databázy pri
// každej požiadavke by bol zbytočný.

import { Request, Response, NextFunction } from 'express';
import Presmerovanie from '../models/Presmerovanie';

/** Ako dlho platí kópia v pamäti. */
const PLATNOST_MS = 60 * 1000;

let kopia = new Map<string, { id: number; novy: string; kod: number }>();
let nacitaneO = 0;

/** Načíta aktívne presmerovania do pamäte. */
const obnovKopiu = async (): Promise<void> => {
  const zaznamy = await Presmerovanie.findAll({ where: { aktivity: true } });

  const nova = new Map<string, { id: number; novy: string; kod: number }>();
  for (const z of zaznamy) {
    nova.set(z.stary_odkaz, { id: z.id, novy: z.novy_odkaz, kod: z.kod });
  }

  kopia = nova;
  nacitaneO = Date.now();
};

/**
 * Nájde presmerovanie pre cestu a zapíše jeho použitie.
 *
 * Web beží ako samostatná aplikácia (Vite / statický build), takže
 * požiadavky na stránky na backend neprídu a middleware nižšie ich
 * nevidí. Web sa preto pri nenájdenej stránke spýta cez
 * GET /api/redirects/resolve, či pre ňu nie je presmerovanie.
 */
export const najdiPresmerovanie = async (povodna: string): Promise<{ novy: string; kod: number } | null> => {
  if (Date.now() - nacitaneO > PLATNOST_MS) {
    await obnovKopiu();
  }
  const ciel = kopia.get(Presmerovanie.normalizuj(povodna));
  if (!ciel) return null;
  void Presmerovanie.update(
    {
      pocet_pouziti: (Presmerovanie.sequelize as any).literal('"pocet_pouziti" + 1'),
      posledne_pouzite: new Date(),
    },
    { where: { id: ciel.id }, silent: true }
  ).catch((chyba) => console.error('Nepodarilo sa zapísať použitie presmerovania:', chyba));
  return { novy: ciel.novy, kod: ciel.kod };
};

/** Zahodí kópiu, aby sa načítala znova. Volá sa po zmene v administrácii. */
export const zrusKopiuPresmerovani = (): void => {
  nacitaneO = 0;
};

/**
 * Middleware presmerovaní.
 *
 * Púšťa sa len na GET a HEAD - presmerovať POST by znamenalo stratiť
 * telo požiadavky. Adresy API sa preskakujú, tie presmerovania neriešia.
 */
export const vykonajPresmerovania = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    next();
    return;
  }

  if (req.path.startsWith('/api/') || req.path.startsWith('/uploads/')) {
    next();
    return;
  }

  try {
    if (Date.now() - nacitaneO > PLATNOST_MS) {
      await obnovKopiu();
    }

    const cesta = Presmerovanie.normalizuj(req.path);
    const ciel = kopia.get(cesta);

    if (!ciel) {
      next();
      return;
    }

    // Počítadlo ukáže, na čo sa ešte odkazuje zvonku. Zapisujeme ho
    // bez čakania, aby presmerovanie nezdržiaval zápis do databázy.
    void Presmerovanie.update(
      {
        pocet_pouziti: (Presmerovanie.sequelize as any).literal('"pocet_pouziti" + 1'),
        posledne_pouzite: new Date(),
      },
      { where: { id: ciel.id }, silent: true }
    ).catch((chyba) => {
      console.error('Nepodarilo sa zapísať použitie presmerovania:', chyba);
    });

    res.redirect(ciel.kod, ciel.novy);
  } catch (chyba) {
    // Chyba v presmerovaniach nesmie zhodiť celý web
    console.error('Chyba pri vyhodnocovaní presmerovaní:', chyba);
    next();
  }
};
