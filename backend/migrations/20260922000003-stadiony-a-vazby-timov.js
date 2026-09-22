// Umiestnenie: backend/migrations/20260922000003-stadiony-a-vazby-timov.js
//
// PREČO VZNIKLA: štadióny v projekte vôbec neexistovali - žiadny model,
// tabuľka ani endpoint. Tím ich nemal a zápas mal len voľné textové pole
// "miesto", takže požiadavku "domáci zápas sa bude hrať na domácom
// štadióne" nebolo z čoho naplniť.
//
// Zároveň dopĺňa dve väzby, ktoré tímu chýbali:
//   stadion_id - domáci štadión tímu
//   sezona_id  - sezóna, do ktorej tím patrí
//
// Obe sú voliteľné a pri zmazaní cieľa sa len vynulujú. Tím je dlhoveká
// entita a nemá zmiznúť preto, že sa zrušil štadión alebo archivovala
// sezóna.

'use strict';

const stlpecExistuje = async (queryInterface, tabulka, stlpec) => {
  const [riadky] = await queryInterface.sequelize.query(
    `SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = '${tabulka}'
        AND column_name = '${stlpec}'`
  );
  return riadky.length > 0;
};

const tabulkaExistuje = async (queryInterface, tabulka) => {
  const [riadky] = await queryInterface.sequelize.query(
    `SELECT to_regclass('public."${tabulka}"') AS existuje`
  );
  return riadky[0] && riadky[0].existuje !== null;
};

module.exports = {
  async up(queryInterface) {
    // ===== 1. Tabuľka štadiónov =====
    if (!(await tabulkaExistuje(queryInterface, 'stadiony'))) {
      await queryInterface.sequelize.query(`
        CREATE TABLE "stadiony" (
          "id" SERIAL PRIMARY KEY,
          "nazov" VARCHAR(120) NOT NULL,
          "adresa" VARCHAR(255),
          "fotka" VARCHAR(500),
          "kapacita" INTEGER,
          "poznamka" TEXT,
          "aktivity" BOOLEAN NOT NULL DEFAULT true,
          "vytvoreny" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "aktualizovany" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await queryInterface.sequelize.query(
        `CREATE INDEX IF NOT EXISTS "stadiony_aktivity" ON "stadiony" ("aktivity")`
      );
    }

    // ===== 2. Väzby na tíme =====
    if (!(await stlpecExistuje(queryInterface, 'timy', 'stadion_id'))) {
      await queryInterface.sequelize.query(
        `ALTER TABLE "timy" ADD COLUMN "stadion_id" INTEGER ` +
        `REFERENCES "stadiony" ("id") ON DELETE SET NULL ON UPDATE CASCADE`
      );
      await queryInterface.sequelize.query(
        `CREATE INDEX IF NOT EXISTS "timy_stadion" ON "timy" ("stadion_id")`
      );
    }

    if (!(await stlpecExistuje(queryInterface, 'timy', 'sezona_id'))) {
      await queryInterface.sequelize.query(
        `ALTER TABLE "timy" ADD COLUMN "sezona_id" INTEGER ` +
        `REFERENCES "sezony" ("id") ON DELETE SET NULL ON UPDATE CASCADE`
      );
      await queryInterface.sequelize.query(
        `CREATE INDEX IF NOT EXISTS "timy_sezona" ON "timy" ("sezona_id")`
      );
    }
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`DROP INDEX IF EXISTS "timy_sezona"`);
    await queryInterface.sequelize.query(`ALTER TABLE "timy" DROP COLUMN IF EXISTS "sezona_id"`);
    await queryInterface.sequelize.query(`DROP INDEX IF EXISTS "timy_stadion"`);
    await queryInterface.sequelize.query(`ALTER TABLE "timy" DROP COLUMN IF EXISTS "stadion_id"`);
    await queryInterface.sequelize.query(`DROP TABLE IF EXISTS "stadiony" CASCADE`);
  },
};
