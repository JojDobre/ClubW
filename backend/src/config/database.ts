// backend/src/config/database.ts
// Konfigurácia pripojenia k databáze

import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

// Načítanie environment premenných
dotenv.config();

// Konfiguračné parametre databázy
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5435'), // Port pre client PostgreSQL z docker-compose
  database: process.env.DB_NAME || 'clubw_client_dev',
  username: process.env.DB_USER || 'client_dev',
  password: process.env.DB_PASSWORD || 'client_dev_password',
  dialect: 'postgres' as const,
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
  timezone: '+01:00', // Slovenské časové pásmo
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
    define: {
      // Automatické snake_case pre názvy stĺpcov
      underscored: true,
      // Použitie pluralu pre názvy tabuliek
      freezeTableName: false,
    },
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

// Funkcia pre synchronizáciu databázy (vytvorenie tabuliek)
export const syncDatabase = async (force: boolean = false): Promise<void> => {
  try {
    await sequelize.sync({ force });
    
    if (force) {
      console.log('✅ Databáza znovu vytvorená (force sync)');
    } else {
      console.log('✅ Databáza synchronizovaná');
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