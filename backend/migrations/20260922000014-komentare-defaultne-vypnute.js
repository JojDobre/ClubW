// Umiestnenie: backend/migrations/20260922000014-komentare-defaultne-vypnute.js
//
// PREČO VZNIKLA: stĺpec "komentare_povolene" mal databázový DEFAULT true,
// takže každý nový článok mal komentáre zapnuté. Podľa požiadavky majú byť
// vypnuté a zapínať sa vedome pri konkrétnom článku.
//
// Mení sa len predvolená hodnota pre NOVÉ články. Existujúcim článkom
// nastavenie necháva tak, ako je - to je vedomé rozhodnutie redaktora
// a migrácia mu doň nemá siahať.

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
    if (await stlpecExistuje(queryInterface, 'clanky', 'komentare_povolene')) {
      await queryInterface.sequelize.query(
        `ALTER TABLE "clanky" ALTER COLUMN "komentare_povolene" SET DEFAULT false`
      );
    }
  },

  async down(queryInterface) {
    if (await stlpecExistuje(queryInterface, 'clanky', 'komentare_povolene')) {
      await queryInterface.sequelize.query(
        `ALTER TABLE "clanky" ALTER COLUMN "komentare_povolene" SET DEFAULT true`
      );
    }
  },
};
