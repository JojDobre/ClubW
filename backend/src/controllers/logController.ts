// Umiestnenie: backend/src/controllers/logController.ts
//
// PREHĽAD LOGOV
//
// Požiadavka: „Logs - všetky udalosti, možnosť filtrovať". Doteraz
// existoval len úzky endpoint /api/admin/gdpr/audit, ktorý vracal
// záznamy bez možnosti filtrovania.

import { Request, Response } from 'express';
import { Op } from 'sequelize';
import AuditLog from '../models/AuditLog';
import User from '../models/user';

/** Akcie, podľa ktorých sa dá filtrovať. */
const AKCIE = [
  'vytvorenie', 'uprava', 'zmazanie', 'anonymizacia',
  'export_udajov', 'zmena_suhlasu', 'prihlasenie', 'zmena_hesla',
];

/**
 * GET /api/admin/logs
 *
 * Filtre:
 *   ?akcia=zmazanie          typ akcie
 *   ?entita=Článok           názov entity
 *   ?pouzivatel_id=3         kto akciu vykonal
 *   ?od=2026-09-01           od dátumu
 *   ?do=2026-09-30           do dátumu
 *   ?hladat=text             hľadanie v popise a e-maile
 *   ?limit= &offset=         stránkovanie
 */
export const getLogy = async (req: Request, res: Response): Promise<void> => {
  try {
    const kde: any = {};

    if (req.query.akcia) {
      const akcia = String(req.query.akcia);
      if (!AKCIE.includes(akcia)) {
        res.status(400).json({
          success: false,
          message: `Neznáma akcia „${akcia}". Povolené sú: ${AKCIE.join(', ')}`,
        });
        return;
      }
      kde.akcia = akcia;
    }

    if (req.query.entita) kde.entita = String(req.query.entita);

    if (req.query.pouzivatel_id) {
      const id = Number(req.query.pouzivatel_id);
      if (Number.isInteger(id) && id > 0) kde.pouzivatel_id = id;
    }

    // Časový rozsah. "do" posúvame na koniec dňa, aby filter
    // ?do=2026-09-30 zahrnul aj záznamy z toho dňa.
    const odKedy = req.query.od ? new Date(String(req.query.od)) : null;
    const doKedy = req.query.do ? new Date(`${String(req.query.do)}T23:59:59.999Z`) : null;

    if (odKedy && !isNaN(odKedy.getTime()) && doKedy && !isNaN(doKedy.getTime())) {
      kde.vytvoreny = { [Op.between]: [odKedy, doKedy] };
    } else if (odKedy && !isNaN(odKedy.getTime())) {
      kde.vytvoreny = { [Op.gte]: odKedy };
    } else if (doKedy && !isNaN(doKedy.getTime())) {
      kde.vytvoreny = { [Op.lte]: doKedy };
    }

    if (req.query.hladat) {
      const hladat = String(req.query.hladat).trim();
      kde[Op.or] = [
        { popis: { [Op.iLike]: `%${hladat}%` } },
        { pouzivatel_email: { [Op.iLike]: `%${hladat}%` } },
        { entita: { [Op.iLike]: `%${hladat}%` } },
      ];
    }

    const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 500);
    const offset = Math.max(Number(req.query.offset) || 0, 0);

    const { count, rows } = await AuditLog.findAndCountAll({
      where: kde,
      include: [{ model: User, as: 'pouzivatel', attributes: ['id', 'meno', 'email'], required: false }],
      order: [['vytvoreny', 'DESC']],
      limit,
      offset,
    });

    res.json({
      success: true,
      data: rows.map((z) => ({
        id: z.id,
        akcia: z.akcia,
        entita: z.entita,
        entita_id: z.entita_id,
        popis: z.popis,
        ip_adresa: z.ip_adresa,
        pouzivatel_id: z.pouzivatel_id,
        pouzivatel_email: z.pouzivatel_email,
        pouzivatel: (z as any).pouzivatel
          ? { id: (z as any).pouzivatel.id, meno: (z as any).pouzivatel.meno }
          : null,
        vytvoreny: z.vytvoreny,
      })),
      pocet: rows.length,
      celkom: count,
      strankovanie: { limit, offset, ma_dalsie: offset + rows.length < count },
    });
  } catch (error) {
    console.error('Chyba pri načítaní logov:', error);
    res.status(500).json({ success: false, message: 'Chyba servera pri načítaní logov' });
  }
};

/**
 * GET /api/admin/logs/filters
 * Hodnoty do rozbaľovacích zoznamov filtra, aby administrácia
 * nemusela ponúkať entity, ktoré sa v logoch nikdy neobjavili.
 */
export const getMoznostiFiltra = async (_req: Request, res: Response): Promise<void> => {
  try {
    const entity = await AuditLog.findAll({
      attributes: ['entita'],
      group: ['entita'],
      order: [['entita', 'ASC']],
    });

    res.json({
      success: true,
      data: {
        akcie: AKCIE,
        entity: entity.map((e) => e.entita),
      },
    });
  } catch (error) {
    console.error('Chyba pri načítaní možností filtra:', error);
    res.status(500).json({ success: false, message: 'Chyba servera' });
  }
};
