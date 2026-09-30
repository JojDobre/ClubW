// Umiestnenie: backend/src/controllers/menuController.ts
//
// MENU A PRESMEROVANIA
//
// Menu sa doteraz skladalo výhradne z Page.v_menu a poradie_menu, takže
// sa nedalo vnoriť, pomenovať inak než stránka ani pridať vlastný odkaz.
// Tu sa spravujú položky menu ako samostatné záznamy a k nim
// presmerovania starých odkazov.

import { Request, Response } from 'express';
import MenuPolozka from '../models/MenuPolozka';
import Presmerovanie from '../models/Presmerovanie';
import Page from '../models/Page';
import Category from '../models/Category';
import { sanitizePlainText } from '../utils/sanitize';

/**
 * Starý odkaz musí byť adresa na tomto webe - nie iný web, API ani
 * administrácia (presmerovaním by sa dala zamknúť).
 */
const overStaryOdkaz = (stary: string): string | null => {
  if (!stary.startsWith('/')) return 'Starý odkaz musí byť adresa na tomto webe (začína /)';
  if (/^\/(api|admin|uploads|prihlasenie)(\/|$)/i.test(stary)) {
    return 'Adresy administrácie, prihlásenia, API a súborov sa presmerovať nedajú';
  }
  if (stary === '/') return 'Úvodnú stránku nie je možné presmerovať';
  return null;
};

const overId = (id: string): number | null => {
  const cislo = Number(id);
  return Number.isInteger(cislo) && cislo > 0 ? cislo : null;
};

/** Načíta položky aj s cieľmi, aby sa dal zostaviť odkaz. */
const nacitajPolozky = (lenAktivne: boolean) =>
  MenuPolozka.findAll({
    where: lenAktivne ? { aktivity: true } : {},
    include: [
      { model: Page, as: 'stranka', attributes: ['id', 'slug', 'nazov', 'publikovany'], required: false },
      { model: Category, as: 'rubrika', attributes: ['id', 'slug', 'nazov'], required: false },
    ],
    order: [['poradie', 'ASC'], ['id', 'ASC']],
  });

/**
 * Poskladá plochý zoznam do stromu podľa rodic_id.
 *
 * Menu má najviac tri úrovne (hlavná položka → kategória → odkaz),
 * funkcia však zvláda ľubovoľnú hĺbku.
 */
const doStromu = (polozky: any[]): any[] => {
  const podlaId = new Map<number, any>();
  const koren: any[] = [];

  for (const p of polozky) {
    podlaId.set(p.id, { ...p, deti: [] });
  }

  for (const p of polozky) {
    const uzol = podlaId.get(p.id);
    if (p.rodic_id && podlaId.has(p.rodic_id)) {
      podlaId.get(p.rodic_id).deti.push(uzol);
    } else {
      koren.push(uzol);
    }
  }

  return koren;
};

/** Najviac úrovní menu: hlavná položka → kategória → odkaz. */
const MAX_UROVNI = 3;

/** Úroveň položky v strome (1 = hlavné menu). */
const urovenPolozky = async (id: number): Promise<number> => {
  let uroven = 1;
  let aktualna = await MenuPolozka.findByPk(id, { attributes: ['id', 'rodic_id'] });
  const navstivene = new Set<number>();
  while (aktualna?.rodic_id && !navstivene.has(aktualna.id) && uroven <= MAX_UROVNI + 1) {
    navstivene.add(aktualna.id);
    uroven++;
    aktualna = await MenuPolozka.findByPk(aktualna.rodic_id, { attributes: ['id', 'rodic_id'] });
  }
  return uroven;
};

/** Potomkovia položky (id) a počet úrovní jej podstromu (1 = bez podmenu). */
const podstrom = async (id: number): Promise<{ potomkovia: Set<number>; vyska: number }> => {
  const vsetky = await MenuPolozka.findAll({ attributes: ['id', 'rodic_id'] });
  const potomkovia = new Set<number>();
  let vyska = 1;
  let uroven = [id];
  while (uroven.length > 0 && vyska <= MAX_UROVNI + 1) {
    const dalsia = vsetky.filter((p) => p.rodic_id !== null && uroven.includes(p.rodic_id) && !potomkovia.has(p.id)).map((p) => p.id);
    if (dalsia.length === 0) break;
    dalsia.forEach((d) => potomkovia.add(d));
    vyska++;
    uroven = dalsia;
  }
  return { potomkovia, vyska };
};

/** Kategória bez odkazu nemá zmysel bez odkazov pod ňou - na webe sa vynechá. */
const bezPrazdnychNadpisov = (uzly: any[]): any[] =>
  uzly
    .map((u) => ({ ...u, deti: bezPrazdnychNadpisov(u.deti ?? []) }))
    .filter((u) => u.typ !== 'nadpis' || u.deti.length > 0);

/**
 * GET /api/menu
 * Menu pre verejný web - vnorené, len aktívne položky.
 *
 * Položka, ktorá ukazuje na nepublikovanú stránku, sa vynecháva.
 * Inak by návštevník klikol na odkaz vedúci na chybovú stránku.
 */
export const getMenu = async (_req: Request, res: Response): Promise<void> => {
  try {
    const polozky = await nacitajPolozky(true);

    const pouzitelne = polozky
      .filter((p) => {
        if (p.typ === 'stranka') return p.stranka && p.stranka.publikovany;
        if (p.typ === 'rubrika') return Boolean(p.rubrika);
        if (p.typ === 'nadpis') return true;
        return Boolean(p.url);
      })
      .map((p) => p.toSafeJSON());

    res.json({
      success: true,
      data: bezPrazdnychNadpisov(doStromu(pouzitelne)),
    });
  } catch (error) {
    console.error('Chyba pri načítaní menu:', error);
    res.status(500).json({ success: false, message: 'Chyba servera pri načítaní menu' });
  }
};

/** GET /api/admin/menu - vrátane skrytých položiek a plochého zoznamu */
export const getMenuAdmin = async (_req: Request, res: Response): Promise<void> => {
  try {
    const polozky = await nacitajPolozky(false);
    const ploche = polozky.map((p) => p.toSafeJSON());

    res.json({
      success: true,
      data: { strom: doStromu(ploche), zoznam: ploche },
    });
  } catch (error) {
    console.error('Chyba pri načítaní menu:', error);
    res.status(500).json({ success: false, message: 'Chyba servera pri načítaní menu' });
  }
};

/** Pripraví údaje položky z tela požiadavky. */
const pripravPolozku = (telo: any) => {
  const udaje: Record<string, unknown> = {};

  if (telo.nazov !== undefined) udaje.nazov = sanitizePlainText(String(telo.nazov)).trim();
  if (telo.typ !== undefined) udaje.typ = telo.typ;
  if (telo.stranka_id !== undefined) udaje.stranka_id = telo.stranka_id || null;
  if (telo.rubrika_id !== undefined) udaje.rubrika_id = telo.rubrika_id || null;
  if (telo.url !== undefined) udaje.url = telo.url ? String(telo.url).trim() : null;
  if (telo.rodic_id !== undefined) udaje.rodic_id = telo.rodic_id || null;
  if (telo.poradie !== undefined) udaje.poradie = Number(telo.poradie) || 0;
  if (telo.otvorit_v_novom !== undefined) udaje.otvorit_v_novom = Boolean(telo.otvorit_v_novom);
  if (telo.aktivity !== undefined) udaje.aktivity = Boolean(telo.aktivity);
  if (telo.obrazok !== undefined) udaje.obrazok = telo.obrazok ? String(telo.obrazok).trim() : null;
  // Kategória (nadpis) nikam nevedie
  if (udaje.typ === 'nadpis') {
    udaje.stranka_id = null;
    udaje.rubrika_id = null;
    udaje.url = null;
    udaje.otvorit_v_novom = false;
  }

  return udaje;
};

/** POST /api/admin/menu */
export const createMenuPolozka = async (req: Request, res: Response): Promise<void> => {
  try {
    const udaje = pripravPolozku(req.body);

    if (!udaje.nazov) {
      res.status(400).json({ success: false, message: 'Názov položky je povinný' });
      return;
    }
    if (udaje.rodic_id) {
      const rodic = await MenuPolozka.findByPk(Number(udaje.rodic_id));
      if (!rodic) {
        res.status(400).json({ success: false, message: 'Nadradená položka neexistuje' });
        return;
      }
      if ((await urovenPolozky(rodic.id)) >= MAX_UROVNI) {
        res.status(400).json({ success: false, message: `Menu má najviac ${MAX_UROVNI} úrovne` });
        return;
      }
    }
    // Nová položka ide na koniec svojej úrovne
    if (udaje.poradie === undefined) {
      const posledne = (await MenuPolozka.max('poradie', { where: { rodic_id: (udaje.rodic_id as number) ?? null } })) as number | null;
      udaje.poradie = (posledne ?? 0) + 1;
    }

    const polozka = await MenuPolozka.create(udaje as any);

    res.status(201).json({
      success: true,
      data: polozka.toSafeJSON(),
      message: `Položka ${polozka.nazov} bola pridaná do menu`,
    });
  } catch (error: any) {
    if (error?.name === 'SequelizeValidationError') {
      const spravy = error.errors.map((e: any) => e.message);
      res.status(400).json({ success: false, message: spravy[0] || 'Neplatné údaje', errors: spravy });
      return;
    }
    if (error?.name === 'SequelizeForeignKeyConstraintError') {
      res.status(400).json({ success: false, message: 'Zvolená stránka alebo rubrika neexistuje' });
      return;
    }
    console.error('Chyba pri vytváraní položky menu:', error);
    res.status(500).json({ success: false, message: 'Chyba servera pri vytváraní položky' });
  }
};

/** PUT /api/admin/menu/:id */
export const updateMenuPolozka = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = overId(req.params.id);
    if (!id) {
      res.status(400).json({ success: false, message: 'ID položky musí byť kladné celé číslo' });
      return;
    }

    const polozka = await MenuPolozka.findByPk(id);
    if (!polozka) {
      res.status(404).json({ success: false, message: 'Položka menu nebola nájdená' });
      return;
    }

    const udaje = pripravPolozku(req.body);

    // Položka nesmie byť vlastným rodičom - vyrobilo by to slučku,
    // z ktorej by sa strom nedal poskladať
    if (udaje.rodic_id && Number(udaje.rodic_id) === id) {
      res.status(400).json({ success: false, message: 'Položka nemôže byť vnorená sama do seba' });
      return;
    }

    // Najviac tri úrovne: úroveň rodiča + výška podstromu presúvanej položky
    if (udaje.rodic_id) {
      const rodic = await MenuPolozka.findByPk(Number(udaje.rodic_id));
      if (!rodic) {
        res.status(400).json({ success: false, message: 'Nadradená položka neexistuje' });
        return;
      }
      const { potomkovia, vyska } = await podstrom(id);
      if (potomkovia.has(rodic.id)) {
        res.status(400).json({ success: false, message: 'Položka nemôže byť vnorená do vlastného podmenu' });
        return;
      }
      if ((await urovenPolozky(rodic.id)) + vyska > MAX_UROVNI) {
        res.status(400).json({ success: false, message: `Menu má najviac ${MAX_UROVNI} úrovne` });
        return;
      }
    }

    await polozka.update(udaje);

    res.json({
      success: true,
      data: polozka.toSafeJSON(),
      message: `Položka ${polozka.nazov} bola upravená`,
    });
  } catch (error: any) {
    if (error?.name === 'SequelizeValidationError') {
      const spravy = error.errors.map((e: any) => e.message);
      res.status(400).json({ success: false, message: spravy[0] || 'Neplatné údaje', errors: spravy });
      return;
    }
    if (error?.name === 'SequelizeForeignKeyConstraintError') {
      res.status(400).json({ success: false, message: 'Zvolená stránka alebo rubrika neexistuje' });
      return;
    }
    console.error('Chyba pri úprave položky menu:', error);
    res.status(500).json({ success: false, message: 'Chyba servera pri úprave položky' });
  }
};

/**
 * PATCH /api/admin/menu/reorder
 * Uloží nové poradie a vnorenie naraz.
 *
 * Telo: { "poradie": [ { "id": 3, "poradie": 1, "rodic_id": null }, ... ] }
 */
export const reorderMenu = async (req: Request, res: Response): Promise<void> => {
  try {
    const zoznam = req.body.poradie;

    if (!Array.isArray(zoznam) || zoznam.length === 0) {
      res.status(400).json({ success: false, message: 'Uveďte pole „poradie" so zoznamom položiek' });
      return;
    }

    // Načítame skutočné riadky a upravujeme inštancie.
    //
    // MenuPolozka.update() s čiastočným telom si postaví prázdnu
    // inštanciu, v ktorej má "typ" predvolenú hodnotu 'stranka'
    // a stranka_id je null - validátor maCiel na nej potom spadne,
    // hoci uložený riadok je v poriadku.
    const idcka = zoznam
      .map((p: any) => Number(p.id))
      .filter((id: number) => Number.isInteger(id) && id > 0);

    if (idcka.length === 0) {
      res.status(400).json({ success: false, message: 'Žiadne platné ID položky' });
      return;
    }

    const instancie = await MenuPolozka.findAll({ where: { id: idcka } });
    const podlaId = new Map(instancie.map((i) => [i.id, i]));

    for (const polozka of zoznam) {
      const id = Number(polozka.id);
      const instancia = podlaId.get(id);
      if (!instancia) continue;

      // Vlastný rodič by vyrobil slučku, z ktorej sa strom nedá poskladať
      const rodic = polozka.rodic_id && Number(polozka.rodic_id) !== id
        ? Number(polozka.rodic_id)
        : null;

      await instancia.update({ poradie: Number(polozka.poradie) || 0, rodic_id: rodic });
    }

    const polozky = await nacitajPolozky(false);

    res.json({
      success: true,
      data: doStromu(polozky.map((p) => p.toSafeJSON())),
      message: 'Poradie menu bolo uložené',
    });
  } catch (error) {
    console.error('Chyba pri ukladaní poradia menu:', error);
    res.status(500).json({ success: false, message: 'Chyba servera pri ukladaní poradia' });
  }
};

/** DELETE /api/admin/menu/:id - vnorené položky idú s ňou */
export const deleteMenuPolozka = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = overId(req.params.id);
    if (!id) {
      res.status(400).json({ success: false, message: 'ID položky musí byť kladné celé číslo' });
      return;
    }

    const polozka = await MenuPolozka.findByPk(id);
    if (!polozka) {
      res.status(404).json({ success: false, message: 'Položka menu nebola nájdená' });
      return;
    }

    const nazov = polozka.nazov;
    await polozka.destroy();

    res.json({ success: true, message: `Položka ${nazov} bola odstránená z menu` });
  } catch (error) {
    console.error('Chyba pri mazaní položky menu:', error);
    res.status(500).json({ success: false, message: 'Chyba servera pri mazaní položky' });
  }
};

// ===== PRESMEROVANIA =====

/** GET /api/admin/redirects */
export const getPresmerovania = async (_req: Request, res: Response): Promise<void> => {
  try {
    const zoznam = await Presmerovanie.findAll({
      order: [['pocet_pouziti', 'DESC'], ['id', 'DESC']],
    });

    res.json({
      success: true,
      data: zoznam.map((p) => p.toSafeJSON()),
    });
  } catch (error) {
    console.error('Chyba pri načítaní presmerovaní:', error);
    res.status(500).json({ success: false, message: 'Chyba servera pri načítaní presmerovaní' });
  }
};

/** POST /api/admin/redirects */
export const createPresmerovanie = async (req: Request, res: Response): Promise<void> => {
  try {
    const stary = req.body.stary_odkaz ? Presmerovanie.normalizuj(String(req.body.stary_odkaz)) : '';
    const novy = req.body.novy_odkaz ? Presmerovanie.normalizuj(String(req.body.novy_odkaz)) : '';

    if (!stary || !novy) {
      res.status(400).json({ success: false, message: 'Starý aj nový odkaz sú povinné' });
      return;
    }
    const chybaStareho = overStaryOdkaz(stary);
    if (chybaStareho) {
      res.status(400).json({ success: false, message: chybaStareho });
      return;
    }

    const existujuce = await Presmerovanie.findOne({ where: { stary_odkaz: stary } });
    if (existujuce) {
      res.status(409).json({
        success: false,
        message: `Presmerovanie pre ${stary} už existuje (vedie na ${existujuce.novy_odkaz})`,
      });
      return;
    }

    const presmerovanie = await Presmerovanie.create({
      stary_odkaz: stary,
      novy_odkaz: novy,
      kod: Number(req.body.kod) || 301,
      poznamka: req.body.poznamka ? sanitizePlainText(String(req.body.poznamka)).slice(0, 255) : null,
    });

    res.status(201).json({
      success: true,
      data: presmerovanie.toSafeJSON(),
      message: `Presmerovanie ${stary} → ${novy} bolo vytvorené`,
    });
  } catch (error: any) {
    if (error?.name === 'SequelizeValidationError') {
      const spravy = error.errors.map((e: any) => e.message);
      res.status(400).json({ success: false, message: spravy[0] || 'Neplatné údaje', errors: spravy });
      return;
    }
    if (error?.name === 'SequelizeForeignKeyConstraintError') {
      res.status(400).json({ success: false, message: 'Zvolená stránka alebo rubrika neexistuje' });
      return;
    }
    console.error('Chyba pri vytváraní presmerovania:', error);
    res.status(500).json({ success: false, message: 'Chyba servera pri vytváraní presmerovania' });
  }
};

/** PUT /api/admin/redirects/:id */
export const updatePresmerovanie = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = overId(req.params.id);
    if (!id) {
      res.status(400).json({ success: false, message: 'ID musí byť kladné celé číslo' });
      return;
    }

    const presmerovanie = await Presmerovanie.findByPk(id);
    if (!presmerovanie) {
      res.status(404).json({ success: false, message: 'Presmerovanie nebolo nájdené' });
      return;
    }

    const udaje: any = {};
    if (req.body.stary_odkaz !== undefined) {
      udaje.stary_odkaz = Presmerovanie.normalizuj(String(req.body.stary_odkaz));
      const chybaStareho = overStaryOdkaz(udaje.stary_odkaz as string);
      if (chybaStareho) {
        res.status(400).json({ success: false, message: chybaStareho });
        return;
      }
    }
    if (req.body.novy_odkaz !== undefined) {
      udaje.novy_odkaz = Presmerovanie.normalizuj(String(req.body.novy_odkaz));
    }
    if (req.body.kod !== undefined) udaje.kod = Number(req.body.kod);
    if (req.body.aktivity !== undefined) udaje.aktivity = Boolean(req.body.aktivity);
    if (req.body.poznamka !== undefined) {
      udaje.poznamka = req.body.poznamka
        ? sanitizePlainText(String(req.body.poznamka)).slice(0, 255)
        : null;
    }

    await presmerovanie.update(udaje);

    res.json({
      success: true,
      data: presmerovanie.toSafeJSON(),
      message: 'Presmerovanie bolo upravené',
    });
  } catch (error: any) {
    if (error?.name === 'SequelizeValidationError' || error?.name === 'SequelizeUniqueConstraintError') {
      res.status(400).json({
        success: false,
        message: 'Neplatné údaje',
        errors: error.errors.map((e: any) => e.message),
      });
      return;
    }
    console.error('Chyba pri úprave presmerovania:', error);
    res.status(500).json({ success: false, message: 'Chyba servera pri úprave presmerovania' });
  }
};

/** DELETE /api/admin/redirects/:id */
export const deletePresmerovanie = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = overId(req.params.id);
    if (!id) {
      res.status(400).json({ success: false, message: 'ID musí byť kladné celé číslo' });
      return;
    }

    const presmerovanie = await Presmerovanie.findByPk(id);
    if (!presmerovanie) {
      res.status(404).json({ success: false, message: 'Presmerovanie nebolo nájdené' });
      return;
    }

    const popis = `${presmerovanie.stary_odkaz} → ${presmerovanie.novy_odkaz}`;
    await presmerovanie.destroy();

    res.json({ success: true, message: `Presmerovanie ${popis} bolo zmazané` });
  } catch (error) {
    console.error('Chyba pri mazaní presmerovania:', error);
    res.status(500).json({ success: false, message: 'Chyba servera pri mazaní presmerovania' });
  }
};
