// Umiestnenie: backend/migrations/20260930000002-stranky-bloky.js
//
// Bloky stránok (časová os, karty osôb, čísla, galéria…) - JSON zoznam
// v stĺpci pages.bloky. Stránka zložená len z blokov nemusí mať text,
// preto má obsah predvolene prázdny reťazec.

'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`ALTER TABLE "pages" ADD COLUMN IF NOT EXISTS "bloky" JSONB NOT NULL DEFAULT '[]'::jsonb`);
    await queryInterface.sequelize.query(`ALTER TABLE "pages" ALTER COLUMN "obsah" SET DEFAULT ''`);
  },

  async down(queryInterface) {
    // Stará verzia vyžaduje text - stránky len z blokov dostanú zástupný text
    await queryInterface.sequelize.query(`UPDATE "pages" SET "obsah" = '<p>Obsah stránky sa pripravuje.</p>' WHERE length(trim("obsah")) < 10`);
    await queryInterface.sequelize.query(`ALTER TABLE "pages" ALTER COLUMN "obsah" DROP DEFAULT`);
    await queryInterface.sequelize.query(`ALTER TABLE "pages" DROP COLUMN IF EXISTS "bloky"`);
  },
};
