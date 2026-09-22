// Umiestnenie: backend/src/controllers/turnajController.ts
//
// PAVÚK TURNAJA
//
// PREČO VZNIKOL: pole pavuk_struktura na modeli existovalo, ale bol to
// len textový JSON blob bez akejkoľvek obsluhy. Nedal sa vygenerovať
// pavúk, zapísať výsledok ani posunúť tím do ďalšieho kola - turnaj bol
// prakticky len úložisko.
//
// TVAR PAVÚKA:
//   {
//     "kola": [
//       { "nazov": "Štvrťfinále", "poradie": 1, "zapasy": [
//           { "kod": "k1z1",
//             "domaci":  { "nazov": "Alfa", "tim_id": 3, "logo": null },
//             "hostia":  { "nazov": "Beta", "tim_id": null, "logo": null },
//             "skore_domaci": null, "skore_hostia": null,
//             "vitaz": null,
//             "postupuje_do": "k2z1", "postupuje_ako": "domaci" }
//       ]}
//     ]
//   }
//
// Kód zápasu je stabilný, takže výsledok sa dá zapísať bez ohľadu na
// poradie v poli a posun víťaza vie, kam presne ho zapísať.

import { Request, Response } from 'express';
import LigaTurnaj from '../models/LigaTurnaj';
import Team from '../models/Team';

/** Názvy kôl podľa počtu zápasov v nich. */
const NAZVY_KOL: Record<number, string> = {
  1: 'Finále',
  2: 'Semifinále',
  4: 'Štvrťfinále',
  8: 'Osemfinále',
  16: 'Šestnásťfinále',
};

interface TimVPavuku {
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
}

interface KoloPavuka {
  nazov: string;
  poradie: number;
  zapasy: ZapasPavuka[];
}

interface Pavuk {
  kola: KoloPavuka[];
}

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

/** Najbližšia mocnina dvojky, ktorá pokryje počet tímov. */
const naMocninuDvoch = (pocet: number): number => {
  let velkost = 1;
  while (velkost < pocet) velkost *= 2;
  return velkost;
};

/**
 * GET /api/tournaments/:id/bracket
 * Pavúk turnaja.
 */
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
        aktualna_faza: turnaj.aktualna_faza,
        pavuk: nacitajPavuka(turnaj),
      },
    });
  } catch (error) {
    console.error('Chyba pri načítaní pavúka:', error);
    res.status(500).json({ success: false, message: 'Chyba servera pri načítaní pavúka' });
  }
};

/**
 * POST /api/tournaments/:id/bracket/generate
 *
 * Vygeneruje prázdny pavúk zo zoznamu tímov.
 *
 * Telo: { "timy": [ {"nazov":"Alfa","tim_id":3}, {"nazov":"Beta"} ] }
 *
 * Keď počet tímov nie je mocnina dvojky, doplnia sa voľné žreby -
 * tím v takom páre postúpi rovno do ďalšieho kola.
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

    // Overíme naše tímy jedným dotazom
    const naseId = vstup
      .map((t: any) => Number(t.tim_id))
      .filter((id: number) => Number.isInteger(id) && id > 0);

    const naseTimy = naseId.length
      ? await Team.findAll({ where: { id: naseId } })
      : [];
    const podlaId = new Map(naseTimy.map((t) => [t.id, t]));

    const timy: (TimVPavuku | null)[] = vstup.map((t: any) => {
      const id = Number(t.tim_id);
      const nas = Number.isInteger(id) ? podlaId.get(id) : undefined;

      if (nas) {
        return { nazov: nas.nazov, tim_id: nas.id, logo: nas.logo };
      }

      const nazov = String(t.nazov || '').trim();
      if (!nazov) return null;
      return { nazov, tim_id: null, logo: t.logo || null };
    });

    if (timy.some((t) => t === null)) {
      res.status(400).json({
        success: false,
        message: 'Každý tím musí mať názov alebo platné tim_id',
      });
      return;
    }

    // Doplnenie na mocninu dvojky voľnými žrebmi
    const velkost = naMocninuDvoch(timy.length);
    const obsadenie: (TimVPavuku | null)[] = [...timy];
    while (obsadenie.length < velkost) obsadenie.push(null);

    const kola: KoloPavuka[] = [];
    let pocetZapasov = velkost / 2;
    let cisloKola = 1;

    while (pocetZapasov >= 1) {
      const zapasy: ZapasPavuka[] = [];

      for (let i = 0; i < pocetZapasov; i++) {
        const kod = `k${cisloKola}z${i + 1}`;

        // Kam víťaz postúpi: dvojica zápasov sa zlieva do jedného
        const dalsieKolo = cisloKola + 1;
        const postupujeDo = pocetZapasov > 1 ? `k${dalsieKolo}z${Math.floor(i / 2) + 1}` : null;
        const postupujeAko: 'domaci' | 'hostia' = i % 2 === 0 ? 'domaci' : 'hostia';

        zapasy.push({
          kod,
          domaci: cisloKola === 1 ? obsadenie[i * 2] : null,
          hostia: cisloKola === 1 ? obsadenie[i * 2 + 1] : null,
          skore_domaci: null,
          skore_hostia: null,
          vitaz: null,
          postupuje_do: postupujeDo,
          postupuje_ako: postupujeDo ? postupujeAko : null,
        });
      }

      kola.push({
        nazov: NAZVY_KOL[pocetZapasov] || `${cisloKola}. kolo`,
        poradie: cisloKola,
        zapasy,
      });

      pocetZapasov = pocetZapasov / 2;
      cisloKola++;
    }

    const pavuk: Pavuk = { kola };

    // Voľný žreb: kde súper chýba, tím postupuje hneď.
    //
    // Prechádzame kolá POSTUPNE, nie len prvé. Pri nepárnom počte
    // tímov môže voľný žreb vzniknúť aj v ďalšom kole - tím by inak
    // stál proti prázdnemu miestu a pavúk by sa zasekol.
    for (const kolo of pavuk.kola) {
      for (const zapas of kolo.zapasy) {
        if (zapas.vitaz) continue;
        if (zapas.domaci && !zapas.hostia) {
          zapas.vitaz = 'domaci';
          posunVitaza(pavuk, zapas);
        } else if (!zapas.domaci && zapas.hostia) {
          zapas.vitaz = 'hostia';
          posunVitaza(pavuk, zapas);
        }
      }
    }

    await turnaj.update({
      pavuk_struktura: JSON.stringify(pavuk),
      pocet_timov: timy.length,
      aktualna_faza: pavuk.kola[0].nazov,
      celkove_fazy: pavuk.kola.map((k) => k.nazov),
      status: 'prebiehajuci',
    });

    res.json({
      success: true,
      data: { turnaj_id: turnaj.id, pavuk },
      message: `Pavúk vygenerovaný pre ${timy.length} tímov (${kola.length} kôl)`,
    });
  } catch (error) {
    console.error('Chyba pri generovaní pavúka:', error);
    res.status(500).json({ success: false, message: 'Chyba servera pri generovaní pavúka' });
  }
};

/** Nájde zápas v pavúku podľa kódu. */
const najdiZapas = (pavuk: Pavuk, kod: string): ZapasPavuka | null => {
  for (const kolo of pavuk.kola) {
    const zapas = kolo.zapasy.find((z) => z.kod === kod);
    if (zapas) return zapas;
  }
  return null;
};

/**
 * Zapíše víťaza zápasu do nasledujúceho kola.
 *
 * Bez tohto kroku by sa pavúk musel prepisovať ručne - práve to bolo
 * to, čo v module chýbalo.
 */
const posunVitaza = (pavuk: Pavuk, zapas: ZapasPavuka): void => {
  if (!zapas.vitaz || !zapas.postupuje_do || !zapas.postupuje_ako) return;

  const dalsi = najdiZapas(pavuk, zapas.postupuje_do);
  if (!dalsi) return;

  const postupujuci = zapas.vitaz === 'domaci' ? zapas.domaci : zapas.hostia;
  dalsi[zapas.postupuje_ako] = postupujuci;
};

/**
 * PATCH /api/tournaments/:id/bracket/match/:kod
 *
 * Zapíše výsledok zápasu a posunie víťaza ďalej.
 *
 * Telo: { "skore_domaci": 2, "skore_hostia": 1 }
 *    alebo { "vitaz": "domaci" } pri postupe bez skóre (penalty, kontumácia)
 */
export const zapisVysledok = async (req: Request, res: Response): Promise<void> => {
  try {
    const turnaj = await najdiTurnaj(req, res);
    if (!turnaj) return;

    const pavuk = nacitajPavuka(turnaj);
    const zapas = najdiZapas(pavuk, String(req.params.kod));

    if (!zapas) {
      res.status(404).json({
        success: false,
        message: `Zápas s kódom „${req.params.kod}" v pavúku nie je`,
      });
      return;
    }

    if (!zapas.domaci || !zapas.hostia) {
      res.status(409).json({
        success: false,
        message: 'Zápas ešte nemá oboch súperov - najprv dohrajte predchádzajúce kolo',
      });
      return;
    }

    const maSkore =
      req.body.skore_domaci !== undefined && req.body.skore_hostia !== undefined;

    if (maSkore) {
      const domaci = Number(req.body.skore_domaci);
      const hostia = Number(req.body.skore_hostia);

      if (!Number.isInteger(domaci) || !Number.isInteger(hostia) || domaci < 0 || hostia < 0) {
        res.status(400).json({ success: false, message: 'Skóre musí byť nezáporné celé číslo' });
        return;
      }

      zapas.skore_domaci = domaci;
      zapas.skore_hostia = hostia;

      if (domaci > hostia) {
        zapas.vitaz = 'domaci';
      } else if (hostia > domaci) {
        zapas.vitaz = 'hostia';
      } else {
        // V pavúku nemôže zostať remíza - postúpiť musí niekto.
        // Kto, povie klient poľom "vitaz" (penalty, kontumácia).
        if (req.body.vitaz !== 'domaci' && req.body.vitaz !== 'hostia') {
          res.status(400).json({
            success: false,
            message:
              'Pri nerozhodnom výsledku uveďte, kto postupuje: "vitaz": "domaci" alebo "hostia"',
          });
          return;
        }
        zapas.vitaz = req.body.vitaz;
      }
    } else if (req.body.vitaz === 'domaci' || req.body.vitaz === 'hostia') {
      zapas.vitaz = req.body.vitaz;
    } else {
      res.status(400).json({
        success: false,
        message: 'Uveďte skore_domaci a skore_hostia, alebo priamo vitaz',
      });
      return;
    }

    posunVitaza(pavuk, zapas);

    // Keď je finále dohrané, turnaj má víťaza
    const finale = pavuk.kola[pavuk.kola.length - 1]?.zapasy[0];
    const zmeny: any = { pavuk_struktura: JSON.stringify(pavuk) };

    if (finale?.vitaz) {
      const vitaz = finale.vitaz === 'domaci' ? finale.domaci : finale.hostia;
      const druhy = finale.vitaz === 'domaci' ? finale.hostia : finale.domaci;

      zmeny.status = 'ukonceny';
      // Ukladáme len naše tímy - externé v tabuľke tímov nie sú
      if (vitaz?.tim_id) zmeny.vitaz_id = vitaz.tim_id;
      if (druhy?.tim_id) zmeny.druhy_id = druhy.tim_id;
    }

    await turnaj.update(zmeny);

    res.json({
      success: true,
      data: { turnaj_id: turnaj.id, zapas, pavuk },
      message: finale?.vitaz
        ? 'Výsledok zapísaný, turnaj je ukončený'
        : 'Výsledok zapísaný, víťaz postúpil do ďalšieho kola',
    });
  } catch (error) {
    console.error('Chyba pri zápise výsledku:', error);
    res.status(500).json({ success: false, message: 'Chyba servera pri zápise výsledku' });
  }
};

/**
 * PUT /api/tournaments/:id/bracket
 *
 * Uloží celý pavúk naraz - pre ručné úpravy v administrácii
 * (presunutie tímu, oprava obsadenia).
 */
export const ulozPavuka = async (req: Request, res: Response): Promise<void> => {
  try {
    const turnaj = await najdiTurnaj(req, res);
    if (!turnaj) return;

    const pavuk = req.body.pavuk ?? req.body;

    if (!pavuk || !Array.isArray(pavuk.kola)) {
      res.status(400).json({
        success: false,
        message: 'Pavúk musí mať pole „kola"',
      });
      return;
    }

    if (pavuk.kola.length > 10) {
      res.status(400).json({ success: false, message: 'Pavúk môže mať najviac 10 kôl' });
      return;
    }

    // Kódy zápasov musia byť jedinečné - inak by sa výsledok zapísal
    // do nesprávneho zápasu
    const kody = new Set<string>();
    for (const kolo of pavuk.kola) {
      if (!Array.isArray(kolo.zapasy)) {
        res.status(400).json({ success: false, message: 'Každé kolo musí mať pole „zapasy"' });
        return;
      }
      for (const zapas of kolo.zapasy) {
        if (!zapas.kod) {
          res.status(400).json({ success: false, message: 'Každý zápas musí mať kód' });
          return;
        }
        if (kody.has(zapas.kod)) {
          res.status(400).json({
            success: false,
            message: `Kód zápasu „${zapas.kod}" je použitý viackrát`,
          });
          return;
        }
        kody.add(zapas.kod);
      }
    }

    await turnaj.update({
      pavuk_struktura: JSON.stringify(pavuk),
      celkove_fazy: pavuk.kola.map((k: any) => k.nazov || ''),
    });

    res.json({
      success: true,
      data: { turnaj_id: turnaj.id, pavuk },
      message: 'Pavúk bol uložený',
    });
  } catch (error) {
    console.error('Chyba pri ukladaní pavúka:', error);
    res.status(500).json({ success: false, message: 'Chyba servera pri ukladaní pavúka' });
  }
};
