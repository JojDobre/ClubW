// Umiestnenie: backend/src/routes/hladanie.ts
//
// VYHĽADÁVANIE NA WEBE
//
// GET /api/hladat?q=text - jeden dotaz prehľadá verejný obsah webu:
// články, stránky, hráčov, tímy, videá, galérie, dokumenty a produkty
// fanshopu. Vracia len zverejnené záznamy a len údaje potrebné na
// zobrazenie výsledku (názov, odkaz, obrázok, krátky popis).

import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { Op } from 'sequelize';
import Article from '../models/Article';
import Page from '../models/Page';
import Player from '../models/Player';
import Team from '../models/Team';
import Video from '../models/Video';
import Galeria from '../models/Galeria';
import Dokument from '../models/Dokument';
import NastaveniaKlubu from '../models/NastaveniaKlubu';
import { EshopProdukt } from '../models/Eshop';

const router = Router();

/** Vyhľadávanie je náročnejší dotaz - najviac 60 za minútu z jednej adresy. */
const limit = rateLimit({ windowMs: 60 * 1000, max: 60, standardHeaders: true, legacyHeaders: false });

export interface VysledokHladania {
  typ: 'clanok' | 'stranka' | 'hrac' | 'tim' | 'video' | 'galeria' | 'dokument' | 'produkt';
  id: number;
  nazov: string;
  odkaz: string;
  popis: string | null;
  obrazok: string | null;
}

/** Krátky text bez HTML okolo prvého výskytu hľadaného slova. */
const ukazka = (html: string | null | undefined, hladane: string, dlzka = 160): string | null => {
  if (!html) return null;
  const text = html.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
  if (!text) return null;
  const poz = text.toLowerCase().indexOf(hladane.toLowerCase());
  const od = poz > 60 ? poz - 60 : 0;
  const vyrez = text.slice(od, od + dlzka);
  return `${od > 0 ? '…' : ''}${vyrez}${od + dlzka < text.length ? '…' : ''}`;
};

router.get('/hladat', limit, async (req: Request, res: Response) => {
  try {
    const q = String(req.query.q ?? '').trim().slice(0, 80);
    if (q.length < 2) {
      res.status(400).json({ success: false, message: 'Zadajte aspoň 2 znaky' });
      return;
    }
    const naTyp = Math.min(Math.max(Number(req.query.limit) || 6, 1), 20);
    const vzor = `%${q.replace(/[%_\\]/g, (z) => `\\${z}`)}%`;
    const obsahuje = { [Op.iLike]: vzor };

    const [clanky, stranky, hraci, timy, videa, galerie, dokumenty, nastavenia] = await Promise.all([
      Article.findAll({
        where: { status: 'published', [Op.or]: [{ nazov: obsahuje }, { excerpt: obsahuje }, { obsah: obsahuje }] },
        attributes: ['id', 'nazov', 'slug', 'excerpt', 'obsah', 'obrazok', 'publikovany_datum'],
        order: [['publikovany_datum', 'DESC']],
        limit: naTyp,
      }),
      Page.findAll({
        where: { publikovany: true, [Op.or]: [{ nazov: obsahuje }, { obsah: obsahuje }] },
        attributes: ['id', 'nazov', 'slug', 'obsah', 'meta_description'],
        limit: naTyp,
      }),
      Player.findAll({
        where: {
          aktivity: true,
          [Op.or]: [{ meno: obsahuje }, { priezvisko: obsahuje }, { pozicia: obsahuje }],
        },
        // Len meno, číslo a tím - fotky maloletých sa bez súhlasu neukazujú
        attributes: ['id', 'meno', 'priezvisko', 'cislo_dresu', 'pozicia'],
        limit: naTyp,
      }),
      Team.findAll({ where: { aktivity: true, nazov: obsahuje }, attributes: ['id', 'nazov', 'logo', 'vekova_kategoria'], limit: naTyp }),
      Video.findAll({
        where: { publikovane: true, [Op.or]: [{ nazov: obsahuje }, { popis: obsahuje }] },
        attributes: ['id', 'nazov', 'popis', 'url', 'nahlad'],
        limit: naTyp,
      }),
      Galeria.findAll({
        where: { aktivity: true, zobrazit_na_webe: true, [Op.or]: [{ nazov: obsahuje }, { popis: obsahuje }] },
        attributes: ['id', 'nazov', 'popis', 'nahladovy_obrazok'],
        limit: naTyp,
      }),
      Dokument.findAll({
        where: { aktivity: true, verejny: true, [Op.or]: [{ nazov: obsahuje }, { popis: obsahuje }] },
        attributes: ['id', 'nazov', 'popis'],
        limit: naTyp,
      }),
      NastaveniaKlubu.nacitaj(),
    ]);

    // Produkty len pri zapnutom obchode
    const obchod = Boolean((nastavenia as any).nastavenia_eshopu?.zapnuty);
    const produkty = obchod
      ? await EshopProdukt.findAll({
          where: { aktivny: true, [Op.or]: [{ nazov: obsahuje }, { popis: obsahuje }] },
          attributes: ['id', 'nazov', 'slug', 'popis', 'obrazok'],
          limit: naTyp,
        })
      : [];

    const vysledky: VysledokHladania[] = [
      ...stranky.map((s) => ({ typ: 'stranka' as const, id: s.id, nazov: s.nazov, odkaz: `/${s.slug}`, popis: ukazka(s.obsah, q) || s.meta_description || null, obrazok: null })),
      ...clanky.map((c) => ({ typ: 'clanok' as const, id: c.id, nazov: c.nazov, odkaz: `/clanek/${c.slug}`, popis: c.excerpt || ukazka(c.obsah, q), obrazok: c.obrazok ?? null })),
      ...timy.map((t) => ({ typ: 'tim' as const, id: t.id, nazov: t.nazov, odkaz: `/teams/${t.id}`, popis: t.vekova_kategoria || null, obrazok: t.logo ?? null })),
      ...hraci.map((h) => ({
        typ: 'hrac' as const,
        id: h.id,
        nazov: `${h.meno} ${h.priezvisko}`,
        odkaz: `/players/${h.id}`,
        popis: [h.cislo_dresu ? `#${h.cislo_dresu}` : null, h.pozicia].filter(Boolean).join(' · ') || null,
        obrazok: null,
      })),
      ...videa.map((v) => ({ typ: 'video' as const, id: v.id, nazov: v.nazov, odkaz: v.url, popis: ukazka(v.popis, q), obrazok: v.nahlad ?? null })),
      ...galerie.map((g) => ({ typ: 'galeria' as const, id: g.id, nazov: g.nazov, odkaz: `/galleries/${g.id}`, popis: ukazka(g.popis, q), obrazok: g.nahladovy_obrazok ?? null })),
      ...dokumenty.map((d) => ({ typ: 'dokument' as const, id: d.id, nazov: d.nazov, odkaz: `/api/documents/${d.id}/download`, popis: ukazka(d.popis, q), obrazok: null })),
      ...produkty.map((p) => ({ typ: 'produkt' as const, id: p.id, nazov: p.nazov, odkaz: `/obchod/${p.slug}`, popis: ukazka(p.popis, q), obrazok: p.obrazok ?? null })),
    ];

    res.json({ success: true, data: vysledky, message: `Nájdených ${vysledky.length} výsledkov` });
  } catch (chyba) {
    console.error('Chyba pri vyhľadávaní:', chyba);
    res.status(500).json({ success: false, message: 'Vyhľadávanie sa nepodarilo' });
  }
});

export default router;
