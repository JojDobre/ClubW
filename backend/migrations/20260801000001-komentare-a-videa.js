// Umiestnenie: backend/migrations/20260801000001-komentare-a-videa.js
//
// Tabuľky komentárov a videí.
//
// PREČO: obe položky sú v návrhu administrácie (sekcia OBSAH), backend
// pre ne však nemal žiadne rozhranie. Turnaje model už mali (LigaTurnaj),
// chýbali len routes — tie pribudli bez zmeny schémy.

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

module.exports = {
  async up(queryInterface, Sequelize) {
    // ===== Komentáre =====
    await vytvorTabulkuAkChyba(queryInterface, 'komentare', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
      clanok_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'clanky', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      autor_meno: { type: Sequelize.STRING(100), allowNull: false },
      autor_email: { type: Sequelize.STRING(150), allowNull: true },
      obsah: { type: Sequelize.TEXT, allowNull: false },
      stav: {
        type: Sequelize.ENUM('caka', 'schvaleny', 'zamietnuty', 'spam'),
        allowNull: false,
        // Nový komentár čaká na schválenie — ochrana pred spamom
        defaultValue: 'caka',
      },
      ip_adresa: { type: Sequelize.STRING(45), allowNull: true },
      // Odpoveď na iný komentár
      rodic_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'komentare', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
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

    await pridajIndexAkChyba(queryInterface, 'komentare', ['clanok_id'], { name: 'komentare_clanok' });
    await pridajIndexAkChyba(queryInterface, 'komentare', ['stav'], { name: 'komentare_stav' });

    // ===== Videá =====
    await vytvorTabulkuAkChyba(queryInterface, 'videa', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
      nazov: { type: Sequelize.STRING(200), allowNull: false },
      popis: { type: Sequelize.TEXT, allowNull: true },
      // Videosúbory neukladáme, len odkazy — pri klubovom hostingu
      // by videá rýchlo vyčerpali priestor
      url: { type: Sequelize.STRING(400), allowNull: false },
      zdroj: {
        type: Sequelize.ENUM('youtube', 'vimeo', 'ine'),
        allowNull: false,
        defaultValue: 'youtube',
      },
      video_id: { type: Sequelize.STRING(60), allowNull: true },
      nahlad: { type: Sequelize.STRING(400), allowNull: true },
      dlzka: { type: Sequelize.INTEGER, allowNull: true },
      kategoria: { type: Sequelize.STRING(60), allowNull: true },
      zapas_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'zapasy', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      publikovane: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      poradie: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      vytvorene: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      aktualizovane: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await pridajIndexAkChyba(queryInterface, 'videa', ['kategoria'], { name: 'videa_kategoria' });
    await pridajIndexAkChyba(queryInterface, 'videa', ['zapas_id'], { name: 'videa_zapas' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('videa');
    await queryInterface.dropTable('komentare');

    for (const typ of ['enum_komentare_stav', 'enum_videa_zdroj']) {
      await queryInterface.sequelize.query(`DROP TYPE IF EXISTS "${typ}" CASCADE`);
    }
  },
};
