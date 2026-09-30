// Umiestnenie: backend/migrations/20261001000001-menu-najnovsie-clanky.js
//
// Položka menu „Najnovšie články" (typ clanky): v rozbaľovacom menu sa
// namiesto odkazu ukážu karty najnovších článkov (voliteľne z jednej
// rubriky). Počet kariet je v stĺpci „pocet".

'use strict';

module.exports = {
  async up(queryInterface) {
    // ADD VALUE nemôže bežať v transakcii spolu s použitím hodnoty - tu sa nepoužíva
    await queryInterface.sequelize.query(`ALTER TYPE "enum_menu_polozky_typ" ADD VALUE IF NOT EXISTS 'clanky'`);
    await queryInterface.sequelize.query(`ALTER TABLE "menu_polozky" ADD COLUMN IF NOT EXISTS "pocet" INTEGER`);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`ALTER TABLE "menu_polozky" DROP COLUMN IF EXISTS "pocet"`);
    // Hodnotu z typu ENUM PostgreSQL odobrať nevie - položky sa zmenia na
    // neaktívne odkazy na zoznam článkov, aby stará verzia aplikácie nespadla
    await queryInterface.sequelize.query(
      `UPDATE "menu_polozky" SET "typ" = 'url', "url" = '/clanky', "rubrika_id" = NULL, "aktivity" = false WHERE "typ" = 'clanky'`
    );
  },
};
