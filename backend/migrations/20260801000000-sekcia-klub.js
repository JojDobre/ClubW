// Umiestnenie: backend/migrations/20260801000000-sekcia-klub.js
//
// Tabuľky sekcie KLUB: sponzori, dokumenty, ankety a fanúšikovia.
//
// PREČO: návrh administrácie obsahuje sekciu KLUB so štyrmi obrazovkami,
// backend pre ne však nemal žiadne rozhranie (zodpovedajú fázam 6, 8, 9
// a 10 z pôvodného plánu vývoja).

'use strict';

const vytvorTabulkuAkChyba = async (queryInterface, nazov, definicia) => {
  const [riadky] = await queryInterface.sequelize.query(
    `SELECT to_regclass('public."${nazov}"') AS existuje`
  );
  if (riadky[0]?.existuje) {
    console.log(`   ℹ️  Tabuľka ${nazov} už existuje, preskakujem`);
    return false;
  }
  await queryInterface.createTable(nazov, definicia);
  return true;
};

const pridajIndexAkChyba = async (queryInterface, tabulka, polia, moznosti) => {
  const [riadky] = await queryInterface.sequelize.query(
    `SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='${moznosti.name}'`
  );
  if (riadky.length > 0) return;
  await queryInterface.addIndex(tabulka, polia, moznosti);
};

const casoveZnacky = (Sequelize, vytvoreny = 'vytvoreny', aktualizovany = 'aktualizovany') => ({
  [vytvoreny]: {
    type: Sequelize.DATE,
    allowNull: false,
    defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
  },
  [aktualizovany]: {
    type: Sequelize.DATE,
    allowNull: false,
    defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
  },
});

module.exports = {
  async up(queryInterface, Sequelize) {
    // ===== Sponzori =====
    await vytvorTabulkuAkChyba(queryInterface, 'sponzori', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
      nazov: { type: Sequelize.STRING(150), allowNull: false },
      uroven: {
        type: Sequelize.ENUM('generalny', 'hlavny', 'partner', 'dodavatel'),
        allowNull: false,
        defaultValue: 'partner',
      },
      logo: { type: Sequelize.STRING(255), allowNull: true },
      web_url: { type: Sequelize.STRING(255), allowNull: true },
      popis: { type: Sequelize.TEXT, allowNull: true },
      platny_od: { type: Sequelize.DATEONLY, allowNull: true },
      platny_do: { type: Sequelize.DATEONLY, allowNull: true },
      poradie: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      aktivity: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      ...casoveZnacky(Sequelize),
    });

    await pridajIndexAkChyba(queryInterface, 'sponzori', ['uroven', 'poradie'], {
      name: 'sponzori_uroven_poradie',
    });

    // ===== Dokumenty =====
    await vytvorTabulkuAkChyba(queryInterface, 'dokumenty', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
      nazov: { type: Sequelize.STRING(200), allowNull: false },
      popis: { type: Sequelize.TEXT, allowNull: true },
      subor_url: { type: Sequelize.STRING(255), allowNull: false },
      typ_suboru: { type: Sequelize.STRING(10), allowNull: true },
      velkost_kb: { type: Sequelize.INTEGER, allowNull: true },
      kategoria: { type: Sequelize.STRING(60), allowNull: true },
      // Neverejný dokument uvidia len prihlásení používatelia
      verejny: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      pocet_stiahnuti: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      poradie: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      aktivity: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      ...casoveZnacky(Sequelize),
    });

    await pridajIndexAkChyba(queryInterface, 'dokumenty', ['kategoria'], {
      name: 'dokumenty_kategoria',
    });

    // ===== Ankety =====
    await vytvorTabulkuAkChyba(queryInterface, 'ankety', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
      otazka: { type: Sequelize.STRING(300), allowNull: false },
      // Možnosti aj s počtami hlasov držíme ako JSON — pri niekoľkých
      // možnostiach by samostatná tabuľka priniesla len réžiu navyše
      moznosti: { type: Sequelize.JSONB, allowNull: false, defaultValue: [] },
      otvorena: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      publikovana: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      platna_od: { type: Sequelize.DATEONLY, allowNull: true },
      platna_do: { type: Sequelize.DATEONLY, allowNull: true },
      celkom_hlasov: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      ...casoveZnacky(Sequelize, 'vytvorena', 'aktualizovana'),
    });

    // ===== Fanúšikovia =====
    await vytvorTabulkuAkChyba(queryInterface, 'fanusikovia', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
      meno: { type: Sequelize.STRING(80), allowNull: false },
      priezvisko: { type: Sequelize.STRING(80), allowNull: false },
      email: { type: Sequelize.STRING(150), allowNull: false, unique: true },
      telefon: { type: Sequelize.STRING(40), allowNull: true },
      typ_clenstva: {
        type: Sequelize.ENUM('fanusik', 'clen', 'vip', 'cestny'),
        allowNull: false,
        defaultValue: 'fanusik',
      },
      cislo_karty: { type: Sequelize.STRING(30), allowNull: true },
      clenstvo_od: { type: Sequelize.DATEONLY, allowNull: true },
      clenstvo_do: { type: Sequelize.DATEONLY, allowNull: true },
      // Súhlas so zasielaním oznamov — dá sa kedykoľvek odvolať
      suhlas_oznamy: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      poznamka: { type: Sequelize.TEXT, allowNull: true },
      aktivity: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      ...casoveZnacky(Sequelize),
    });

    await pridajIndexAkChyba(queryInterface, 'fanusikovia', ['email'], {
      unique: true,
      name: 'fanusikovia_email',
    });
    await pridajIndexAkChyba(queryInterface, 'fanusikovia', ['typ_clenstva'], {
      name: 'fanusikovia_typ',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('fanusikovia');
    await queryInterface.dropTable('ankety');
    await queryInterface.dropTable('dokumenty');
    await queryInterface.dropTable('sponzori');

    // ENUM typy zostávajú po zmazaní tabuliek, treba ich odstrániť zvlášť
    for (const typ of ['enum_sponzori_uroven', 'enum_fanusikovia_typ_clenstva']) {
      await queryInterface.sequelize.query(`DROP TYPE IF EXISTS "${typ}" CASCADE`);
    }
  },
};
