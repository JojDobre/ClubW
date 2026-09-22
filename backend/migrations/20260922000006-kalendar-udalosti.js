// Umiestnenie: backend/migrations/20260922000006-kalendar-udalosti.js
//
// PREČO VZNIKLA: kalendár vedel len čítať zápasy. Vlastná udalosť
// (napríklad tréning U12) sa nedala vytvoriť vôbec - žiadny model,
// tabuľka ani endpoint. Požiadavka pritom hovorí o názve, popise, tíme,
// čase, dátume a pravidelnosti, a o tom, že sa udalosť v kalendári
// zobrazuje pod farbou tímu.
//
// OPAKOVANIE sa ukladá ako PRAVIDLO, nie ako tisíc jednotlivých
// záznamov. Pri čítaní sa pravidlo rozvinie na konkrétne dni v žiadanom
// rozsahu. Úprava tréningu tak zmení celý rad naraz a databáza
// nenarastá s každým týždňom.

'use strict';

const tabulkaExistuje = async (queryInterface, tabulka) => {
  const [riadky] = await queryInterface.sequelize.query(
    `SELECT to_regclass('public."${tabulka}"') AS existuje`
  );
  return riadky[0] && riadky[0].existuje !== null;
};

module.exports = {
  async up(queryInterface) {
    if (await tabulkaExistuje(queryInterface, 'kalendar_udalosti')) return;

    await queryInterface.sequelize.query(
      `DO 'BEGIN CREATE TYPE "public"."enum_kalendar_udalosti_opakovanie" ` +
      `AS ENUM(''ziadne'', ''denne'', ''tyzdenne'', ''dvojtyzdenne'', ''mesacne''); ` +
      `EXCEPTION WHEN duplicate_object THEN null; END';`
    );

    await queryInterface.sequelize.query(`
      CREATE TABLE "kalendar_udalosti" (
        "id" SERIAL PRIMARY KEY,
        "nazov" VARCHAR(150) NOT NULL,
        "popis" TEXT,
        "tim_id" INTEGER REFERENCES "timy" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        "datum" DATE NOT NULL,
        "cas_od" TIME,
        "cas_do" TIME,
        "miesto" VARCHAR(150),
        "opakovanie" "public"."enum_kalendar_udalosti_opakovanie" NOT NULL DEFAULT 'ziadne',
        "opakovanie_do" DATE,
        "aktivity" BOOLEAN NOT NULL DEFAULT true,
        "vytvorena" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "aktualizovana" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await queryInterface.sequelize.query(
      `CREATE INDEX IF NOT EXISTS "kalendar_udalosti_datum" ON "kalendar_udalosti" ("datum")`
    );
    await queryInterface.sequelize.query(
      `CREATE INDEX IF NOT EXISTS "kalendar_udalosti_tim" ON "kalendar_udalosti" ("tim_id")`
    );
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`DROP TABLE IF EXISTS "kalendar_udalosti" CASCADE`);
    await queryInterface.sequelize.query(
      `DROP TYPE IF EXISTS "enum_kalendar_udalosti_opakovanie" CASCADE`
    );
  },
};
