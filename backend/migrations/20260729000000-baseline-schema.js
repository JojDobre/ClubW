// Umiestnenie: backend/migrations/20260729000000-baseline-schema.js
//
// POČIATOČNÁ (BASELINE) MIGRÁCIA - celá schéma projektu k dátumu 29. 7. 2026.
//
// PREČO VZNIKLA: schéma sa doteraz vytvárala volaním sequelize.sync().
// Pre produkciu je to nebezpečné - neexistuje história zmien, nedá sa vrátiť
// späť a sync({ alter: true }) vie v PostgreSQL ticho prepísať alebo zahodiť
// stĺpce aj s dátami. Od teraz sa schéma mení výhradne migráciami.
//
// Obsah bol vygenerovaný z reálneho SQL, ktoré Sequelize produkuje pre
// súčasné modely (skript scripts/generuj-baseline-migraciu.ts), takže je
// zaručene zhodný s modelmi a nevznikol ručným prepisom.
//
// Poradie tabuliek je odvodené z cudzích kľúčov - rodičovské tabuľky
// vznikajú skôr než tie, ktoré sa na ne odkazujú.
//
// EXISTUJÚCA INŠTALÁCIA: príkazy používajú IF NOT EXISTS, takže migráciu
// možno bezpečne spustiť aj nad databázou, ktorá už vznikla cez sync().

'use strict';

module.exports = {
  async up(queryInterface) {
    // ===== 1. ENUM typy =====
    // Musia existovať skôr, než ich použijú stĺpce tabuliek
    const enumTypy = [
      `DO 'BEGIN CREATE TYPE "public"."enum_timy_typ" AS ENUM(''muzi'', ''zeny'', ''mladez''); EXCEPTION WHEN duplicate_object THEN null; END';`,
      `DO 'BEGIN CREATE TYPE "public"."enum_pouzivatelia_rola" AS ENUM(''admin'', ''redaktor'', ''trener'', ''uzivatel''); EXCEPTION WHEN duplicate_object THEN null; END';`,
      `DO 'BEGIN CREATE TYPE "public"."enum_clanky_status" AS ENUM(''draft'', ''published'', ''scheduled'', ''archived''); EXCEPTION WHEN duplicate_object THEN null; END';`,
      `DO 'BEGIN CREATE TYPE "public"."enum_ligy_typ" AS ENUM(''sutaz'', ''pohar'', ''priatelska''); EXCEPTION WHEN duplicate_object THEN null; END';`,
      `DO 'BEGIN CREATE TYPE "public"."enum_ligy_format" AS ENUM(''tabulka'', ''turnaj'', ''kombinovany''); EXCEPTION WHEN duplicate_object THEN null; END';`,
      `DO 'BEGIN CREATE TYPE "public"."enum_ligy_turnaj_typ" AS ENUM(''single_elimination'', ''double_elimination'', ''round_robin'', ''groups_playoff''); EXCEPTION WHEN duplicate_object THEN null; END';`,
      `DO 'BEGIN CREATE TYPE "public"."enum_liga_turnaje_typ" AS ENUM(''single_elimination'', ''double_elimination'', ''round_robin'', ''groups_playoff''); EXCEPTION WHEN duplicate_object THEN null; END';`,
      `DO 'BEGIN CREATE TYPE "public"."enum_liga_turnaje_status" AS ENUM(''pripravuje'', ''prebiehajuci'', ''ukonceny'', ''pozastaveny''); EXCEPTION WHEN duplicate_object THEN null; END';`,
      `DO 'BEGIN CREATE TYPE "public"."enum_zapasy_status" AS ENUM(''naplanovany'', ''prebieha'', ''ukonceny'', ''odlozeny'', ''zruseny''); EXCEPTION WHEN duplicate_object THEN null; END';`,
      `DO 'BEGIN CREATE TYPE "public"."enum_zapas_statistiky_typ" AS ENUM(''gol'', ''asistencia'', ''zlta_karta'', ''cervena_karta'', ''vlastny_gol''); EXCEPTION WHEN duplicate_object THEN null; END';`,
    ];

    for (const prikaz of enumTypy) {
      await queryInterface.sequelize.query(prikaz);
    }

    // ===== 2. Tabuľky =====
    const tabulky = [
      `CREATE TABLE IF NOT EXISTS "ligy" ("id"  SERIAL , "nazov" VARCHAR(100) NOT NULL, "sezona" VARCHAR(20) NOT NULL, "typ" "public"."enum_ligy_typ" NOT NULL DEFAULT 'sutaz', "popis" TEXT, "external_widget_url" VARCHAR(500), "logo" VARCHAR(255), "farba" VARCHAR(7), "poradie" INTEGER NOT NULL DEFAULT 0, "aktivity" BOOLEAN NOT NULL DEFAULT true, "datum_start" DATE, "datum_koniec" DATE, "format" "public"."enum_ligy_format" NOT NULL DEFAULT 'tabulka', "pocet_timov" INTEGER, "body_za_vitazstvo" INTEGER NOT NULL DEFAULT 3, "body_za_remizy" INTEGER NOT NULL DEFAULT 1, "body_za_prehru" INTEGER NOT NULL DEFAULT 0, "auto_update_tabulka" BOOLEAN NOT NULL DEFAULT true, "zobrazit_formu" BOOLEAN NOT NULL DEFAULT true, "min_zapasov" INTEGER NOT NULL DEFAULT 0, "turnaj_typ" "public"."enum_ligy_turnaj_typ", "turnaj_pocet_postupujucich" INTEGER, "posledny_import" TIMESTAMP WITH TIME ZONE, "external_sync" BOOLEAN NOT NULL DEFAULT false, "vytvoreny" TIMESTAMP WITH TIME ZONE NOT NULL, "aktualizovany" TIMESTAMP WITH TIME ZONE NOT NULL, PRIMARY KEY ("id"));`,
      `CREATE TABLE IF NOT EXISTS "pages" ("id"  SERIAL , "nazov" VARCHAR(200) NOT NULL, "obsah" TEXT NOT NULL, "slug" VARCHAR(100) NOT NULL UNIQUE, "v_menu" BOOLEAN NOT NULL DEFAULT false, "poradie_menu" INTEGER NOT NULL DEFAULT 10, "meta_title" VARCHAR(100), "meta_description" VARCHAR(300), "publikovany" BOOLEAN NOT NULL DEFAULT false, "vytvoreny" TIMESTAMP WITH TIME ZONE NOT NULL, "aktualizovany" TIMESTAMP WITH TIME ZONE NOT NULL, PRIMARY KEY ("id"));`,
      `CREATE TABLE IF NOT EXISTS "rubriky" ("id"  SERIAL , "nazov" VARCHAR(100) NOT NULL UNIQUE, "slug" VARCHAR(120) NOT NULL UNIQUE, "popis" TEXT, "farba" VARCHAR(7), "ikona" VARCHAR(50), "poradie" INTEGER NOT NULL DEFAULT 0, "aktivity" BOOLEAN NOT NULL DEFAULT true, "vytvoreny" TIMESTAMP WITH TIME ZONE NOT NULL, "aktualizovany" TIMESTAMP WITH TIME ZONE NOT NULL, PRIMARY KEY ("id"));`,
      `CREATE TABLE IF NOT EXISTS "timy" ("id"  SERIAL , "nazov" VARCHAR(100) NOT NULL, "slug" VARCHAR(120) NOT NULL UNIQUE, "typ" "public"."enum_timy_typ" NOT NULL, "vekova_kategoria" VARCHAR(20) NOT NULL , "popis" TEXT, "logo" VARCHAR(500), "farba_prva" VARCHAR(7) , "farba_druha" VARCHAR(7) , "poradie" INTEGER NOT NULL DEFAULT 0, "aktivity" BOOLEAN NOT NULL DEFAULT true, "vytvoreny" TIMESTAMP WITH TIME ZONE NOT NULL, "aktualizovany" TIMESTAMP WITH TIME ZONE NOT NULL, PRIMARY KEY ("id")); COMMENT ON COLUMN "timy"."vekova_kategoria" IS 'Napríklad: U9, U13, U16, U21, seniori, ženy'; COMMENT ON COLUMN "timy"."farba_prva" IS 'Hex farba prvého dresu (napríklad #FF0000)'; COMMENT ON COLUMN "timy"."farba_druha" IS 'Hex farba druhého dresu (napríklad #0000FF)';`,
      `CREATE TABLE IF NOT EXISTS "hraci" ("id"  SERIAL , "meno" VARCHAR(50) NOT NULL, "priezvisko" VARCHAR(50) NOT NULL, "datum_narodenia" DATE NOT NULL, "cislo_dresu" INTEGER , "pozicia" VARCHAR(30) NOT NULL , "narodnost" VARCHAR(50), "vaha" DECIMAL(5,2) , "vyska" INTEGER , "fotka" VARCHAR(500) , "tim_id" INTEGER NOT NULL REFERENCES "timy" ("id") ON DELETE CASCADE ON UPDATE CASCADE, "aktivity" BOOLEAN NOT NULL DEFAULT true, "poznamky" TEXT, "vytvoreny" TIMESTAMP WITH TIME ZONE NOT NULL, "aktualizovany" TIMESTAMP WITH TIME ZONE NOT NULL, PRIMARY KEY ("id")); COMMENT ON COLUMN "hraci"."cislo_dresu" IS 'Číslo dresu (1-99), unikátne v rámci tímu'; COMMENT ON COLUMN "hraci"."pozicia" IS 'Pozícia hráča (brankár, obranca, stredopoliar, útočník)'; COMMENT ON COLUMN "hraci"."vaha" IS 'Váha v kilogramoch'; COMMENT ON COLUMN "hraci"."vyska" IS 'Výška v centimetroch'; COMMENT ON COLUMN "hraci"."fotka" IS 'URL adresa fotky hráča';`,
      `CREATE TABLE IF NOT EXISTS "liga_tabulky" ("id"  SERIAL , "liga_id" INTEGER NOT NULL REFERENCES "ligy" ("id") ON DELETE CASCADE ON UPDATE CASCADE, "tim_id" INTEGER REFERENCES "timy" ("id") ON DELETE CASCADE ON UPDATE CASCADE, "custom_tim_nazov" VARCHAR(100), "pozicia" INTEGER NOT NULL, "body" INTEGER NOT NULL DEFAULT 0, "zapasy" INTEGER NOT NULL DEFAULT 0, "vitazstva" INTEGER NOT NULL DEFAULT 0, "remizy" INTEGER NOT NULL DEFAULT 0, "prehry" INTEGER NOT NULL DEFAULT 0, "goly_za" INTEGER NOT NULL DEFAULT 0, "goly_proti" INTEGER NOT NULL DEFAULT 0, "goly_rozdiel" INTEGER NOT NULL DEFAULT 0, "domace_zapasy" INTEGER DEFAULT 0, "domace_vitazstva" INTEGER DEFAULT 0, "domace_remizy" INTEGER DEFAULT 0, "domace_prehry" INTEGER DEFAULT 0, "domace_goly_za" INTEGER DEFAULT 0, "domace_goly_proti" INTEGER DEFAULT 0, "vonkajsie_zapasy" INTEGER DEFAULT 0, "vonkajsie_vitazstva" INTEGER DEFAULT 0, "vonkajsie_remizy" INTEGER DEFAULT 0, "vonkajsie_prehry" INTEGER DEFAULT 0, "vonkajsie_goly_za" INTEGER DEFAULT 0, "vonkajsie_goly_proti" INTEGER DEFAULT 0, "forma" VARCHAR(10), "serie_zapasov" INTEGER , "penalizacne_body" INTEGER DEFAULT 0 , "bonus_body" INTEGER DEFAULT 0 , "posledny_zapas" TIMESTAMP WITH TIME ZONE, "manualne_upravene" BOOLEAN NOT NULL DEFAULT false, "poznamky" TEXT, "vytvoreny" TIMESTAMP WITH TIME ZONE NOT NULL, "aktualizovany" TIMESTAMP WITH TIME ZONE NOT NULL, PRIMARY KEY ("id")); COMMENT ON COLUMN "liga_tabulky"."serie_zapasov" IS 'Pozitívne = séria víťazstiev, negatívne = séria prehier'; COMMENT ON COLUMN "liga_tabulky"."penalizacne_body" IS 'Odobraté body - záporné číslo'; COMMENT ON COLUMN "liga_tabulky"."bonus_body" IS 'Bonusové body - kladné číslo';`,
      `CREATE TABLE IF NOT EXISTS "liga_turnaje" ("id"  SERIAL , "liga_id" INTEGER NOT NULL REFERENCES "ligy" ("id") ON DELETE CASCADE ON UPDATE CASCADE, "nazov" VARCHAR(100) NOT NULL, "typ" "public"."enum_liga_turnaje_typ" NOT NULL, "pocet_timov" INTEGER NOT NULL, "pocet_postupujucich" INTEGER, "aktualna_faza" VARCHAR(50) NOT NULL DEFAULT 'round_1', "celkove_fazy" JSON NOT NULL DEFAULT '[]', "pocet_skupin" INTEGER, "skupiny_struktura" TEXT, "pavuk_struktura" TEXT, "ma_tretie_miesto" BOOLEAN NOT NULL DEFAULT true, "status" "public"."enum_liga_turnaje_status" NOT NULL DEFAULT 'pripravuje', "datum_start" DATE, "datum_koniec" DATE, "vitaz_id" INTEGER REFERENCES "timy" ("id"), "druhy_id" INTEGER REFERENCES "timy" ("id"), "treti_id" INTEGER REFERENCES "timy" ("id"), "poznamky" TEXT, "aktivity" BOOLEAN NOT NULL DEFAULT true, "vytvoreny" TIMESTAMP WITH TIME ZONE NOT NULL, "aktualizovany" TIMESTAMP WITH TIME ZONE NOT NULL, PRIMARY KEY ("id"));`,
      `CREATE TABLE IF NOT EXISTS "pouzivatelia" ("id"  SERIAL , "meno" VARCHAR(100) NOT NULL, "email" VARCHAR(255) NOT NULL UNIQUE, "heslo" VARCHAR(255) NOT NULL, "rola" "public"."enum_pouzivatelia_rola" NOT NULL DEFAULT 'uzivatel', "tim_id" INTEGER REFERENCES "timy" ("id") ON DELETE SET NULL ON UPDATE CASCADE, "aktivity" BOOLEAN NOT NULL DEFAULT true, "posledne_prihlasenie" TIMESTAMP WITH TIME ZONE, "vytvoreny" TIMESTAMP WITH TIME ZONE NOT NULL, "aktualizovany" TIMESTAMP WITH TIME ZONE NOT NULL, PRIMARY KEY ("id"));`,
      `CREATE TABLE IF NOT EXISTS "realizacny_tim" ("id"  SERIAL , "meno" VARCHAR(50) NOT NULL, "priezvisko" VARCHAR(50) NOT NULL, "funkcia" VARCHAR(50) NOT NULL , "email" VARCHAR(255), "telefon" VARCHAR(20), "datum_narodenia" DATE, "kvalifikacia" TEXT , "fotka" VARCHAR(500), "tim_id" INTEGER REFERENCES "timy" ("id") ON DELETE SET NULL ON UPDATE CASCADE, "aktivity" BOOLEAN NOT NULL DEFAULT true, "poznamky" TEXT, "poradie" INTEGER NOT NULL DEFAULT 0 , "vytvoreny" TIMESTAMP WITH TIME ZONE NOT NULL, "aktualizovany" TIMESTAMP WITH TIME ZONE NOT NULL, PRIMARY KEY ("id")); COMMENT ON COLUMN "realizacny_tim"."funkcia" IS 'Funkcia v realizačnom tíme (tréner, lekár, masér, etc.)'; COMMENT ON COLUMN "realizacny_tim"."kvalifikacia" IS 'Trénerské licencie, vzdelanie, certifikáty'; COMMENT ON COLUMN "realizacny_tim"."poradie" IS 'Poradie zobrazovania v zozname';`,
      `CREATE TABLE IF NOT EXISTS "clanky" ("id"  SERIAL , "nazov" VARCHAR(200) NOT NULL, "slug" VARCHAR(220) NOT NULL UNIQUE, "obsah" TEXT NOT NULL, "excerpt" VARCHAR(500), "obrazok" VARCHAR(255), "autor_id" INTEGER NOT NULL REFERENCES "pouzivatelia" ("id") ON DELETE RESTRICT ON UPDATE CASCADE, "kategoria_id" INTEGER NOT NULL REFERENCES "rubriky" ("id") ON DELETE RESTRICT ON UPDATE CASCADE, "status" "public"."enum_clanky_status" NOT NULL DEFAULT 'draft', "publikovany_datum" TIMESTAMP WITH TIME ZONE, "views" INTEGER NOT NULL DEFAULT 0, "meta_title" VARCHAR(70), "meta_description" VARCHAR(160), "tags" TEXT, "featured" BOOLEAN NOT NULL DEFAULT false, "komentare_povolene" BOOLEAN NOT NULL DEFAULT true, "vytvoreny" TIMESTAMP WITH TIME ZONE NOT NULL, "aktualizovany" TIMESTAMP WITH TIME ZONE NOT NULL, PRIMARY KEY ("id"));`,
      `CREATE TABLE IF NOT EXISTS "zapasy" ("id"  SERIAL , "nazov" VARCHAR(200) NOT NULL, "liga_id" INTEGER REFERENCES "ligy" ("id") ON DELETE RESTRICT ON UPDATE CASCADE, "liga_nazov" VARCHAR(100), "kolo" VARCHAR(50), "datum_cas" TIMESTAMP WITH TIME ZONE NOT NULL, "miesto" VARCHAR(100), "domaci_tim_id" INTEGER REFERENCES "timy" ("id") ON DELETE SET NULL ON UPDATE CASCADE, "domaci_tim_nazov" VARCHAR(100), "hostujuci_tim_id" INTEGER REFERENCES "timy" ("id") ON DELETE SET NULL ON UPDATE CASCADE, "hostujuci_tim_nazov" VARCHAR(100), "goly_domaci" INTEGER, "goly_hostia" INTEGER, "status" "public"."enum_zapasy_status" NOT NULL DEFAULT 'naplanovany', "pocet_divakov" INTEGER, "poznamky" TEXT, "video_url" VARCHAR(500), "clanok_id" INTEGER REFERENCES "clanky" ("id"), "fotogaleria_id" INTEGER, "aktivity" BOOLEAN NOT NULL DEFAULT true, "vytvoreny" TIMESTAMP WITH TIME ZONE NOT NULL, "aktualizovany" TIMESTAMP WITH TIME ZONE NOT NULL, PRIMARY KEY ("id"));`,
      `CREATE TABLE IF NOT EXISTS "galerie" ("id"  SERIAL , "nazov" VARCHAR(150) NOT NULL, "popis" TEXT, "slug" VARCHAR(170) NOT NULL UNIQUE, "tim_id" INTEGER REFERENCES "timy" ("id"), "clanok_id" INTEGER REFERENCES "clanky" ("id"), "zapas_id" INTEGER REFERENCES "zapasy" ("id"), "pocet_obrazkov" INTEGER NOT NULL DEFAULT 0, "nahladovy_obrazok" VARCHAR(500), "aktivity" BOOLEAN NOT NULL DEFAULT true, "vytvoreny" TIMESTAMP WITH TIME ZONE NOT NULL, "aktualizovany" TIMESTAMP WITH TIME ZONE NOT NULL, PRIMARY KEY ("id"));`,
      `CREATE TABLE IF NOT EXISTS "zapas_statistiky" ("id"  SERIAL , "zapas_id" INTEGER NOT NULL REFERENCES "zapasy" ("id") ON DELETE CASCADE ON UPDATE CASCADE, "hrac_id" INTEGER NOT NULL REFERENCES "hraci" ("id") ON DELETE CASCADE ON UPDATE CASCADE, "typ" "public"."enum_zapas_statistiky_typ" NOT NULL, "minuta" INTEGER, "poznamka" VARCHAR(500), "aktivity" BOOLEAN NOT NULL DEFAULT true, "vytvoreny" TIMESTAMP WITH TIME ZONE NOT NULL, "aktualizovany" TIMESTAMP WITH TIME ZONE NOT NULL, PRIMARY KEY ("id"));`,
      `CREATE TABLE IF NOT EXISTS "galeria_obrazky" ("id"  SERIAL , "galeria_id" INTEGER NOT NULL REFERENCES "galerie" ("id") ON DELETE CASCADE ON UPDATE CASCADE, "nazov" VARCHAR(200), "popis" TEXT, "cesta_suboru" VARCHAR(500) NOT NULL, "originalny_nazov" VARCHAR(255) NOT NULL, "velkost_suboru" BIGINT NOT NULL, "mime_typ" VARCHAR(100) NOT NULL, "sirka" INTEGER, "vyska" INTEGER, "nahladovy_maly" VARCHAR(500), "nahladovy_stredny" VARCHAR(500), "poradie" INTEGER NOT NULL DEFAULT 1, "je_nahladovy" BOOLEAN NOT NULL DEFAULT false, "zobrazenia" INTEGER NOT NULL DEFAULT 0, "aktivity" BOOLEAN NOT NULL DEFAULT true, "vytvoreny" TIMESTAMP WITH TIME ZONE NOT NULL, "aktualizovany" TIMESTAMP WITH TIME ZONE NOT NULL, PRIMARY KEY ("id"));`,
    ];

    for (const prikaz of tabulky) {
      await queryInterface.sequelize.query(prikaz);
    }

    // ===== 3. Indexy =====
    const indexy = [
      `CREATE UNIQUE INDEX "timy_slug" ON "timy" ("slug")`,
      `CREATE INDEX "timy_typ" ON "timy" ("typ")`,
      `CREATE INDEX "timy_aktivity" ON "timy" ("aktivity")`,
      `CREATE INDEX "timy_poradie" ON "timy" ("poradie")`,
      `CREATE UNIQUE INDEX "rubriky_slug" ON "rubriky" ("slug")`,
      `CREATE INDEX "rubriky_aktivity" ON "rubriky" ("aktivity")`,
      `CREATE INDEX "rubriky_poradie" ON "rubriky" ("poradie")`,
      `CREATE UNIQUE INDEX "clanky_slug" ON "clanky" ("slug")`,
      `CREATE INDEX "clanky_status" ON "clanky" ("status")`,
      `CREATE INDEX "clanky_autor_id" ON "clanky" ("autor_id")`,
      `CREATE INDEX "clanky_kategoria_id" ON "clanky" ("kategoria_id")`,
      `CREATE INDEX "clanky_publikovany_datum" ON "clanky" ("publikovany_datum")`,
      `CREATE INDEX "clanky_featured" ON "clanky" ("featured")`,
      `CREATE INDEX "clanky_views" ON "clanky" ("views")`,
      `CREATE INDEX "hraci_tim_id" ON "hraci" ("tim_id")`,
      `CREATE INDEX "hraci_aktivity" ON "hraci" ("aktivity")`,
      `CREATE INDEX "hraci_pozicia" ON "hraci" ("pozicia")`,
      `CREATE UNIQUE INDEX "unique_jersey_per_team" ON "hraci" ("cislo_dresu", "tim_id") WHERE "cislo_dresu" IS NOT NULL AND "aktivity" = true`,
      `CREATE INDEX "realizacny_tim_tim_id" ON "realizacny_tim" ("tim_id")`,
      `CREATE INDEX "realizacny_tim_aktivity" ON "realizacny_tim" ("aktivity")`,
      `CREATE INDEX "realizacny_tim_funkcia" ON "realizacny_tim" ("funkcia")`,
      `CREATE INDEX "realizacny_tim_poradie" ON "realizacny_tim" ("poradie")`,
      `CREATE UNIQUE INDEX "realizacny_tim_email" ON "realizacny_tim" ("email") WHERE "email" IS NOT NULL`,
      `CREATE UNIQUE INDEX "ligy_nazov_sezona" ON "ligy" ("nazov", "sezona")`,
      `CREATE INDEX "ligy_typ" ON "ligy" ("typ")`,
      `CREATE INDEX "ligy_aktivity" ON "ligy" ("aktivity")`,
      `CREATE INDEX "ligy_poradie" ON "ligy" ("poradie")`,
      `CREATE INDEX "ligy_format" ON "ligy" ("format")`,
      `CREATE INDEX "ligy_datum_start" ON "ligy" ("datum_start")`,
      `CREATE INDEX "ligy_datum_koniec" ON "ligy" ("datum_koniec")`,
      `CREATE UNIQUE INDEX "liga_tabulky_liga_pozicia" ON "liga_tabulky" ("liga_id", "pozicia")`,
      `CREATE INDEX "liga_tabulky_tim_id" ON "liga_tabulky" ("tim_id")`,
      `CREATE INDEX "liga_tabulky_ranking" ON "liga_tabulky" ("liga_id", "body", "goly_rozdiel")`,
      `CREATE UNIQUE INDEX "liga_turnaje_liga_id_aktivny_unique" ON "liga_turnaje" ("liga_id") WHERE "aktivity" = true`,
      `CREATE INDEX "liga_turnaje_liga_id" ON "liga_turnaje" ("liga_id")`,
      `CREATE INDEX "liga_turnaje_typ" ON "liga_turnaje" ("typ")`,
      `CREATE INDEX "liga_turnaje_status" ON "liga_turnaje" ("status")`,
      `CREATE INDEX "liga_turnaje_aktualna_faza" ON "liga_turnaje" ("aktualna_faza")`,
      `CREATE INDEX "zapasy_datum_cas" ON "zapasy" ("datum_cas")`,
      `CREATE INDEX "zapasy_status" ON "zapasy" ("status")`,
      `CREATE INDEX "zapasy_liga_id" ON "zapasy" ("liga_id")`,
      `CREATE INDEX "zapasy_domaci_tim_id" ON "zapasy" ("domaci_tim_id")`,
      `CREATE INDEX "zapasy_hostujuci_tim_id" ON "zapasy" ("hostujuci_tim_id")`,
      `CREATE INDEX "zapasy_aktivity" ON "zapasy" ("aktivity")`,
      `CREATE INDEX "zapas_statistiky_zapas_id" ON "zapas_statistiky" ("zapas_id")`,
      `CREATE INDEX "zapas_statistiky_hrac_id" ON "zapas_statistiky" ("hrac_id")`,
      `CREATE INDEX "zapas_statistiky_typ" ON "zapas_statistiky" ("typ")`,
      `CREATE INDEX "zapas_statistiky_aktivity" ON "zapas_statistiky" ("aktivity")`,
      `CREATE INDEX "zapas_statistiky_zapas_id_typ" ON "zapas_statistiky" ("zapas_id", "typ")`,
      `CREATE UNIQUE INDEX "pages_slug" ON "pages" ("slug")`,
      `CREATE INDEX "pages_publikovany" ON "pages" ("publikovany")`,
      `CREATE INDEX "pages_v_menu" ON "pages" ("v_menu")`,
      `CREATE INDEX "pages_v_menu_publikovany_poradie_menu" ON "pages" ("v_menu", "publikovany", "poradie_menu")`,
      `CREATE UNIQUE INDEX "galerie_slug" ON "galerie" ("slug")`,
      `CREATE INDEX "galerie_tim_id" ON "galerie" ("tim_id")`,
      `CREATE INDEX "galerie_clanok_id" ON "galerie" ("clanok_id")`,
      `CREATE INDEX "galerie_zapas_id" ON "galerie" ("zapas_id")`,
      `CREATE INDEX "galerie_aktivity" ON "galerie" ("aktivity")`,
      `CREATE INDEX "galerie_vytvoreny" ON "galerie" ("vytvoreny")`,
      `CREATE INDEX "galeria_obrazky_galeria_id" ON "galeria_obrazky" ("galeria_id")`,
      `CREATE INDEX "galeria_obrazky_galeria_id_poradie" ON "galeria_obrazky" ("galeria_id", "poradie")`,
      `CREATE INDEX "galeria_obrazky_je_nahladovy" ON "galeria_obrazky" ("je_nahladovy")`,
      `CREATE INDEX "galeria_obrazky_aktivity" ON "galeria_obrazky" ("aktivity")`,
      `CREATE INDEX "galeria_obrazky_vytvoreny" ON "galeria_obrazky" ("vytvoreny")`,
      `CREATE UNIQUE INDEX "galeria_obrazky_galeria_id_je_nahladovy" ON "galeria_obrazky" ("galeria_id", "je_nahladovy") WHERE "je_nahladovy" = true AND "aktivity" = true`,
    ];

    for (const prikaz of indexy) {
      // Index už môže existovať z predchádzajúcej inštalácie cez sync(),
      // preto doplníme IF NOT EXISTS
      const bezpecny = prikaz.replace(
        /^CREATE (UNIQUE )?INDEX /i,
        (_zhoda, unikatny) => `CREATE ${unikatny || ''}INDEX IF NOT EXISTS `
      );
      await queryInterface.sequelize.query(bezpecny);
    }
  },

  async down(queryInterface) {
    // Mazanie v opačnom poradí kvôli cudzím kľúčom.
    // CASCADE odstráni aj závislé obmedzenia.
    const tabulkyNaZmazanie = [
      'galeria_obrazky',
      'zapas_statistiky',
      'galerie',
      'zapasy',
      'clanky',
      'realizacny_tim',
      'pouzivatelia',
      'liga_turnaje',
      'liga_tabulky',
      'hraci',
      'timy',
      'rubriky',
      'pages',
      'ligy',
    ];

    for (const tabulka of tabulkyNaZmazanie) {
      await queryInterface.sequelize.query(`DROP TABLE IF EXISTS "${tabulka}" CASCADE`);
    }

    // ENUM typy sa mažú až po tabuľkách, ktoré ich používali
    const enumNaZmazanie = [
      'enum_clanky_status',
      'enum_liga_turnaje_status',
      'enum_liga_turnaje_typ',
      'enum_ligy_format',
      'enum_ligy_turnaj_typ',
      'enum_ligy_typ',
      'enum_pouzivatelia_rola',
      'enum_timy_typ',
      'enum_zapas_statistiky_typ',
      'enum_zapasy_status',
    ];

    for (const typ of enumNaZmazanie) {
      await queryInterface.sequelize.query(`DROP TYPE IF EXISTS "${typ}" CASCADE`);
    }
  },
};
