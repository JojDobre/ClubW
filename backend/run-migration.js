// backend/run-migration.js
// Opravený script na spustenie migrácie pre opravu LigaTabulka.tim_id

const { Pool } = require('pg');

// Konfigurácia sa načítava z jediného zdroja pravdy - rovnakého, aký používa
// aplikácia. Pôvodne mal tento skript vlastné predvolené hodnoty
// (football_club@5432, používateľ postgres/password), takže migrácie
// upravovali úplne inú databázu, než na akú sa pripájala aplikácia.
const dbConfig = require('./config/database');

const pool = new Pool({
  user: dbConfig.username,
  host: dbConfig.host,
  database: dbConfig.database,
  password: dbConfig.password,
  port: dbConfig.port,
});

console.log(`📦 Databáza: ${dbConfig.database}@${dbConfig.host}:${dbConfig.port}`);

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Spúšťam migráciu pre opravu LigaTabulka.tim_id...');
    
    // Začiatok transakcie
    await client.query('BEGIN');
    
    // Krok 1: Zmena stĺpca tim_id na nullable
    console.log('1️⃣ Mením tim_id na nullable...');
    await client.query(`
      ALTER TABLE liga_tabulky 
      ALTER COLUMN tim_id DROP NOT NULL;
    `);
    
    // Krok 2: Pridanie check constraint
    console.log('2️⃣ Pridávam validačný constraint...');
    await client.query(`
      ALTER TABLE liga_tabulky 
      ADD CONSTRAINT liga_tabulky_tim_check 
      CHECK (
        (tim_id IS NOT NULL) OR 
        (custom_tim_nazov IS NOT NULL AND LENGTH(TRIM(custom_tim_nazov)) >= 2)
      );
    `);
    
    // Krok 3: Vytvorenie jednoduchšieho indexu (bez CASE)
    console.log('3️⃣ Vytváram indexy...');
    
    // Index na tim_id (pre DB tímy)
    await client.query(`
      CREATE INDEX IF NOT EXISTS liga_tabulky_tim_id_idx 
      ON liga_tabulky (tim_id) 
      WHERE tim_id IS NOT NULL;
    `);
    
    // Index na custom_tim_nazov (pre custom tímy)
    await client.query(`
      CREATE INDEX IF NOT EXISTS liga_tabulky_custom_nazov_idx 
      ON liga_tabulky (custom_tim_nazov) 
      WHERE custom_tim_nazov IS NOT NULL;
    `);
    
    // Krok 4: Pridanie komentárov
    console.log('4️⃣ Pridávam komentáre...');
    await client.query(`
      COMMENT ON TABLE liga_tabulky IS 'Tabuľka so štatistikami tímov v ligách';
    `);
    await client.query(`
      COMMENT ON COLUMN liga_tabulky.tim_id IS 'ID tímu z databázy (nullable pre custom tímy)';
    `);
    await client.query(`
      COMMENT ON COLUMN liga_tabulky.custom_tim_nazov IS 'Vlastný názov tímu (pre tímy mimo systému)';
    `);
    
    // Potvrdenie transakcie
    await client.query('COMMIT');
    
    console.log('✅ Migrácia úspešne dokončená!');
    console.log('');
    console.log('📋 Zmeny:');
    console.log('   • tim_id je teraz nullable');
    console.log('   • Pridaný constraint pre validáciu tim_id OR custom_tim_nazov');
    console.log('   • Vytvorené parciálne indexy pre rýchlejšie vyhľadávanie');
    console.log('   • Pridané komentáre k tabuľke');
    
  } catch (error) {
    // Rollback v prípade chyby
    await client.query('ROLLBACK');
    console.error('❌ Chyba pri migrácii:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function checkDatabase() {
  const client = await pool.connect();
  
  try {
    // Kontrola či existuje tabuľka
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'liga_tabulky'
      );
    `);
    
    if (!tableCheck.rows[0].exists) {
      throw new Error('Tabuľka liga_tabulky neexistuje. Najprv spustite synchronizáciu databázy.');
    }
    
    // Kontrola aktuálneho stavu stĺpca
    const columnCheck = await client.query(`
      SELECT is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'liga_tabulky' 
      AND column_name = 'tim_id';
    `);
    
    if (columnCheck.rows.length === 0) {
      throw new Error('Stĺpec tim_id neexistuje v tabuľke liga_tabulky');
    }
    
    const isNullable = columnCheck.rows[0].is_nullable === 'YES';
    
    if (isNullable) {
      console.log('ℹ️ Stĺpec tim_id je už nullable. Migrácia nie je potrebná.');
      return false;
    }
    
    console.log('✅ Databáza je pripravená na migráciu.');
    console.log(`📊 Aktuálny stav: tim_id is_nullable = ${columnCheck.rows[0].is_nullable}`);
    return true;
    
  } finally {
    client.release();
  }
}

async function main() {
  try {
    console.log('🔍 Kontrolujem stav databázy...');
    
    const needsMigration = await checkDatabase();
    
    if (!needsMigration) {
      console.log('🎉 Migrácia už bola vykonaná alebo nie je potrebná.');
      process.exit(0);
    }
    
    // Potvrdenie od používateľa
    console.log('');
    console.log('⚠️  POZOR: Táto migrácia zmení štruktúru tabuľky liga_tabulky');
    console.log('   Odporúčame vytvoriť zálohu databázy pred pokračovaním.');
    console.log('');
    
    // Pre automatické spustenie bez potvrdenia, odkomentovať nasledujúci riadok:
    // await runMigration();
    
    // Pre manuálne potvrdenie:
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    rl.question('Pokračovať s migráciou? (ano/nie): ', async (answer) => {
      if (answer.toLowerCase() === 'ano' || answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
        try {
          await runMigration();
          console.log('');
          console.log('🚀 Teraz môžete reštartovať backend server a testovať ukladanie tabuľky.');
        } catch (error) {
          console.error('💥 Migrácia zlyhala:', error.message);
          process.exit(1);
        }
      } else {
        console.log('❌ Migrácia zrušená používateľom.');
      }
      rl.close();
      process.exit(0);
    });
    
  } catch (error) {
    console.error('💥 Chyba:', error.message);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Ukončujem migráciu...');
  await pool.end();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Ukončujem migráciu...');
  await pool.end();
  process.exit(0);
});

// Spustenie
main();