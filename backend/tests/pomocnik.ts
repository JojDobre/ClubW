// Umiestnenie: backend/tests/pomocnik.ts
// Spoločné údaje pre integračné testy.
//
// V CI beží testovanie na čistej databáze len s migráciami - nie je tam
// žiadny používateľ ani rubrika. Testy si ich preto vytvoria samy
// (alebo použijú existujúce na vývojovej databáze).

import models from '../src/models';

const { User, Category } = models as any;

/** Aktívny správca administrácie (vytvorí sa, ak žiadny nie je). */
export const testovaciSpravca = async () =>
  (await User.findOne({ where: { rola: 'admin', aktivity: true } })) ??
  User.create({
    meno: 'Test',
    priezvisko: 'Správca',
    email: 'test-spravca@clubw.test',
    heslo: 'dlhe testovacie heslo pre ci',
    rola: 'admin',
    aktivity: true,
  });

/** Ľubovoľná rubrika článkov (vytvorí sa, ak žiadna nie je). */
export const testovaciaRubrika = async () =>
  (await Category.findOne()) ?? Category.create({ nazov: 'Testovacia rubrika', aktivity: true });
