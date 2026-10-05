// Umiestnenie: backend/src/routes/emaily.ts
// E-maily v administrácii a odhlásenie z oznamov.
//
//   /api/admin/email/stav               či e-maily fungujú, čo je vo fronte
//   /api/admin/email/nastavenia         SMTP server a odosielateľ (+ /test)
//   /api/admin/email/sablony            texty automatických e-mailov
//   /api/admin/email/odoslane           záznam odoslaných e-mailov
//   /api/admin/email/kampane            hromadné e-maily fanúšikom
//   /api/email/odhlasit                 odkaz na odhlásenie v hromadnom e-maile

import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { Op, fn, col } from 'sequelize';
import { authenticateToken, requireAdmin, requireEditor } from '../middleware/auth';
import { EmailFronta, EmailKampan, EmailNastavenia, EmailSablona, type ZabezpecenieSmtp } from '../models/Email';
import Fanusik from '../models/Fanusik';
import NastaveniaKlubu from '../models/NastaveniaKlubu';
import { desifruj, zasifruj } from '../utils/sifrovanie';
import { odpovedzNaChybuModelu } from '../utils/odpoved';
import { sanitizePlainText } from '../utils/sanitize';
import {
  SPOLOCNE_ZNACKY,
  konfiguraciaZUdajov,
  nacitajKonfiguraciu,
  nahladSablony,
  odosliZaznam,
  popisChybySmtp,
  spracujFrontu,
  udajeKlubu,
  zaradDoFronty,
  overSpojenie,
} from '../services/email/odosielanie';
import { SABLONY, UKAZKA_KAMPANE, ZNACKY_KAMPANE, najdiSablonu } from '../services/email/sablony';
import { overPodpisOdhlasenia, pocetAdresatov, zaradKampan } from '../services/email/kampane';
import { vyrobEmail } from '../services/email/vzhlad';

export const adminEmailRouter = Router();
export const verejnyEmailRouter = Router();

const text = (v: unknown, max: number): string => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const ciste = (v: unknown, max: number): string => (typeof v === 'string' ? sanitizePlainText(v).trim().slice(0, max) : '');
const jeEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const chybaServera = (res: Response, kde: string, chyba: unknown) => {
  if (odpovedzNaChybuModelu(chyba, res)) return;
  console.error(`Chyba (${kde}):`, chyba);
  res.status(500).json({ success: false, message: 'Chyba servera, skúste to znova' });
};
const ZABEZPECENIA: ZabezpecenieSmtp[] = ['auto', 'ssl', 'starttls', 'ziadne'];

adminEmailRouter.use(authenticateToken);

// ===== Stav =====

adminEmailRouter.get('/stav', requireEditor, async (_req, res) => {
  try {
    const k = await nacitajKonfiguraciu();
    const den = new Date(Date.now() - 86_400_000);
    const [caka, chyby, odoslane, posledna] = await Promise.all([
      EmailFronta.count({ where: { stav: { [Op.in]: ['caka', 'odosiela'] } } }),
      EmailFronta.count({ where: { stav: 'chyba', vytvoreny: { [Op.gte]: den } } }),
      EmailFronta.count({ where: { stav: { [Op.in]: ['odoslany', 'konzola'] }, odoslany: { [Op.gte]: den } } }),
      EmailFronta.findOne({ where: { posledna_chyba: { [Op.ne]: null } }, order: [['aktualizovany', 'DESC']], attributes: ['posledna_chyba', 'aktualizovany'] }),
    ]);
    res.json({
      success: true,
      data: {
        nastavene: Boolean(k),
        zdroj: k?.zdroj ?? null,
        server: k ? `${k.host}:${k.port}` : null,
        odosielatel: k?.odosielatel ?? null,
        vyvoj: !k && process.env.NODE_ENV !== 'production',
        caka,
        chyby_24h: chyby,
        odoslane_24h: odoslane,
        posledna_chyba: posledna?.posledna_chyba ?? null,
        posledna_chyba_cas: posledna?.aktualizovany ?? null,
      },
    });
  } catch (chyba) {
    chybaServera(res, 'stav e-mailov', chyba);
  }
});

// ===== Nastavenia =====

adminEmailRouter.get('/nastavenia', requireAdmin, async (_req, res) => {
  try {
    const n = await EmailNastavenia.nacitaj();
    res.json({
      success: true,
      data: { ...n.toJSON(), env: process.env.SMTP_HOST ? { host: process.env.SMTP_HOST, port: process.env.SMTP_PORT || '587', pouzivatel: process.env.SMTP_USER || null } : null },
    });
  } catch (chyba) {
    chybaServera(res, 'nastavenia e-mailov', chyba);
  }
});

/** Údaje SMTP z formulára (bez hesla). */
const udajeZFormulara = (b: Record<string, unknown>) => {
  const port = Number(b.smtp_port);
  const zabezpecenie = ZABEZPECENIA.includes(b.smtp_zabezpecenie as ZabezpecenieSmtp) ? (b.smtp_zabezpecenie as ZabezpecenieSmtp) : 'auto';
  return {
    smtp_host: text(b.smtp_host, 255).replace(/\s/g, '') || null,
    smtp_port: Number.isInteger(port) && port > 0 && port < 65536 ? port : null,
    smtp_zabezpecenie: zabezpecenie,
    smtp_pouzivatel: text(b.smtp_pouzivatel, 255) || null,
    odosielatel_meno: ciste(b.odosielatel_meno, 150) || null,
    odosielatel_email: text(b.odosielatel_email, 255).toLowerCase() || null,
    odpovedat_na: text(b.odpovedat_na, 255).toLowerCase() || null,
  };
};

adminEmailRouter.put('/nastavenia', requireAdmin, async (req, res) => {
  try {
    const b = req.body ?? {};
    const udaje = udajeZFormulara(b);
    if (udaje.smtp_host && !/^[a-z0-9.-]+$/i.test(udaje.smtp_host)) {
      res.status(400).json({ success: false, message: 'Adresa SMTP servera nie je platná' });
      return;
    }
    const n = await EmailNastavenia.nacitaj();
    const limit = Number(b.limit_za_minutu);
    await n.update({
      ...udaje,
      pata: ciste(b.pata, 1000) || null,
      limit_za_minutu: Number.isInteger(limit) && limit >= 1 && limit <= 1000 ? limit : n.limit_za_minutu,
      // Prázdne heslo = ponechať uložené; zmazat_heslo ho odstráni
      ...(typeof b.heslo === 'string' && b.heslo ? { smtp_heslo: zasifruj(b.heslo) } : {}),
      ...(b.zmazat_heslo === true ? { smtp_heslo: null } : {}),
    });
    res.json({ success: true, message: 'Nastavenia e-mailov boli uložené', data: n.toJSON() });
  } catch (chyba) {
    chybaServera(res, 'uloženie nastavení e-mailov', chyba);
  }
});

/**
 * Skúšobný e-mail. Ak formulár pošle údaje SMTP, otestujú sa tie
 * (ešte neuložené); inak aktuálne nastavenia.
 */
adminEmailRouter.post('/nastavenia/test', requireAdmin, async (req, res) => {
  const b = req.body ?? {};
  const prijemca = text(b.prijemca, 255).toLowerCase();
  if (!jeEmail(prijemca)) {
    res.status(400).json({ success: false, message: 'Zadajte platnú e-mailovú adresu' });
    return;
  }
  try {
    const klub = await NastaveniaKlubu.nacitaj();
    let k = await nacitajKonfiguraciu();
    if (b.smtp_host !== undefined) {
      const ulozene = await EmailNastavenia.nacitaj();
      const heslo = typeof b.heslo === 'string' && b.heslo ? b.heslo : desifruj(ulozene.smtp_heslo);
      k = konfiguraciaZUdajov({ ...udajeZFormulara(b), heslo }, klub?.nazov || 'Klub', klub?.email ?? null) ?? k;
    }
    if (!k) {
      res.status(400).json({ success: false, message: 'Najprv vyplňte SMTP server a e-mail odosielateľa' });
      return;
    }
    const { klub: vzhlad, znacky, pata } = await udajeKlubu();
    const email = vyrobEmail(
      {
        predmet: 'Skúšobný e-mail - {{klub}}',
        obsah:
          'Dobrý deň,\n\nak čítate túto správu, odosielanie e-mailov z webu **{{klub}}** funguje.\n\n' +
          `- Server: ${k.host}:${k.port}\n- Odosielateľ: ${k.odosielatel}\n\n` +
          'Ak správa prišla do nevyžiadanej pošty, skontrolujte záznamy SPF, DKIM a DMARC domény (návod NAVOD-EMAILY.md).',
      },
      znacky,
      vzhlad,
      { pata }
    );
    const zaznam = await zaradDoFronty({ ...email, prijemca, sablona: 'test' });
    // Najprv overíme spojenie - hláška o chybe je potom presnejšia
    try {
      await overSpojenie(k);
    } catch (chyba) {
      const popis = popisChybySmtp(chyba, k);
      await zaznam.update({ stav: 'chyba', pokusy: 1, posledna_chyba: popis });
      res.status(400).json({ success: false, message: popis });
      return;
    }
    const odoslany = await odosliZaznam(zaznam, k);
    if (!odoslany) {
      await zaznam.reload();
      res.status(400).json({ success: false, message: zaznam.posledna_chyba || 'E-mail sa nepodarilo odoslať' });
      return;
    }
    res.json({ success: true, message: `Skúšobný e-mail bol odoslaný na ${prijemca}` });
  } catch (chyba) {
    chybaServera(res, 'skúšobný e-mail', chyba);
  }
});

// ===== Šablóny =====

adminEmailRouter.get('/sablony', requireAdmin, async (_req, res) => {
  try {
    const upravy = new Map((await EmailSablona.findAll()).map((s) => [s.kluc, s]));
    res.json({
      success: true,
      data: SABLONY.map((s) => {
        const u = upravy.get(s.kluc);
        return {
          kluc: s.kluc,
          skupina: s.skupina,
          komu: s.komu,
          vypnutelna: s.vypnutelna,
          upravena: Boolean(u),
          aktivna: s.vypnutelna ? u?.aktivna ?? true : true,
          predmet: u?.predmet ?? s.predmet,
          aktualizovany: u?.aktualizovany ?? null,
        };
      }),
    });
  } catch (chyba) {
    chybaServera(res, 'šablóny e-mailov', chyba);
  }
});

adminEmailRouter.get('/sablony/:kluc', requireAdmin, async (req, res) => {
  try {
    const s = najdiSablonu(req.params.kluc);
    if (!s) {
      res.status(404).json({ success: false, message: 'Šablóna e-mailu sa nenašla' });
      return;
    }
    const u = await EmailSablona.findOne({ where: { kluc: s.kluc } });
    res.json({
      success: true,
      data: {
        ...s,
        upravena: Boolean(u),
        aktivna: s.vypnutelna ? u?.aktivna ?? true : true,
        predmet: u?.predmet ?? s.predmet,
        obsah: u?.obsah ?? s.obsah,
        predvoleny_predmet: s.predmet,
        predvoleny_obsah: s.obsah,
        spolocne_znacky: SPOLOCNE_ZNACKY,
      },
    });
  } catch (chyba) {
    chybaServera(res, 'šablóna e-mailu', chyba);
  }
});

adminEmailRouter.put('/sablony/:kluc', requireAdmin, async (req, res) => {
  try {
    const s = najdiSablonu(req.params.kluc);
    if (!s) {
      res.status(404).json({ success: false, message: 'Šablóna e-mailu sa nenašla' });
      return;
    }
    const predmet = text(req.body?.predmet, 255);
    const obsah = text(req.body?.obsah, 20_000);
    const aktivna = s.vypnutelna ? req.body?.aktivna !== false : true;
    if (!predmet || !obsah) {
      res.status(400).json({ success: false, message: 'Predmet aj text e-mailu musia byť vyplnené' });
      return;
    }
    const existujuca = await EmailSablona.findOne({ where: { kluc: s.kluc } });
    // Text zhodný s predvoleným netreba ukladať - budúce vylepšenia predvoleného textu sa prejavia
    if (predmet === s.predmet && obsah === s.obsah && aktivna) {
      await existujuca?.destroy();
    } else if (existujuca) {
      await existujuca.update({ predmet, obsah, aktivna });
    } else {
      await EmailSablona.create({ kluc: s.kluc, predmet, obsah, aktivna });
    }
    res.json({ success: true, message: 'Šablóna e-mailu bola uložená' });
  } catch (chyba) {
    chybaServera(res, 'uloženie šablóny e-mailu', chyba);
  }
});

adminEmailRouter.delete('/sablony/:kluc', requireAdmin, async (req, res) => {
  try {
    await EmailSablona.destroy({ where: { kluc: req.params.kluc } });
    res.json({ success: true, message: 'Obnovený predvolený text e-mailu' });
  } catch (chyba) {
    chybaServera(res, 'obnovenie šablóny e-mailu', chyba);
  }
});

const textNaNahlad = (b: Record<string, unknown>, predvoleny: { predmet: string; obsah: string }) => ({
  predmet: text(b.predmet, 255) || predvoleny.predmet,
  obsah: text(b.obsah, 20_000) || predvoleny.obsah,
});

adminEmailRouter.post('/sablony/:kluc/nahlad', requireAdmin, async (req, res) => {
  try {
    const s = najdiSablonu(req.params.kluc);
    if (!s) {
      res.status(404).json({ success: false, message: 'Šablóna e-mailu sa nenašla' });
      return;
    }
    res.json({ success: true, data: await nahladSablony(textNaNahlad(req.body ?? {}, s), s.ukazka) });
  } catch (chyba) {
    chybaServera(res, 'náhľad šablóny e-mailu', chyba);
  }
});

adminEmailRouter.post('/sablony/:kluc/test', requireAdmin, async (req, res) => {
  try {
    const s = najdiSablonu(req.params.kluc);
    const prijemca = text(req.body?.prijemca, 255).toLowerCase();
    if (!s) {
      res.status(404).json({ success: false, message: 'Šablóna e-mailu sa nenašla' });
      return;
    }
    if (!jeEmail(prijemca)) {
      res.status(400).json({ success: false, message: 'Zadajte platnú e-mailovú adresu' });
      return;
    }
    const email = await nahladSablony(textNaNahlad(req.body ?? {}, s), s.ukazka);
    const zaznam = await zaradDoFronty({ ...email, predmet: `[Skúška] ${email.predmet}`, prijemca, sablona: s.kluc });
    const odoslany = await odosliZaznam(zaznam);
    await zaznam.reload();
    if (!odoslany) {
      res.status(400).json({ success: false, message: zaznam.posledna_chyba || 'E-mail sa nepodarilo odoslať' });
      return;
    }
    res.json({ success: true, message: `Skúšobný e-mail bol odoslaný na ${prijemca}` });
  } catch (chyba) {
    chybaServera(res, 'skúška šablóny e-mailu', chyba);
  }
});

// ===== Odoslané e-maily =====

adminEmailRouter.get('/odoslane', requireAdmin, async (req, res) => {
  try {
    const strana = Math.max(1, Number(req.query.strana) || 1);
    const naStranu = Math.min(100, Math.max(10, Number(req.query.na_stranu) || 50));
    const stav = String(req.query.stav || '');
    const hladat = text(req.query.hladat, 100);
    const where: Record<string | symbol, unknown> = {};
    if (stav === 'odoslany') where.stav = { [Op.in]: ['odoslany', 'konzola'] };
    else if (stav === 'caka') where.stav = { [Op.in]: ['caka', 'odosiela'] };
    else if (stav === 'chyba') where.stav = 'chyba';
    if (req.query.kampan_id) where.kampan_id = Number(req.query.kampan_id);
    if (hladat) where[Op.or] = [{ prijemca: { [Op.iLike]: `%${hladat}%` } }, { predmet: { [Op.iLike]: `%${hladat}%` } }];
    const { rows, count } = await EmailFronta.findAndCountAll({
      where,
      attributes: { exclude: ['html', 'text', 'hlavicky'] },
      order: [['id', 'DESC']],
      limit: naStranu,
      offset: (strana - 1) * naStranu,
    });
    const pocty = await EmailFronta.findAll({ attributes: ['stav', [fn('COUNT', col('id')), 'pocet']], group: ['stav'], raw: true });
    const pocet = (stavy: string[]) => (pocty as unknown as Array<{ stav: string; pocet: string }>).filter((p) => stavy.includes(p.stav)).reduce((s, p) => s + Number(p.pocet), 0);
    res.json({
      success: true,
      data: rows,
      meta: { celkom: count, strana, na_stranu: naStranu, pocty: { odoslany: pocet(['odoslany', 'konzola']), caka: pocet(['caka', 'odosiela']), chyba: pocet(['chyba']) } },
    });
  } catch (chyba) {
    chybaServera(res, 'odoslané e-maily', chyba);
  }
});

adminEmailRouter.get('/odoslane/:id', requireAdmin, async (req, res) => {
  try {
    const zaznam = await EmailFronta.findByPk(Number(req.params.id));
    if (!zaznam) {
      res.status(404).json({ success: false, message: 'E-mail sa nenašiel' });
      return;
    }
    res.json({ success: true, data: zaznam });
  } catch (chyba) {
    chybaServera(res, 'detail e-mailu', chyba);
  }
});

adminEmailRouter.post('/odoslane/:id/znova', requireAdmin, async (req, res) => {
  try {
    const zaznam = await EmailFronta.findByPk(Number(req.params.id));
    if (!zaznam) {
      res.status(404).json({ success: false, message: 'E-mail sa nenašiel' });
      return;
    }
    await zaznam.update({ stav: 'caka', pokusy: 0, odoslat_po: new Date(), posledna_chyba: null });
    const odoslany = await odosliZaznam(zaznam);
    await zaznam.reload();
    res.status(odoslany ? 200 : 400).json({
      success: odoslany,
      message: odoslany ? 'E-mail bol odoslaný' : zaznam.posledna_chyba || 'E-mail sa nepodarilo odoslať',
      data: zaznam,
    });
  } catch (chyba) {
    chybaServera(res, 'opakované odoslanie e-mailu', chyba);
  }
});

adminEmailRouter.post('/fronta/spracuj', requireEditor, async (_req, res) => {
  try {
    const odoslane = await spracujFrontu();
    res.json({ success: true, message: `Odoslané e-maily: ${odoslane}`, data: { odoslane } });
  } catch (chyba) {
    chybaServera(res, 'spracovanie fronty e-mailov', chyba);
  }
});

// ===== Hromadné e-maily =====

const adresatiZTela = (v: unknown) => {
  const a = (v && typeof v === 'object' ? v : {}) as { typy?: unknown; len_platne?: unknown };
  const typy = Array.isArray(a.typy) ? a.typy.filter((t) => ['fanusik', 'clen', 'vip', 'cestny'].includes(String(t))).map(String) : [];
  return { typy: [...new Set(typy)], len_platne: a.len_platne === true };
};

const statistikaKampani = async (ids: number[]) => {
  if (!ids.length) return new Map<number, Record<string, number>>();
  const riadky = (await EmailFronta.findAll({
    where: { kampan_id: { [Op.in]: ids } },
    attributes: ['kampan_id', 'stav', [fn('COUNT', col('id')), 'pocet']],
    group: ['kampan_id', 'stav'],
    raw: true,
  })) as unknown as Array<{ kampan_id: number; stav: string; pocet: string }>;
  const mapa = new Map<number, Record<string, number>>();
  for (const r of riadky) {
    const s = mapa.get(r.kampan_id) ?? { odoslane: 0, caka: 0, chyby: 0 };
    if (r.stav === 'odoslany' || r.stav === 'konzola') s.odoslane += Number(r.pocet);
    else if (r.stav === 'chyba') s.chyby += Number(r.pocet);
    else s.caka += Number(r.pocet);
    mapa.set(r.kampan_id, s);
  }
  return mapa;
};

adminEmailRouter.get('/kampane', requireEditor, async (_req, res) => {
  try {
    const kampane = await EmailKampan.findAll({ order: [['id', 'DESC']], limit: 200 });
    const stat = await statistikaKampani(kampane.map((k) => k.id));
    res.json({ success: true, data: kampane.map((k) => ({ ...k.toJSON(), statistika: stat.get(k.id) ?? { odoslane: 0, caka: 0, chyby: 0 } })) });
  } catch (chyba) {
    chybaServera(res, 'hromadné e-maily', chyba);
  }
});

adminEmailRouter.get('/kampane/znacky', requireEditor, (_req, res) => {
  res.json({ success: true, data: { znacky: ZNACKY_KAMPANE, spolocne_znacky: SPOLOCNE_ZNACKY } });
});

adminEmailRouter.post('/kampane/pocet', requireEditor, async (req, res) => {
  try {
    res.json({ success: true, data: { pocet: await pocetAdresatov(adresatiZTela(req.body?.adresati)) } });
  } catch (chyba) {
    chybaServera(res, 'počet adresátov', chyba);
  }
});

adminEmailRouter.post('/kampane/nahlad', requireEditor, async (req, res) => {
  try {
    const predmet = text(req.body?.predmet, 255) || 'Predmet e-mailu';
    const obsah = text(req.body?.obsah, 50_000) || 'Text e-mailu…';
    res.json({ success: true, data: await nahladSablony({ predmet, obsah }, UKAZKA_KAMPANE, true) });
  } catch (chyba) {
    chybaServera(res, 'náhľad hromadného e-mailu', chyba);
  }
});

const udajeKampane = (b: Record<string, unknown>) => ({
  nazov: ciste(b.nazov, 150),
  predmet: text(b.predmet, 255),
  obsah: text(b.obsah, 50_000),
  adresati: adresatiZTela(b.adresati),
});

adminEmailRouter.post('/kampane', requireEditor, async (req: Request, res) => {
  try {
    const kampan = await EmailKampan.create({ ...udajeKampane(req.body ?? {}), vytvoril_id: req.userId ?? null });
    res.status(201).json({ success: true, message: 'Hromadný e-mail bol uložený', data: kampan });
  } catch (chyba) {
    chybaServera(res, 'nový hromadný e-mail', chyba);
  }
});

const najdiKampan = async (req: Request, res: Response) => {
  const kampan = await EmailKampan.findByPk(Number(req.params.id));
  if (!kampan) res.status(404).json({ success: false, message: 'Hromadný e-mail sa nenašiel' });
  return kampan;
};

adminEmailRouter.get('/kampane/:id', requireEditor, async (req, res) => {
  try {
    const kampan = await najdiKampan(req, res);
    if (!kampan) return;
    const stat = await statistikaKampani([kampan.id]);
    res.json({ success: true, data: { ...kampan.toJSON(), statistika: stat.get(kampan.id) ?? { odoslane: 0, caka: 0, chyby: 0 } } });
  } catch (chyba) {
    chybaServera(res, 'hromadný e-mail', chyba);
  }
});

adminEmailRouter.put('/kampane/:id', requireEditor, async (req, res) => {
  try {
    const kampan = await najdiKampan(req, res);
    if (!kampan) return;
    if (kampan.stav !== 'koncept') {
      res.status(400).json({ success: false, message: 'Odoslaný e-mail sa už nedá upraviť - vytvorte kópiu' });
      return;
    }
    await kampan.update(udajeKampane(req.body ?? {}));
    res.json({ success: true, message: 'Hromadný e-mail bol uložený', data: kampan });
  } catch (chyba) {
    chybaServera(res, 'úprava hromadného e-mailu', chyba);
  }
});

adminEmailRouter.delete('/kampane/:id', requireEditor, async (req, res) => {
  try {
    const kampan = await najdiKampan(req, res);
    if (!kampan) return;
    if (kampan.stav === 'odosiela') {
      res.status(400).json({ success: false, message: 'E-mail sa práve odosiela - najprv ho zastavte' });
      return;
    }
    await kampan.destroy();
    res.json({ success: true, message: 'Hromadný e-mail bol odstránený' });
  } catch (chyba) {
    chybaServera(res, 'odstránenie hromadného e-mailu', chyba);
  }
});

adminEmailRouter.post('/kampane/:id/test', requireEditor, async (req, res) => {
  try {
    const kampan = await najdiKampan(req, res);
    if (!kampan) return;
    const prijemca = text(req.body?.prijemca, 255).toLowerCase();
    if (!jeEmail(prijemca)) {
      res.status(400).json({ success: false, message: 'Zadajte platnú e-mailovú adresu' });
      return;
    }
    const email = await nahladSablony(kampan, UKAZKA_KAMPANE, true);
    const zaznam = await zaradDoFronty({ ...email, predmet: `[Skúška] ${email.predmet}`, prijemca, sablona: 'test' });
    const odoslany = await odosliZaznam(zaznam);
    await zaznam.reload();
    if (!odoslany) {
      res.status(400).json({ success: false, message: zaznam.posledna_chyba || 'E-mail sa nepodarilo odoslať' });
      return;
    }
    res.json({ success: true, message: `Skúšobný e-mail bol odoslaný na ${prijemca}` });
  } catch (chyba) {
    chybaServera(res, 'skúška hromadného e-mailu', chyba);
  }
});

adminEmailRouter.post('/kampane/:id/odoslat', requireEditor, async (req, res) => {
  try {
    const kampan = await najdiKampan(req, res);
    if (!kampan) return;
    if (kampan.stav !== 'koncept') {
      res.status(400).json({ success: false, message: 'Tento e-mail už bol odoslaný' });
      return;
    }
    // Stav meníme hneď, aby dvojklik neposlal e-mail dvakrát
    const [zmenene] = await EmailKampan.update({ stav: 'odosiela' }, { where: { id: kampan.id, stav: 'koncept' } });
    if (!zmenene) {
      res.status(409).json({ success: false, message: 'Tento e-mail už bol odoslaný' });
      return;
    }
    await kampan.reload();
    const pocet = await zaradKampan(kampan);
    void spracujFrontu().catch(() => undefined);
    const k = await nacitajKonfiguraciu();
    res.json({
      success: true,
      message: k || process.env.NODE_ENV !== 'production'
        ? `E-mail sa odosiela ${pocet} adresátom`
        : `E-mail čaká vo fronte pre ${pocet} adresátov - odíde po nastavení SMTP servera`,
      data: { pocet },
    });
  } catch (chyba) {
    chybaServera(res, 'odoslanie hromadného e-mailu', chyba);
  }
});

adminEmailRouter.post('/kampane/:id/zastavit', requireEditor, async (req, res) => {
  try {
    const kampan = await najdiKampan(req, res);
    if (!kampan) return;
    const zrusene = await EmailFronta.destroy({ where: { kampan_id: kampan.id, stav: 'caka' } });
    await kampan.update({ stav: 'odoslana' });
    res.json({ success: true, message: `Odosielanie bolo zastavené (neodoslané: ${zrusene})` });
  } catch (chyba) {
    chybaServera(res, 'zastavenie hromadného e-mailu', chyba);
  }
});

adminEmailRouter.post('/kampane/:id/kopia', requireEditor, async (req: Request, res) => {
  try {
    const kampan = await najdiKampan(req, res);
    if (!kampan) return;
    const kopia = await EmailKampan.create({
      nazov: `${kampan.nazov} (kópia)`.slice(0, 150),
      predmet: kampan.predmet,
      obsah: kampan.obsah,
      adresati: kampan.adresati,
      vytvoril_id: req.userId ?? null,
    });
    res.status(201).json({ success: true, message: 'Kópia bola vytvorená', data: kopia });
  } catch (chyba) {
    chybaServera(res, 'kópia hromadného e-mailu', chyba);
  }
});

// ===== Odhlásenie z oznamov (verejné) =====

const limitOdhlasenia = rateLimit({ windowMs: 60_000, max: 30, standardHeaders: true, legacyHeaders: false });

const escapuj = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const stranka = async (nadpis: string, telo: string) => {
  const { klub } = await udajeKlubu();
  return `<!doctype html><html lang="sk"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapuj(nadpis)} - ${escapuj(klub.nazov)}</title></head>
<body style="margin:0;font-family:system-ui,-apple-system,Segoe UI,Arial,sans-serif;background:#f1f5f9;color:#0f172a;">
<main style="max-width:480px;margin:10vh auto;padding:32px 28px;background:#fff;border-radius:16px;box-shadow:0 12px 32px -20px rgba(15,23,42,.4);text-align:center;">
<p style="margin:0 0 6px;font-weight:700;color:${klub.farba};">${escapuj(klub.nazov)}</p>
<h1 style="margin:0 0 14px;font-size:24px;">${escapuj(nadpis)}</h1>
${telo}
<p style="margin:24px 0 0;"><a href="${escapuj(klub.web)}" style="color:#64748b;">Späť na web</a></p>
</main></body></html>`;
};

const najdiOdhlasovaneho = async (req: Request) => {
  const id = Number(req.query.f);
  const podpis = String(req.query.t || '');
  if (!Number.isInteger(id) || !podpis || !overPodpisOdhlasenia(id, podpis)) return null;
  return Fanusik.findByPk(id);
};

verejnyEmailRouter.get('/odhlasit', limitOdhlasenia, async (req, res) => {
  try {
    const f = await najdiOdhlasovaneho(req);
    const { klub } = await udajeKlubu();
    if (!f) {
      res.status(404).send(await stranka('Odkaz nie je platný', '<p>Odkaz na odhlásenie je neúplný alebo už neplatí. Napíšte nám a odhlásime vás ručne.</p>'));
      return;
    }
    if (!f.suhlas_oznamy) {
      res.send(await stranka('Už ste odhlásený', '<p>Oznamy klubu vám už neposielame.</p>'));
      return;
    }
    // Odhlásenie až po kliknutí - antivírusové kontroly odkazov by inak odhlásili ľudí samé
    res.send(
      await stranka(
        'Odhlásenie z oznamov',
        `<p>Naozaj už nechcete dostávať oznamy klubu na <strong>${escapuj(f.email)}</strong>? Dôležité e-maily (objednávky, heslo) vám budú chodiť ďalej.</p>
<form method="post"><button type="submit" style="margin-top:8px;padding:12px 24px;border:0;border-radius:999px;background:${klub.farba};color:${klub.farbaKontrast};font:inherit;font-weight:700;cursor:pointer;">Odhlásiť sa</button></form>`
      )
    );
  } catch (chyba) {
    console.error('Chyba (odhlásenie z oznamov):', chyba);
    res.status(500).send('Chyba servera');
  }
});

verejnyEmailRouter.post('/odhlasit', limitOdhlasenia, async (req, res) => {
  try {
    const f = await najdiOdhlasovaneho(req);
    if (!f) {
      res.status(404).send(await stranka('Odkaz nie je platný', '<p>Odkaz na odhlásenie je neúplný alebo už neplatí. Napíšte nám a odhlásime vás ručne.</p>'));
      return;
    }
    if (f.suhlas_oznamy) await f.update({ suhlas_oznamy: false });
    res.send(await stranka('Boli ste odhlásený', '<p>Oznamy klubu vám už posielať nebudeme. Súhlas môžete kedykoľvek obnoviť v sekcii Môj klub na webe.</p>'));
  } catch (chyba) {
    console.error('Chyba (odhlásenie z oznamov):', chyba);
    res.status(500).send('Chyba servera');
  }
});
