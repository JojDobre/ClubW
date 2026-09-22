// Umiestnenie: backend/migrations/20260922000001-archivacia-sezon.js
//
// PREČO VZNIKLA: sezóny boli jediná entita z archívu, ktorá sa mazala
// natvrdo (sezona.destroy()). Tým sa nenávratne strácala aj história,
// ktorá sa na ňu viaže. Ostatné archivovateľné entity - tímy, hráči,
// realizačný tím aj ligy - už príznak "aktivity" majú a mažú sa mäkko.
//
// Stĺpec dostáva rovnaký názov aj význam ako inde v projekte:
// aktivity = false znamená "archivované, neukazuj, ale dáta zostávajú".

'use strict';

const TABULKA = 'sezony';
const STLPEC = 'aktivity';

/** Zistí, či stĺpec v tabuľke už existuje. */
const stlpecExistuje = async (queryInterface) => {
  const [riadky] = await queryInterface.sequelize.query(
    `SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = '${TABULKA}'
        AND column_name = '${STLPEC}'`
  );
  return riadky.length > 0;
};

module.exports = {
  async up(queryInterface) {
    if (await stlpecExistuje(queryInterface)) {
      return;
    }

    // Všetky existujúce sezóny sú aktívne - nič sa doteraz archivovať nedalo.
    await queryInterface.sequelize.query(
      `ALTER TABLE "${TABULKA}" ADD COLUMN "${STLPEC}" BOOLEAN NOT NULL DEFAULT true`
    );

    // Archív aj bežný výpis sa pýtajú práve na tento stĺpec.
    await queryInterface.sequelize.query(
      `CREATE INDEX IF NOT EXISTS "sezony_aktivity" ON "${TABULKA}" ("${STLPEC}")`
    );
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`DROP INDEX IF EXISTS "sezony_aktivity"`);
    await queryInterface.sequelize.query(
      `ALTER TABLE "${TABULKA}" DROP COLUMN IF EXISTS "${STLPEC}"`
    );
  },
};
