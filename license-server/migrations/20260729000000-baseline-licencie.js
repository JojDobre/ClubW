// Umiestnenie: license-server/migrations/20260729000000-baseline-licencie.js
// Počiatočná schéma databázy licencií.

'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // ENUM typy musia existovať skôr, než ich použijú stĺpce
    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE "enum_licencie_plan" AS ENUM ('pro', 'enterprise');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE "enum_licencie_stav" AS ENUM ('aktivna', 'pozastavena', 'zrusena');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);

    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS "licencie" (
        "id" SERIAL PRIMARY KEY,
        -- Licenčný kľúč, ktorý klient zadá do svojho webu
        "kluc" VARCHAR(64) NOT NULL UNIQUE,
        "nazov_klienta" VARCHAR(200) NOT NULL,
        "email_klienta" VARCHAR(200) NOT NULL,
        -- Doména, na ktorej smie licencia bežať (prázdne = neviazaná)
        "domena" VARCHAR(200),
        "plan" "enum_licencie_plan" NOT NULL DEFAULT 'pro',
        -- Zoznam povolených funkcií, napr. ["cms","timy","ligy"]
        "funkcie" JSONB NOT NULL DEFAULT '[]'::jsonb,
        "platna_od" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "platna_do" TIMESTAMP WITH TIME ZONE NOT NULL,
        "stav" "enum_licencie_stav" NOT NULL DEFAULT 'aktivna',
        "poznamka" TEXT,
        -- Kedy sa klientsky web naposledy ozval
        "posledna_kontrola" TIMESTAMP WITH TIME ZONE,
        "pocet_kontrol" INTEGER NOT NULL DEFAULT 0,
        "vytvoreny" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "aktualizovany" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);

    const indexy = [
      `CREATE UNIQUE INDEX IF NOT EXISTS "licencie_kluc_unique" ON "licencie" ("kluc")`,
      `CREATE INDEX IF NOT EXISTS "licencie_stav" ON "licencie" ("stav")`,
      `CREATE INDEX IF NOT EXISTS "licencie_platna_do" ON "licencie" ("platna_do")`,
      `CREATE INDEX IF NOT EXISTS "licencie_email" ON "licencie" ("email_klienta")`,
    ];

    for (const prikaz of indexy) {
      await queryInterface.sequelize.query(prikaz);
    }
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query('DROP TABLE IF EXISTS "licencie" CASCADE');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_licencie_plan" CASCADE');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_licencie_stav" CASCADE');
  },
};
