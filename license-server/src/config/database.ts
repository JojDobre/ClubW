// Umiestnenie: license-server/src/config/database.ts
// Pripojenie licenčného servera k jeho vlastnej databáze.
//
// Databáza licencií je zámerne oddelená od databáz klientov - klient
// nesmie mať prístup k údajom o licenciách iných klubov.

import { Sequelize } from 'sequelize';

// Konfiguráciu čítame z config/database.js, ten istý súbor používa
// aj sequelize-cli pri migráciách
// eslint-disable-next-line @typescript-eslint/no-var-requires
const dbConfig = require('../../config/database');

export const sequelize = new Sequelize(
  dbConfig.database,
  dbConfig.username,
  dbConfig.password,
  {
    host: dbConfig.host,
    port: dbConfig.port,
    dialect: 'postgres',
    logging: dbConfig.logging,
    pool: dbConfig.pool,
    timezone: dbConfig.timezone,
    dialectOptions: dbConfig.dialectOptions,
    define: dbConfig.define,
  }
);

/**
 * Overí, či sa dá pripojiť k databáze.
 */
export const testConnection = async (): Promise<boolean> => {
  try {
    await sequelize.authenticate();
    console.log('✅ Pripojenie k databáze licencií je funkčné');
    return true;
  } catch (error) {
    console.error('❌ Pripojenie k databáze licencií zlyhalo:', error);
    return false;
  }
};

export default sequelize;
