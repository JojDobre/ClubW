// Umiestnenie: backend/migrations/20261009000001-nastavenia-registracie.js
//
// Nastavenia verejnej registrácie fanúšikov a členov: povolené typy,
// polia formulára (vypnuté / nepovinné / povinné) a texty stránky.
// Prázdny objekt = doterajšie správanie s predvolenými textami.

'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(
      `ALTER TABLE "nastavenia_klubu" ADD COLUMN IF NOT EXISTS "nastavenia_registracie" JSONB NOT NULL DEFAULT '{}'::jsonb`
    );
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`ALTER TABLE "nastavenia_klubu" DROP COLUMN IF EXISTS "nastavenia_registracie"`);
  },
};
