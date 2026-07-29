// Umiestnenie: backend/config/database.js
//
// JEDINÝ ZDROJ PRAVDY pre pripojenie k databáze.
//
// PREČO VZNIKOL: konfigurácia bola v projekte na troch miestach s odlišnými
// hodnotami - src/config/database.ts sa pripájalo na clubw_client_dev@5435,
// run-migration.js na football_club@5432 s používateľom postgres/password
// a .env.example neobsahovalo databázové premenné vôbec. Čerstvá inštalácia
// tak ticho bežala na zabudovaných vývojárskych heslách a migračný skript
// upravoval úplne inú databázu než aplikácia.
//
// Tento súbor je zámerne v CommonJS, aby ho vedeli načítať aj nástroje,
// ktoré nepoužívajú TypeScript (sequelize-cli, run-migration.js).

require('dotenv').config();

// Predvolené hodnoty zodpovedajú docker-compose.dev.yml (služba client-db).
// Sú určené VÝHRADNE pre lokálny vývoj.
const VYVOJOVE_PREDVOLENE = {
  host: 'localhost',
  port: 5435,
  database: 'clubw_client_dev',
  username: 'client_dev',
  password: 'client_dev_password',
};

const jeProdukcia = process.env.NODE_ENV === 'production';

/**
 * Načíta hodnotu z prostredia, inak použije vývojovú predvolenú.
 * V produkcii predvolené hodnoty nepovolíme - aplikácia radšej nenaštartuje,
 * než by ticho bežala s verejne známym heslom.
 */
const nacitaj = (nazovPremennej, predvolena) => {
  const hodnota = process.env[nazovPremennej];

  if (hodnota !== undefined && hodnota !== '') {
    return hodnota;
  }

  if (jeProdukcia) {
    throw new Error(
      `Chýba povinná premenná prostredia ${nazovPremennej}. ` +
      `V produkcii nie je dovolené použiť vývojové predvolené hodnoty. ` +
      `Skopírujte backend/.env.example do backend/.env a doplňte údaje.`
    );
  }

  return predvolena;
};

const konfiguracia = {
  host: nacitaj('DB_HOST', VYVOJOVE_PREDVOLENE.host),
  port: parseInt(String(nacitaj('DB_PORT', VYVOJOVE_PREDVOLENE.port)), 10),
  database: nacitaj('DB_NAME', VYVOJOVE_PREDVOLENE.database),
  username: nacitaj('DB_USER', VYVOJOVE_PREDVOLENE.username),
  password: nacitaj('DB_PASSWORD', VYVOJOVE_PREDVOLENE.password),
  dialect: 'postgres',

  // SQL dotazy vypisujeme len pri vývoji
  logging: process.env.NODE_ENV === 'development' ? console.log : false,

  pool: {
    max: parseInt(process.env.DB_POOL_MAX || '5', 10),
    min: 0,
    acquire: 30000,
    idle: 10000,
  },

  // Časy ukladáme v UTC. Prepočet na Europe/Bratislava (ktoré samo rieši
  // letný a zimný čas) prebieha až pri zobrazení na frontende.
  timezone: '+00:00',

  // Šifrované spojenie sa zapína premennou DB_SSL=true - vyžaduje ho
  // väčšina hostovaných databáz
  dialectOptions:
    process.env.DB_SSL === 'true'
      ? { ssl: { require: true, rejectUnauthorized: false } }
      : {},

  define: {
    // Automatické snake_case pre názvy stĺpcov (zhodné s pôvodným nastavením)
    underscored: true,
    freezeTableName: false,
  },
};

module.exports = konfiguracia;

// Formát, ktorý očakáva sequelize-cli (config/config.js).
// Všetky tri prostredia čítajú z rovnakých premenných prostredia,
// líšia sa len súborom .env, ktorý sa načíta.
module.exports.development = konfiguracia;
module.exports.test = { ...konfiguracia, database: `${konfiguracia.database}_test` };
module.exports.production = konfiguracia;
