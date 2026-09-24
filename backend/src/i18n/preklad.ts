// Umiestnenie: backend/src/i18n/preklad.ts
// Preklad hlášok servera do jazyka administrácie.
//
// Administrácia posiela hlavičku X-Jazyk (cs, en). Hlášky v odpovedi
// (message, errors) sa preložia podľa slovníka - slovenský text je kľúčom,
// rovnako ako na frontende. Kontroléry tak ostávajú bez zmeny a píšu
// hlášky po slovensky.
//
// Hlášky s premennou časťou („Šablóna X bola nainštalovaná") sú v slovníku
// ako vzor s {0}, {1}... - premenné časti sa prenesú do prekladu.
//
// Verejný web hlavičku neposiela, takže návštevníci dostanú slovenčinu.
// Chýbajúce preklady: npm run preklady (priečinok backend).

import { Request, Response, NextFunction } from 'express';
import en from './en.json';
import cs from './cs.json';

type Slovnik = Record<string, string>;

interface PripravenySlovnik {
  presne: Map<string, string>;
  vzory: Array<{ vzor: RegExp; preklad: string; poradie: string[] }>;
}

const escapuj = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const priprav = (slovnik: Slovnik): PripravenySlovnik => {
  const presne = new Map<string, string>();
  const vzory: PripravenySlovnik['vzory'] = [];
  for (const [kluc, preklad] of Object.entries(slovnik)) {
    if (!/\{\d+\}/.test(kluc)) {
      presne.set(kluc, preklad);
      continue;
    }
    const poradie: string[] = [];
    const casti = kluc.split(/(\{\d+\})/);
    const regex = casti
      .map((c) => {
        const m = c.match(/^\{(\d+)\}$/);
        if (m) {
          poradie.push(m[1]);
          return '([\\s\\S]*?)';
        }
        return escapuj(c);
      })
      .join('');
    vzory.push({ vzor: new RegExp(`^${regex}$`), preklad, poradie });
  }
  // Dlhšie (konkrétnejšie) vzory skúšame skôr
  vzory.sort((a, b) => b.vzor.source.length - a.vzor.source.length);
  return { presne, vzory };
};

const SLOVNIKY: Record<string, PripravenySlovnik> = { en: priprav(en as Slovnik), cs: priprav(cs as Slovnik) };

/** Preloží jednu hlášku; neznámu vráti bez zmeny. */
export const prelozHlasku = (text: string, jazyk: string): string => {
  const slovnik = SLOVNIKY[jazyk];
  if (!slovnik || typeof text !== 'string' || !text) return text;
  const presny = slovnik.presne.get(text);
  if (presny !== undefined) return presny;
  // Hlášky typu „pole: chyba" z validácie modelu
  const dvojbodka = text.match(/^([\w.]+): ([\s\S]+)$/);
  if (dvojbodka) {
    const zvysok = prelozHlasku(dvojbodka[2], jazyk);
    if (zvysok !== dvojbodka[2]) return `${dvojbodka[1]}: ${zvysok}`;
  }
  for (const { vzor, preklad, poradie } of slovnik.vzory) {
    const m = text.match(vzor);
    if (!m) continue;
    let vysledok = preklad;
    poradie.forEach((cislo, i) => {
      // Premenná časť môže byť sama prekladateľná (napr. názov sekcie)
      const hodnota = slovnik.presne.get(m[i + 1]) ?? m[i + 1];
      vysledok = vysledok.split(`{${cislo}}`).join(hodnota);
    });
    return vysledok;
  }
  return text;
};

const prelozChyby = (chyby: unknown, jazyk: string): unknown =>
  Array.isArray(chyby)
    ? chyby.map((ch) => {
        if (typeof ch === 'string') return prelozHlasku(ch, jazyk);
        if (ch && typeof ch === 'object' && typeof (ch as any).msg === 'string') return { ...ch, msg: prelozHlasku((ch as any).msg, jazyk) };
        if (ch && typeof ch === 'object' && typeof (ch as any).message === 'string')
          return { ...ch, message: prelozHlasku((ch as any).message, jazyk) };
        return ch;
      })
    : chyby;

/** Middleware - obalí res.json a preloží hlášky v odpovedi. */
export const prekladHlasok = (req: Request, res: Response, next: NextFunction): void => {
  const jazyk = String(req.get('x-jazyk') || '').toLowerCase();
  if (!SLOVNIKY[jazyk]) {
    next();
    return;
  }
  const povodny = res.json.bind(res);
  res.json = (telo?: any) => {
    if (telo && typeof telo === 'object' && !Array.isArray(telo)) {
      const kopia = { ...telo };
      if (typeof kopia.message === 'string') kopia.message = prelozHlasku(kopia.message, jazyk);
      if (kopia.errors) kopia.errors = prelozChyby(kopia.errors, jazyk);
      if (kopia.chyby) kopia.chyby = prelozChyby(kopia.chyby, jazyk);
      return povodny(kopia);
    }
    return povodny(telo);
  };
  next();
};
