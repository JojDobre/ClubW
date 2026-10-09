// Umiestnenie: backend/migrations/20261009000002-zapas-zivy-prenos.js
//
// Živý prenos zápasu: aktuálna fáza (1. polčas, polčas, 2. polčas,
// predĺženie, penalty), čas jej začiatku, dĺžka polčasu (mládež hrá
// kratšie polčasy) a odkaz na video prenos (YouTube, Facebook...).
// Z fázy a jej začiatku web počíta bežiacu minútu.

'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE "zapasy"
        ADD COLUMN IF NOT EXISTS "live_faza" VARCHAR(20),
        ADD COLUMN IF NOT EXISTS "live_faza_od" TIMESTAMP WITH TIME ZONE,
        ADD COLUMN IF NOT EXISTS "dlzka_polcasu" INTEGER,
        ADD COLUMN IF NOT EXISTS "stream_url" VARCHAR(500)
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE "zapasy"
        DROP COLUMN IF EXISTS "live_faza",
        DROP COLUMN IF EXISTS "live_faza_od",
        DROP COLUMN IF EXISTS "dlzka_polcasu",
        DROP COLUMN IF EXISTS "stream_url"
    `);
  },
};
