// Umiestnenie: backend/migrations/20260922000009-role-a-opravnenia.js
//
// PREČO VZNIKLA: role boli pevný PostgreSQL enum
// (admin/redaktor/trener/uzivatel). Neexistovala tabuľka rolí ani
// oprávnení, takže požiadavku „možnosť vytvoriť rolu a tam nastaviť
// defaultné oprávnenia" nebolo ako naplniť - a nedalo sa povedať ani
// niečo také jednoduché ako „tréner smie upravovať zápasy, ale nie
// články".
//
// Oprávnenia sú uložené ako JSON mapa modul -> {citat, pisat, mazat}.
// Zodpovedá to zaškrtávacej tabuľke v administrácii a nevyžaduje to
// spojovaciu tabuľku s tisíckami riadkov.
//
// SPÄTNÁ ZLUČITEĽNOSŤ: pôvodný stĺpec "rola" zostáva. Migrácia založí
// štyri systémové role zodpovedajúce doterajšiemu enumu a existujúcich
// používateľov na ne prepojí, takže po nasadení nikto nepríde o prístup.

'use strict';

/** Moduly administrácie, na ktoré sa práva nastavujú. */
const MODULY = [
  'clanky', 'rubriky', 'komentare', 'stranky', 'galerie', 'videa',
  'media', 'stadiony', 'sezony', 'timy', 'hraci', 'realizacny_tim',
  'ligy', 'turnaje', 'zapasy', 'kalendar', 'sponzori', 'dokumenty',
  'formulare', 'pouzivatelia', 'archiv', 'nastavenia', 'logy', 'licencia',
];

/** Vyrobí mapu práv - rovnaká hodnota pre všetky moduly. */
const vsetkyModuly = (citat, pisat, mazat) =>
  MODULY.reduce((mapa, modul) => {
    mapa[modul] = { citat, pisat, mazat };
    return mapa;
  }, {});

/** Práva redaktora: obsah áno, správa systému nie. */
const pravaRedaktora = () => {
  const prava = vsetkyModuly(true, false, false);
  const obsah = [
    'clanky', 'rubriky', 'komentare', 'stranky', 'galerie', 'videa',
    'media', 'zapasy', 'kalendar', 'ligy', 'turnaje', 'sponzori',
    'dokumenty', 'hraci', 'realizacny_tim', 'timy', 'stadiony', 'sezony',
  ];
  for (const modul of obsah) prava[modul] = { citat: true, pisat: true, mazat: false };
  for (const modul of ['pouzivatelia', 'nastavenia', 'logy', 'licencia']) {
    prava[modul] = { citat: false, pisat: false, mazat: false };
  }
  return prava;
};

/** Práva trénera: vlastný športový úsek. */
const pravaTrenera = () => {
  const prava = vsetkyModuly(false, false, false);
  for (const modul of ['timy', 'hraci', 'realizacny_tim', 'zapasy', 'kalendar', 'sezony']) {
    prava[modul] = { citat: true, pisat: true, mazat: false };
  }
  for (const modul of ['ligy', 'turnaje', 'stadiony', 'clanky', 'galerie']) {
    prava[modul] = { citat: true, pisat: false, mazat: false };
  }
  return prava;
};

const tabulkaExistuje = async (queryInterface, tabulka) => {
  const [riadky] = await queryInterface.sequelize.query(
    `SELECT to_regclass('public."${tabulka}"') AS existuje`
  );
  return riadky[0] && riadky[0].existuje !== null;
};

const stlpecExistuje = async (queryInterface, tabulka, stlpec) => {
  const [riadky] = await queryInterface.sequelize.query(
    `SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = '${tabulka}' AND column_name = '${stlpec}'`
  );
  return riadky.length > 0;
};

/**
 * Doplní chýbajúci DEFAULT na časové stĺpce.
 *
 * PREČO: tabuľku mohol vytvoriť aj sequelize.sync() z modelu (vo vývoji
 * bežal pri každom štarte servera). Sync vyrobí "vytvorena TIMESTAMP NOT NULL"
 * BEZ databázového DEFAULT-u, lebo DataTypes.NOW dopĺňa Sequelize v JS.
 * Vloženie čistým SQL potom spadne na "null value in column violates
 * not-null constraint". Tabuľka má vyzerať rovnako bez ohľadu na to,
 * či ju vyrobila migrácia alebo sync.
 */
const dopravDefaultCasov = async (queryInterface, tabulka, stlpce) => {
  for (const stlpec of stlpce) {
    if (await stlpecExistuje(queryInterface, tabulka, stlpec)) {
      await queryInterface.sequelize.query(
        `ALTER TABLE "${tabulka}" ALTER COLUMN "${stlpec}" SET DEFAULT CURRENT_TIMESTAMP`
      );
    }
  }
};

module.exports = {
  async up(queryInterface) {
    // ===== 1. Tabuľka rolí =====
    if (!(await tabulkaExistuje(queryInterface, 'roly'))) {
      await queryInterface.sequelize.query(`
        CREATE TABLE "roly" (
          "id" SERIAL PRIMARY KEY,
          "nazov" VARCHAR(80) NOT NULL UNIQUE,
          "kod" VARCHAR(40) NOT NULL UNIQUE,
          "popis" TEXT,
          "opravnenia" JSONB NOT NULL DEFAULT '{}'::jsonb,
          "je_systemova" BOOLEAN NOT NULL DEFAULT false,
          "poradie" INTEGER NOT NULL DEFAULT 0,
          "aktivity" BOOLEAN NOT NULL DEFAULT true,
          "vytvorena" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "aktualizovana" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
    }

    await dopravDefaultCasov(queryInterface, 'roly', ['vytvorena', 'aktualizovana']);

    // ===== 2. Štyri systémové role podľa doterajšieho enumu =====
    const predvolene = [
      { kod: 'admin', nazov: 'Správca', popis: 'Plný prístup ku všetkému', poradie: 1, prava: vsetkyModuly(true, true, true) },
      { kod: 'redaktor', nazov: 'Redaktor', popis: 'Správa obsahu bez prístupu k nastaveniam a používateľom', poradie: 2, prava: pravaRedaktora() },
      { kod: 'trener', nazov: 'Tréner', popis: 'Tímy, hráči, zápasy a kalendár', poradie: 3, prava: pravaTrenera() },
      { kod: 'uzivatel', nazov: 'Používateľ', popis: 'Bez prístupu do administrácie', poradie: 4, prava: vsetkyModuly(false, false, false) },
    ];

    for (const rola of predvolene) {
      await queryInterface.sequelize.query(
        `INSERT INTO "roly"
           ("nazov", "kod", "popis", "opravnenia", "je_systemova", "poradie",
            "vytvorena", "aktualizovana")
         VALUES (:nazov, :kod, :popis, CAST(:prava AS jsonb), true, :poradie,
                 CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         ON CONFLICT ("kod") DO NOTHING`,
        {
          replacements: {
            nazov: rola.nazov,
            kod: rola.kod,
            popis: rola.popis,
            prava: JSON.stringify(rola.prava),
            poradie: rola.poradie,
          },
        }
      );
    }

    // ===== 3. Väzba používateľa na rolu =====
    if (!(await stlpecExistuje(queryInterface, 'pouzivatelia', 'rola_id'))) {
      await queryInterface.sequelize.query(
        `ALTER TABLE "pouzivatelia" ADD COLUMN "rola_id" INTEGER ` +
        `REFERENCES "roly" ("id") ON DELETE SET NULL ON UPDATE CASCADE`
      );
      await queryInterface.sequelize.query(
        `CREATE INDEX IF NOT EXISTS "pouzivatelia_rola" ON "pouzivatelia" ("rola_id")`
      );

      // Existujúcich používateľov prepojíme podľa doterajšieho enumu,
      // aby po nasadení nikto neprišiel o prístup
      await queryInterface.sequelize.query(`
        UPDATE "pouzivatelia" u
           SET "rola_id" = r."id"
          FROM "roly" r
         WHERE r."kod" = u."rola"::text
      `);
    }

    // ===== 4. Priezvisko používateľa =====
    // Doteraz bolo len jedno pole "meno".
    if (!(await stlpecExistuje(queryInterface, 'pouzivatelia', 'priezvisko'))) {
      await queryInterface.sequelize.query(
        `ALTER TABLE "pouzivatelia" ADD COLUMN "priezvisko" VARCHAR(100)`
      );
    }
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      `ALTER TABLE "pouzivatelia" DROP COLUMN IF EXISTS "priezvisko"`
    );
    await queryInterface.sequelize.query(`DROP INDEX IF EXISTS "pouzivatelia_rola"`);
    await queryInterface.sequelize.query(
      `ALTER TABLE "pouzivatelia" DROP COLUMN IF EXISTS "rola_id"`
    );
    await queryInterface.sequelize.query(`DROP TABLE IF EXISTS "roly" CASCADE`);
  },
};
