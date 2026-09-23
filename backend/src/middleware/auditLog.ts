// Umiestnenie: backend/src/middleware/auditLog.ts
//
// AUTOMATICKÝ ZÁPIS DO AUDITU
//
// PREČO VZNIKOL: model AuditLog existoval a bol dobre navrhnutý, ale
// zapisovalo sa doň len z troch miest v GDPR controlleri. Požiadavka
// pritom hovorí „Logs - všetky udalosti, možnosť filtrovať" a z auditu
// sa nedalo vyčítať, kto čo v administrácii zmenil.
//
// PREČO MIDDLEWARE A NIE VOLANIE V KAŽDOM CONTROLLERI: zápis by sa
// inak musel doplniť do viac než dvadsiatich controllerov a pri každom
// novom endpointe by sa naň dalo zabudnúť. Takto sa zaznamená každá
// zapisovacia požiadavka, ktorá naozaj prešla, bez ohľadu na to, kde
// je obslúžená.
//
// Zapisujú sa LEN úspešné zápisy (POST/PUT/PATCH/DELETE so stavom 2xx).
// Čítanie sa neloguje - zahltilo by to tabuľku a nič nehovorí.

import { Request, Response, NextFunction } from 'express';
import AuditLog, { TypAkcie } from '../models/AuditLog';

/**
 * Preklad začiatku cesty na názov entity v audite.
 *
 * Kľúč je prvý zmysluplný úsek cesty za /api (prípadne za /api/admin).
 */
const ENTITY: Record<string, string> = {
  articles: 'Článok',
  categories: 'Rubrika',
  pages: 'Stránka',
  galleries: 'Galéria',
  media: 'Súbor',
  teams: 'Tím',
  players: 'Hráč',
  staff: 'Realizačný tím',
  stadiums: 'Štadión',
  leagues: 'Liga',
  matches: 'Zápas',
  calendar: 'Kalendár',
  seasons: 'Sezóna',
  rosters: 'Súpiska',
  sponsors: 'Sponzor',
  'sponsor-levels': 'Úroveň partnerstva',
  documents: 'Dokument',
  'document-categories': 'Kategória dokumentov',
  comments: 'Komentár',
  videos: 'Video',
  tournaments: 'Turnaj',
  polls: 'Anketa',
  fans: 'Fanúšik',
  forms: 'Formulár',
  users: 'Používateľ',
  roles: 'Rola',
  menu: 'Menu',
  redirects: 'Presmerovanie',
  sablony: 'Šablóna webu',
  settings: 'Nastavenia',
  archive: 'Archív',
  auth: 'Prihlásenie',
};

/** Cesty, ktoré sa do auditu nezapisujú. */
const PRESKOCIT = [
  // Odosielanie formulára je verejná akcia návštevníka, nie zásah
  // do administrácie - má vlastnú tabuľku odpovedí
  '/api/forms',
  // Verejné pridanie komentáru rieši moderácia
  '/api/comments',
];

/** Odvodí typ akcie z HTTP metódy a cesty. */
const zistiAkciu = (metoda: string, cesta: string): TypAkcie => {
  if (cesta.includes('/restore')) return 'uprava';
  if (cesta.includes('/login')) return 'prihlasenie';
  if (cesta.includes('heslo')) return 'zmena_hesla';

  switch (metoda) {
    case 'POST':
      return 'vytvorenie';
    case 'DELETE':
      return 'zmazanie';
    default:
      return 'uprava';
  }
};

/** Vyberie z cesty názov entity a jej ID, ak tam je. */
const rozoberCestu = (cesta: string): { entita: string; id: number | null } => {
  // /api/admin/articles/12 -> ['api','admin','articles','12']
  const useky = cesta.split('/').filter(Boolean);
  const bezPrefixu = useky[0] === 'api' ? useky.slice(1) : useky;
  const bezAdmin = bezPrefixu[0] === 'admin' ? bezPrefixu.slice(1) : bezPrefixu;

  const kluc = bezAdmin[0] || 'neznama';
  const entita = ENTITY[kluc] || kluc;

  // ID hľadáme medzi ďalšími úsekmi - prvé číslo je ID záznamu
  let id: number | null = null;
  for (const usek of bezAdmin.slice(1)) {
    const cislo = Number(usek);
    if (Number.isInteger(cislo) && cislo > 0) {
      id = cislo;
      break;
    }
  }

  return { entita, id };
};

/**
 * Middleware, ktorý po úspešnom zápise založí záznam v audite.
 *
 * Zápis prebieha až po odoslaní odpovede, takže používateľa nezdržiava
 * a prípadná chyba auditu nezhodí samotnú operáciu.
 */
export const zaznamenajZmeny = (req: Request, res: Response, next: NextFunction): void => {
  const metoda = req.method;

  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(metoda)) {
    next();
    return;
  }

  const cesta = req.originalUrl.split('?')[0];

  if (PRESKOCIT.some((p) => cesta === p || cesta.startsWith(`${p}/`))) {
    next();
    return;
  }

  res.on('finish', () => {
    // Len úspešné operácie. Neúspešný pokus nie je zmena.
    if (res.statusCode < 200 || res.statusCode >= 300) return;

    // Neprihlásený zápis je buď verejná akcia, alebo prihlásenie;
    // prihlásenie sa zaznamenáva zvlášť nižšie
    const jePrihlasenie = cesta.includes('/login');
    if (!req.userId && !jePrihlasenie) return;

    const { entita, id } = rozoberCestu(cesta);

    void AuditLog.zaznamenaj({
      req,
      akcia: zistiAkciu(metoda, cesta),
      entita,
      entita_id: id,
      popis: `${metoda} ${cesta}`,
      // Pri prihlásení ešte nie je známy používateľ z tokenu - zapíšeme
      // e-mail, ktorým sa prihlásil, aby log nehovoril len „Systém"
      email: jePrihlasenie && typeof req.body?.email === 'string' ? req.body.email.slice(0, 150) : null,
    });
  });

  next();
};
