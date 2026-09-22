// Umiestnenie: backend/migrations/20260922000007-media-kniznica.js
//
// PREČO VZNIKLA: media knižnica v projekte vôbec neexistovala.
// Neexistovala tabuľka súborov, takže sa nedal znovu použiť existujúci
// obrázok a nebol alt text, popis, autor ani dátum nahratia. Cesty
// navyše nesedeli s požiadavkou - obrázky článkov padali ploché do
// /uploads/articles/, bez roka a mesiaca a bez záznamu v databáze.
//
// Nové súbory pôjdu do /uploads/media/<rok>/<mesiac>/ a každý dostane
// záznam. Staré cesty zostávajú funkčné - existujúce súbory doplní do
// knižnice skript scripts/import-media.ts.

'use strict';

const tabulkaExistuje = async (queryInterface, tabulka) => {
  const [riadky] = await queryInterface.sequelize.query(
    `SELECT to_regclass('public."${tabulka}"') AS existuje`
  );
  return riadky[0] && riadky[0].existuje !== null;
};

module.exports = {
  async up(queryInterface) {
    if (await tabulkaExistuje(queryInterface, 'media')) return;

    await queryInterface.sequelize.query(
      `DO 'BEGIN CREATE TYPE "public"."enum_media_typ" ` +
      `AS ENUM(''obrazok'', ''dokument'', ''ine''); ` +
      `EXCEPTION WHEN duplicate_object THEN null; END';`
    );

    await queryInterface.sequelize.query(`
      CREATE TABLE "media" (
        "id" SERIAL PRIMARY KEY,
        "nazov" VARCHAR(200) NOT NULL,
        "originalny_nazov" VARCHAR(255) NOT NULL,
        "cesta" VARCHAR(500) NOT NULL UNIQUE,
        "typ" "public"."enum_media_typ" NOT NULL DEFAULT 'obrazok',
        "mime_typ" VARCHAR(100) NOT NULL,
        "velkost" BIGINT NOT NULL DEFAULT 0,
        "sirka" INTEGER,
        "vyska" INTEGER,
        "alt_text" VARCHAR(255),
        "popis" TEXT,
        "autor_id" INTEGER REFERENCES "pouzivatelia" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
        "aktivity" BOOLEAN NOT NULL DEFAULT true,
        "vytvoreny" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "aktualizovany" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await queryInterface.sequelize.query(
      `CREATE INDEX IF NOT EXISTS "media_typ" ON "media" ("typ")`
    );
    await queryInterface.sequelize.query(
      `CREATE INDEX IF NOT EXISTS "media_vytvoreny" ON "media" ("vytvoreny")`
    );
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`DROP TABLE IF EXISTS "media" CASCADE`);
    await queryInterface.sequelize.query(`DROP TYPE IF EXISTS "enum_media_typ" CASCADE`);
  },
};
