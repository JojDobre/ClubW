// Umiestnenie: backend/migrations/20260729000002-tokeny-relacii-a-hesiel.js
//
// Pridanie tabuliek pre obnovovacie tokeny a obnovu zabudnutého hesla.
//
// PREČO:
//   1. Pôvodný endpoint /api/auth/refresh vyžadoval PLATNÝ prihlasovací
//      token, takže obnoviť sa dal len token, ktorý ešte nevypršal.
//      Po 24 hodinách bol používateľ odhlásený uprostred práce.
//   2. Neexistoval spôsob, ako platný token zrušiť - deaktivácia účtu
//      alebo odobratie práv sa prejavili až po jeho vypršaní.
//   3. Neexistovala žiadna obnova zabudnutého hesla - jedinou možnosťou
//      bol ručný zásah do databázy.
//
// V oboch tabuľkách sa ukladá len odtlačok (SHA-256) tokenu, nie samotná
// hodnota. Únik obsahu tabuľky preto neumožní prihlásiť sa cudzím účtom.

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
    // ===== Obnovovacie tokeny relácií =====
    await vytvorTabulkuAkChyba(queryInterface, 'obnovovacie_tokeny', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      pouzivatel_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'pouzivatelia', key: 'id' },
        onUpdate: 'CASCADE',
        // Po zmazaní používateľa zaniknú aj jeho relácie
        onDelete: 'CASCADE',
      },
      odtlacok: {
        // SHA-256 v šestnástkovej sústave má vždy 64 znakov
        type: Sequelize.STRING(64),
        allowNull: false,
        unique: true,
      },
      platny_do: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      zruseny: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      dovod_zrusenia: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      ip_adresa: {
        // 45 znakov stačí aj na IPv6
        type: Sequelize.STRING(45),
        allowNull: true,
      },
      prehliadac: {
        type: Sequelize.STRING(255),
        allowNull: true,
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

    await pridajIndexAkChyba(queryInterface, 'obnovovacie_tokeny', ['odtlacok'], {
      unique: true,
      name: 'obnovovacie_tokeny_odtlacok',
    });
    await pridajIndexAkChyba(queryInterface, 'obnovovacie_tokeny', ['pouzivatel_id'], {
      name: 'obnovovacie_tokeny_pouzivatel',
    });
    // Index pre upratovanie vypršaných záznamov
    await pridajIndexAkChyba(queryInterface, 'obnovovacie_tokeny', ['platny_do'], {
      name: 'obnovovacie_tokeny_platnost',
    });

    // ===== Tokeny na obnovu zabudnutého hesla =====
    await vytvorTabulkuAkChyba(queryInterface, 'reset_hesla_tokeny', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      pouzivatel_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'pouzivatelia', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      odtlacok: {
        type: Sequelize.STRING(64),
        allowNull: false,
        unique: true,
      },
      platny_do: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      pouzity: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      ip_adresa: {
        type: Sequelize.STRING(45),
        allowNull: true,
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

    await pridajIndexAkChyba(queryInterface, 'reset_hesla_tokeny', ['odtlacok'], {
      unique: true,
      name: 'reset_hesla_odtlacok',
    });
    await pridajIndexAkChyba(queryInterface, 'reset_hesla_tokeny', ['pouzivatel_id'], {
      name: 'reset_hesla_pouzivatel',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('reset_hesla_tokeny');
    await queryInterface.dropTable('obnovovacie_tokeny');
  },
};
