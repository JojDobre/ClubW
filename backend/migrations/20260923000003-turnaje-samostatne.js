// Umiestnenie: backend/migrations/20260923000003-turnaje-samostatne.js
//
// PREČO VZNIKLA: turnaj musel povinne patriť pod ligu (liga_id NOT NULL)
// a nemal vlastné údaje. Turnaj je však samostatná súťaž (mládežnícky
// turnaj, pohár) - má vlastný názov, sezónu, logo, popis a náš tím.
//
// - liga_id prestáva byť povinné
// - popis, logo, sezona_id, tim_id (náš tím), zobrazit_na_webe
// - vitaz_nazov: víťaz môže byť aj klub mimo našej databázy

'use strict';

const stlpecExistuje = async (queryInterface, tabulka, stlpec) => {
  const [riadky] = await queryInterface.sequelize.query(
    `SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = '${tabulka}' AND column_name = '${stlpec}'`
  );
  return riadky.length > 0;
};

const STLPCE = [
  ['popis', 'TEXT'],
  ['logo', 'VARCHAR(500)'],
  ['sezona_id', 'INTEGER REFERENCES "sezony" ("id") ON DELETE SET NULL ON UPDATE CASCADE'],
  ['tim_id', 'INTEGER REFERENCES "timy" ("id") ON DELETE SET NULL ON UPDATE CASCADE'],
  ['zobrazit_na_webe', 'BOOLEAN NOT NULL DEFAULT true'],
  ['vitaz_nazov', 'VARCHAR(120)'],
];

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`ALTER TABLE "liga_turnaje" ALTER COLUMN "liga_id" DROP NOT NULL`);

    for (const [stlpec, definicia] of STLPCE) {
      if (!(await stlpecExistuje(queryInterface, 'liga_turnaje', stlpec))) {
        await queryInterface.sequelize.query(`ALTER TABLE "liga_turnaje" ADD COLUMN "${stlpec}" ${definicia}`);
      }
    }
  },

  async down(queryInterface) {
    for (const [stlpec] of STLPCE) {
      await queryInterface.sequelize.query(`ALTER TABLE "liga_turnaje" DROP COLUMN IF EXISTS "${stlpec}"`);
    }
    // Samostatné turnaje bez ligy by návrat NOT NULL zablokovali - tie zmažeme
    await queryInterface.sequelize.query(`DELETE FROM "liga_turnaje" WHERE "liga_id" IS NULL`);
    await queryInterface.sequelize.query(`ALTER TABLE "liga_turnaje" ALTER COLUMN "liga_id" SET NOT NULL`);
  },
};
