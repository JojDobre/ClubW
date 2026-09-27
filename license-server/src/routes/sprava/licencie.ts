// Umiestnenie: license-server/src/routes/sprava/licencie.ts
// Správa licencií v administrácii.

import { Router, Request } from 'express';
import { Op, WhereOptions } from 'sequelize';
import Licencia from '../../models/Licencia';
import { Administrator, NEUKONCENE_STAVY, Prikaz, Produkt, Udalost, Verzia, zaznamenaj } from '../../models/sprava';
import { vygenerujLicencnyKluc } from '../../utils/podpis';
import { ChybaPrikazu, ONLINE_MS, cielovaVerzia, doAdministracie, vytvorPrikazAktualizacie } from '../../sluzby/licencie';
import { a, ChybaVstupu, cislo, datum, domena, email, ip, strankovanie, text, zoznamTextov } from './pomocky';

const router = Router();

const DEN = 24 * 60 * 60 * 1000;

/** Filtre zoznamu licencií z parametrov adresy. */
const filtre = (req: Request): WhereOptions => {
  const kde: any = {};
  const teraz = new Date();
  if (req.query.produkt_id) kde.produkt_id = Number(req.query.produkt_id);
  if (req.query.plan) kde.plan = String(req.query.plan);
  if (req.query.verzia) kde.nainstalovana_verzia = String(req.query.verzia);
  switch (req.query.stav) {
    case 'aktivna':
      Object.assign(kde, { stav: 'aktivna', platna_do: { [Op.gte]: teraz } });
      break;
    case 'vyprsana':
      Object.assign(kde, { stav: 'aktivna', platna_do: { [Op.lt]: teraz } });
      break;
    case 'vyprsi':
      Object.assign(kde, { stav: 'aktivna', platna_do: { [Op.between]: [teraz, new Date(Date.now() + 30 * DEN)] } });
      break;
    case 'pozastavena':
    case 'zrusena':
      kde.stav = req.query.stav;
      break;
    case 'online':
      kde.posledna_kontrola = { [Op.gte]: new Date(Date.now() - ONLINE_MS) };
      break;
    case 'offline':
      kde[Op.or as any] = [{ posledna_kontrola: null }, { posledna_kontrola: { [Op.lt]: new Date(Date.now() - ONLINE_MS) } }];
      break;
  }
  const hladat = typeof req.query.hladat === 'string' ? req.query.hladat.trim().slice(0, 100) : '';
  if (hladat) {
    const vzor = `%${hladat.replace(/[%_\\]/g, (z) => `\\${z}`)}%`;
    kde[Op.and as any] = [
      ...(kde[Op.and as any] ?? []),
      { [Op.or]: ['kluc', 'nazov_klienta', 'email_klienta', 'domena', 'poznamka'].map((pole) => ({ [pole]: { [Op.iLike]: vzor } })) },
    ];
  }
  return kde;
};

const PORADIA: Record<string, [string, 'ASC' | 'DESC']> = {
  platnost: ['platna_do', 'ASC'],
  nazov: ['nazov_klienta', 'ASC'],
  kontakt: ['posledna_kontrola', 'DESC'],
  vytvorenie: ['vytvoreny', 'DESC'],
};

router.get(
  '/licencie',
  a(async (req, res) => {
    const { limit, offset, strana } = strankovanie(req);
    const poradie = PORADIA[String(req.query.poradie)] ?? PORADIA.vytvorenie;
    const { rows, count } = await Licencia.findAndCountAll({
      where: filtre(req),
      include: [{ model: Produkt, as: 'produkt', attributes: ['id', 'kod', 'nazov'] }],
      order: [[poradie[0], `${poradie[1]} NULLS LAST` as any], ['id', 'DESC']],
      limit,
      offset,
    });
    res.json({ success: true, data: rows.map(doAdministracie), strankovanie: { celkom: count, strana, stran: Math.max(1, Math.ceil(count / limit)) } });
  })
);

/** Export licencií do CSV (rovnaké filtre ako zoznam). */
router.get(
  '/licencie/export.csv',
  a(async (req, res) => {
    const licencie = await Licencia.findAll({ where: filtre(req), include: [{ model: Produkt, as: 'produkt', attributes: ['kod'] }], order: [['vytvoreny', 'DESC']], limit: 10000 });
    const bunka = (v: unknown) => {
      const s = v === null || v === undefined ? '' : v instanceof Date ? v.toISOString() : String(v);
      // Ochrana pred vzorcami v Exceli (=, +, -, @ na začiatku bunky)
      const bezpecny = /^[=+\-@]/.test(s) ? `'${s}` : s;
      return `"${bezpecny.replace(/"/g, '""')}"`;
    };
    const hlavicka = ['Kľúč', 'Produkt', 'Klient', 'E-mail', 'Doména', 'Plán', 'Stav', 'Platná od', 'Platná do', 'Verzia', 'Posledný kontakt', 'Poznámka'];
    const riadky = licencie.map((l) => {
      const d = doAdministracie(l) as any;
      return [l.kluc, d.produkt?.kod, l.nazov_klienta, l.email_klienta, l.domena, l.plan, d.vypocitany_stav, l.platna_od, l.platna_do, l.nainstalovana_verzia, l.posledna_kontrola, l.poznamka].map(bunka).join(';');
    });
    await zaznamenaj({ typ: 'export', popis: `Export ${licencie.length} licencií do CSV`, administrator_id: req.admin!.id, ip: ip(req) });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="licencie-${new Date().toISOString().slice(0, 10)}.csv"`);
    res.send(`﻿${[hlavicka.map(bunka).join(';'), ...riadky].join('\r\n')}`);
  })
);

const nacitajLicenciu = async (id: unknown) => {
  const licencia = await Licencia.findByPk(Number(id));
  if (!licencia) throw new ChybaVstupu('Licencia nenájdená', 404);
  return licencia;
};

router.get(
  '/licencie/:id',
  a(async (req, res) => {
    const licencia = await Licencia.findByPk(Number(req.params.id), {
      include: [
        { model: Produkt, as: 'produkt' },
        { model: Verzia, as: 'pripnuta_verzia' },
      ],
    });
    if (!licencia) throw new ChybaVstupu('Licencia nenájdená', 404);
    const [prikazy, udalosti, ciel] = await Promise.all([
      Prikaz.findAll({
        where: { licencia_id: licencia.id },
        include: [
          { model: Verzia, as: 'verzia', attributes: ['id', 'verzia', 'tag'] },
          { model: Administrator, as: 'vytvoril', attributes: ['id', 'meno'] },
        ],
        order: [['vytvoreny', 'DESC']],
        limit: 20,
      }),
      Udalost.findAll({
        where: { licencia_id: licencia.id },
        include: [{ model: Administrator, as: 'administrator', attributes: ['id', 'meno'] }],
        order: [['vytvorena', 'DESC']],
        limit: 50,
      }),
      cielovaVerzia(licencia),
    ]);
    res.json({
      success: true,
      data: {
        ...doAdministracie(licencia),
        cielova_verzia: ciel ? { id: ciel.verzia.id, verzia: ciel.verzia.verzia, balik_stav: ciel.verzia.balik_stav } : null,
        prikazy,
        udalosti,
      },
    });
  })
);

/** Overí plán a vráti jeho predvolené funkcie a dĺžku. */
const planProduktu = (produkt: Produkt, plan: unknown) => {
  const kod = text(plan, 40, 'Plán', true)!;
  const najdeny = (produkt.plany ?? []).find((p) => p.kod === kod);
  if ((produkt.plany ?? []).length > 0 && !najdeny) throw new ChybaVstupu(`Produkt ${produkt.nazov} nemá plán ${kod}`);
  return { kod, mesiacov: najdeny?.mesiacov ?? 12, funkcie: najdeny?.funkcie ?? [] };
};

const overPripnutuVerziu = async (hodnota: unknown, produktId: number): Promise<number | null> => {
  if (hodnota === undefined || hodnota === null || hodnota === '') return null;
  const verzia = await Verzia.findByPk(Number(hodnota));
  if (!verzia || verzia.produkt_id !== produktId) throw new ChybaVstupu('Pripnutá verzia nepatrí produktu licencie');
  return verzia.id;
};

router.post(
  '/licencie',
  a(async (req, res) => {
    const produkt = await Produkt.findByPk(Number(req.body.produkt_id));
    if (!produkt) throw new ChybaVstupu('Vyberte produkt');
    const plan = planProduktu(produkt, req.body.plan);
    const platnaOd = datum(req.body.platna_od, 'Začiatok platnosti') ?? new Date();
    let platnaDo = datum(req.body.platna_do, 'Koniec platnosti');
    if (!platnaDo) {
      platnaDo = new Date(platnaOd);
      platnaDo.setMonth(platnaDo.getMonth() + plan.mesiacov);
    }
    if (platnaDo <= platnaOd) throw new ChybaVstupu('Koniec platnosti musí byť po jej začiatku');

    const licencia = await Licencia.create({
      kluc: vygenerujLicencnyKluc(),
      produkt_id: produkt.id,
      nazov_klienta: text(req.body.nazov_klienta, 200, 'Názov klienta', true)!,
      email_klienta: email(req.body.email_klienta, 'E-mail klienta'),
      domena: domena(req.body.domena),
      plan: plan.kod,
      funkcie: req.body.funkcie !== undefined ? zoznamTextov(req.body.funkcie, 'Funkcie') : plan.funkcie,
      platna_od: platnaOd,
      platna_do: platnaDo,
      poznamka: text(req.body.poznamka, 5000, 'Poznámka'),
      automaticke_aktualizacie: req.body.automaticke_aktualizacie === true,
      pripnuta_verzia_id: await overPripnutuVerziu(req.body.pripnuta_verzia_id, produkt.id),
    });
    await zaznamenaj({
      typ: 'licencia_vytvorena',
      popis: `Nová licencia ${licencia.kluc} pre ${licencia.nazov_klienta} (${produkt.nazov}, ${plan.kod})`,
      administrator_id: req.admin!.id,
      licencia_id: licencia.id,
      produkt_id: produkt.id,
      ip: ip(req),
    });
    res.status(201).json({ success: true, data: doAdministracie(licencia), message: 'Licencia bola vytvorená' });
  })
);

router.put(
  '/licencie/:id',
  a(async (req, res) => {
    const licencia = await nacitajLicenciu(req.params.id);
    const produkt = (await Produkt.findByPk(licencia.produkt_id))!;
    const b = req.body;
    const zmeny: Record<string, unknown> = {};
    if (b.nazov_klienta !== undefined) zmeny.nazov_klienta = text(b.nazov_klienta, 200, 'Názov klienta', true);
    if (b.email_klienta !== undefined) zmeny.email_klienta = email(b.email_klienta, 'E-mail klienta');
    if (b.domena !== undefined) zmeny.domena = domena(b.domena);
    if (b.plan !== undefined) zmeny.plan = planProduktu(produkt, b.plan).kod;
    if (b.funkcie !== undefined) zmeny.funkcie = zoznamTextov(b.funkcie, 'Funkcie');
    if (b.poznamka !== undefined) zmeny.poznamka = text(b.poznamka, 5000, 'Poznámka');
    if (b.platna_od !== undefined) zmeny.platna_od = datum(b.platna_od, 'Začiatok platnosti') ?? licencia.platna_od;
    if (b.platna_do !== undefined) zmeny.platna_do = datum(b.platna_do, 'Koniec platnosti') ?? licencia.platna_do;
    if (b.automaticke_aktualizacie !== undefined) zmeny.automaticke_aktualizacie = b.automaticke_aktualizacie === true;
    if (b.pripnuta_verzia_id !== undefined) zmeny.pripnuta_verzia_id = await overPripnutuVerziu(b.pripnuta_verzia_id, produkt.id);
    const od = (zmeny.platna_od as Date) ?? licencia.platna_od;
    const doKedy = (zmeny.platna_do as Date) ?? licencia.platna_do;
    if (new Date(doKedy) <= new Date(od)) throw new ChybaVstupu('Koniec platnosti musí byť po jej začiatku');

    // Do záznamu len skutočne zmenené polia (pred → po)
    const rozdiel: Record<string, { pred: unknown; po: unknown }> = {};
    for (const [pole, hodnota] of Object.entries(zmeny)) {
      const pred = (licencia as any)[pole];
      if (JSON.stringify(pred) !== JSON.stringify(hodnota)) rozdiel[pole] = { pred, po: hodnota };
    }
    await licencia.update(zmeny);
    if (Object.keys(rozdiel).length) {
      await zaznamenaj({
        typ: 'licencia_upravena',
        popis: `Úprava licencie ${licencia.nazov_klienta}: ${Object.keys(rozdiel).join(', ')}`,
        administrator_id: req.admin!.id,
        licencia_id: licencia.id,
        produkt_id: licencia.produkt_id,
        detaily: rozdiel,
        ip: ip(req),
      });
    }
    res.json({ success: true, data: doAdministracie(licencia), message: 'Licencia bola uložená' });
  })
);

/** Zmena stavu: pozastaviť, obnoviť, zrušiť. */
const zmenaStavu = (novy: 'aktivna' | 'pozastavena' | 'zrusena', popis: string, typ: string) =>
  a(async (req, res) => {
    const licencia = await nacitajLicenciu(req.params.id);
    if (licencia.stav === novy) throw new ChybaVstupu(`Licencia už je v stave ${novy}`);
    const dovod = text(req.body?.dovod, 500, 'Dôvod');
    await licencia.update({ stav: novy });
    // Zrušená licencia už aktualizácie nestiahne
    if (novy === 'zrusena') {
      await Prikaz.update({ stav: 'zruseny', dokonceny: new Date(), sprava: 'Licencia bola zrušená' }, { where: { licencia_id: licencia.id, stav: { [Op.in]: NEUKONCENE_STAVY } } });
    }
    await zaznamenaj({
      typ,
      popis: `${popis}: ${licencia.nazov_klienta}${dovod ? ` (${dovod})` : ''}`,
      administrator_id: req.admin!.id,
      licencia_id: licencia.id,
      produkt_id: licencia.produkt_id,
      ip: ip(req),
    });
    res.json({ success: true, data: doAdministracie(licencia), message: `${popis}` });
  });

router.post('/licencie/:id/pozastavit', zmenaStavu('pozastavena', 'Licencia pozastavená', 'licencia_pozastavena'));
router.post('/licencie/:id/obnovit', zmenaStavu('aktivna', 'Licencia obnovená', 'licencia_obnovena'));
router.post('/licencie/:id/zrusit', zmenaStavu('zrusena', 'Licencia zrušená', 'licencia_zrusena'));

router.post(
  '/licencie/:id/predlzit',
  a(async (req, res) => {
    const licencia = await nacitajLicenciu(req.params.id);
    const mesiacov = cislo(req.body.mesiacov, 'Počet mesiacov', 1, 120);
    // Predĺženie od konca platnosti; vypršaná licencia sa predlžuje od dnes
    const od = new Date(Math.max(new Date(licencia.platna_do).getTime(), Date.now()));
    const nova = new Date(od);
    nova.setMonth(nova.getMonth() + mesiacov);
    const predosla = licencia.platna_do;
    await licencia.update({ platna_do: nova });
    await zaznamenaj({
      typ: 'licencia_predlzena',
      popis: `Licencia ${licencia.nazov_klienta} predĺžená o ${mesiacov} mes. (do ${nova.toISOString().slice(0, 10)})`,
      administrator_id: req.admin!.id,
      licencia_id: licencia.id,
      produkt_id: licencia.produkt_id,
      detaily: { pred: predosla, po: nova },
      ip: ip(req),
    });
    res.json({ success: true, data: doAdministracie(licencia), message: 'Licencia bola predĺžená' });
  })
);

/** Nový kľúč - starý prestane platiť (napr. pri úniku kľúča). */
router.post(
  '/licencie/:id/novy-kluc',
  a(async (req, res) => {
    const licencia = await nacitajLicenciu(req.params.id);
    const stary = licencia.kluc;
    await licencia.update({ kluc: vygenerujLicencnyKluc() });
    await zaznamenaj({
      typ: 'licencia_novy_kluc',
      popis: `Nový kľúč pre ${licencia.nazov_klienta} (starý ${stary.slice(0, 11)}… prestal platiť)`,
      administrator_id: req.admin!.id,
      licencia_id: licencia.id,
      produkt_id: licencia.produkt_id,
      ip: ip(req),
    });
    res.json({ success: true, data: doAdministracie(licencia), message: 'Kľúč bol vymenený - klient musí zadať nový kľúč do svojho webu' });
  })
);

/** Zmazať sa dá len licencia, ktorú žiadna inštalácia ešte nepoužila. */
router.delete(
  '/licencie/:id',
  a(async (req, res) => {
    const licencia = await nacitajLicenciu(req.params.id);
    if (licencia.pocet_kontrol > 0) throw new ChybaVstupu('Licenciu už inštalácia použila - namiesto zmazania ju zrušte', 409);
    await zaznamenaj({ typ: 'licencia_zmazana', popis: `Zmazaná nepoužitá licencia ${licencia.kluc} (${licencia.nazov_klienta})`, administrator_id: req.admin!.id, produkt_id: licencia.produkt_id, ip: ip(req) });
    await licencia.destroy();
    res.json({ success: true, message: 'Licencia bola zmazaná' });
  })
);

/** Aktualizovať inštaláciu na cieľovú (alebo zvolenú) verziu. */
router.post(
  '/licencie/:id/aktualizovat',
  a(async (req, res) => {
    const licencia = await nacitajLicenciu(req.params.id);
    const verzia = req.body?.verzia_id ? await Verzia.findByPk(Number(req.body.verzia_id)) : (await cielovaVerzia(licencia))?.verzia;
    if (!verzia) throw new ChybaVstupu('Produkt nemá nastavenú aktuálnu verziu');
    try {
      const prikaz = await vytvorPrikazAktualizacie(licencia, verzia, { administrator_id: req.admin!.id, ip: ip(req) });
      res.status(201).json({ success: true, data: prikaz, message: `Inštalácia dostane aktualizáciu na ${verzia.verzia} pri najbližšom overení licencie` });
    } catch (chyba) {
      if (chyba instanceof ChybaPrikazu) throw new ChybaVstupu(chyba.message, 409);
      throw chyba;
    }
  })
);

export default router;
