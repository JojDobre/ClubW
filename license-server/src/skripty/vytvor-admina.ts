// Umiestnenie: license-server/src/skripty/vytvor-admina.ts
// Vytvorenie administrátora z príkazového riadku - prvý administrátor
// inak vzniknúť nemôže (administráciu nikto nemá ako otvoriť).
//
//   npm run vytvor-admina -- --email ja@firma.sk --meno "Jozef Mrkvička"
//   (heslo sa zadá skryto; v skripte cez premennú ADMIN_HESLO)
//
// Existujúcemu administrátorovi príkaz nastaví nové heslo (zabudnuté heslo)
// a vypne mu dvojstupňové overenie.

import dotenv from 'dotenv';
dotenv.config();

import readline from 'readline';
import sequelize from '../config/database';
import { Administrator, Relacia, zaznamenaj } from '../models/sprava';
import { chybaHesla, zahasujHeslo } from '../utils/heslo';

const argument = (nazov: string) => {
  const i = process.argv.indexOf(`--${nazov}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
};

/** Heslo z terminálu bez zobrazenia znakov. */
const skryteHeslo = (otazka: string): Promise<string> =>
  new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    const rozhranie = rl as unknown as { _writeToOutput: (s: string) => void; output: NodeJS.WriteStream };
    let otazkaVypisana = false;
    rozhranie._writeToOutput = (s: string) => {
      if (!otazkaVypisana) {
        rozhranie.output.write(s);
        otazkaVypisana = true;
      } else if (s.includes('\n')) rozhranie.output.write('\n');
    };
    rl.question(otazka, (odpoved) => {
      rl.close();
      resolve(odpoved);
    });
  });

const hlavna = async () => {
  const email = argument('email')?.trim().toLowerCase();
  const meno = argument('meno')?.trim();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    console.error('Použitie: npm run vytvor-admina -- --email ja@firma.sk --meno "Meno Priezvisko"');
    process.exit(1);
  }
  let heslo = process.env.ADMIN_HESLO;
  if (!heslo) {
    heslo = await skryteHeslo('Heslo (aspoň 12 znakov): ');
    const znova = await skryteHeslo('Heslo znova: ');
    if (heslo !== znova) throw new Error('Heslá sa nezhodujú');
  }
  const chyba = chybaHesla(heslo);
  if (chyba) throw new Error(chyba);

  const existujuci = await Administrator.findOne({ where: { email } });
  if (existujuci) {
    await existujuci.update({ heslo_hash: await zahasujHeslo(heslo), aktivny: true, totp_aktivne: false, totp_tajomstvo: null, ...(meno ? { meno } : {}) });
    await Relacia.destroy({ where: { administrator_id: existujuci.id } });
    await zaznamenaj({ typ: 'administrator_upraveny', popis: `Heslo administrátora ${existujuci.meno} nastavené z príkazového riadku`, administrator_id: existujuci.id });
    console.log(`✅ Administrátorovi ${email} bolo nastavené nové heslo (dvojstupňové overenie vypnuté).`);
  } else {
    if (!meno) throw new Error('Pri novom administrátorovi zadajte aj --meno');
    const admin = await Administrator.create({ email, meno, heslo_hash: await zahasujHeslo(heslo) });
    await zaznamenaj({ typ: 'administrator_vytvoreny', popis: `Administrátor ${meno} vytvorený z príkazového riadku`, administrator_id: admin.id });
    console.log(`✅ Administrátor ${email} bol vytvorený. Prihláste sa na adrese licenčného servera.`);
  }
  await sequelize.close();
};

hlavna().catch(async (chyba) => {
  console.error(`❌ ${chyba.message}`);
  await sequelize.close().catch(() => undefined);
  process.exit(1);
});
