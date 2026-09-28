// Umiestnenie: backend/migrations/20260928000001-predvolena-sablona-klubova.js
//
// Predvolenou šablónou webu je Klubová. Nové inštalácie ju dostanú hneď
// a weby, ktoré ostali na pôvodnej základnej šablóne, sa prepnú na ňu.
// Weby s inou zvolenou šablónou (Moderná, Štadión, nahratá) ostanú tak.
// Pôvodná základná šablóna zostáva v systéme - Klubová z nej preberá
// stránky, ktoré ešte sama nemá.

'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`ALTER TABLE "nastavenia_klubu" ALTER COLUMN "aktivna_sablona" SET DEFAULT 'klubova'`);
    await queryInterface.sequelize.query(`UPDATE "nastavenia_klubu" SET "aktivna_sablona" = 'klubova' WHERE "aktivna_sablona" = 'zakladna'`);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`ALTER TABLE "nastavenia_klubu" ALTER COLUMN "aktivna_sablona" SET DEFAULT 'zakladna'`);
    await queryInterface.sequelize.query(`UPDATE "nastavenia_klubu" SET "aktivna_sablona" = 'zakladna' WHERE "aktivna_sablona" = 'klubova'`);
  },
};
