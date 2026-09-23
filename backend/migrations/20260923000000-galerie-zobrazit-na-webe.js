// Umiestnenie: backend/migrations/20260923000000-galerie-zobrazit-na-webe.js
//
// PREČO VZNIKLA: stĺpec "aktivity" slúžil pri galériách naraz na dve veci -
// „zobraziť na webe" aj zmazanie (mazanie je mäkké, nastaví aktivity=false).
// Skrytá galéria bola preto nerozoznateľná od zmazanej a z administrácie
// zmizla spolu s ňou, hoci ju chcel redaktor len dočasne schovať.
//
// Nový stĺpec zobrazit_na_webe drží viditeľnosť, aktivity zostáva len
// príznakom zmazania. Existujúce galérie ostávajú viditeľné.

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
    if (!(await stlpecExistuje(queryInterface, 'galerie', 'zobrazit_na_webe'))) {
      await queryInterface.sequelize.query(
        `ALTER TABLE "galerie" ADD COLUMN "zobrazit_na_webe" BOOLEAN NOT NULL DEFAULT true`
      );
    }
  },

  async down(queryInterface) {
    if (await stlpecExistuje(queryInterface, 'galerie', 'zobrazit_na_webe')) {
      await queryInterface.sequelize.query(`ALTER TABLE "galerie" DROP COLUMN "zobrazit_na_webe"`);
    }
  },
};
