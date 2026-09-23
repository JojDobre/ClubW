// Umiestnenie: backend/migrations/20260923000006-sablony.js
//
// Šablóny verejného webu: ktorá je aktívna a hodnoty ich vlastných
// nastavení (farby, obrázok na úvode...) - pre každú šablónu zvlášť, aby
// sa po prepnutí späť nestratili.

'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(
      `ALTER TABLE "nastavenia_klubu" ADD COLUMN IF NOT EXISTS "aktivna_sablona" VARCHAR(60) NOT NULL DEFAULT 'zakladna'`
    );
    await queryInterface.sequelize.query(
      `ALTER TABLE "nastavenia_klubu" ADD COLUMN IF NOT EXISTS "nastavenia_sablon" JSONB NOT NULL DEFAULT '{}'::jsonb`
    );
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`ALTER TABLE "nastavenia_klubu" DROP COLUMN IF EXISTS "nastavenia_sablon"`);
    await queryInterface.sequelize.query(`ALTER TABLE "nastavenia_klubu" DROP COLUMN IF EXISTS "aktivna_sablona"`);
  },
};
