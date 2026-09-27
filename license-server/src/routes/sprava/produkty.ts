// Umiestnenie: license-server/src/routes/sprava/produkty.ts
// Produkty, ich plány a verzie (z GitHubu), aktuálna verzia a hromadné
// aktualizácie inštalácií.

import fs from 'fs';
import { Router } from 'express';
import { Op, fn, col } from 'sequelize';
import Licencia from '../../models/Licencia';
import { NEUKONCENE_STAVY, PlanProduktu, Prikaz, Produkt, Verzia, zaznamenaj } from '../../models/sprava';
import { jePlatnyRepo, nacitajVerzie } from '../../utils/github';
import { cestaBaliku } from '../../utils/balicky';
import { jeVerzia, normalizujVerziu, porovnajVerzie } from '../../utils/verzie';
import { pripravBalik } from '../../sluzby/baliky';
import { ChybaPrikazu, ONLINE_MS, vypocitanyStav, vytvorPrikazAktualizacie } from '../../sluzby/licencie';
import { a, ChybaVstupu, ip, text, zoznamTextov } from './pomocky';

const router = Router();

/** Overí zoznam plánov produktu. */
const plany = (vstup: unknown): PlanProduktu[] => {
  if (!Array.isArray(vstup) || vstup.length > 20) throw new ChybaVstupu('Plány musia byť zoznam (najviac 20)');
  const kody = new Set<string>();
  return vstup.map((p: any, i) => {
    const kod = text(p?.kod, 40, `Kód plánu ${i + 1}`, true)!.toLowerCase();
    if (!/^[a-z0-9_-]+$/.test(kod)) throw new ChybaVstupu(`Kód plánu „${kod}" smie obsahovať len malé písmená, číslice, - a _`);
    if (kody.has(kod)) throw new ChybaVstupu(`Plán „${kod}" je v zozname dvakrát`);
    kody.add(kod);
    const mesiacov = Number(p?.mesiacov);
    if (!Number.isInteger(mesiacov) || mesiacov < 1 || mesiacov > 120) throw new ChybaVstupu(`Plán ${kod}: dĺžka musí byť 1 až 120 mesiacov`);
    return { kod, nazov: text(p?.nazov, 80, `Názov plánu ${kod}`, true)!, mesiacov, funkcie: zoznamTextov(p?.funkcie, `Funkcie plánu ${kod}`) };
  });
};

const repo = (vstup: unknown): string | null => {
  const r = text(vstup, 200, 'Repozitár');
  if (!r) return null;
  const cisty = r.replace(/^https?:\/\/github\.com\//i, '').replace(/\.git$/, '').replace(/\/+$/, '');
  if (!jePlatnyRepo(cisty)) throw new ChybaVstupu('Repozitár musí byť v tvare vlastnik/repozitar (napr. JojDobre/ClubW)');
  return cisty;
};

const nacitajProdukt = async (id: unknown) => {
  const produkt = await Produkt.findByPk(Number(id), { include: [{ model: Verzia, as: 'aktualna_verzia' }] });
  if (!produkt) throw new ChybaVstupu('Produkt nenájdený', 404);
  return produkt;
};

router.get(
  '/produkty',
  a(async (_req, res) => {
    const produkty = await Produkt.findAll({ include: [{ model: Verzia, as: 'aktualna_verzia' }], order: [['nazov', 'ASC']] });
    const pocty = (await Licencia.findAll({
      attributes: ['produkt_id', 'stav', [fn('COUNT', col('id')), 'pocet']],
      group: ['produkt_id', 'stav'],
      raw: true,
    })) as unknown as Array<{ produkt_id: number; stav: string; pocet: string }>;
    res.json({
      success: true,
      data: produkty.map((p) => ({
        ...p.toJSON(),
        licencie: pocty.filter((r) => r.produkt_id === p.id).reduce((s, r) => ({ ...s, [r.stav]: Number(r.pocet) }), {} as Record<string, number>),
      })),
    });
  })
);

router.post(
  '/produkty',
  a(async (req, res) => {
    const kod = text(req.body.kod, 40, 'Kód produktu', true)!.toLowerCase();
    if (!/^[a-z0-9-]+$/.test(kod)) throw new ChybaVstupu('Kód produktu smie obsahovať len malé písmená, číslice a pomlčku');
    if (await Produkt.findOne({ where: { kod } })) throw new ChybaVstupu(`Produkt s kódom ${kod} už existuje`, 409);
    const produkt = await Produkt.create({
      kod,
      nazov: text(req.body.nazov, 120, 'Názov produktu', true),
      popis: text(req.body.popis, 2000, 'Popis'),
      github_repo: repo(req.body.github_repo),
      plany: req.body.plany !== undefined ? plany(req.body.plany) : [{ kod: 'standard', nazov: 'Štandard', mesiacov: 12, funkcie: [] }],
    });
    await zaznamenaj({ typ: 'produkt_vytvoreny', popis: `Nový produkt ${produkt.nazov}`, administrator_id: req.admin!.id, produkt_id: produkt.id, ip: ip(req) });
    res.status(201).json({ success: true, data: produkt, message: 'Produkt bol vytvorený' });
  })
);

router.put(
  '/produkty/:id',
  a(async (req, res) => {
    const produkt = await nacitajProdukt(req.params.id);
    const b = req.body;
    const zmeny: Record<string, unknown> = {};
    if (b.nazov !== undefined) zmeny.nazov = text(b.nazov, 120, 'Názov produktu', true);
    if (b.popis !== undefined) zmeny.popis = text(b.popis, 2000, 'Popis');
    if (b.github_repo !== undefined) zmeny.github_repo = repo(b.github_repo);
    if (b.plany !== undefined) zmeny.plany = plany(b.plany);
    if (b.aktivny !== undefined) zmeny.aktivny = b.aktivny === true;
    if (b.minimalna_verzia !== undefined) {
      const min = text(b.minimalna_verzia, 40, 'Minimálna verzia');
      if (min && !jeVerzia(min)) throw new ChybaVstupu('Minimálna verzia musí byť v tvare 1.2.0');
      zmeny.minimalna_verzia = min ? normalizujVerziu(min) : null;
    }
    await produkt.update(zmeny);
    await zaznamenaj({ typ: 'produkt_upraveny', popis: `Úprava produktu ${produkt.nazov}: ${Object.keys(zmeny).join(', ')}`, administrator_id: req.admin!.id, produkt_id: produkt.id, ip: ip(req) });
    res.json({ success: true, data: produkt, message: 'Produkt bol uložený' });
  })
);

// ===== Verzie =====

router.get(
  '/produkty/:id/verzie',
  a(async (req, res) => {
    const produkt = await nacitajProdukt(req.params.id);
    const verzie = await Verzia.findAll({ where: { produkt_id: produkt.id } });
    const naVerziach = (await Licencia.findAll({
      where: { produkt_id: produkt.id, posledna_kontrola: { [Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
      attributes: ['nainstalovana_verzia', [fn('COUNT', col('id')), 'pocet']],
      group: ['nainstalovana_verzia'],
      raw: true,
    })) as unknown as Array<{ nainstalovana_verzia: string | null; pocet: string }>;
    const pocet = (v: string) => Number(naVerziach.find((r) => r.nainstalovana_verzia && porovnajVerzie(r.nainstalovana_verzia, v) === 0)?.pocet ?? 0);
    res.json({
      success: true,
      data: verzie
        .sort((x, y) => porovnajVerzie(y.verzia, x.verzia))
        .map((v) => ({ ...v.toJSON(), aktualna: v.id === produkt.aktualna_verzia_id, instalacii: pocet(v.verzia) })),
      instalacie_podla_verzie: naVerziach.map((r) => ({ verzia: r.nainstalovana_verzia, pocet: Number(r.pocet) })),
    });
  })
);

/** Načíta vydania a tagy z GitHubu a doplní nové verzie. */
router.post(
  '/produkty/:id/synchronizovat',
  a(async (req, res) => {
    const produkt = await nacitajProdukt(req.params.id);
    if (!produkt.github_repo) throw new ChybaVstupu('Produkt nemá nastavený repozitár na GitHube');
    let zGithubu;
    try {
      zGithubu = await nacitajVerzie(produkt.github_repo);
    } catch (chyba: any) {
      throw new ChybaVstupu(chyba.message, 502);
    }
    let nove = 0;
    let upravene = 0;
    for (const v of zGithubu) {
      const existujuca = await Verzia.findOne({ where: { produkt_id: produkt.id, tag: v.tag } });
      if (!existujuca) {
        await Verzia.create({ ...v, produkt_id: produkt.id, publikovana: v.publikovana ? new Date(v.publikovana) : null });
        nove++;
      } else if (existujuca.zdroj !== 'rucne') {
        // Poznámky a názov sa môžu na GitHube doplniť neskôr
        await existujuca.update({ nazov: v.nazov, poznamky: v.poznamky, predbezna: v.predbezna, zdroj: v.zdroj, commit_sha: v.commit_sha ?? existujuca.commit_sha, publikovana: v.publikovana ? new Date(v.publikovana) : existujuca.publikovana });
        upravene++;
      }
    }
    await zaznamenaj({ typ: 'verzie_synchronizovane', popis: `${produkt.nazov}: z GitHubu ${zGithubu.length} verzií, nových ${nove}`, administrator_id: req.admin!.id, produkt_id: produkt.id, ip: ip(req) });
    res.json({ success: true, data: { spolu: zGithubu.length, nove, upravene }, message: nove ? `Pribudlo ${nove} nových verzií` : 'Žiadne nové verzie' });
  })
);

/** Ručne pridaná verzia (tag, ktorý na GitHube existuje, ale synchronizácia ho nenašla). */
router.post(
  '/produkty/:id/verzie',
  a(async (req, res) => {
    const produkt = await nacitajProdukt(req.params.id);
    const tag = text(req.body.tag, 100, 'Tag', true)!;
    if (!jeVerzia(tag)) throw new ChybaVstupu('Tag musí byť v tvare verzie (v1.2.0)');
    if (await Verzia.findOne({ where: { produkt_id: produkt.id, tag } })) throw new ChybaVstupu('Táto verzia už existuje', 409);
    const verzia = await Verzia.create({
      produkt_id: produkt.id,
      tag,
      verzia: normalizujVerziu(tag),
      nazov: text(req.body.nazov, 200, 'Názov'),
      poznamky: text(req.body.poznamky, 20000, 'Poznámky'),
      zdroj: 'rucne',
      publikovana: new Date(),
      predbezna: normalizujVerziu(tag).includes('-'),
    });
    await zaznamenaj({ typ: 'verzia_pridana', popis: `${produkt.nazov}: ručne pridaná verzia ${verzia.verzia}`, administrator_id: req.admin!.id, produkt_id: produkt.id, ip: ip(req) });
    res.status(201).json({ success: true, data: verzia, message: 'Verzia bola pridaná' });
  })
);

const nacitajVerziu = async (id: unknown) => {
  const verzia = await Verzia.findByPk(Number(id));
  if (!verzia) throw new ChybaVstupu('Verzia nenájdená', 404);
  return verzia;
};

router.put(
  '/verzie/:id',
  a(async (req, res) => {
    const verzia = await nacitajVerziu(req.params.id);
    const zmeny: Record<string, unknown> = {};
    if (req.body.nazov !== undefined) zmeny.nazov = text(req.body.nazov, 200, 'Názov');
    if (req.body.poznamky !== undefined) zmeny.poznamky = text(req.body.poznamky, 20000, 'Poznámky');
    await verzia.update(zmeny);
    res.json({ success: true, data: verzia, message: 'Verzia bola uložená' });
  })
);

/** Nastaví verziu ako aktuálnu - inštalácie ju budú hlásiť ako dostupnú aktualizáciu. */
router.post(
  '/verzie/:id/aktualna',
  a(async (req, res) => {
    const verzia = await nacitajVerziu(req.params.id);
    const produkt = await nacitajProdukt(verzia.produkt_id);
    const predosla = produkt.aktualna_verzia?.verzia ?? null;
    await produkt.update({ aktualna_verzia_id: verzia.id });
    if (verzia.balik_stav !== 'pripraveny' && verzia.balik_stav !== 'pripravuje') await pripravBalik(verzia, req.admin!.id);
    await zaznamenaj({
      typ: 'aktualna_verzia',
      popis: `${produkt.nazov}: aktuálna verzia ${predosla ?? '—'} → ${verzia.verzia}`,
      administrator_id: req.admin!.id,
      produkt_id: produkt.id,
      ip: ip(req),
    });
    res.json({ success: true, data: verzia, message: `Aktuálna verzia je ${verzia.verzia}${verzia.balik_stav === 'pripraveny' ? '' : ' - balík sa pripravuje'}` });
  })
);

/** Stiahne (znova) balík verzie z GitHubu. */
router.post(
  '/verzie/:id/balik',
  a(async (req, res) => {
    const verzia = await nacitajVerziu(req.params.id);
    if (verzia.balik_stav === 'pripravuje') throw new ChybaVstupu('Balík sa už pripravuje', 409);
    try {
      await pripravBalik(verzia, req.admin!.id);
    } catch (chyba: any) {
      throw new ChybaVstupu(chyba.message);
    }
    res.json({ success: true, data: verzia, message: 'Balík sa pripravuje' });
  })
);

router.delete(
  '/verzie/:id',
  a(async (req, res) => {
    const verzia = await nacitajVerziu(req.params.id);
    const produkt = await nacitajProdukt(verzia.produkt_id);
    if (produkt.aktualna_verzia_id === verzia.id) throw new ChybaVstupu('Aktuálnu verziu nemožno zmazať - najprv nastavte inú', 409);
    if (await Prikaz.count({ where: { verzia_id: verzia.id, stav: { [Op.in]: NEUKONCENE_STAVY } } })) throw new ChybaVstupu('Na verziu čakajú aktualizácie - najprv ich zrušte', 409);
    if (await Licencia.count({ where: { pripnuta_verzia_id: verzia.id } })) throw new ChybaVstupu('Na túto verziu sú pripnuté licencie', 409);
    await fs.promises.rm(cestaBaliku(produkt.kod, verzia.tag), { force: true });
    await verzia.destroy();
    await zaznamenaj({ typ: 'verzia_zmazana', popis: `${produkt.nazov}: zmazaná verzia ${verzia.verzia}`, administrator_id: req.admin!.id, produkt_id: produkt.id, ip: ip(req) });
    res.json({ success: true, message: 'Verzia bola zmazaná' });
  })
);

/**
 * Hromadná aktualizácia: všetky aktívne inštalácie produktu so staršou
 * verziou dostanú príkaz na zvolenú (predvolene aktuálnu) verziu.
 */
router.post(
  '/produkty/:id/aktualizovat',
  a(async (req, res) => {
    const produkt = await nacitajProdukt(req.params.id);
    const verzia = req.body?.verzia_id ? await nacitajVerziu(req.body.verzia_id) : produkt.aktualna_verzia;
    if (!verzia || verzia.produkt_id !== produkt.id) throw new ChybaVstupu('Vyberte verziu tohto produktu');
    if (verzia.balik_stav !== 'pripraveny') throw new ChybaVstupu(`Balík verzie ${verzia.verzia} ešte nie je pripravený`);
    const lenOnline = req.body?.len_online !== false;

    const licencie = await Licencia.findAll({
      where: {
        produkt_id: produkt.id,
        stav: 'aktivna',
        platna_do: { [Op.gte]: new Date() },
        nainstalovana_verzia: { [Op.ne]: null },
        pripnuta_verzia_id: null,
        ...(lenOnline ? { posledna_kontrola: { [Op.gte]: new Date(Date.now() - ONLINE_MS) } } : {}),
      },
    });
    let zadane = 0;
    const preskocene: string[] = [];
    for (const l of licencie) {
      if (vypocitanyStav(l) !== 'aktivna' || porovnajVerzie(verzia.verzia, l.nainstalovana_verzia) <= 0) continue;
      try {
        await vytvorPrikazAktualizacie(l, verzia, { administrator_id: req.admin!.id, ip: ip(req) });
        zadane++;
      } catch (chyba) {
        if (!(chyba instanceof ChybaPrikazu)) throw chyba;
        preskocene.push(`${l.nazov_klienta}: ${chyba.message}`);
      }
    }
    await zaznamenaj({
      typ: 'hromadna_aktualizacia',
      popis: `${produkt.nazov}: hromadná aktualizácia na ${verzia.verzia} - zadaná ${zadane} inštaláciám`,
      administrator_id: req.admin!.id,
      produkt_id: produkt.id,
      detaily: { preskocene },
      ip: ip(req),
    });
    res.json({ success: true, data: { zadane, preskocene }, message: zadane ? `Aktualizácia zadaná ${zadane} inštaláciám` : 'Žiadna inštalácia nepotrebuje aktualizáciu' });
  })
);

export default router;
