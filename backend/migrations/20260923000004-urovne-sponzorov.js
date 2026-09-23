// Umiestnenie: backend/migrations/20260923000004-urovne-sponzorov.js
//
// PREČO VZNIKLA: úrovne partnerstva (generálny, hlavný, partner,
// dodávateľ) boli pevný zoznam v databáze aj v kóde, takže klub si
// nemohol pridať napríklad „Mediálny partner" ani úroveň premenovať.
// Teraz sú samostatná tabuľka, ktorú spravuje administrácia.
//
// Pôvodný stĺpec "uroven" ZOSTÁVA (už nepovinný), aby sa dalo vrátiť
// späť. Migrácia vytvorí štyri doterajšie úrovne a sponzorov na ne prepojí.

'use strict';

const stlpecExistuje = async (queryInterface, tabulka, stlpec) => {
  const [riadky] = await queryInterface.sequelize.query(
    `SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = '${tabulka}' AND column_name = '${stlpec}'`
  );
  return riadky.length > 0;
};

const POVODNE = [
  { kod: 'generalny', nazov: 'Generálny partner', velkost: 'velke', poradie: 1 },
  { kod: 'hlavny', nazov: 'Hlavný partner', velkost: 'velke', poradie: 2 },
  { kod: 'partner', nazov: 'Partner', velkost: 'stredne', poradie: 3 },
  { kod: 'dodavatel', nazov: 'Dodávateľ', velkost: 'male', poradie: 4 },
];

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS "urovne_sponzorov" (
        "id" SERIAL PRIMARY KEY,
        "nazov" VARCHAR(80) NOT NULL UNIQUE,
        "popis" TEXT,
        "poradie" INTEGER NOT NULL DEFAULT 0,
        "velkost_loga" VARCHAR(10) NOT NULL DEFAULT 'stredne'
          CHECK ("velkost_loga" IN ('velke', 'stredne', 'male')),
        "aktivity" BOOLEAN NOT NULL DEFAULT true,
        "vytvorena" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "aktualizovana" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    for (const u of POVODNE) {
      await queryInterface.sequelize.query(
        `INSERT INTO "urovne_sponzorov" ("nazov", "poradie", "velkost_loga")
         VALUES (:nazov, :poradie, :velkost) ON CONFLICT ("nazov") DO NOTHING`,
        { replacements: u }
      );
    }

    if (!(await stlpecExistuje(queryInterface, 'sponzori', 'uroven_id'))) {
      await queryInterface.sequelize.query(
        `ALTER TABLE "sponzori" ADD COLUMN "uroven_id" INTEGER ` +
        `REFERENCES "urovne_sponzorov" ("id") ON DELETE SET NULL ON UPDATE CASCADE`
      );
      await queryInterface.sequelize.query(
        `CREATE INDEX IF NOT EXISTS "sponzori_uroven_id" ON "sponzori" ("uroven_id")`
      );

      for (const u of POVODNE) {
        await queryInterface.sequelize.query(
          `UPDATE "sponzori" s SET "uroven_id" = u."id"
             FROM "urovne_sponzorov" u
            WHERE u."nazov" = :nazov AND s."uroven"::text = :kod`,
          { replacements: u }
        );
      }
    }

    // Nový sponzor už pôvodný stĺpec nevypĺňa
    await queryInterface.sequelize.query(`ALTER TABLE "sponzori" ALTER COLUMN "uroven" DROP NOT NULL`);
  },

  async down(queryInterface) {
    // Späť do pevného zoznamu - podľa názvu úrovne, inak "partner"
    if (await stlpecExistuje(queryInterface, 'sponzori', 'uroven_id')) {
      for (const u of POVODNE) {
        await queryInterface.sequelize.query(
          `UPDATE "sponzori" s SET "uroven" = :kod
             FROM "urovne_sponzorov" u
            WHERE s."uroven_id" = u."id" AND u."nazov" = :nazov`,
          { replacements: u }
        );
      }
    }
    await queryInterface.sequelize.query(`UPDATE "sponzori" SET "uroven" = 'partner' WHERE "uroven" IS NULL`);
    await queryInterface.sequelize.query(`ALTER TABLE "sponzori" ALTER COLUMN "uroven" SET NOT NULL`);
    await queryInterface.sequelize.query(`DROP INDEX IF EXISTS "sponzori_uroven_id"`);
    await queryInterface.sequelize.query(`ALTER TABLE "sponzori" DROP COLUMN IF EXISTS "uroven_id"`);
    await queryInterface.sequelize.query(`DROP TABLE IF EXISTS "urovne_sponzorov" CASCADE`);
  },
};
