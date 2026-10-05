// Umiestnenie: backend/migrations/20261006000001-fanusikovia-ucty-vyhody.js
//
// Účty fanúšikov na webe (stránka Môj klub):
//   - fanusikovia: heslo, overovací kód členskej karty (QR), posledné
//     prihlásenie a verzia tokenov (zmena hesla odhlási ostatné zariadenia)
//   - fanusikovia_tokeny: jednorazové odkazy na nastavenie / obnovu hesla
//   - vyhody_fanusikov: výhody členov, ktoré klub zadáva v administrácii

'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const t = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.addColumn('fanusikovia', 'heslo_hash', { type: Sequelize.STRING(100), allowNull: true }, { transaction: t });
      await queryInterface.addColumn('fanusikovia', 'overovaci_kod', { type: Sequelize.STRING(40), allowNull: true }, { transaction: t });
      await queryInterface.addColumn('fanusikovia', 'posledne_prihlasenie', { type: Sequelize.DATE, allowNull: true }, { transaction: t });
      await queryInterface.addColumn(
        'fanusikovia',
        'verzia_tokenu',
        { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
        { transaction: t }
      );
      await queryInterface.addIndex('fanusikovia', ['overovaci_kod'], { unique: true, name: 'fanusikovia_overovaci_kod', transaction: t });

      await queryInterface.createTable(
        'fanusikovia_tokeny',
        {
          id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
          fanusik_id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: { model: 'fanusikovia', key: 'id' },
            onDelete: 'CASCADE',
          },
          /** SHA-256 odtlačok - samotný token sa neukladá */
          odtlacok: { type: Sequelize.STRING(64), allowNull: false, unique: true },
          /** pozvanka | obnova */
          ucel: { type: Sequelize.STRING(20), allowNull: false },
          platny_do: { type: Sequelize.DATE, allowNull: false },
          pouzity: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
          vytvoreny: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
          aktualizovany: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
        },
        { transaction: t }
      );
      await queryInterface.addIndex('fanusikovia_tokeny', ['fanusik_id'], { name: 'fanusikovia_tokeny_fanusik', transaction: t });

      await queryInterface.createTable(
        'vyhody_fanusikov',
        {
          id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
          nazov: { type: Sequelize.STRING(150), allowNull: false },
          popis: { type: Sequelize.TEXT, allowNull: true },
          obrazok: { type: Sequelize.STRING(500), allowNull: true },
          /** Pre ktoré typy členstva; prázdne = pre všetkých */
          typy_clenstva: { type: Sequelize.JSONB, allowNull: false, defaultValue: [] },
          sponzor_id: {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: { model: 'sponzori', key: 'id' },
            onDelete: 'SET NULL',
          },
          /** Zľavový kód, ktorý člen ukáže alebo zadá u partnera */
          kod: { type: Sequelize.STRING(60), allowNull: true },
          odkaz: { type: Sequelize.STRING(500), allowNull: true },
          platne_od: { type: Sequelize.DATEONLY, allowNull: true },
          platne_do: { type: Sequelize.DATEONLY, allowNull: true },
          poradie: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
          aktivity: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
          vytvoreny: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
          aktualizovany: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
        },
        { transaction: t }
      );

      await t.commit();
    } catch (chyba) {
      await t.rollback();
      throw chyba;
    }
  },

  async down(queryInterface) {
    await queryInterface.dropTable('vyhody_fanusikov');
    await queryInterface.dropTable('fanusikovia_tokeny');
    await queryInterface.removeIndex('fanusikovia', 'fanusikovia_overovaci_kod');
    for (const stlpec of ['verzia_tokenu', 'posledne_prihlasenie', 'overovaci_kod', 'heslo_hash']) {
      await queryInterface.removeColumn('fanusikovia', stlpec);
    }
  },
};
