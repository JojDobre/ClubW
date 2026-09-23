// Umiestnenie: backend/migrations/20260923000001-ligy-rezim-tabulky.js
//
// PREČO VZNIKLA: požiadavka na ligy hovorí, že všetky stĺpce tabuľky sú
// voliteľné a liga môže viesť „len body" (napríklad nižšie súťaže, kde
// klub prepisuje len poradie a body z oficiálneho zväzového webu).
//
// rezim_tabulky:
//   'plna'     - zápasy, výhry, remízy, prehry, skóre, +/-, forma, body
//   'len_body' - iba poradie, tím a body

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
    if (!(await stlpecExistuje(queryInterface, 'ligy', 'rezim_tabulky'))) {
      await queryInterface.sequelize.query(
        `ALTER TABLE "ligy" ADD COLUMN "rezim_tabulky" VARCHAR(20) NOT NULL DEFAULT 'plna' ` +
        `CONSTRAINT "ligy_rezim_tabulky_hodnoty" CHECK ("rezim_tabulky" IN ('plna', 'len_body'))`
      );
    }
  },

  async down(queryInterface) {
    if (await stlpecExistuje(queryInterface, 'ligy', 'rezim_tabulky')) {
      await queryInterface.sequelize.query(`ALTER TABLE "ligy" DROP COLUMN "rezim_tabulky"`);
    }
  },
};
