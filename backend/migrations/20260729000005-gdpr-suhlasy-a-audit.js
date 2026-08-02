// Umiestnenie: backend/migrations/20260729000005-gdpr-suhlasy-a-audit.js
//
// Evidencia súhlasov so spracovaním osobných údajov a auditný záznam.
//
// PREČO: systém eviduje mená, dátumy narodenia a fotky detí (kategórie
// U9 až U19) a zobrazuje ich na verejnom webe. Podľa GDPR ide o osobné
// údaje maloletých, ktorých zverejnenie vyžaduje súhlas zákonného
// zástupcu. Doteraz sa nikde neevidoval. Zároveň chýbal záznam o tom,
// kto a kedy s osobnými údajmi pracoval.

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
    // ===== Súhlasy =====
    await vytvorTabulkuAkChyba(queryInterface, 'suhlasy', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      hrac_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'hraci', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      druh: {
        type: Sequelize.ENUM(
          'zverejnenie_fotky',
          'zverejnenie_mena',
          'spracovanie_udajov',
          'kontaktne_udaje',
          'marketing'
        ),
        allowNull: false,
      },
      udeleny: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      // Kto súhlas udelil - pri maloletom zákonný zástupca
      udelil_meno: { type: Sequelize.STRING(150), allowNull: true },
      udelil_vztah: { type: Sequelize.STRING(50), allowNull: true },
      udelil_email: { type: Sequelize.STRING(150), allowNull: true },
      datum_udelenia: { type: Sequelize.DATE, allowNull: true },
      datum_odvolania: { type: Sequelize.DATE, allowNull: true },
      platny_do: { type: Sequelize.DATEONLY, allowNull: true },
      zdroj: { type: Sequelize.STRING(100), allowNull: true },
      poznamka: { type: Sequelize.TEXT, allowNull: true },
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

    await pridajIndexAkChyba(queryInterface, 'suhlasy', ['hrac_id', 'druh'], {
      unique: true,
      name: 'suhlasy_hrac_druh',
    });
    await pridajIndexAkChyba(queryInterface, 'suhlasy', ['hrac_id'], {
      name: 'suhlasy_hrac',
    });

    // ===== Auditný záznam =====
    await vytvorTabulkuAkChyba(queryInterface, 'audit_log', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      pouzivatel_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'pouzivatelia', key: 'id' },
        onUpdate: 'CASCADE',
        // Po zmazaní používateľa záznam zostáva - inak by sa dala
        // história zahladiť zmazaním vlastného účtu
        onDelete: 'SET NULL',
      },
      pouzivatel_email: { type: Sequelize.STRING(150), allowNull: true },
      akcia: {
        type: Sequelize.ENUM(
          'vytvorenie', 'uprava', 'zmazanie', 'anonymizacia',
          'export_udajov', 'zmena_suhlasu', 'prihlasenie', 'zmena_hesla'
        ),
        allowNull: false,
      },
      entita: { type: Sequelize.STRING(50), allowNull: false },
      entita_id: { type: Sequelize.INTEGER, allowNull: true },
      popis: { type: Sequelize.STRING(500), allowNull: true },
      ip_adresa: { type: Sequelize.STRING(45), allowNull: true },
      vytvoreny: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await pridajIndexAkChyba(queryInterface, 'audit_log', ['entita', 'entita_id'], {
      name: 'audit_entita',
    });
    await pridajIndexAkChyba(queryInterface, 'audit_log', ['pouzivatel_id'], {
      name: 'audit_pouzivatel',
    });
    await pridajIndexAkChyba(queryInterface, 'audit_log', ['vytvoreny'], {
      name: 'audit_datum',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('audit_log');
    await queryInterface.dropTable('suhlasy');
    // ENUM typy zostávajú po zmazaní tabuliek, treba ich odstrániť zvlášť
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_audit_log_akcia" CASCADE');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_suhlasy_druh" CASCADE');
  },
};
