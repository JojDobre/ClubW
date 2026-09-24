// Umiestnenie: backend/migrations/20260924000001-jazyky.js
//
// Jazyk administrácie: predvolený pre celý klub (Nastavenia) a vlastný
// pre každého používateľa (Môj profil). Prázdny jazyk používateľa znamená
// „podľa nastavenia klubu".

'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(
      `ALTER TABLE "pouzivatelia" ADD COLUMN IF NOT EXISTS "jazyk" VARCHAR(5)`
    );
    await queryInterface.sequelize.query(
      `ALTER TABLE "nastavenia_klubu" ADD COLUMN IF NOT EXISTS "jazyk_administracie" VARCHAR(5) NOT NULL DEFAULT 'sk'`
    );
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`ALTER TABLE "nastavenia_klubu" DROP COLUMN IF EXISTS "jazyk_administracie"`);
    await queryInterface.sequelize.query(`ALTER TABLE "pouzivatelia" DROP COLUMN IF EXISTS "jazyk"`);
  },
};
