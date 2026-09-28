// Umiestnenie: backend/tests/integration/eshop.test.ts
// E-shop: vlastnosti produktu, výpočet ceny, objednávka so skladom,
// doprava zadarmo, zatvorený obchod, vrátenie na sklad a oznámenie
// od platobnej brány.
//
// Vyžadujú bežiacu databázu (npm run db:migrate na testovacej DB).

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express from 'express';
import request from 'supertest';
import sequelize from '../../src/config/database';
import '../../src/models';
import NastaveniaKlubu from '../../src/models/NastaveniaKlubu';
import { EshopDorucenie, EshopObjednavka, EshopPlatba, EshopProdukt } from '../../src/models/Eshop';
import { ChybaEshopu, ocistiVlastnosti, vratNaSklad, vypocitajPolozku, vytvorObjednavku, nahradZnacky, slugZNazvu } from '../../src/services/eshop';
import { verejnyEshopRouter } from '../../src/routes/eshop';

const P = `E${Date.now()}`;
const app = express();
app.use(express.json());
app.use('/api/eshop', verejnyEshopRouter);

let dres: EshopProdukt, sal: EshopProdukt, kurier: EshopDorucenie, odber: EshopDorucenie, prevod: EshopPlatba, brana: EshopPlatba;
let povodneNastavenia: Record<string, unknown>;
const objednavky: number[] = [];

const zakaznik = {
  meno: 'Ján Fanúšik',
  email: 'jan@example.com',
  telefon: '0900 123 456',
  ulica: 'Hlavná 1',
  mesto: 'Dolina',
  psc: '900 01',
};

const nastavObchod = async (hodnoty: Record<string, unknown>) => {
  const n = await NastaveniaKlubu.nacitaj();
  n.nastavenia_eshopu = { ...(n.nastavenia_eshopu || {}), ...hodnoty };
  n.changed('nastavenia_eshopu', true);
  await n.save();
};

beforeAll(async () => {
  await sequelize.authenticate();
  povodneNastavenia = { ...((await NastaveniaKlubu.nacitaj()).nastavenia_eshopu || {}) };
  await nastavObchod({ zapnuty: true, mena: 'EUR', podmienky_url: null, minimalna_objednavka: 0 });

  dres = await EshopProdukt.create({
    nazov: `${P} Dres`,
    slug: `${P.toLowerCase()}-dres`,
    cena: 49.9,
    sklad: 10,
    vlastnosti: ocistiVlastnosti([
      { id: 'velkost', nazov: 'Veľkosť', typ: 'vyber', hodnoty: [{ id: 'm', nazov: 'M', sklad: 3 }, { id: 'xl', nazov: 'XL', priplatok: 2, sklad: 1 }] },
      { id: 'meno', nazov: 'Meno na dres', typ: 'text', priplatok: 5, max_dlzka: 12 },
    ]),
  });
  sal = await EshopProdukt.create({ nazov: `${P} Šál`, slug: `${P.toLowerCase()}-sal`, cena: 15, sklad: null });
  kurier = await EshopDorucenie.create({ nazov: `${P} Kuriér`, cena: 4.9, zadarmo_od: 60, vyzaduje_adresu: true });
  odber = await EshopDorucenie.create({ nazov: `${P} Odber`, cena: 0, vyzaduje_adresu: false });
  prevod = await EshopPlatba.create({ nazov: `${P} Prevod`, typ: 'prevod', pokyny: 'Pošlite {{suma}} {{mena}}, VS {{vs}}' });
  brana = await EshopPlatba.create({
    nazov: `${P} Karta`,
    typ: 'brana',
    poplatok: 1,
    brana_kluc: 'tajny-kluc-123',
    brana_html: '<form data-suma="{{suma}}" data-meno="{{meno}}"></form>',
    dorucenia: [odber.id],
  });
});

afterAll(async () => {
  await EshopObjednavka.destroy({ where: { id: objednavky } });
  await EshopProdukt.destroy({ where: { id: [dres.id, sal.id] } });
  await EshopPlatba.destroy({ where: { id: [prevod.id, brana.id] } });
  await EshopDorucenie.destroy({ where: { id: [kurier.id, odber.id] } });
  const n = await NastaveniaKlubu.nacitaj();
  n.nastavenia_eshopu = povodneNastavenia;
  n.changed('nastavenia_eshopu', true);
  await n.save();
  await sequelize.close();
});

describe('vlastnosti a cena', () => {
  it('odmietne vlastnosť bez hodnôt a duplicitnú hodnotu', () => {
    expect(() => ocistiVlastnosti([{ nazov: 'Veľkosť', typ: 'vyber', hodnoty: [] }])).toThrow(ChybaEshopu);
    expect(() => ocistiVlastnosti([{ nazov: 'Veľkosť', hodnoty: [{ nazov: 'M' }, { nazov: 'm' }] }])).toThrow(/dvakrát/);
  });

  it('pripočíta príplatok hodnoty aj textu a vyžaduje povinnú voľbu', () => {
    expect(vypocitajPolozku(dres, { velkost: 'xl', meno: 'NOVÁK 9' }).cena_za_kus).toBe(56.9);
    expect(vypocitajPolozku(dres, { velkost: 'm' }).cena_za_kus).toBe(49.9);
    expect(() => vypocitajPolozku(dres, {})).toThrow(/Veľkosť/);
    expect(() => vypocitajPolozku(dres, { velkost: 'm', meno: 'PRÍLIŠ DLHÉ MENO NA DRES' })).toThrow(/najviac 12/);
  });

  it('adresa produktu rozdelí slová aj na interpunkcii', () => {
    expect(slugZNazvu('Domáci dres 2026/27')).toBe('domaci-dres-2026-27');
    expect(slugZNazvu('  Šál & čiapka!  ')).toBe('sal-ciapka');
    expect(slugZNazvu('???')).toBe('polozka');
  });

  it('nahradí značky a v HTML escapuje hodnoty', () => {
    expect(nahradZnacky('{{a}} {{b}} {{x}}', { a: '1', b: '<b>' })).toBe('1 <b> {{x}}');
    expect(nahradZnacky('{{b}}', { b: '<b>"' }, true)).toBe('&lt;b&gt;&quot;');
  });
});

describe('objednávka', () => {
  it('prepočíta ceny na serveri, zníži sklad a dá dopravu zadarmo od sumy', async () => {
    const o = await vytvorObjednavku({
      ...zakaznik,
      polozky: [
        { produkt_id: dres.id, pocet: 1, volby: { velkost: 'xl', meno: 'NOVÁK' } },
        { produkt_id: sal.id, pocet: 1 },
      ],
      dorucenie_id: kurier.id,
      platba_id: prevod.id,
    });
    objednavky.push(o.id);
    expect(Number(o.medzisucet)).toBe(71.9);
    expect(Number(o.dorucenie_cena)).toBe(0);
    expect(Number(o.spolu)).toBe(71.9);
    expect(o.cislo).toMatch(new RegExp(`^${new Date().getFullYear()}\\d{4}$`));
    expect(o.polozky).toHaveLength(2);

    await dres.reload();
    expect(dres.sklad).toBe(9);
    expect(dres.vlastnosti[0].hodnoty.find((h) => h.id === 'xl')!.sklad).toBe(0);
  });

  it('nepredá vypredanú veľkosť a nezmení sklad pri chybe', async () => {
    await expect(
      vytvorObjednavku({ ...zakaznik, polozky: [{ produkt_id: dres.id, pocet: 1, volby: { velkost: 'xl' } }], dorucenie_id: kurier.id, platba_id: prevod.id })
    ).rejects.toThrow(/vypredaný/);
    await expect(
      vytvorObjednavku({ ...zakaznik, polozky: [{ produkt_id: dres.id, pocet: 4, volby: { velkost: 'm' } }], dorucenie_id: kurier.id, platba_id: prevod.id })
    ).rejects.toThrow(/zostáva už len 3/);
    await dres.reload();
    expect(dres.sklad).toBe(9);
  });

  it('kontroluje adresu a povolené doručenie platby', async () => {
    await expect(
      vytvorObjednavku({ meno: 'Ján', email: 'jan@example.com', polozky: [{ produkt_id: sal.id, pocet: 1 }], dorucenie_id: kurier.id, platba_id: prevod.id })
    ).rejects.toThrow(/ulicu, mesto a PSČ/);
    await expect(
      vytvorObjednavku({ ...zakaznik, polozky: [{ produkt_id: sal.id, pocet: 1 }], dorucenie_id: kurier.id, platba_id: brana.id })
    ).rejects.toThrow(/nemožno použiť/);
  });

  it('pri zrušení vráti tovar na sklad len raz', async () => {
    const o = await vytvorObjednavku({
      meno: 'Eva',
      email: 'eva@example.com',
      polozky: [{ produkt_id: dres.id, pocet: 2, volby: { velkost: 'm' } }],
      dorucenie_id: odber.id,
      platba_id: prevod.id,
    });
    objednavky.push(o.id);
    await dres.reload();
    expect(dres.sklad).toBe(7);
    expect(dres.vlastnosti[0].hodnoty.find((h) => h.id === 'm')!.sklad).toBe(1);

    await sequelize.transaction((t) => vratNaSklad(o, t));
    await sequelize.transaction((t) => vratNaSklad(o, t));
    await dres.reload();
    expect(dres.sklad).toBe(9);
    expect(dres.vlastnosti[0].hodnoty.find((h) => h.id === 'm')!.sklad).toBe(3);
  });
});

describe('verejné API', () => {
  it('zatvorený obchod neukáže produkty a neprijme objednávku', async () => {
    await nastavObchod({ zapnuty: false });
    const produkty = await request(app).get('/api/eshop/produkty');
    expect(produkty.body.data).toEqual([]);
    const odpoved = await request(app)
      .post('/api/eshop/objednavky')
      .send({ ...zakaznik, polozky: [{ produkt_id: sal.id, pocet: 1 }], dorucenie_id: odber.id, platba_id: prevod.id });
    expect(odpoved.status).toBe(403);
    await nastavObchod({ zapnuty: true });
  });

  it('objednávka cez API, stav cez tajný odkaz s pokynmi a kódom brány', async () => {
    const odpoved = await request(app)
      .post('/api/eshop/objednavky')
      .send({ ...zakaznik, meno: 'Peter <b>', polozky: [{ produkt_id: sal.id, pocet: 2 }], dorucenie_id: odber.id, platba_id: brana.id });
    expect(odpoved.status).toBe(201);
    const { token, cislo } = odpoved.body.data;
    const o = await EshopObjednavka.findOne({ where: { cislo } });
    objednavky.push(o!.id);

    const stav = await request(app).get(`/api/eshop/objednavky/${token}`);
    expect(stav.body.data.spolu).toBe(31);
    expect(stav.body.data.brana_html).toContain('data-suma="31.00"');
    expect(stav.body.data.brana_html).not.toContain('<b>');
    expect((await request(app).get('/api/eshop/objednavky/nespravny')).status).toBe(404);

    // Oznámenie od brány: zlý kľúč odmietne, správny označí objednávku ako zaplatenú
    expect((await request(app).post(`/api/eshop/platby/${brana.id}/oznamenie`).send({ cislo, stav: 'paid', kluc: 'zly' })).status).toBe(401);
    const oznamenie = await request(app)
      .post(`/api/eshop/platby/${brana.id}/oznamenie`)
      .set('X-ClubW-Kluc', 'tajny-kluc-123')
      .send({ vs: cislo, stav: 'paid', referencia: 'TX-1' });
    expect(oznamenie.body.data.stav_platby).toBe('uhradena');
    await o!.reload();
    expect(o!.stav).toBe('potvrdena');
    expect(o!.platba_referencia).toBe('TX-1');

    const poZaplateni = await request(app).get(`/api/eshop/objednavky/${token}`);
    expect(poZaplateni.body.data.brana_html).toBeNull();
  });
});
