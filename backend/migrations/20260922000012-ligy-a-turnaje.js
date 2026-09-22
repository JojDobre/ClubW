// Umiestnenie: backend/migrations/20260922000012-ligy-a-turnaje.js
//
// PREČO VZNIKLA: z požiadaviek na ligy chýbalo:
//   - logo externého tímu v tabuľke (bol len jeho názov)
//   - väzba ligy na náš tím
//
// V tabuľke ligy sa tím zadáva buď výberom z našich (tim_id), alebo
// vlastným názvom. Pri vlastnom názve nebolo kam uložiť logo, hoci
// požiadavka hovorí „Tímy iba v tejto tabuľke - logo tímu, názov".

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
    if (!(await stlpecExistuje(queryInterface, 'liga_tabulky', 'custom_tim_logo'))) {
      await queryInterface.sequelize.query(
        `ALTER TABLE "liga_tabulky" ADD COLUMN "custom_tim_logo" VARCHAR(500)`
      );
    }

    if (!(await stlpecExistuje(queryInterface, 'ligy', 'tim_id'))) {
      await queryInterface.sequelize.query(
        `ALTER TABLE "ligy" ADD COLUMN "tim_id" INTEGER ` +
        `REFERENCES "timy" ("id") ON DELETE SET NULL ON UPDATE CASCADE`
      );
      await queryInterface.sequelize.query(
        `CREATE INDEX IF NOT EXISTS "ligy_tim" ON "ligy" ("tim_id")`
      );
    }
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`DROP INDEX IF EXISTS "ligy_tim"`);
    await queryInterface.sequelize.query(`ALTER TABLE "ligy" DROP COLUMN IF EXISTS "tim_id"`);
    await queryInterface.sequelize.query(
      `ALTER TABLE "liga_tabulky" DROP COLUMN IF EXISTS "custom_tim_logo"`
    );
  },
};
