// Umiestnenie: license-server/tests/prostredie.ts
// Príprava testov: vlastná databáza, pár kľúčov a čistá schéma z migrácií.
// Import tohto súboru musí predchádzať importu aplikácie.

import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';

const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
export const VEREJNY_KLUC = publicKey.export({ type: 'spki', format: 'pem' }).toString();

process.env.NODE_ENV = 'test';
process.env.DB_NAME = process.env.TEST_DB_NAME || 'clubw_licenses_test';
process.env.LICENSE_PRIVATE_KEY = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
process.env.LICENSE_PUBLIC_KEY = VEREJNY_KLUC;
process.env.BALIKY_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'clubw-baliky-test-'));
process.env.ADMIN_DIR = path.join(os.tmpdir(), 'clubw-bez-administracie');

/** Zmaže schému a vytvorí ju znova všetkými migráciami. */
export const pripravDatabazu = async () => {
  const { default: sequelize } = await import('../src/config/database');
  const { Sequelize } = await import('sequelize');
  await sequelize.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  const priecinok = path.join(__dirname, '../migrations');
  for (const subor of fs.readdirSync(priecinok).filter((s) => s.endsWith('.js')).sort()) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    await require(path.join(priecinok, subor)).up(sequelize.getQueryInterface(), Sequelize);
  }
  return sequelize;
};
