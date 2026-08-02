// Umiestnenie: backend/scripts/vytvor-spravcu.ts
// Vytvorenie prvého správcovského účtu.
//
// PREČO SKRIPT A NIE PRÍKAZ V TERMINÁLI: viacriadkový príkaz s úvodzovkami
// sa v PowerShelli a v Bashi zapisuje inak a ľahko sa pokazí. Skript funguje
// všade rovnako.
//
// Spustenie:
//   cd backend
//   npm run vytvor-spravcu
//
// Skript sa spýta na údaje. Dajú sa zadať aj rovno:
//   npm run vytvor-spravcu -- --email admin@klub.sk --meno "Adam Novák" --heslo "moje dlhe heslo"

import readline from 'readline';
import sequelize from '../src/config/database';
import User from '../src/models/user';
import { overSiluHesla } from '../src/utils/heslo';

/** Prečíta hodnotu z argumentov príkazu, napríklad --email hodnota */
const zArgumentov = (nazov: string): string | undefined => {
  const index = process.argv.indexOf(`--${nazov}`);
  return index !== -1 ? process.argv[index + 1] : undefined;
};

/** Opýta sa používateľa na hodnotu. */
const opytajSa = (otazka: string, skryt = false): Promise<string> => {
  const rozhranie = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((vyriesit) => {
    if (skryt) {
      // Pri hesle potlačíme výpis znakov na obrazovku
      const vystup = process.stdout as any;
      const povodnyZapis = vystup.write.bind(vystup);
      let potlacit = false;

      vystup.write = (retazec: string, ...zvysok: any[]) => {
        if (potlacit && !retazec.includes('\n')) return true;
        return povodnyZapis(retazec, ...zvysok);
      };

      rozhranie.question(otazka, (odpoved) => {
        vystup.write = povodnyZapis;
        process.stdout.write('\n');
        rozhranie.close();
        vyriesit(odpoved.trim());
      });

      potlacit = true;
    } else {
      rozhranie.question(otazka, (odpoved) => {
        rozhranie.close();
        vyriesit(odpoved.trim());
      });
    }
  });
};

async function spusti() {
  console.log('\n═══════════════════════════════════════');
  console.log('  Vytvorenie správcovského účtu');
  console.log('═══════════════════════════════════════\n');

  try {
    await sequelize.authenticate();
  } catch (chyba: any) {
    console.error('❌ Pripojenie k databáze zlyhalo:', chyba.message);
    console.error('   Skontrolujte súbor backend/.env (DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD).');
    process.exit(1);
  }

  // Údaje z argumentov, inak sa opýtame
  const meno = zArgumentov('meno') ?? (await opytajSa('Meno a priezvisko: '));
  if (!meno) {
    console.error('❌ Meno je povinné.');
    process.exit(1);
  }

  const email = (zArgumentov('email') ?? (await opytajSa('E-mail: '))).toLowerCase();
  if (!email.includes('@')) {
    console.error('❌ Zadajte platnú e-mailovú adresu.');
    process.exit(1);
  }

  const existujuci = await User.findOne({ where: { email } });

  const heslo = zArgumentov('heslo') ?? (await opytajSa('Heslo: ', true));

  // Kontrola sily hesla — rovnaká ako pri zmene hesla v administrácii
  const chyby = overSiluHesla(heslo, { meno, email });
  if (chyby.length > 0) {
    console.error('\n❌ Heslo nespĺňa požiadavky:');
    chyby.forEach((ch) => console.error(`   • ${ch}`));
    console.error('\n   Tip: dlhá zapamätateľná fráza prejde ľahko,');
    console.error('   napríklad "zelena lucna kosacka pri potoku".\n');
    process.exit(1);
  }

  try {
    if (existujuci) {
      // Účet už existuje — namiesto chyby ponúkneme obnovu prístupu
      console.log(`\nÚčet ${email} už existuje.`);
      const potvrdenie = await opytajSa('Nastaviť mu nové heslo a rolu admin? (a/n): ');

      if (potvrdenie.toLowerCase() !== 'a') {
        console.log('Zrušené.');
        process.exit(0);
      }

      await existujuci.update({ heslo, rola: 'admin', aktivity: true, meno });
      console.log('\n✅ Účet aktualizovaný. Heslo bolo zmenené a rola nastavená na admin.');
    } else {
      await User.create({
        meno,
        email,
        heslo, // model ho pri uložení sám zahashuje
        rola: 'admin',
        aktivity: true,
      } as any);
      console.log('\n✅ Správca bol vytvorený.');
    }

    console.log('\n   Prihláste sa na http://localhost:3002/prihlasenie');
    console.log(`   E-mail: ${email}\n`);
  } catch (chyba: any) {
    console.error('\n❌ Účet sa nepodarilo uložiť:', chyba.message);
    if (chyba.errors) {
      chyba.errors.forEach((e: any) => console.error(`   • ${e.message}`));
    }
    process.exit(1);
  }

  await sequelize.close();
  process.exit(0);
}

spusti().catch((chyba) => {
  console.error('❌ Neočakávaná chyba:', chyba);
  process.exit(1);
});
