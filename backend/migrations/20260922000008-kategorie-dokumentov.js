// Umiestnenie: backend/migrations/20260922000008-kategorie-dokumentov.js
//
// PREČO VZNIKLA: požiadavka hovorí „Kategória dokumentov - popis, názov",
// teda samostatná entita. V modeli bol len voľný textový stĺpec
// "kategoria" na dokumente, takže sa kategória nedala pomenovať raz
// a používať všade rovnako - každý dokument si ju písal po svojom.
//
// Pôvodný textový stĺpec ZOSTÁVA a migrácia z neho vyrobí kategórie,
// aby sa nič nestratilo. Dokumenty sa na ne prepoja cez kategoria_id.

'use strict';

const stlpecExistuje = async (queryInterface, tabulka, stlpec) => {
  const [riadky] = await queryInterface.sequelize.query(
    `SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = '${tabulka}' AND column_name = '${stlpec}'`
  );
  return riadky.length > 0;
};

const tabulkaExistuje = async (queryInterface, tabulka) => {
  const [riadky] = await queryInterface.sequelize.query(
    `SELECT to_regclass('public."${tabulka}"') AS existuje`
  );
  return riadky[0] && riadky[0].existuje !== null;
};

module.exports = {
  async up(queryInterface) {
    if (!(await tabulkaExistuje(queryInterface, 'dokument_kategorie'))) {
      await queryInterface.sequelize.query(`
        CREATE TABLE "dokument_kategorie" (
          "id" SERIAL PRIMARY KEY,
          "nazov" VARCHAR(100) NOT NULL UNIQUE,
          "popis" TEXT,
          "poradie" INTEGER NOT NULL DEFAULT 0,
          "aktivity" BOOLEAN NOT NULL DEFAULT true,
          "vytvorena" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "aktualizovana" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
    }

    if (!(await stlpecExistuje(queryInterface, 'dokumenty', 'kategoria_id'))) {
      await queryInterface.sequelize.query(
        `ALTER TABLE "dokumenty" ADD COLUMN "kategoria_id" INTEGER ` +
        `REFERENCES "dokument_kategorie" ("id") ON DELETE SET NULL ON UPDATE CASCADE`
      );
      await queryInterface.sequelize.query(
        `CREATE INDEX IF NOT EXISTS "dokumenty_kategoria" ON "dokumenty" ("kategoria_id")`
      );

      // Z doterajších textových hodnôt vyrobíme kategórie a prepojíme ich.
      // Bez tohto kroku by sa po nasadení stratilo rozdelenie dokumentov.
      await queryInterface.sequelize.query(`
        INSERT INTO "dokument_kategorie" ("nazov")
        SELECT DISTINCT TRIM("kategoria")
          FROM "dokumenty"
         WHERE "kategoria" IS NOT NULL AND TRIM("kategoria") <> ''
        ON CONFLICT ("nazov") DO NOTHING
      `);

      await queryInterface.sequelize.query(`
        UPDATE "dokumenty" d
           SET "kategoria_id" = k."id"
          FROM "dokument_kategorie" k
         WHERE TRIM(d."kategoria") = k."nazov"
      `);
    }
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`DROP INDEX IF EXISTS "dokumenty_kategoria"`);
    await queryInterface.sequelize.query(
      `ALTER TABLE "dokumenty" DROP COLUMN IF EXISTS "kategoria_id"`
    );
    await queryInterface.sequelize.query(`DROP TABLE IF EXISTS "dokument_kategorie" CASCADE`);
  },
};
