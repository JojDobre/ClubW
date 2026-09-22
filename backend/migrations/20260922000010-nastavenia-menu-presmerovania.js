// Umiestnenie: backend/migrations/20260922000010-nastavenia-menu-presmerovania.js
//
// PREČO VZNIKLA: z požiadaviek na nastavenia chýbalo:
//   - dodatkové farby podľa šablóny
//   - globálne nastavenia komentárov
//   - GDPR nastavenia
//   - širšie SEO nastavenia (bol len meta_popis)
//   - úprava menu (poradie, texty, odkazy, vnorenie, vlastná položka)
//   - presmerovanie odkazov (starý odkaz -> nový)
//
// Menu sa doteraz skladalo VÝHRADNE z Page.v_menu a poradie_menu, takže
// sa nedalo vnoriť, pomenovať inak než stránka ani pridať vlastný odkaz.
// Preto vzniká samostatná tabuľka položiek menu.

'use strict';

const stlpecExistuje = async (queryInterface, tabulka, stlpec) => {
  const [riadky] = await queryInterface.sequelize.query(
    `SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = '${tabulka}' AND column_name = '${stlpec}'`
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
    // ===== 1. Rozšírené nastavenia klubu =====
    // JSONB namiesto desiatok stĺpcov: sady nastavení sa menia často
    // a nová položka v nich nevyžaduje migráciu.
    const jsonoveStlpce = [
      ['dodatkove_farby', "'{}'::jsonb"],
      ['nastavenia_komentarov', `'{"povolene":true,"moderovat":true,"vyzadovat_email":false,"povolit_odpovede":true}'::jsonb`],
      ['nastavenia_gdpr', `'{"cookie_lista":true,"text_suhlasu":null,"kontakt_zodpovednej_osoby":null,"retencia_mesiacov":36}'::jsonb`],
      ['nastavenia_seo', `'{"meta_title_sablona":null,"kluc_slova":null,"og_obrazok":null,"indexovat":true,"google_search_console":null}'::jsonb`],
    ];

    for (const [stlpec, predvolena] of jsonoveStlpce) {
      if (await stlpecExistuje(queryInterface, 'nastavenia_klubu', stlpec)) continue;
      await queryInterface.sequelize.query(
        `ALTER TABLE "nastavenia_klubu" ADD COLUMN "${stlpec}" JSONB NOT NULL DEFAULT ${predvolena}`
      );
    }

    // ===== 2. Položky menu =====
    if (!(await tabulkaExistuje(queryInterface, 'menu_polozky'))) {
      await queryInterface.sequelize.query(
        `DO 'BEGIN CREATE TYPE "public"."enum_menu_polozky_typ" ` +
        `AS ENUM(''stranka'', ''url'', ''rubrika''); ` +
        `EXCEPTION WHEN duplicate_object THEN null; END';`
      );

      await queryInterface.sequelize.query(`
        CREATE TABLE "menu_polozky" (
          "id" SERIAL PRIMARY KEY,
          "nazov" VARCHAR(100) NOT NULL,
          "typ" "public"."enum_menu_polozky_typ" NOT NULL DEFAULT 'stranka',
          "stranka_id" INTEGER REFERENCES "pages" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
          "rubrika_id" INTEGER REFERENCES "rubriky" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
          "url" VARCHAR(500),
          "rodic_id" INTEGER REFERENCES "menu_polozky" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
          "poradie" INTEGER NOT NULL DEFAULT 0,
          "otvorit_v_novom" BOOLEAN NOT NULL DEFAULT false,
          "aktivity" BOOLEAN NOT NULL DEFAULT true,
          "vytvorena" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "aktualizovana" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await queryInterface.sequelize.query(
        `CREATE INDEX IF NOT EXISTS "menu_polozky_rodic" ON "menu_polozky" ("rodic_id")`
      );

      // Prevod existujúceho menu zo stránok, aby web po nasadení
      // nezostal bez navigácie
      await queryInterface.sequelize.query(`
        INSERT INTO "menu_polozky" ("nazov", "typ", "stranka_id", "poradie")
        SELECT "nazov", 'stranka', "id", "poradie_menu"
          FROM "pages"
         WHERE "v_menu" = true
      `);
    }

    // ===== 3. Presmerovania =====
    if (!(await tabulkaExistuje(queryInterface, 'presmerovania'))) {
      await queryInterface.sequelize.query(`
        CREATE TABLE "presmerovania" (
          "id" SERIAL PRIMARY KEY,
          "stary_odkaz" VARCHAR(500) NOT NULL UNIQUE,
          "novy_odkaz" VARCHAR(500) NOT NULL,
          "kod" INTEGER NOT NULL DEFAULT 301,
          "poznamka" VARCHAR(255),
          "pocet_pouziti" INTEGER NOT NULL DEFAULT 0,
          "posledne_pouzite" TIMESTAMP WITH TIME ZONE,
          "aktivity" BOOLEAN NOT NULL DEFAULT true,
          "vytvorene" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "aktualizovane" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await queryInterface.sequelize.query(
        `CREATE INDEX IF NOT EXISTS "presmerovania_stary" ON "presmerovania" ("stary_odkaz")`
      );
    }
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`DROP TABLE IF EXISTS "presmerovania" CASCADE`);
    await queryInterface.sequelize.query(`DROP TABLE IF EXISTS "menu_polozky" CASCADE`);
    await queryInterface.sequelize.query(`DROP TYPE IF EXISTS "enum_menu_polozky_typ" CASCADE`);

    for (const stlpec of ['dodatkove_farby', 'nastavenia_komentarov', 'nastavenia_gdpr', 'nastavenia_seo']) {
      await queryInterface.sequelize.query(
        `ALTER TABLE "nastavenia_klubu" DROP COLUMN IF EXISTS "${stlpec}"`
      );
    }
  },
};
