// Umiestnenie: backend/migrations/20260729000003-nastavenia-klubu.js
//
// Tabuľka nastavení klubu - white-label identita, farby a kontaktné údaje.
//
// PREČO: návrh verejného webu je postavený tak, že zmena troch CSS
// premenných prefarbí celý web. Hodnoty však boli natvrdo v štýloch,
// takže každý nový klub znamenal zásah do kódu. Pri licenčnom modeli,
// kde systém obsluhuje viacero klubov, to nie je použiteľné.
//
// Tabuľka obsahuje jediný riadok na inštaláciu. Migrácia ho rovno vytvorí
// s predvolenými hodnotami, aby web nikdy nezostal bez názvu a farieb.

'use strict';

/**
 * Vytvorí tabuľku, len ak ešte neexistuje.
 *
 * PREČO: databázy vytvorené starším spôsobom (sequelize.sync()) už tieto
 * tabuľky obsahovať môžu. Bez tejto kontroly by migrácia na existujúcej
 * inštalácii zlyhala hláškou "relation already exists".
 */
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

/**
 * Pridá index, len ak ešte neexistuje.
 */
const pridajIndexAkChyba = async (queryInterface, tabulka, polia, moznosti) => {
  const [riadky] = await queryInterface.sequelize.query(
    `SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='${moznosti.name}'`
  );
  if (riadky.length > 0) return;
  await queryInterface.addIndex(tabulka, polia, moznosti);
};

/**
 * Pridá stĺpec, len ak ešte neexistuje.
 */
const pridajStlpecAkChyba = async (queryInterface, tabulka, stlpec, definicia) => {
  const [riadky] = await queryInterface.sequelize.query(
    `SELECT 1 FROM information_schema.columns
     WHERE table_name='${tabulka}' AND column_name='${stlpec}'`
  );
  if (riadky.length > 0) {
    console.log(`   ℹ️  Stĺpec ${tabulka}.${stlpec} už existuje, preskakujem`);
    return false;
  }
  await queryInterface.addColumn(tabulka, stlpec, definicia);
  return true;
};

module.exports = {
  async up(queryInterface, Sequelize) {
    await vytvorTabulkuAkChyba(queryInterface, 'nastavenia_klubu', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },

      // ===== Identita klubu =====
      nazov: {
        type: Sequelize.STRING(150),
        allowNull: false,
        defaultValue: 'Futbalový klub',
      },
      skratka: {
        // Znak loga, napríklad "SD" pre FC Slovan Dolina
        type: Sequelize.STRING(4),
        allowNull: true,
      },
      slogan: { type: Sequelize.STRING(150), allowNull: true },
      rok_zalozenia: { type: Sequelize.INTEGER, allowNull: true },
      logo: { type: Sequelize.STRING(255), allowNull: true },
      favicon: { type: Sequelize.STRING(255), allowNull: true },

      // ===== Farby (white-label tokeny) =====
      // Predvolené hodnoty zodpovedajú návrhu webu
      farba_primarna: {
        type: Sequelize.STRING(7),
        allowNull: false,
        defaultValue: '#1B5E20',
      },
      farba_sekundarna: {
        type: Sequelize.STRING(7),
        allowNull: false,
        defaultValue: '#FFFFFF',
      },
      farba_akcent: {
        type: Sequelize.STRING(7),
        allowNull: false,
        defaultValue: '#FFC107',
      },
      farba_primarna_kontrast: {
        type: Sequelize.STRING(7),
        allowNull: false,
        defaultValue: '#FFFFFF',
      },
      farba_akcent_kontrast: {
        type: Sequelize.STRING(7),
        allowNull: false,
        defaultValue: '#1B2410',
      },

      // ===== Kontakt =====
      email: { type: Sequelize.STRING(150), allowNull: true },
      telefon: { type: Sequelize.STRING(40), allowNull: true },
      adresa: { type: Sequelize.STRING(255), allowNull: true },
      ico: { type: Sequelize.STRING(20), allowNull: true },
      dic: { type: Sequelize.STRING(20), allowNull: true },

      // ===== Sociálne siete =====
      facebook_url: { type: Sequelize.STRING(255), allowNull: true },
      instagram_url: { type: Sequelize.STRING(255), allowNull: true },
      youtube_url: { type: Sequelize.STRING(255), allowNull: true },
      x_url: { type: Sequelize.STRING(255), allowNull: true },

      // ===== Web =====
      meta_popis: { type: Sequelize.STRING(300), allowNull: true },
      google_analytics_id: { type: Sequelize.STRING(40), allowNull: true },

      vytvoreny: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      aktualizovany: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    // Vloženie prvého riadku s predvolenými hodnotami.
    // Bez neho by web pri prvom spustení nemal názov ani farby.
    await queryInterface.bulkInsert('nastavenia_klubu', [
      {
        nazov: 'Futbalový klub',
        farba_primarna: '#1B5E20',
        farba_sekundarna: '#FFFFFF',
        farba_akcent: '#FFC107',
        farba_primarna_kontrast: '#FFFFFF',
        farba_akcent_kontrast: '#1B2410',
        vytvoreny: new Date(),
        aktualizovany: new Date(),
      },
    ]);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('nastavenia_klubu');
  },
};
