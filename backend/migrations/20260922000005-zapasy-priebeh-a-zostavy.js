// Umiestnenie: backend/migrations/20260922000005-zapasy-priebeh-a-zostavy.js
//
// PREČO VZNIKLA: zápas vedel len výsledok a pár základných štatistík.
// Chýbalo z požiadaviek:
//   - rozhodca
//   - doma / vonku / neutrálne (a s tým miesto konania z domáceho štadióna)
//   - logo súpera
//   - striedanie medzi typmi udalostí
//   - hosťujúci hráč zadaný vlastným menom a číslom
//   - odohrané minúty
//   - základná zostava a lavička
//   - voľné udalosti zo zápasu
//
// Pribúdajú dve nové tabuľky (zostavy a udalosti) a rozširujú sa dve
// existujúce (zapasy, zapas_statistiky).

'use strict';

const stlpecExistuje = async (queryInterface, tabulka, stlpec) => {
  const [riadky] = await queryInterface.sequelize.query(
    `SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = '${tabulka}'
        AND column_name = '${stlpec}'`
  );
  return riadky.length > 0;
};

const tabulkaExistuje = async (queryInterface, tabulka) => {
  const [riadky] = await queryInterface.sequelize.query(
    `SELECT to_regclass('public."${tabulka}"') AS existuje`
  );
  return riadky[0] && riadky[0].existuje !== null;
};

const pridajStlpec = async (queryInterface, tabulka, stlpec, definicia) => {
  if (await stlpecExistuje(queryInterface, tabulka, stlpec)) return;
  await queryInterface.sequelize.query(
    `ALTER TABLE "${tabulka}" ADD COLUMN "${stlpec}" ${definicia}`
  );
};

const vytvorEnum = async (queryInterface, nazov, hodnoty) => {
  const zoznam = hodnoty.map((h) => `''${h}''`).join(', ');
  await queryInterface.sequelize.query(
    `DO 'BEGIN CREATE TYPE "public"."${nazov}" AS ENUM(${zoznam}); ` +
    `EXCEPTION WHEN duplicate_object THEN null; END';`
  );
};

module.exports = {
  async up(queryInterface) {
    // ===== 1. Rozšírenie tabuľky zápasov =====
    await pridajStlpec(queryInterface, 'zapasy', 'rozhodca', 'VARCHAR(120)');
    await pridajStlpec(queryInterface, 'zapasy', 'supier_logo', 'VARCHAR(500)');
    await pridajStlpec(
      queryInterface,
      'zapasy',
      'stadion_id',
      'INTEGER REFERENCES "stadiony" ("id") ON DELETE SET NULL ON UPDATE CASCADE'
    );

    if (!(await stlpecExistuje(queryInterface, 'zapasy', 'typ_zapasu'))) {
      await vytvorEnum(queryInterface, 'enum_zapasy_typ_zapasu', ['doma', 'vonku', 'neutralne']);
      await queryInterface.sequelize.query(
        `ALTER TABLE "zapasy" ADD COLUMN "typ_zapasu" "public"."enum_zapasy_typ_zapasu" ` +
        `NOT NULL DEFAULT 'doma'`
      );
    }

    // ===== 2. Rozšírenie štatistík =====
    // Striedanie doplníme do existujúceho enumu. ADD VALUE IF NOT EXISTS
    // je idempotentné, takže migrácia znesie opakované spustenie.
    await queryInterface.sequelize.query(
      `ALTER TYPE "public"."enum_zapas_statistiky_typ" ADD VALUE IF NOT EXISTS 'striedanie'`
    );

    // Hosťujúci hráč nie je v našej databáze - musí sa dať zapísať menom.
    // Preto hrac_id prestáva byť povinný.
    await queryInterface.sequelize.query(
      `ALTER TABLE "zapas_statistiky" ALTER COLUMN "hrac_id" DROP NOT NULL`
    );

    await pridajStlpec(queryInterface, 'zapas_statistiky', 'hostujuci_hrac_meno', 'VARCHAR(100)');
    await pridajStlpec(queryInterface, 'zapas_statistiky', 'hostujuci_hrac_cislo', 'INTEGER');
    await pridajStlpec(
      queryInterface,
      'zapas_statistiky',
      'striedany_hrac_id',
      'INTEGER REFERENCES "hraci" ("id") ON DELETE SET NULL ON UPDATE CASCADE'
    );
    await pridajStlpec(queryInterface, 'zapas_statistiky', 'striedany_hrac_meno', 'VARCHAR(100)');

    // Záznam musí vedieť, koho sa týka: buď náš hráč, alebo meno hosťa.
    await queryInterface.sequelize.query(`
      DO 'BEGIN
        ALTER TABLE "zapas_statistiky"
          ADD CONSTRAINT "zapas_statistiky_ma_hraca"
          CHECK ("hrac_id" IS NOT NULL OR "hostujuci_hrac_meno" IS NOT NULL);
      EXCEPTION WHEN duplicate_object THEN null; END';
    `);

    // ===== 3. Zostavy =====
    if (!(await tabulkaExistuje(queryInterface, 'zapas_zostavy'))) {
      await vytvorEnum(queryInterface, 'enum_zapas_zostavy_strana', ['domaci', 'hostia']);
      await vytvorEnum(queryInterface, 'enum_zapas_zostavy_zaradenie', ['zakladna', 'lavicka']);

      await queryInterface.sequelize.query(`
        CREATE TABLE "zapas_zostavy" (
          "id" SERIAL PRIMARY KEY,
          "zapas_id" INTEGER NOT NULL REFERENCES "zapasy" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
          "strana" "public"."enum_zapas_zostavy_strana" NOT NULL,
          "hrac_id" INTEGER REFERENCES "hraci" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
          "hostujuci_hrac_meno" VARCHAR(100),
          "hostujuci_hrac_cislo" INTEGER,
          "zaradenie" "public"."enum_zapas_zostavy_zaradenie" NOT NULL DEFAULT 'zakladna',
          "odohrane_minuty" INTEGER,
          "kapitan" BOOLEAN NOT NULL DEFAULT false,
          "poznamka" VARCHAR(255),
          "vytvoreny" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "aktualizovany" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "zapas_zostavy_ma_hraca"
            CHECK ("hrac_id" IS NOT NULL OR "hostujuci_hrac_meno" IS NOT NULL)
        )
      `);

      await queryInterface.sequelize.query(
        `CREATE INDEX IF NOT EXISTS "zapas_zostavy_zapas" ON "zapas_zostavy" ("zapas_id")`
      );
      // Jeden hráč smie byť v zostave zápasu len raz
      await queryInterface.sequelize.query(
        `CREATE UNIQUE INDEX IF NOT EXISTS "zapas_zostavy_hrac_raz" ` +
        `ON "zapas_zostavy" ("zapas_id", "hrac_id") WHERE "hrac_id" IS NOT NULL`
      );
    }

    // ===== 4. Voľné udalosti zo zápasu =====
    if (!(await tabulkaExistuje(queryInterface, 'zapas_udalosti'))) {
      await queryInterface.sequelize.query(`
        CREATE TABLE "zapas_udalosti" (
          "id" SERIAL PRIMARY KEY,
          "zapas_id" INTEGER NOT NULL REFERENCES "zapasy" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
          "minuta" INTEGER,
          "text" TEXT NOT NULL,
          "poradie" INTEGER NOT NULL DEFAULT 0,
          "vytvorena" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "aktualizovana" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await queryInterface.sequelize.query(
        `CREATE INDEX IF NOT EXISTS "zapas_udalosti_zapas" ON "zapas_udalosti" ("zapas_id")`
      );
    }
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`DROP TABLE IF EXISTS "zapas_udalosti" CASCADE`);
    await queryInterface.sequelize.query(`DROP TABLE IF EXISTS "zapas_zostavy" CASCADE`);
    await queryInterface.sequelize.query(
      `DROP TYPE IF EXISTS "enum_zapas_zostavy_zaradenie" CASCADE`
    );
    await queryInterface.sequelize.query(`DROP TYPE IF EXISTS "enum_zapas_zostavy_strana" CASCADE`);

    await queryInterface.sequelize.query(
      `ALTER TABLE "zapas_statistiky" DROP CONSTRAINT IF EXISTS "zapas_statistiky_ma_hraca"`
    );
    for (const stlpec of [
      'hostujuci_hrac_meno',
      'hostujuci_hrac_cislo',
      'striedany_hrac_id',
      'striedany_hrac_meno',
    ]) {
      await queryInterface.sequelize.query(
        `ALTER TABLE "zapas_statistiky" DROP COLUMN IF EXISTS "${stlpec}"`
      );
    }
    // Riadky bez hráča by po vrátení NOT NULL prekážali - zmažeme ich
    await queryInterface.sequelize.query(
      `DELETE FROM "zapas_statistiky" WHERE "hrac_id" IS NULL`
    );
    await queryInterface.sequelize.query(
      `ALTER TABLE "zapas_statistiky" ALTER COLUMN "hrac_id" SET NOT NULL`
    );

    for (const stlpec of ['rozhodca', 'supier_logo', 'stadion_id', 'typ_zapasu']) {
      await queryInterface.sequelize.query(
        `ALTER TABLE "zapasy" DROP COLUMN IF EXISTS "${stlpec}"`
      );
    }
    await queryInterface.sequelize.query(
      `DROP TYPE IF EXISTS "enum_zapasy_typ_zapasu" CASCADE`
    );
    // Hodnotu 'striedanie' z enumu nevraciame - PostgreSQL to nevie
    // a zvysne data by sa tym poskodili.
  },
};
