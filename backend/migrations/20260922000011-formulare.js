// Umiestnenie: backend/migrations/20260922000011-formulare.js
//
// PREČO VZNIKLA: formuláre v projekte vôbec neexistovali - žiadny
// model ani endpoint. Požiadavka žiada vytváranie formulárov (názov,
// polia s popismi), zobrazenie formulára, zobrazenie vyplnených
// a označovanie prečítané/neprečítané.
//
// Polia formulára sú JSON. Každý formulár má iné a pevná schéma by
// znamenala migráciu pri každej zmene.

'use strict';

const tabulkaExistuje = async (queryInterface, tabulka) => {
  const [riadky] = await queryInterface.sequelize.query(
    `SELECT to_regclass('public."${tabulka}"') AS existuje`
  );
  return riadky[0] && riadky[0].existuje !== null;
};

module.exports = {
  async up(queryInterface) {
    if (!(await tabulkaExistuje(queryInterface, 'formulare'))) {
      await queryInterface.sequelize.query(`
        CREATE TABLE "formulare" (
          "id" SERIAL PRIMARY KEY,
          "nazov" VARCHAR(150) NOT NULL,
          "slug" VARCHAR(170) NOT NULL UNIQUE,
          "popis" TEXT,
          "polia" JSONB NOT NULL DEFAULT '[]'::jsonb,
          "sprava_po_odoslani" TEXT,
          "email_pre_notifikacie" VARCHAR(255),
          "aktivny" BOOLEAN NOT NULL DEFAULT true,
          "aktivity" BOOLEAN NOT NULL DEFAULT true,
          "vytvoreny" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "aktualizovany" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
    }

    if (!(await tabulkaExistuje(queryInterface, 'formular_odpovede'))) {
      await queryInterface.sequelize.query(`
        CREATE TABLE "formular_odpovede" (
          "id" SERIAL PRIMARY KEY,
          "formular_id" INTEGER NOT NULL
            REFERENCES "formulare" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
          "udaje" JSONB NOT NULL DEFAULT '{}'::jsonb,
          "precitane" BOOLEAN NOT NULL DEFAULT false,
          "ip_adresa" VARCHAR(45),
          "vytvorena" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "aktualizovana" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await queryInterface.sequelize.query(
        `CREATE INDEX IF NOT EXISTS "formular_odpovede_formular" ON "formular_odpovede" ("formular_id")`
      );
      // Nové (neprečítané) odpovede sú to, čo administrácia ukazuje ako prvé
      await queryInterface.sequelize.query(
        `CREATE INDEX IF NOT EXISTS "formular_odpovede_precitane" ON "formular_odpovede" ("precitane")`
      );
    }
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`DROP TABLE IF EXISTS "formular_odpovede" CASCADE`);
    await queryInterface.sequelize.query(`DROP TABLE IF EXISTS "formulare" CASCADE`);
  },
};
