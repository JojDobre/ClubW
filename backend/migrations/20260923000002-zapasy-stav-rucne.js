// Umiestnenie: backend/migrations/20260923000002-zapasy-stav-rucne.js
//
// PREČO VZNIKLA: požiadavka hovorí „stav zápasu plánovaný/odohraný -
// automaticky, s možnosťou zmeny". Plánovač stav prepočítaval podľa času
// pri všetkých zápasoch okrem zrušených a odložených - ručne nastavený
// stav (napr. zápas ukončený predčasne, alebo ešte neodohraný po termíne)
// o päť minút prepísal späť.
//
// stav_rucne = true znamená: stav určil človek, plánovač ho nemení.

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
    if (!(await stlpecExistuje(queryInterface, 'zapasy', 'stav_rucne'))) {
      await queryInterface.sequelize.query(
        `ALTER TABLE "zapasy" ADD COLUMN "stav_rucne" BOOLEAN NOT NULL DEFAULT false`
      );
      // Zrušené a odložené zápasy boli ručné vždy - zachováme to
      await queryInterface.sequelize.query(
        `UPDATE "zapasy" SET "stav_rucne" = true WHERE "status" IN ('zruseny', 'odlozeny')`
      );
    }
  },

  async down(queryInterface) {
    if (await stlpecExistuje(queryInterface, 'zapasy', 'stav_rucne')) {
      await queryInterface.sequelize.query(`ALTER TABLE "zapasy" DROP COLUMN "stav_rucne"`);
    }
  },
};
