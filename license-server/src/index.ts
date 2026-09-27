// Umiestnenie: license-server/src/index.ts
// Spustenie licenčného servera ClubW.

import dotenv from 'dotenv';
dotenv.config();

import { testConnection } from './config/database';
import app from './app';
import { opravPrerusenePripravy } from './sluzby/baliky';

const PORT = Number(process.env.PORT) || 3001;

const spustiServer = async () => {
  try {
    console.log('🔐 Spúšťanie ClubW License Servera...');

    // Bez súkromného kľúča server nevie podpisovať odpovede - je nepoužiteľný
    if (!process.env.LICENSE_PRIVATE_KEY) {
      throw new Error('Chýba LICENSE_PRIVATE_KEY. Vygenerujte pár kľúčov príkazom: npm run generuj-kluce');
    }

    if (!(await testConnection())) throw new Error('Nepodarilo sa pripojiť k databáze licencií');

    // Schéma sa vytvára výhradne migráciami (npm run db:migrate)
    await opravPrerusenePripravy().catch((chyba) => {
      throw new Error(`Databáza nemá aktuálnu schému - spustite npm run db:migrate (${chyba.message})`);
    });

    app.listen(PORT, () => {
      console.log(`✅ License Server beží na porte ${PORT}`);
      console.log(`   Administrácia: http://localhost:${PORT}/`);
      console.log(`   Overenie:      POST http://localhost:${PORT}/api/license/verify`);
    });
  } catch (error: any) {
    console.error('❌ Licenčný server sa nepodarilo spustiť:', error.message);
    process.exit(1);
  }
};

spustiServer();
