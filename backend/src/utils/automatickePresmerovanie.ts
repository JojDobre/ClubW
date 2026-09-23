// Umiestnenie: backend/src/utils/automatickePresmerovanie.ts
//
// Pri zmene adresy publikovaného článku alebo stránky vytvorí
// presmerovanie zo starej adresy na novú. Inak by odkazy zdieľané na
// sociálnych sieťach a výsledky vo vyhľadávači viedli na „nenájdené".

import { Op } from 'sequelize';
import Presmerovanie from '../models/Presmerovanie';
import { zrusKopiuPresmerovani } from '../middleware/presmerovania';

export const presmerujStaruAdresu = async (stara: string, nova: string): Promise<void> => {
  if (!stara || !nova || stara === nova) return;
  try {
    // Nová adresa bola predtým presmerovaná inam - to presmerovanie by
    // teraz posielalo návštevníkov preč z existujúcej stránky
    await Presmerovanie.destroy({ where: { stary_odkaz: nova } });

    // Reťaze skrátime: čo viedlo na starú adresu, povedie rovno na novú
    await Presmerovanie.update({ novy_odkaz: nova }, { where: { novy_odkaz: stara, stary_odkaz: { [Op.ne]: nova } } });

    const existujuce = await Presmerovanie.findOne({ where: { stary_odkaz: stara } });
    if (existujuce) {
      await existujuce.update({ novy_odkaz: nova, aktivity: true });
    } else {
      await Presmerovanie.create({
        stary_odkaz: stara,
        novy_odkaz: nova,
        kod: 301,
        poznamka: 'Automaticky pri zmene adresy',
      } as any);
    }
    zrusKopiuPresmerovani();
  } catch (chyba) {
    // Presmerovanie je doplnok - jeho chyba nesmie zhodiť uloženie obsahu
    console.error('Nepodarilo sa vytvoriť presmerovanie starej adresy:', chyba);
  }
};
