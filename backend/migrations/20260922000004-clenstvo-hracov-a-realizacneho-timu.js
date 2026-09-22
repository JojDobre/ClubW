// Umiestnenie: backend/migrations/20260922000004-clenstvo-hracov-a-realizacneho-timu.js
//
// PREČO VZNIKLA: hráč ani realizačný tím nemali kedy do klubu prišli
// a kedy odišli. Polia od/do na súpiske sa viažu na dvojicu sezóna+tím,
// nie na členstvo v klube, takže na otázku „odkedy je u nás" sa nedalo
// odpovedať.
//
// Druhá vec je STAV hráča. Doteraz existoval len príznak "aktivity",
// ktorý zároveň slúžil ako archivácia. Zneaktívnenie zraneného hráča ho
// teda schovalo úplne, rovnako ako archivácia. Pribúda samostatný
// stĺpec "stav":
//   aktivity = je/nie je v archíve (schované, ale dáta zostávajú)
//   stav     = aktívny/neaktívny hráč v rámci kádra (zranený, hosťovanie)
// Neaktívny hráč sa naďalej zobrazuje a má štatistiky, len nie je
// súčasťou aktuálneho kádra.

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

const pridajStlpec = async (queryInterface, tabulka, stlpec, definicia) => {
  if (await stlpecExistuje(queryInterface, tabulka, stlpec)) return;
  await queryInterface.sequelize.query(
    `ALTER TABLE "${tabulka}" ADD COLUMN "${stlpec}" ${definicia}`
  );
};

module.exports = {
  async up(queryInterface) {
    // ===== Hráči =====
    await pridajStlpec(queryInterface, 'hraci', 'datum_pripojenia', 'DATE');
    await pridajStlpec(queryInterface, 'hraci', 'datum_odpojenia', 'DATE');

    if (!(await stlpecExistuje(queryInterface, 'hraci', 'stav'))) {
      await queryInterface.sequelize.query(
        `DO 'BEGIN CREATE TYPE "public"."enum_hraci_stav" AS ENUM(''aktivny'', ''neaktivny''); ` +
        `EXCEPTION WHEN duplicate_object THEN null; END';`
      );
      await queryInterface.sequelize.query(
        `ALTER TABLE "hraci" ADD COLUMN "stav" "public"."enum_hraci_stav" NOT NULL DEFAULT 'aktivny'`
      );
    }

    // ===== Realizačný tím =====
    await pridajStlpec(queryInterface, 'realizacny_tim', 'narodnost', 'VARCHAR(50)');
    await pridajStlpec(queryInterface, 'realizacny_tim', 'datum_pripojenia', 'DATE');
    await pridajStlpec(queryInterface, 'realizacny_tim', 'datum_odpojenia', 'DATE');
    await pridajStlpec(
      queryInterface,
      'realizacny_tim',
      'sezona_id',
      'INTEGER REFERENCES "sezony" ("id") ON DELETE SET NULL ON UPDATE CASCADE'
    );

    await queryInterface.sequelize.query(
      `CREATE INDEX IF NOT EXISTS "realizacny_tim_sezona" ON "realizacny_tim" ("sezona_id")`
    );
    await queryInterface.sequelize.query(
      `CREATE INDEX IF NOT EXISTS "hraci_stav" ON "hraci" ("stav")`
    );
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`DROP INDEX IF EXISTS "hraci_stav"`);
    await queryInterface.sequelize.query(`DROP INDEX IF EXISTS "realizacny_tim_sezona"`);

    for (const stlpec of ['datum_pripojenia', 'datum_odpojenia', 'stav']) {
      await queryInterface.sequelize.query(
        `ALTER TABLE "hraci" DROP COLUMN IF EXISTS "${stlpec}"`
      );
    }
    for (const stlpec of ['narodnost', 'datum_pripojenia', 'datum_odpojenia', 'sezona_id']) {
      await queryInterface.sequelize.query(
        `ALTER TABLE "realizacny_tim" DROP COLUMN IF EXISTS "${stlpec}"`
      );
    }

    await queryInterface.sequelize.query(`DROP TYPE IF EXISTS "enum_hraci_stav" CASCADE`);
  },
};
