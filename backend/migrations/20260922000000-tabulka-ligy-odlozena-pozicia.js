// Umiestnenie: backend/migrations/20260922000000-tabulka-ligy-odlozena-pozicia.js
//
// PREČO VZNIKLA: tabuľka ligy mala na dvojici (liga_id, pozicia) obyčajný
// UNIKÁTNY INDEX. Ten sa v PostgreSQL vyhodnocuje po každom jednotlivom
// riadku, takže akákoľvek výmena poradia zlyhala: pri prehodení tímov
// z pozícií 1 a 2 existoval medzi dvoma UPDATE-mi okamih, keď mali obidva
// riadky rovnakú pozíciu, a zápis skončil chybou
// "liga_tabulky_liga_pozicia must be unique". Rovnako zlyhalo pridanie
// nového tímu na pozíciu, ktorú niekto práve držal.
//
// Riešenie: unikátnosť ponechať (dve mužstvá naozaj nemajú byť na tej istej
// priečke), ale ako ODLOŽENÝ TABUĽKOVÝ CONSTRAINT. Ten sa kontroluje až pri
// COMMIT-e, takže vnútri jednej transakcie smie tabuľka dočasne prejsť cez
// stav s duplicitnou pozíciou a skontroluje sa až výsledok.
//
// Unikátny index sa nedá urobiť odloženým - odložiť sa dá len constraint,
// preto index padá a na jeho mieste vzniká constraint rovnakého mena.

'use strict';

const NAZOV = 'liga_tabulky_liga_pozicia';

module.exports = {
  async up(queryInterface) {
    // Pôvodný unikátny index odstránime. Používame IF EXISTS, aby migrácia
    // prešla aj nad databázou, ktorá ho z akéhokoľvek dôvodu nemá.
    await queryInterface.sequelize.query(`DROP INDEX IF EXISTS "${NAZOV}"`);

    // Constraint rovnakého mena mohol vzniknúť pri opakovanom spustení -
    // zhodíme ho tiež, nech je ďalší príkaz idempotentný.
    await queryInterface.sequelize.query(
      `ALTER TABLE "liga_tabulky" DROP CONSTRAINT IF EXISTS "${NAZOV}"`
    );

    await queryInterface.sequelize.query(
      `ALTER TABLE "liga_tabulky" ` +
      `ADD CONSTRAINT "${NAZOV}" UNIQUE ("liga_id", "pozicia") ` +
      `DEFERRABLE INITIALLY DEFERRED`
    );
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      `ALTER TABLE "liga_tabulky" DROP CONSTRAINT IF EXISTS "${NAZOV}"`
    );

    // Návrat k pôvodnému stavu: obyčajný unikátny index.
    await queryInterface.sequelize.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "${NAZOV}" ON "liga_tabulky" ("liga_id", "pozicia")`
    );
  },
};
