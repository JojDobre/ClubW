// Umiestnenie: backend/migrations/20260930000001-menu-kategorie-obrazky.js
//
// Menu s kategóriami a kartami (rozbaľovacie menu cez celú šírku):
//  - typ položky „nadpis" = kategória bez odkazu (nadpis stĺpca v menu),
//  - obrázok položky = zobrazí sa ako karta s obrázkom v rozbaľovacom menu.
// Tretia úroveň menu (hlavná položka → kategória → odkaz) nepotrebuje
// zmenu schémy, stráži ju kontrolér.

'use strict';

module.exports = {
  async up(queryInterface) {
    // ADD VALUE nemôže bežať v transakcii spolu s použitím hodnoty - tu sa nepoužíva
    await queryInterface.sequelize.query(`ALTER TYPE "enum_menu_polozky_typ" ADD VALUE IF NOT EXISTS 'nadpis'`);
    await queryInterface.sequelize.query(`ALTER TABLE "menu_polozky" ADD COLUMN IF NOT EXISTS "obrazok" VARCHAR(500)`);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`ALTER TABLE "menu_polozky" DROP COLUMN IF EXISTS "obrazok"`);
    // Hodnotu z typu ENUM PostgreSQL odobrať nevie - kategórie sa zmenia na
    // neaktívne odkazy na úvod, aby stará verzia aplikácie nespadla
    await queryInterface.sequelize.query(
      `UPDATE "menu_polozky" SET "typ" = 'url', "url" = '/', "aktivity" = false WHERE "typ" = 'nadpis'`
    );
  },
};
