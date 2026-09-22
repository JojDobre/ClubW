// Umiestnenie: backend/migrations/20260922000013-komentare-videa-sezony.js
//
// PREČO VZNIKLA:
//
// KOMENTÁRE. Komentár nemal väzbu na používateľa - len autor_meno
// a autor_email ako voľný text. Nedalo sa teda overiť vlastníctvo,
// a požiadavka „na klubovom frontende ich autor vie upravovať" sa
// bez toho naplniť nedala.
//
// VIDEÁ. Rubrika bola voľný textový stĺpec "kategoria", nie väzba na
// rubriky. Dve videá tej istej rubriky tak mohli mať rôzny zápis.

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
    // ===== Komentáre =====
    if (!(await stlpecExistuje(queryInterface, 'komentare', 'pouzivatel_id'))) {
      await queryInterface.sequelize.query(
        `ALTER TABLE "komentare" ADD COLUMN "pouzivatel_id" INTEGER ` +
        `REFERENCES "pouzivatelia" ("id") ON DELETE SET NULL ON UPDATE CASCADE`
      );
      await queryInterface.sequelize.query(
        `CREATE INDEX IF NOT EXISTS "komentare_pouzivatel" ON "komentare" ("pouzivatel_id")`
      );
    }

    // Kedy bol komentár naposledy upravený autorom - frontend podľa
    // toho zobrazí „upravené"
    if (!(await stlpecExistuje(queryInterface, 'komentare', 'upraveny_autorom'))) {
      await queryInterface.sequelize.query(
        `ALTER TABLE "komentare" ADD COLUMN "upraveny_autorom" TIMESTAMP WITH TIME ZONE`
      );
    }

    // ===== Videá =====
    if (!(await stlpecExistuje(queryInterface, 'videa', 'rubrika_id'))) {
      await queryInterface.sequelize.query(
        `ALTER TABLE "videa" ADD COLUMN "rubrika_id" INTEGER ` +
        `REFERENCES "rubriky" ("id") ON DELETE SET NULL ON UPDATE CASCADE`
      );
      await queryInterface.sequelize.query(
        `CREATE INDEX IF NOT EXISTS "videa_rubrika" ON "videa" ("rubrika_id")`
      );

      // Z doterajších textových kategórií sa pokúsime nájsť rubriku
      // rovnakého názvu, aby sa zaradenie videí nestratilo
      await queryInterface.sequelize.query(`
        UPDATE "videa" v
           SET "rubrika_id" = r."id"
          FROM "rubriky" r
         WHERE v."kategoria" IS NOT NULL
           AND LOWER(TRIM(v."kategoria")) = LOWER(r."nazov")
      `);
    }
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`DROP INDEX IF EXISTS "videa_rubrika"`);
    await queryInterface.sequelize.query(`ALTER TABLE "videa" DROP COLUMN IF EXISTS "rubrika_id"`);
    await queryInterface.sequelize.query(`DROP INDEX IF EXISTS "komentare_pouzivatel"`);
    await queryInterface.sequelize.query(
      `ALTER TABLE "komentare" DROP COLUMN IF EXISTS "upraveny_autorom"`
    );
    await queryInterface.sequelize.query(
      `ALTER TABLE "komentare" DROP COLUMN IF EXISTS "pouzivatel_id"`
    );
  },
};
