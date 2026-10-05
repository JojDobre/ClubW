// Umiestnenie: backend/tests/integration/suboryGalerie.test.ts
// Mazanie fotiek galérie aj z disku: nahratá fotka zmizne spolu
// s náhľadmi, súbor z knižnice médií ostane, trvalé zmazanie galérie
// z archívu uprace jej súbory.
//
// Vyžadujú bežiacu databázu (npm run db:migrate na testovacej DB).

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express from 'express';
import request from 'supertest';
import path from 'path';
import { existsSync, promises as fs } from 'fs';
import sharp from 'sharp';
import sequelize from '../../src/config/database';
import models from '../../src/models';
import {
  uploadImages,
  uploadGalleryImages,
  deleteGalleryImage,
  pridajZKniznice,
} from '../../src/controllers/galeriaObrazokController';
import { deleteGallery } from '../../src/controllers/galeriaController';
import { zmazTrvalo } from '../../src/controllers/archivController';

const { Galeria, GaleriaObrazok, Media } = models as any;

const P = `sg${Date.now()}`;
const naDisku = (cesta: string) => existsSync(path.join(process.cwd(), cesta));
const KNIZNICA = `/uploads/media/test-${P}/kniznica.jpg`;

const app = express();
app.use(express.json());
app.post('/galerie/:id/images', (req, res) =>
  uploadImages(req, res, (err: unknown) => (err ? res.status(400).json({ err: String(err) }) : uploadGalleryImages(req, res)))
);
app.post('/galerie/:id/kniznica', pridajZKniznice);
app.delete('/galerie/:galleryId/images/:imageId', deleteGalleryImage);
app.delete('/galerie/:id', deleteGallery);
app.delete('/archiv/:typ/:id', zmazTrvalo);

let jpg: Buffer;
let media: any;
const galerie: any[] = [];

const novaGaleria = async (nazov: string) => {
  const g = await Galeria.create({ nazov: `${P} ${nazov}`, slug: `${P}-${nazov}` });
  galerie.push(g);
  return g;
};

const nahraj = async (galeriaId: number) => {
  const odpoved = await request(app).post(`/galerie/${galeriaId}/images`).attach('images', jpg, 'fotka.jpg');
  expect(odpoved.status).toBe(201);
  return GaleriaObrazok.findOne({ where: { galeria_id: galeriaId }, order: [['id', 'DESC']] });
};

beforeAll(async () => {
  await sequelize.authenticate();
  jpg = await sharp({ create: { width: 800, height: 600, channels: 3, background: '#2f6bff' } }).jpeg().toBuffer();
  await fs.mkdir(path.dirname(path.join(process.cwd(), KNIZNICA)), { recursive: true });
  await fs.writeFile(path.join(process.cwd(), KNIZNICA), jpg);
  media = await Media.create({
    nazov: `${P} knižnica`,
    originalny_nazov: 'kniznica.jpg',
    nazov_suboru: 'kniznica.jpg',
    cesta: KNIZNICA,
    typ: 'obrazok',
    mime_typ: 'image/jpeg',
    velkost: jpg.length,
  });
});

afterAll(async () => {
  for (const g of galerie) await Galeria.destroy({ where: { id: g.id } });
  if (media) await Media.destroy({ where: { id: media.id }, force: true });
  await fs.rm(path.join(process.cwd(), path.dirname(KNIZNICA)), { recursive: true, force: true });
});

describe('mazanie súborov galérie', () => {
  it('zmazaná fotka zmizne z disku aj s náhľadmi', async () => {
    const g = await novaGaleria('jedna');
    const fotka = await nahraj(g.id);
    const cesty = [fotka.cesta_suboru, fotka.nahladovy_maly, fotka.nahladovy_stredny];
    expect(cesty.every(naDisku)).toBe(true);

    const odpoved = await request(app).delete(`/galerie/${g.id}/images/${fotka.id}`);
    expect(odpoved.status).toBe(200);
    expect(cesty.some(naDisku)).toBe(false);
    expect(await GaleriaObrazok.count({ where: { id: fotka.id } })).toBe(0);
    // Prázdny priečinok galérie tiež zmizol
    expect(naDisku(path.posix.dirname(fotka.cesta_suboru))).toBe(false);
  });

  it('súbor z knižnice médií po odobratí z galérie ostane', async () => {
    const g = await novaGaleria('kniznica');
    const odpoved = await request(app).post(`/galerie/${g.id}/kniznica`).send({ media_ids: [media.id] });
    expect(odpoved.status).toBe(201);
    const fotka = await GaleriaObrazok.findOne({ where: { galeria_id: g.id } });

    await request(app).delete(`/galerie/${g.id}/images/${fotka.id}`).expect(200);
    expect(naDisku(KNIZNICA)).toBe(true);
  });

  it('archivovaná galéria si súbory nechá, trvalé zmazanie ich uprace', async () => {
    const g = await novaGaleria('archiv');
    const fotka = await nahraj(g.id);

    await request(app).delete(`/galerie/${g.id}`).expect(200);
    expect(naDisku(fotka.cesta_suboru)).toBe(true);

    await request(app).delete(`/archiv/galerie/${g.id}`).expect(200);
    expect(naDisku(fotka.cesta_suboru)).toBe(false);
    expect(naDisku(fotka.nahladovy_stredny)).toBe(false);
    expect(await Galeria.count({ where: { id: g.id } })).toBe(0);
  });
});
