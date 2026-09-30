// Umiestnenie: backend/migrations/20260930000003-fanusikovia-registracia.js
//
// Registrácia fanúšikov a členov z webu: žiadosť čaká na schválenie
// (stav „ziadost"), zaznamená sa, odkiaľ prišla, a doplnia sa údaje,
// ktoré klub pri členstve potrebuje (dátum narodenia, adresa, správa).

'use strict';

module.exports = {
  async up(queryInterface) {
    const q = (sql) => queryInterface.sequelize.query(sql);
    await q(`ALTER TABLE "fanusikovia" ADD COLUMN IF NOT EXISTS "stav" VARCHAR(20) NOT NULL DEFAULT 'aktivny'`);
    await q(`ALTER TABLE "fanusikovia" ADD COLUMN IF NOT EXISTS "zdroj" VARCHAR(20) NOT NULL DEFAULT 'administracia'`);
    await q(`ALTER TABLE "fanusikovia" ADD COLUMN IF NOT EXISTS "datum_narodenia" DATE`);
    await q(`ALTER TABLE "fanusikovia" ADD COLUMN IF NOT EXISTS "adresa" VARCHAR(255)`);
    await q(`ALTER TABLE "fanusikovia" ADD COLUMN IF NOT EXISTS "sprava" TEXT`);
    await q(`CREATE INDEX IF NOT EXISTS "fanusikovia_stav" ON "fanusikovia" ("stav")`);
  },

  async down(queryInterface) {
    const q = (sql) => queryInterface.sequelize.query(sql);
    await q(`DROP INDEX IF EXISTS "fanusikovia_stav"`);
    for (const stlpec of ['sprava', 'adresa', 'datum_narodenia', 'zdroj', 'stav']) {
      await q(`ALTER TABLE "fanusikovia" DROP COLUMN IF EXISTS "${stlpec}"`);
    }
  },
};
