// Umiestnenie: license-server/migrations/20260927000000-sprava.js
// Administrácia licenčného servera: produkty, verzie z GitHubu,
// príkazy na aktualizáciu, administrátori, relácie a záznam udalostí.
//
// Licencie dostanú väzbu na produkt (doterajšie patria produktu ClubW),
// nainštalovanú verziu a údaje o inštalácii, ktoré posiela klientsky web.
// Plán licencie už nie je pevný ENUM (pro/enterprise) - plány si definuje
// každý produkt sám.

'use strict';

module.exports = {
  async up(queryInterface) {
    const q = (sql) => queryInterface.sequelize.query(sql);

    await q(`
      CREATE TABLE IF NOT EXISTS "produkty" (
        "id" SERIAL PRIMARY KEY,
        -- Krátky kód produktu, napr. clubw
        "kod" VARCHAR(40) NOT NULL UNIQUE,
        "nazov" VARCHAR(120) NOT NULL,
        "popis" TEXT,
        -- Repozitár na GitHube v tvare vlastnik/repozitar
        "github_repo" VARCHAR(200),
        -- Plány produktu: [{ kod, nazov, mesiacov, funkcie: [] }]
        "plany" JSONB NOT NULL DEFAULT '[]'::jsonb,
        "aktualna_verzia_id" INTEGER,
        -- Staršie verzie dostanú aktualizáciu označenú ako povinnú
        "minimalna_verzia" VARCHAR(40),
        "aktivny" BOOLEAN NOT NULL DEFAULT TRUE,
        "vytvoreny" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "aktualizovany" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);

    await q(`
      CREATE TABLE IF NOT EXISTS "verzie" (
        "id" SERIAL PRIMARY KEY,
        "produkt_id" INTEGER NOT NULL REFERENCES "produkty" ("id") ON DELETE CASCADE,
        -- Verzia bez predpony v (1.2.0), tag tak, ako je na GitHube (v1.2.0)
        "verzia" VARCHAR(40) NOT NULL,
        "tag" VARCHAR(100) NOT NULL,
        "nazov" VARCHAR(200),
        "poznamky" TEXT,
        "publikovana" TIMESTAMP WITH TIME ZONE,
        "predbezna" BOOLEAN NOT NULL DEFAULT FALSE,
        -- Odkiaľ verzia prišla: release, tag alebo rucne
        "zdroj" VARCHAR(20) NOT NULL DEFAULT 'rucne',
        "commit_sha" VARCHAR(64),
        -- Balík na stiahnutie klientmi: stav, kontrolný súčet, veľkosť
        "balik_stav" VARCHAR(20) NOT NULL DEFAULT 'ziadny',
        "balik_sha256" VARCHAR(64),
        "balik_velkost" BIGINT,
        "balik_chyba" TEXT,
        "vytvorena" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "aktualizovana" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        CONSTRAINT "verzie_produkt_tag_unique" UNIQUE ("produkt_id", "tag")
      );
    `);

    await q(`
      DO $$ BEGIN
        ALTER TABLE "produkty" ADD CONSTRAINT "produkty_aktualna_verzia_fk"
          FOREIGN KEY ("aktualna_verzia_id") REFERENCES "verzie" ("id") ON DELETE SET NULL;
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);

    await q(`
      CREATE TABLE IF NOT EXISTS "administratori" (
        "id" SERIAL PRIMARY KEY,
        "email" VARCHAR(200) NOT NULL UNIQUE,
        "meno" VARCHAR(120) NOT NULL,
        -- scrypt: sol a odvodený kľúč
        "heslo_hash" VARCHAR(300) NOT NULL,
        -- Dvojstupňové overenie (TOTP)
        "totp_tajomstvo" VARCHAR(64),
        "totp_aktivne" BOOLEAN NOT NULL DEFAULT FALSE,
        "aktivny" BOOLEAN NOT NULL DEFAULT TRUE,
        "posledne_prihlasenie" TIMESTAMP WITH TIME ZONE,
        "vytvoreny" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "aktualizovany" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);

    await q(`
      CREATE TABLE IF NOT EXISTS "relacie" (
        "id" SERIAL PRIMARY KEY,
        "administrator_id" INTEGER NOT NULL REFERENCES "administratori" ("id") ON DELETE CASCADE,
        -- V databáze je len odtlačok tokenu, samotný token má iba prehliadač
        "token_hash" VARCHAR(64) NOT NULL UNIQUE,
        "ip" VARCHAR(64),
        "prehliadac" VARCHAR(300),
        "plati_do" TIMESTAMP WITH TIME ZONE NOT NULL,
        "posledna_aktivita" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "vytvorena" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);

    // ===== Licencie =====
    // Plán ako text - každý produkt má vlastné plány
    await q(`ALTER TABLE "licencie" ALTER COLUMN "plan" DROP DEFAULT`);
    await q(`ALTER TABLE "licencie" ALTER COLUMN "plan" TYPE VARCHAR(40) USING "plan"::text`);
    await q(`ALTER TABLE "licencie" ALTER COLUMN "plan" SET DEFAULT 'pro'`);
    await q(`DROP TYPE IF EXISTS "enum_licencie_plan"`);

    await q(`ALTER TABLE "licencie" ADD COLUMN IF NOT EXISTS "produkt_id" INTEGER REFERENCES "produkty" ("id") ON DELETE RESTRICT`);
    await q(`ALTER TABLE "licencie" ADD COLUMN IF NOT EXISTS "nainstalovana_verzia" VARCHAR(40)`);
    await q(`ALTER TABLE "licencie" ADD COLUMN IF NOT EXISTS "posledna_ip" VARCHAR(64)`);
    // Čo o sebe inštalácia hlási: adresa webu, verzia Node, systém...
    await q(`ALTER TABLE "licencie" ADD COLUMN IF NOT EXISTS "instalacia" JSONB`);
    await q(`ALTER TABLE "licencie" ADD COLUMN IF NOT EXISTS "automaticke_aktualizacie" BOOLEAN NOT NULL DEFAULT FALSE`);
    // Licencia môže ostať na konkrétnej verzii (napr. kým sa klient nepripraví)
    await q(`ALTER TABLE "licencie" ADD COLUMN IF NOT EXISTS "pripnuta_verzia_id" INTEGER REFERENCES "verzie" ("id") ON DELETE SET NULL`);
    await q(`CREATE INDEX IF NOT EXISTS "licencie_produkt" ON "licencie" ("produkt_id")`);

    await q(`
      CREATE TABLE IF NOT EXISTS "prikazy" (
        "id" SERIAL PRIMARY KEY,
        "licencia_id" INTEGER NOT NULL REFERENCES "licencie" ("id") ON DELETE CASCADE,
        -- Zatiaľ jediný typ: aktualizacia
        "typ" VARCHAR(30) NOT NULL,
        "verzia_id" INTEGER REFERENCES "verzie" ("id") ON DELETE SET NULL,
        -- caka -> prevzaty -> prebieha -> hotovo | chyba, alebo zruseny
        "stav" VARCHAR(20) NOT NULL DEFAULT 'caka',
        "sprava" TEXT,
        "vytvoril_id" INTEGER REFERENCES "administratori" ("id") ON DELETE SET NULL,
        "vytvoreny" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "prevzaty" TIMESTAMP WITH TIME ZONE,
        "dokonceny" TIMESTAMP WITH TIME ZONE,
        "aktualizovany" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);
    await q(`CREATE INDEX IF NOT EXISTS "prikazy_licencia_stav" ON "prikazy" ("licencia_id", "stav")`);

    await q(`
      CREATE TABLE IF NOT EXISTS "udalosti" (
        "id" BIGSERIAL PRIMARY KEY,
        "administrator_id" INTEGER REFERENCES "administratori" ("id") ON DELETE SET NULL,
        "licencia_id" INTEGER REFERENCES "licencie" ("id") ON DELETE SET NULL,
        "produkt_id" INTEGER REFERENCES "produkty" ("id") ON DELETE SET NULL,
        "typ" VARCHAR(50) NOT NULL,
        "popis" TEXT NOT NULL,
        "detaily" JSONB,
        "ip" VARCHAR(64),
        "vytvorena" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);
    await q(`CREATE INDEX IF NOT EXISTS "udalosti_vytvorena" ON "udalosti" ("vytvorena" DESC)`);
    await q(`CREATE INDEX IF NOT EXISTS "udalosti_licencia" ON "udalosti" ("licencia_id")`);

    // Prvý produkt - doterajšie licencie patria jemu
    await q(`
      INSERT INTO "produkty" ("kod", "nazov", "popis", "github_repo", "plany")
      VALUES ('clubw', 'ClubW CMS', 'Webová platforma pre športové kluby', 'JojDobre/ClubW',
        '[{"kod":"pro","nazov":"Pro","mesiacov":12,"funkcie":[]},{"kod":"enterprise","nazov":"Enterprise","mesiacov":24,"funkcie":[]}]'::jsonb)
      ON CONFLICT ("kod") DO NOTHING
    `);
    await q(`UPDATE "licencie" SET "produkt_id" = (SELECT "id" FROM "produkty" WHERE "kod" = 'clubw') WHERE "produkt_id" IS NULL`);
    await q(`ALTER TABLE "licencie" ALTER COLUMN "produkt_id" SET NOT NULL`);
  },

  async down(queryInterface) {
    const q = (sql) => queryInterface.sequelize.query(sql);
    await q('DROP TABLE IF EXISTS "udalosti"');
    await q('DROP TABLE IF EXISTS "prikazy"');
    await q('DROP INDEX IF EXISTS "licencie_produkt"');
    for (const stlpec of ['pripnuta_verzia_id', 'automaticke_aktualizacie', 'instalacia', 'posledna_ip', 'nainstalovana_verzia', 'produkt_id']) {
      await q(`ALTER TABLE "licencie" DROP COLUMN IF EXISTS "${stlpec}"`);
    }
    await q(`
      DO $$ BEGIN
        CREATE TYPE "enum_licencie_plan" AS ENUM ('pro', 'enterprise');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    // Plány mimo pro/enterprise sa pri návrate zmenia na pro
    await q(`UPDATE "licencie" SET "plan" = 'pro' WHERE "plan" NOT IN ('pro', 'enterprise')`);
    await q(`ALTER TABLE "licencie" ALTER COLUMN "plan" DROP DEFAULT`);
    await q(`ALTER TABLE "licencie" ALTER COLUMN "plan" TYPE "enum_licencie_plan" USING "plan"::"enum_licencie_plan"`);
    await q(`ALTER TABLE "licencie" ALTER COLUMN "plan" SET DEFAULT 'pro'`);
    await q('DROP TABLE IF EXISTS "relacie"');
    await q('DROP TABLE IF EXISTS "administratori"');
    await q('ALTER TABLE "produkty" DROP CONSTRAINT IF EXISTS "produkty_aktualna_verzia_fk"');
    await q('DROP TABLE IF EXISTS "verzie"');
    await q('DROP TABLE IF EXISTS "produkty"');
  },
};
