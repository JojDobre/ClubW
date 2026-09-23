// Umiestnenie: backend/migrations/20260923000005-nastavenia-udaje-klubu.js
//
// Požiadavka „IČO / údaje" - pri IČO a DIČ chýbal oficiálny názov
// organizácie (občianske združenie má iný názov než klub), IČ DPH
// a účet na príspevky (IBAN). Pribudol aj TikTok medzi sociálne siete.

'use strict';

const STLPCE = [
  ['pravny_nazov', 'VARCHAR(200)'],
  ['ic_dph', 'VARCHAR(20)'],
  ['iban', 'VARCHAR(34)'],
  ['tiktok_url', 'VARCHAR(255)'],
];

module.exports = {
  async up(queryInterface) {
    for (const [stlpec, typ] of STLPCE) {
      await queryInterface.sequelize.query(
        `ALTER TABLE "nastavenia_klubu" ADD COLUMN IF NOT EXISTS "${stlpec}" ${typ}`
      );
    }
  },

  async down(queryInterface) {
    for (const [stlpec] of STLPCE) {
      await queryInterface.sequelize.query(
        `ALTER TABLE "nastavenia_klubu" DROP COLUMN IF EXISTS "${stlpec}"`
      );
    }
  },
};
