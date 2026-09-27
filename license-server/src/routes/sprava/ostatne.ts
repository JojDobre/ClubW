// Umiestnenie: license-server/src/routes/sprava/ostatne.ts
// Prehľad, príkazy (aktualizácie), záznam udalostí a administrátori.

import { Router } from 'express';
import { Op, fn, col } from 'sequelize';
import Licencia from '../../models/Licencia';
import { Administrator, NEUKONCENE_STAVY, Prikaz, Produkt, Udalost, Verzia, zaznamenaj } from '../../models/sprava';
import { chybaHesla, zahasujHeslo } from '../../utils/heslo';
import { zrusVsetkyRelacie } from '../../middleware/prihlasenie';
import { ONLINE_MS, doAdministracie } from '../../sluzby/licencie';
import { a, ChybaVstupu, email, ip, strankovanie, text } from './pomocky';

const router = Router();
const DEN = 24 * 60 * 60 * 1000;

// ===== Prehľad =====

router.get(
  '/prehlad',
  a(async (_req, res) => {
    const teraz = new Date();
    const o30 = new Date(Date.now() + 30 * DEN);
    const [aktivne, vyprsane, pozastavene, zrusene, vyprsia, online, spolu] = await Promise.all([
      Licencia.count({ where: { stav: 'aktivna', platna_do: { [Op.gte]: teraz } } }),
      Licencia.count({ where: { stav: 'aktivna', platna_do: { [Op.lt]: teraz } } }),
      Licencia.count({ where: { stav: 'pozastavena' } }),
      Licencia.count({ where: { stav: 'zrusena' } }),
      Licencia.count({ where: { stav: 'aktivna', platna_do: { [Op.between]: [teraz, o30] } } }),
      Licencia.count({ where: { posledna_kontrola: { [Op.gte]: new Date(Date.now() - ONLINE_MS) } } }),
      Licencia.count(),
    ]);
    const [prikazy, coskoroVyprsia, udalosti, produkty, verzie] = await Promise.all([
      Prikaz.findAll({ attributes: ['stav', [fn('COUNT', col('id')), 'pocet']], group: ['stav'], raw: true }) as unknown as Promise<Array<{ stav: string; pocet: string }>>,
      Licencia.findAll({
        where: { stav: 'aktivna', platna_do: { [Op.between]: [teraz, o30] } },
        include: [{ model: Produkt, as: 'produkt', attributes: ['id', 'nazov'] }],
        order: [['platna_do', 'ASC']],
        limit: 8,
      }),
      Udalost.findAll({ include: [{ model: Administrator, as: 'administrator', attributes: ['id', 'meno'] }], order: [['vytvorena', 'DESC']], limit: 12 }),
      Produkt.findAll({ include: [{ model: Verzia, as: 'aktualna_verzia' }], order: [['nazov', 'ASC']] }),
      Licencia.findAll({
        where: { posledna_kontrola: { [Op.gte]: new Date(Date.now() - 30 * DEN) } },
        attributes: ['produkt_id', 'nainstalovana_verzia', [fn('COUNT', col('id')), 'pocet']],
        group: ['produkt_id', 'nainstalovana_verzia'],
        raw: true,
      }) as unknown as Promise<Array<{ produkt_id: number; nainstalovana_verzia: string | null; pocet: string }>>,
    ]);
    res.json({
      success: true,
      data: {
        licencie: { spolu, aktivne, vyprsane, pozastavene, zrusene, vyprsia, online },
        prikazy: Object.fromEntries(prikazy.map((p) => [p.stav, Number(p.pocet)])),
        coskoro_vyprsia: coskoroVyprsia.map(doAdministracie),
        udalosti,
        produkty: produkty.map((p) => ({
          id: p.id,
          nazov: p.nazov,
          kod: p.kod,
          aktualna_verzia: p.aktualna_verzia ? { id: p.aktualna_verzia.id, verzia: p.aktualna_verzia.verzia, balik_stav: p.aktualna_verzia.balik_stav } : null,
          verzie: verzie.filter((v) => v.produkt_id === p.id).map((v) => ({ verzia: v.nainstalovana_verzia, pocet: Number(v.pocet) })),
        })),
      },
    });
  })
);

// ===== Príkazy =====

router.get(
  '/prikazy',
  a(async (req, res) => {
    const { limit, offset, strana } = strankovanie(req);
    const kde: any = {};
    if (req.query.stav === 'neukoncene') kde.stav = { [Op.in]: NEUKONCENE_STAVY };
    else if (req.query.stav) kde.stav = String(req.query.stav);
    if (req.query.licencia_id) kde.licencia_id = Number(req.query.licencia_id);
    const licenciaKde = req.query.produkt_id ? { produkt_id: Number(req.query.produkt_id) } : undefined;
    const { rows, count } = await Prikaz.findAndCountAll({
      where: kde,
      include: [
        { model: Licencia, as: 'licencia', attributes: ['id', 'nazov_klienta', 'domena', 'nainstalovana_verzia', 'produkt_id'], where: licenciaKde },
        { model: Verzia, as: 'verzia', attributes: ['id', 'verzia', 'tag'] },
        { model: Administrator, as: 'vytvoril', attributes: ['id', 'meno'] },
      ],
      order: [['vytvoreny', 'DESC']],
      limit,
      offset,
    });
    res.json({ success: true, data: rows, strankovanie: { celkom: count, strana, stran: Math.max(1, Math.ceil(count / limit)) } });
  })
);

router.post(
  '/prikazy/:id/zrusit',
  a(async (req, res) => {
    const prikaz = await Prikaz.findByPk(Number(req.params.id), { include: [{ model: Licencia, as: 'licencia' }, { model: Verzia, as: 'verzia' }] });
    if (!prikaz) throw new ChybaVstupu('Príkaz nenájdený', 404);
    if (!NEUKONCENE_STAVY.includes(prikaz.stav)) throw new ChybaVstupu('Príkaz je už ukončený', 409);
    await prikaz.update({ stav: 'zruseny', dokonceny: new Date(), sprava: `Zrušil ${req.admin!.meno}` });
    await zaznamenaj({
      typ: 'aktualizacia_zrusena',
      popis: `Zrušená aktualizácia na ${prikaz.verzia?.verzia ?? '?'} - ${prikaz.licencia?.nazov_klienta ?? ''}`,
      administrator_id: req.admin!.id,
      licencia_id: prikaz.licencia_id,
      produkt_id: prikaz.licencia?.produkt_id ?? null,
      ip: ip(req),
    });
    res.json({ success: true, data: prikaz, message: 'Aktualizácia bola zrušená' });
  })
);

// ===== Udalosti =====

router.get(
  '/udalosti',
  a(async (req, res) => {
    const { limit, offset, strana } = strankovanie(req, 100);
    const kde: any = {};
    if (req.query.typ) kde.typ = String(req.query.typ);
    if (req.query.licencia_id) kde.licencia_id = Number(req.query.licencia_id);
    if (req.query.produkt_id) kde.produkt_id = Number(req.query.produkt_id);
    if (req.query.administrator_id) kde.administrator_id = Number(req.query.administrator_id);
    const hladat = typeof req.query.hladat === 'string' ? req.query.hladat.trim().slice(0, 100) : '';
    if (hladat) kde.popis = { [Op.iLike]: `%${hladat.replace(/[%_\\]/g, (z) => `\\${z}`)}%` };
    const { rows, count } = await Udalost.findAndCountAll({
      where: kde,
      include: [
        { model: Administrator, as: 'administrator', attributes: ['id', 'meno'] },
        { model: Licencia, as: 'licencia', attributes: ['id', 'nazov_klienta'] },
      ],
      order: [['vytvorena', 'DESC']],
      limit,
      offset,
    });
    const typy = (await Udalost.findAll({ attributes: [[fn('DISTINCT', col('typ')), 'typ']], raw: true })) as unknown as Array<{ typ: string }>;
    res.json({ success: true, data: rows, typy: typy.map((t) => t.typ).sort(), strankovanie: { celkom: count, strana, stran: Math.max(1, Math.ceil(count / limit)) } });
  })
);

// ===== Administrátori =====

router.get(
  '/administratori',
  a(async (_req, res) => {
    const admini = await Administrator.findAll({ order: [['meno', 'ASC']] });
    res.json({ success: true, data: admini.map((x) => x.verejne()) });
  })
);

router.post(
  '/administratori',
  a(async (req, res) => {
    const e = email(req.body.email);
    if (await Administrator.findOne({ where: { email: e } })) throw new ChybaVstupu('Administrátor s týmto e-mailom už existuje', 409);
    const chyba = chybaHesla(req.body.heslo);
    if (chyba) throw new ChybaVstupu(chyba);
    const admin = await Administrator.create({ email: e, meno: text(req.body.meno, 120, 'Meno', true), heslo_hash: await zahasujHeslo(req.body.heslo) });
    await zaznamenaj({ typ: 'administrator_vytvoreny', popis: `Nový administrátor ${admin.meno} (${admin.email})`, administrator_id: req.admin!.id, ip: ip(req) });
    res.status(201).json({ success: true, data: admin.verejne(), message: 'Administrátor bol vytvorený' });
  })
);

router.put(
  '/administratori/:id',
  a(async (req, res) => {
    const admin = await Administrator.findByPk(Number(req.params.id));
    if (!admin) throw new ChybaVstupu('Administrátor nenájdený', 404);
    const zmeny: Record<string, unknown> = {};
    if (req.body.meno !== undefined) zmeny.meno = text(req.body.meno, 120, 'Meno', true);
    if (req.body.aktivny !== undefined) {
      if (admin.id === req.admin!.id && req.body.aktivny === false) throw new ChybaVstupu('Seba nemôžete deaktivovať');
      zmeny.aktivny = req.body.aktivny === true;
    }
    if (req.body.heslo !== undefined) {
      const chyba = chybaHesla(req.body.heslo);
      if (chyba) throw new ChybaVstupu(chyba);
      zmeny.heslo_hash = await zahasujHeslo(req.body.heslo);
    }
    if (req.body.vypnut_2fa === true) Object.assign(zmeny, { totp_aktivne: false, totp_tajomstvo: null });
    await admin.update(zmeny);
    // Deaktivovaný administrátor alebo nové heslo = odhlásiť zo všetkých zariadení
    if (zmeny.aktivny === false || zmeny.heslo_hash) await zrusVsetkyRelacie(admin.id);
    await zaznamenaj({
      typ: 'administrator_upraveny',
      popis: `Úprava administrátora ${admin.meno}: ${Object.keys(zmeny).map((k) => (k === 'heslo_hash' ? 'heslo' : k)).join(', ')}`,
      administrator_id: req.admin!.id,
      ip: ip(req),
    });
    res.json({ success: true, data: admin.verejne(), message: 'Administrátor bol uložený' });
  })
);

export default router;
