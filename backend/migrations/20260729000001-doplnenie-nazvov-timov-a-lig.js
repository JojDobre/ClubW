// Umiestnenie: backend/migrations/20260729000001-doplnenie-nazvov-timov-a-lig.js
//
// Oprava dát: doplnenie chýbajúcich názvov tímov a líg pri zápasoch.
//
// PÔVOD: prevzaté z ručného SQL súboru
// migrations/20241218_fix_existing_matches_again.sql, ktorý sa spúšťal
// mimo akéhokoľvek systému migrácií, takže nebolo možné zistiť, či a kedy
// prebehol. Tu je zaznamenaný ako riadna migrácia.
//
// ČO RIEŠI: zápasy majú tím uložený buď ako odkaz do databázy (domaci_tim_id),
// alebo ako voľný text (domaci_tim_nazov) pre súperov mimo databázy.
// Staršie záznamy mali vyplnené len ID a názov ostal prázdny alebo obsahoval
// zástupný text "Neznámy tím", čo sa prejavovalo aj vo výpisoch na webe.
//
// POZNÁMKA: migrácia je idempotentná - opakované spustenie nič nepokazí,
// pretože upravuje len riadky s chýbajúcim alebo zástupným názvom.

'use strict';

module.exports = {
  async up(queryInterface) {
    // Domáci tím - doplnenie názvu z tabuľky timy
    await queryInterface.sequelize.query(`
      UPDATE zapasy
      SET domaci_tim_nazov = timy.nazov
      FROM timy
      WHERE zapasy.domaci_tim_id = timy.id
        AND zapasy.aktivity = true
        AND (zapasy.domaci_tim_nazov IS NULL
             OR zapasy.domaci_tim_nazov = ''
             OR zapasy.domaci_tim_nazov = 'Neznámy tím')
    `);

    // Hosťujúci tím - doplnenie názvu z tabuľky timy
    await queryInterface.sequelize.query(`
      UPDATE zapasy
      SET hostujuci_tim_nazov = timy.nazov
      FROM timy
      WHERE zapasy.hostujuci_tim_id = timy.id
        AND zapasy.aktivity = true
        AND (zapasy.hostujuci_tim_nazov IS NULL
             OR zapasy.hostujuci_tim_nazov = ''
             OR zapasy.hostujuci_tim_nazov = 'Neznámy tím')
    `);

    // Liga - doplnenie názvu z tabuľky ligy
    await queryInterface.sequelize.query(`
      UPDATE zapasy
      SET liga_nazov = ligy.nazov
      FROM ligy
      WHERE zapasy.liga_id = ligy.id
        AND zapasy.aktivity = true
        AND (zapasy.liga_nazov IS NULL OR zapasy.liga_nazov = '')
    `);
  },

  async down() {
    // Zámerne prázdne. Ide o opravu chýbajúcich údajov - vrátenie späť by
    // znamenalo názvy znovu vymazať, čo nedáva zmysel a viedlo by k strate
    // údajov aj pri zápasoch, ktoré boli v poriadku od začiatku.
  },
};
