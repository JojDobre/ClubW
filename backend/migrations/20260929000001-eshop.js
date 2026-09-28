// Umiestnenie: backend/migrations/20260929000001-eshop.js
//
// PREČO VZNIKLA: šablóna Klubová má na úvode fanshop, ale klub nemal kde
// spravovať produkty ani prijímať objednávky. Migrácia pridáva e-shop:
//
//   eshop_kategorie   - kategórie produktov (Dresy, Doplnky...)
//   eshop_produkty    - produkty; vlastnosti (veľkosť, meno na dres...)
//                       sú JSON so zoznamom hodnôt, príplatkov a skladu
//   eshop_dorucenia   - spôsoby doručenia s cenou a dopravou zadarmo od
//   eshop_platby      - spôsoby platby (prevod, dobierka, hotovosť,
//                       platobná brána s vlastným HTML kódom)
//   eshop_objednavky  - objednávky s údajmi zákazníka a súhrnom cien
//   eshop_polozky     - položky objednávky (kópia názvu a ceny v čase
//                       nákupu - zmena produktu nemení starú objednávku)
//
// Nastavenia obchodu sú JSON stĺpec v nastavenia_klubu. Obchod je po
// migrácii VYPNUTÝ - správca ho zapne, keď má produkty a spôsoby platby.

'use strict';

const stlpecExistuje = async (queryInterface, tabulka, stlpec) => {
  const [riadky] = await queryInterface.sequelize.query(
    `SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = '${tabulka}' AND column_name = '${stlpec}'`
  );
  return riadky.length > 0;
};

module.exports = {
  async up(queryInterface) {
    const q = (sql) => queryInterface.sequelize.query(sql);

    await q(`
      CREATE TABLE IF NOT EXISTS "eshop_kategorie" (
        "id" SERIAL PRIMARY KEY,
        "nazov" VARCHAR(100) NOT NULL,
        "slug" VARCHAR(120) NOT NULL UNIQUE,
        "popis" TEXT,
        "poradie" INTEGER NOT NULL DEFAULT 0,
        "aktivity" BOOLEAN NOT NULL DEFAULT true,
        "vytvorena" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "aktualizovana" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await q(`
      CREATE TABLE IF NOT EXISTS "eshop_produkty" (
        "id" SERIAL PRIMARY KEY,
        "nazov" VARCHAR(150) NOT NULL,
        "slug" VARCHAR(170) NOT NULL UNIQUE,
        "kategoria_id" INTEGER REFERENCES "eshop_kategorie" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
        "kratky_popis" VARCHAR(300),
        "popis" TEXT,
        "cena" DECIMAL(10, 2) NOT NULL DEFAULT 0 CHECK ("cena" >= 0),
        "povodna_cena" DECIMAL(10, 2) CHECK ("povodna_cena" IS NULL OR "povodna_cena" >= 0),
        "obrazok" VARCHAR(255),
        "obrazky" JSONB NOT NULL DEFAULT '[]',
        "vlastnosti" JSONB NOT NULL DEFAULT '[]',
        "sklad" INTEGER CHECK ("sklad" IS NULL OR "sklad" >= 0),
        "kod" VARCHAR(60),
        "odporucany" BOOLEAN NOT NULL DEFAULT false,
        "aktivny" BOOLEAN NOT NULL DEFAULT true,
        "poradie" INTEGER NOT NULL DEFAULT 0,
        "vytvoreny" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "aktualizovany" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await q(`CREATE INDEX IF NOT EXISTS "eshop_produkty_kategoria" ON "eshop_produkty" ("kategoria_id")`);
    await q(`CREATE INDEX IF NOT EXISTS "eshop_produkty_aktivny_poradie" ON "eshop_produkty" ("aktivny", "poradie")`);

    await q(`
      CREATE TABLE IF NOT EXISTS "eshop_dorucenia" (
        "id" SERIAL PRIMARY KEY,
        "nazov" VARCHAR(100) NOT NULL,
        "popis" VARCHAR(300),
        "cena" DECIMAL(10, 2) NOT NULL DEFAULT 0 CHECK ("cena" >= 0),
        "zadarmo_od" DECIMAL(10, 2) CHECK ("zadarmo_od" IS NULL OR "zadarmo_od" >= 0),
        "vyzaduje_adresu" BOOLEAN NOT NULL DEFAULT true,
        "aktivny" BOOLEAN NOT NULL DEFAULT true,
        "poradie" INTEGER NOT NULL DEFAULT 0,
        "vytvorene" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "aktualizovane" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await q(`
      CREATE TABLE IF NOT EXISTS "eshop_platby" (
        "id" SERIAL PRIMARY KEY,
        "nazov" VARCHAR(100) NOT NULL,
        "popis" VARCHAR(300),
        "typ" VARCHAR(20) NOT NULL DEFAULT 'prevod'
          CHECK ("typ" IN ('prevod', 'dobierka', 'hotovost', 'brana', 'ine')),
        "poplatok" DECIMAL(10, 2) NOT NULL DEFAULT 0 CHECK ("poplatok" >= 0),
        "pokyny" TEXT,
        "brana_html" TEXT,
        "brana_kluc" VARCHAR(64),
        "dorucenia" JSONB NOT NULL DEFAULT '[]',
        "aktivny" BOOLEAN NOT NULL DEFAULT true,
        "poradie" INTEGER NOT NULL DEFAULT 0,
        "vytvorena" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "aktualizovana" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await q(`
      CREATE TABLE IF NOT EXISTS "eshop_objednavky" (
        "id" SERIAL PRIMARY KEY,
        "cislo" VARCHAR(20) NOT NULL UNIQUE,
        "token" VARCHAR(64) NOT NULL UNIQUE,
        "stav" VARCHAR(20) NOT NULL DEFAULT 'nova'
          CHECK ("stav" IN ('nova', 'potvrdena', 'pripravena', 'odoslana', 'vybavena', 'zrusena')),
        "stav_platby" VARCHAR(20) NOT NULL DEFAULT 'neuhradena'
          CHECK ("stav_platby" IN ('neuhradena', 'uhradena', 'vratena')),
        "meno" VARCHAR(150) NOT NULL,
        "email" VARCHAR(150) NOT NULL,
        "telefon" VARCHAR(40),
        "ulica" VARCHAR(200),
        "mesto" VARCHAR(100),
        "psc" VARCHAR(20),
        "krajina" VARCHAR(80),
        "poznamka" TEXT,
        "dorucenie_id" INTEGER REFERENCES "eshop_dorucenia" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
        "dorucenie_nazov" VARCHAR(100) NOT NULL,
        "dorucenie_cena" DECIMAL(10, 2) NOT NULL DEFAULT 0,
        "platba_id" INTEGER REFERENCES "eshop_platby" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
        "platba_nazov" VARCHAR(100) NOT NULL,
        "platba_typ" VARCHAR(20) NOT NULL,
        "platba_poplatok" DECIMAL(10, 2) NOT NULL DEFAULT 0,
        "medzisucet" DECIMAL(10, 2) NOT NULL DEFAULT 0,
        "spolu" DECIMAL(10, 2) NOT NULL DEFAULT 0,
        "mena" VARCHAR(3) NOT NULL DEFAULT 'EUR',
        "variabilny_symbol" VARCHAR(10) NOT NULL,
        "platba_referencia" VARCHAR(120),
        "uhradena" TIMESTAMP WITH TIME ZONE,
        "sklad_vrateny" BOOLEAN NOT NULL DEFAULT false,
        "poznamka_interna" TEXT,
        "vytvorena" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "aktualizovana" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await q(`CREATE INDEX IF NOT EXISTS "eshop_objednavky_stav" ON "eshop_objednavky" ("stav", "vytvorena")`);
    await q(`CREATE INDEX IF NOT EXISTS "eshop_objednavky_email" ON "eshop_objednavky" ("email")`);

    await q(`
      CREATE TABLE IF NOT EXISTS "eshop_polozky" (
        "id" SERIAL PRIMARY KEY,
        "objednavka_id" INTEGER NOT NULL REFERENCES "eshop_objednavky" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        "produkt_id" INTEGER REFERENCES "eshop_produkty" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
        "nazov" VARCHAR(150) NOT NULL,
        "kod" VARCHAR(60),
        "vlastnosti" JSONB NOT NULL DEFAULT '[]',
        "cena_za_kus" DECIMAL(10, 2) NOT NULL,
        "pocet" INTEGER NOT NULL CHECK ("pocet" > 0),
        "spolu" DECIMAL(10, 2) NOT NULL
      )
    `);
    await q(`CREATE INDEX IF NOT EXISTS "eshop_polozky_objednavka" ON "eshop_polozky" ("objednavka_id")`);

    if (!(await stlpecExistuje(queryInterface, 'nastavenia_klubu', 'nastavenia_eshopu'))) {
      await q(`ALTER TABLE "nastavenia_klubu" ADD COLUMN "nastavenia_eshopu" JSONB NOT NULL DEFAULT '{}'`);
    }

    // Redaktor smie spravovať produkty a objednávky (nie mazať) - správca
    // to v Rolách môže zmeniť. Ostatným rolám sa nový modul neotvorí.
    await q(`
      UPDATE "roly" SET "opravnenia" = "opravnenia" || '{"eshop": {"citat": true, "pisat": true, "mazat": false}}'::jsonb
       WHERE "kod" = 'redaktor' AND ("opravnenia" -> 'eshop') IS NULL
    `);

    // Predvolené spôsoby doručenia a platby - správca ich upraví alebo zmaže
    const [dorucenia] = await q(`SELECT COUNT(*)::int AS pocet FROM "eshop_dorucenia"`);
    if (dorucenia[0].pocet === 0) {
      await q(`
        INSERT INTO "eshop_dorucenia" ("nazov", "popis", "cena", "vyzaduje_adresu", "poradie") VALUES
          ('Osobný odber v klube', 'Vyzdvihnutie na štadióne po dohode', 0, false, 1),
          ('Kuriér na adresu', 'Doručenie do 2 - 3 pracovných dní', 4.90, true, 2)
      `);
    }
    const [platby] = await q(`SELECT COUNT(*)::int AS pocet FROM "eshop_platby"`);
    if (platby[0].pocet === 0) {
      await q(`
        INSERT INTO "eshop_platby" ("nazov", "popis", "typ", "poplatok", "pokyny", "poradie") VALUES
          ('Bankový prevod', 'Objednávku odošleme po prijatí platby', 'prevod', 0,
           'Sumu {{suma_text}} {{mena}} pošlite na účet {{iban}}, variabilný symbol {{vs}}.', 1),
          ('Hotovosť pri odbere', 'Zaplatíte pri vyzdvihnutí v klube', 'hotovost', 0, NULL, 2)
      `);
      // Hotovosť dáva zmysel len pri osobnom odbere
      await q(`
        UPDATE "eshop_platby" SET "dorucenia" = COALESCE(
          (SELECT jsonb_agg("id") FROM "eshop_dorucenia" WHERE "vyzaduje_adresu" = false), '[]'
        ) WHERE "typ" = 'hotovost'
      `);
    }
  },

  async down(queryInterface) {
    const q = (sql) => queryInterface.sequelize.query(sql);
    await q(`DROP TABLE IF EXISTS "eshop_polozky" CASCADE`);
    await q(`DROP TABLE IF EXISTS "eshop_objednavky" CASCADE`);
    await q(`DROP TABLE IF EXISTS "eshop_platby" CASCADE`);
    await q(`DROP TABLE IF EXISTS "eshop_dorucenia" CASCADE`);
    await q(`DROP TABLE IF EXISTS "eshop_produkty" CASCADE`);
    await q(`DROP TABLE IF EXISTS "eshop_kategorie" CASCADE`);
    await q(`ALTER TABLE "nastavenia_klubu" DROP COLUMN IF EXISTS "nastavenia_eshopu"`);
  },
};
