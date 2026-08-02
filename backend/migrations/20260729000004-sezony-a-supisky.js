// Umiestnenie: backend/migrations/20260729000004-sezony-a-supisky.js
//
// Sezóna ako samostatná entita + súpisky hráčov po sezónach.
//
// PREČO:
//   1. Sezóna bola len textom v tabuľke líg. Preklep ("2025/26" vs
//      "2025/2026") vytvoril dve rôzne sezóny a liga sa v archíve
//      nespárovala. Nedalo sa ani zaznamenať, ktorá sezóna je aktuálna.
//   2. Hráč mal jediné pole tim_id. Po prestupe alebo posune z dorastu
//      do mužov sa prepísalo a už sa nedalo zistiť, za koho hral vlani.
//      Pri mládežníckom klube, kde hráči každý rok postupujú vyššie,
//      sa tým strácala celá história.
//
// PREVOD EXISTUJÚCICH DÁT: migrácia vytvorí sezóny z hodnôt, ktoré sú
// už v tabuľke líg, prepojí ligy na ne a založí súpisky podľa aktuálneho
// zaradenia hráčov. Žiadne údaje sa nestrácajú.

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
    const { sequelize } = queryInterface;

    // ===== 1. Tabuľka sezón =====
    await vytvorTabulkuAkChyba(queryInterface, 'sezony', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      nazov: {
        type: Sequelize.STRING(20),
        allowNull: false,
        unique: true,
      },
      zaciatok: { type: Sequelize.DATEONLY, allowNull: true },
      koniec: { type: Sequelize.DATEONLY, allowNull: true },
      aktualna: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      uzavreta: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      poznamka: { type: Sequelize.TEXT, allowNull: true },
      vytvorena: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      aktualizovana: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await pridajIndexAkChyba(queryInterface, 'sezony', ['nazov'], {
      unique: true,
      name: 'sezony_nazov',
    });

    // Čiastočný jedinečný index - aktuálna môže byť len jedna sezóna.
    // Databáza to ustráži aj vtedy, keby aplikačná logika zlyhala.
    await sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS sezony_jedna_aktualna
      ON sezony (aktualna) WHERE aktualna = true
    `);

    // ===== 2. Prevod existujúcich sezón z tabuľky líg =====
    // Vezmeme všetky rôzne hodnoty poľa sezona a vytvoríme z nich záznamy
    await sequelize.query(`
      INSERT INTO sezony (nazov, vytvorena, aktualizovana)
      SELECT DISTINCT TRIM(sezona), CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      FROM ligy
      WHERE sezona IS NOT NULL AND TRIM(sezona) <> ''
      ON CONFLICT (nazov) DO NOTHING
    `);

    // Ak žiadne ligy neexistujú, založíme aspoň jednu sezónu,
    // aby aplikácia mala s čím pracovať. Futbalový ročník začína v lete.
    await sequelize.query(`
      INSERT INTO sezony (nazov, vytvorena, aktualizovana)
      SELECT
        CASE
          WHEN EXTRACT(MONTH FROM CURRENT_DATE) >= 7
            THEN EXTRACT(YEAR FROM CURRENT_DATE)::text || '/' || (EXTRACT(YEAR FROM CURRENT_DATE) + 1)::text
          ELSE (EXTRACT(YEAR FROM CURRENT_DATE) - 1)::text || '/' || EXTRACT(YEAR FROM CURRENT_DATE)::text
        END,
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      WHERE NOT EXISTS (SELECT 1 FROM sezony)
    `);

    // Najnovšiu sezónu označíme ako aktuálnu
    await sequelize.query(`
      UPDATE sezony SET aktualna = true
      WHERE id = (SELECT id FROM sezony ORDER BY nazov DESC LIMIT 1)
    `);

    // ===== 3. Prepojenie líg na sezóny =====
    await pridajStlpecAkChyba(queryInterface, 'ligy', 'sezona_id', {
      type: Sequelize.INTEGER,
      allowNull: true, // dočasne, po naplnení sprísnime
      references: { model: 'sezony', key: 'id' },
      onUpdate: 'CASCADE',
      // Sezónu s ligami nemožno zmazať - je to história
      onDelete: 'RESTRICT',
    });

    await sequelize.query(`
      UPDATE ligy
      SET sezona_id = sezony.id
      FROM sezony
      WHERE TRIM(ligy.sezona) = sezony.nazov
    `);

    // Ligy bez rozpoznanej sezóny priradíme k aktuálnej,
    // aby nezostali bez väzby
    await sequelize.query(`
      UPDATE ligy
      SET sezona_id = (SELECT id FROM sezony WHERE aktualna = true LIMIT 1)
      WHERE sezona_id IS NULL
    `);

    await pridajIndexAkChyba(queryInterface, 'ligy', ['sezona_id'], {
      name: 'ligy_sezona_id',
    });

    // Pôvodný textový stĺpec sezona zámerne ponechávame.
    // Používa ho existujúci kód a slúži ako záloha pri prípadnom návrate.
    // Odstrániť sa dá neskôr samostatnou migráciou.

    // ===== 4. Súpisky po sezónach =====
    await vytvorTabulkuAkChyba(queryInterface, 'supisky_sezon', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      sezona_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'sezony', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      tim_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'timy', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      hrac_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'hraci', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      cislo_dresu: { type: Sequelize.INTEGER, allowNull: true },
      pozicia: { type: Sequelize.STRING(30), allowNull: true },
      kapitan: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      od: { type: Sequelize.DATEONLY, allowNull: true },
      do: { type: Sequelize.DATEONLY, allowNull: true },
      poznamka: { type: Sequelize.TEXT, allowNull: true },
      aktivny: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
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

    await pridajIndexAkChyba(queryInterface, 'supisky_sezon', ['sezona_id', 'tim_id', 'hrac_id'], {
      unique: true,
      name: 'supisky_sezona_tim_hrac',
    });
    await pridajIndexAkChyba(queryInterface, 'supisky_sezon', ['sezona_id'], { name: 'supisky_sezona' });
    await pridajIndexAkChyba(queryInterface, 'supisky_sezon', ['tim_id'], { name: 'supisky_tim' });
    await pridajIndexAkChyba(queryInterface, 'supisky_sezon', ['hrac_id'], { name: 'supisky_hrac' });

    // ===== 5. Prevod aktuálnych hráčov na súpisku aktuálnej sezóny =====
    // Zachytíme tým súčasný stav - od teraz sa história začne budovať.
    // Stĺpce hráča sa medzi inštaláciami mohli líšiť, preto ich
    // dopĺňame len vtedy, keď naozaj existujú.
    const [stlpce] = await sequelize.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'hraci' AND column_name IN ('cislo_dresu', 'pozicia')
    `);
    const nazvyStlpcov = stlpce.map((r) => r.column_name);
    const vyrazCislo = nazvyStlpcov.includes('cislo_dresu') ? 'h.cislo_dresu' : 'NULL';
    const vyrazPozicia = nazvyStlpcov.includes('pozicia') ? 'h.pozicia::text' : 'NULL';

    await sequelize.query(`
      INSERT INTO supisky_sezon
        (sezona_id, tim_id, hrac_id, cislo_dresu, pozicia, vytvoreny, aktualizovany)
      SELECT
        (SELECT id FROM sezony WHERE aktualna = true LIMIT 1),
        h.tim_id,
        h.id,
        ${vyrazCislo},
        ${vyrazPozicia},
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      FROM hraci h
      WHERE h.tim_id IS NOT NULL
      ON CONFLICT (sezona_id, tim_id, hrac_id) DO NOTHING
    `);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('supisky_sezon');
    await queryInterface.removeColumn('ligy', 'sezona_id');
    await queryInterface.dropTable('sezony');
  },
};
