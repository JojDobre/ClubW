// backend/src/config/database.ts
// Konfigurácia pripojenia k databáze

import { Sequelize } from 'sequelize';

// Konfigurácia sa načítava z jediného zdroja pravdy: backend/config/database.js.
// Ten istý súbor používa aj sequelize-cli pri migráciách a pomocné skripty,
// takže aplikácia a migrácie nikdy nebežia proti rôznym databázam.
// Načítanie premenných z .env rieši samotný konfiguračný súbor.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const dbConfig = require('../../config/database') as {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  dialect: 'postgres';
  logging: any;
  pool: { max: number; min: number; acquire: number; idle: number };
  timezone: string;
  dialectOptions: object;
  define: { underscored: boolean; freezeTableName: boolean };
};

// Vytvorenie Sequelize inštancie
export const sequelize = new Sequelize(
  dbConfig.database,
  dbConfig.username,
  dbConfig.password,
  {
    host: dbConfig.host,
    port: dbConfig.port,
    dialect: dbConfig.dialect,
    logging: dbConfig.logging,
    pool: dbConfig.pool,
    timezone: dbConfig.timezone,
    dialectOptions: dbConfig.dialectOptions,
    define: dbConfig.define,
  }
);

// Funkcia pre testovanie pripojenia k databáze
export const testConnection = async (): Promise<boolean> => {
  try {
    await sequelize.authenticate();
    console.log('✅ Databázové pripojenie úspešne nadviazané');
    return true;
  } catch (error) {
    console.error('❌ Chyba pri pripájaní k databáze:', error);
    return false;
  }
};

/**
 * Synchronizácia databázy podľa modelov.
 *
 * POZOR: v produkcii je zámerne zakázaná. Schéma sa tam mení výhradne
 * migráciami (`npm run db:migrate`), pretože sync() nemá históriu zmien,
 * nedá sa vrátiť späť a s voľbou alter vie v PostgreSQL ticho zahodiť
 * stĺpce aj s dátami.
 *
 * Vo vývoji ostáva dostupná ako rýchla pomôcka, ale aj tam odporúčame
 * migrácie, aby schéma v oboch prostrediach zodpovedala tej istej histórii.
 *
 * @param force - true zmaže a znovu vytvorí všetky tabuľky (len pre testy)
 */
export const syncDatabase = async (force: boolean = false): Promise<void> => {
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'sync() je v produkcii zakázaný. Schému meňte migráciami: npm run db:migrate'
    );
  }

  try {
    await sequelize.sync({ force });

    if (force) {
      console.log('✅ Databáza znovu vytvorená (force sync)');
    } else {
      console.log('✅ Databáza synchronizovaná (vývojový režim)');
    }
  } catch (error) {
    console.error('❌ Chyba pri synchronizácii databázy:', error);
    throw error;
  }
};

// Funkcia pre uzavretie pripojenia
export const closeConnection = async (): Promise<void> => {
  try {
    await sequelize.close();
    console.log('✅ Databázové pripojenie uzavreté');
  } catch (error) {
    console.error('❌ Chyba pri uzavieraní pripojenia:', error);
  }
};

export default sequelize;