// Umiestnenie: backend/migrations/20260922000002-clanky-tim.js
//
// PREČO VZNIKLA: článok sa mal dať voliteľne priradiť k tímu ("tím
// (voliteľné)" v požiadavkách), aby sa na stránke tímu dali zobraziť
// jeho správy. Väzba na modeli vôbec nebola.
//
// Väzba je VOLITEĽNÁ a pri zmazaní tímu sa len vynuluje (SET NULL) -
// článok o zápase nemá zmiznúť len preto, že tím prestal existovať.

'use strict';

const TABULKA = 'clanky';
const STLPEC = 'tim_id';

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

    await queryInterface.sequelize.query(
      `ALTER TABLE "${TABULKA}" ADD COLUMN "${STLPEC}" INTEGER ` +
      `REFERENCES "timy" ("id") ON DELETE SET NULL ON UPDATE CASCADE`
    );

    // Výpis článkov tímu je bežný dotaz na verejnom webe
    await queryInterface.sequelize.query(
      `CREATE INDEX IF NOT EXISTS "clanky_tim" ON "${TABULKA}" ("${STLPEC}")`
    );
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`DROP INDEX IF EXISTS "clanky_tim"`);
    await queryInterface.sequelize.query(
      `ALTER TABLE "${TABULKA}" DROP COLUMN IF EXISTS "${STLPEC}"`
    );
  },
};
