// Umiestnenie: backend/migrations/20261007000001-emaily.js
//
// E-mailový systém:
//   - email_nastavenia: SMTP server a odosielateľ zadané v administrácii
//     (jeden riadok; bez neho sa použijú premenné SMTP_* z .env)
//   - email_sablony: texty automatických e-mailov, ktoré klub upravil
//     (predvolené texty sú v kóde, tu sú len zmeny)
//   - email_kampane: hromadné e-maily fanúšikom
//   - email_fronta: každý e-mail - čaká, odoslaný, chyba; opakované pokusy

'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const t = await queryInterface.sequelize.transaction();
    const cas = {
      vytvoreny: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      aktualizovany: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    };
    try {
      await queryInterface.createTable(
        'email_nastavenia',
        {
          id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
          smtp_host: { type: Sequelize.STRING(255), allowNull: true },
          smtp_port: { type: Sequelize.INTEGER, allowNull: true },
          /** auto | ssl | starttls | ziadne */
          smtp_zabezpecenie: { type: Sequelize.STRING(10), allowNull: false, defaultValue: 'auto' },
          smtp_pouzivatel: { type: Sequelize.STRING(255), allowNull: true },
          /** Zašifrované (AES-256-GCM) - nikdy sa neposiela späť do prehliadača */
          smtp_heslo: { type: Sequelize.TEXT, allowNull: true },
          odosielatel_meno: { type: Sequelize.STRING(150), allowNull: true },
          odosielatel_email: { type: Sequelize.STRING(255), allowNull: true },
          odpovedat_na: { type: Sequelize.STRING(255), allowNull: true },
          /** Text v pätičke každého e-mailu */
          pata: { type: Sequelize.TEXT, allowNull: true },
          /** Koľko e-mailov z fronty odíde za minútu (hromadné e-maily) */
          limit_za_minutu: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 30 },
          ...cas,
        },
        { transaction: t }
      );

      await queryInterface.createTable(
        'email_sablony',
        {
          id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
          kluc: { type: Sequelize.STRING(60), allowNull: false, unique: true },
          predmet: { type: Sequelize.STRING(255), allowNull: false },
          obsah: { type: Sequelize.TEXT, allowNull: false },
          aktivna: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
          ...cas,
        },
        { transaction: t }
      );

      await queryInterface.createTable(
        'email_kampane',
        {
          id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
          nazov: { type: Sequelize.STRING(150), allowNull: false },
          predmet: { type: Sequelize.STRING(255), allowNull: false },
          obsah: { type: Sequelize.TEXT, allowNull: false },
          /** { typy: ['clen', ...] (prázdne = všetci), len_platne: true } */
          adresati: { type: Sequelize.JSONB, allowNull: false, defaultValue: {} },
          /** koncept | odosiela | odoslana */
          stav: { type: Sequelize.STRING(15), allowNull: false, defaultValue: 'koncept' },
          pocet_adresatov: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
          vytvoril_id: {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: { model: 'pouzivatelia', key: 'id' },
            onDelete: 'SET NULL',
          },
          odoslana: { type: Sequelize.DATE, allowNull: true },
          ...cas,
        },
        { transaction: t }
      );

      await queryInterface.createTable(
        'email_fronta',
        {
          id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
          prijemca: { type: Sequelize.STRING(255), allowNull: false },
          predmet: { type: Sequelize.STRING(255), allowNull: false },
          text: { type: Sequelize.TEXT, allowNull: false },
          html: { type: Sequelize.TEXT, allowNull: true },
          /** Kľúč šablóny (heslo_admin, objednavka_zakaznik...), test alebo null */
          sablona: { type: Sequelize.STRING(60), allowNull: true },
          kampan_id: {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: { model: 'email_kampane', key: 'id' },
            onDelete: 'SET NULL',
          },
          /** Ďalšie hlavičky (List-Unsubscribe pri hromadných e-mailoch) */
          hlavicky: { type: Sequelize.JSONB, allowNull: true },
          /** caka | odosiela | odoslany | chyba | konzola (vývoj bez SMTP) */
          stav: { type: Sequelize.STRING(15), allowNull: false, defaultValue: 'caka' },
          pokusy: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
          posledna_chyba: { type: Sequelize.TEXT, allowNull: true },
          odoslat_po: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
          odoslany: { type: Sequelize.DATE, allowNull: true },
          ...cas,
        },
        { transaction: t }
      );
      await queryInterface.addIndex('email_fronta', ['stav', 'odoslat_po'], { name: 'email_fronta_stav_cas', transaction: t });
      await queryInterface.addIndex('email_fronta', ['kampan_id'], { name: 'email_fronta_kampan', transaction: t });
      await queryInterface.addIndex('email_fronta', ['vytvoreny'], { name: 'email_fronta_vytvoreny', transaction: t });

      await t.commit();
    } catch (e) {
      await t.rollback();
      throw e;
    }
  },

  async down(queryInterface) {
    await queryInterface.dropTable('email_fronta');
    await queryInterface.dropTable('email_kampane');
    await queryInterface.dropTable('email_sablony');
    await queryInterface.dropTable('email_nastavenia');
  },
};
