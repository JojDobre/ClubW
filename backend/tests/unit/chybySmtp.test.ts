// Umiestnenie: backend/tests/unit/chybySmtp.test.ts
// Hlášky o chybách SMTP a predvolený odosielateľ. Chyby pochádzajú zo
// skutočného nodemaileru proti malému SMTP serveru, ktorý odmieta
// zvolený príkaz - tak sa overí, že rozlišujeme odosielateľa a príjemcu.

import net from 'net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import nodemailer from 'nodemailer';
import { konfiguraciaZUdajov, popisChybySmtp } from '../../src/services/email/odosielanie';

let odmietnut: 'MAIL' | 'RCPT' | 'DATA' = 'MAIL';
let server: net.Server;
let port = 0;

beforeAll(async () => {
  server = net.createServer((s) => {
    s.write('220 test ESMTP\r\n');
    let data = false;
    s.on('data', (b) => {
      for (const riadok of b.toString().split('\r\n').filter(Boolean)) {
        if (data) {
          if (riadok === '.') {
            data = false;
            s.write('250 OK\r\n');
          }
          continue;
        }
        const prikaz = riadok.split(/[ :]/)[0].toUpperCase();
        if (prikaz === 'EHLO' || prikaz === 'HELO') s.write('250 test\r\n');
        else if (prikaz === 'MAIL') s.write(odmietnut === 'MAIL' ? '553 5.7.1 <noreply@inyklub.sk>: Sender address rejected: not owned by user\r\n' : '250 OK\r\n');
        else if (prikaz === 'RCPT') s.write(odmietnut === 'RCPT' ? '550 5.1.1 <nikto@test.sk>: Recipient address rejected: User unknown\r\n' : '250 OK\r\n');
        else if (prikaz === 'DATA') {
          if (odmietnut === 'DATA') s.write('554 5.7.1 Message rejected as spam\r\n');
          else {
            data = true;
            s.write('354 go\r\n');
          }
        } else if (prikaz === 'QUIT') s.end('221 bye\r\n');
        else s.write('250 OK\r\n');
      }
    });
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', () => r()));
  port = (server.address() as net.AddressInfo).port;
});

afterAll(() => server.close());

const chybaPri = async (krok: typeof odmietnut) => {
  odmietnut = krok;
  const prenos = nodemailer.createTransport({ host: '127.0.0.1', port, secure: false, ignoreTLS: true });
  try {
    await prenos.sendMail({ from: 'noreply@inyklub.sk', to: 'nikto@test.sk', subject: 'x', text: 'x' });
  } catch (e) {
    return e;
  }
  throw new Error('E-mail mal byť odmietnutý');
};

const konfiguracia = (u: Parameters<typeof konfiguraciaZUdajov>[0]) => konfiguraciaZUdajov({ smtp_host: 'smtp.test', ...u }, 'FK Test', 'info@fktest.sk')!;

describe('predvolený odosielateľ', () => {
  it('prázdny odosielateľ = prihlasovacia schránka', () => {
    expect(konfiguracia({ smtp_pouzivatel: 'jozko@gmail.com' }).odosielatelEmail).toBe('jozko@gmail.com');
  });

  it('prihlasovacie meno, ktoré nie je adresa (Brevo), sa nepoužije', () => {
    expect(konfiguracia({ smtp_pouzivatel: '8a1b2c001' }).odosielatelEmail).toBe('info@fktest.sk');
  });

  it('vyplnený odosielateľ má prednosť', () => {
    const k = konfiguracia({ smtp_pouzivatel: 'jozko@gmail.com', odosielatel_email: 'noreply@fktest.sk' });
    expect(k.odosielatelEmail).toBe('noreply@fktest.sk');
    expect(k.odosielatel).toBe('"FK Test" <noreply@fktest.sk>');
  });
});

describe('popisChybySmtp', () => {
  it('odmietnutý odosielateľ - poradí prihlasovaciu adresu a ukáže odpoveď servera', async () => {
    const k = konfiguracia({ smtp_pouzivatel: 'jozko@gmail.com', odosielatel_email: 'noreply@inyklub.sk' });
    const popis = popisChybySmtp(await chybaPri('MAIL'), k);
    expect(popis).toContain('Server odmietol odosielateľa noreply@inyklub.sk');
    expect(popis).toContain('prihlasovacie meno jozko@gmail.com');
    expect(popis).toContain('Sender address rejected: not owned by user');
  });

  it('odmietnutý odosielateľ pri službe s overenou doménou', async () => {
    const k = konfiguracia({ smtp_pouzivatel: '8a1b2c001', odosielatel_email: 'noreply@inyklub.sk' });
    const popis = popisChybySmtp(await chybaPri('MAIL'), k);
    expect(popis).toContain('k doméne overenej v e-mailovej službe');
  });

  it('odmietnutý príjemca sa nehlási ako chyba odosielateľa', async () => {
    const popis = popisChybySmtp(await chybaPri('RCPT'), konfiguracia({ smtp_pouzivatel: 'jozko@gmail.com' }));
    expect(popis).toMatch(/^Server odmietol adresu príjemcu/);
    expect(popis).toContain('User unknown');
  });

  it('odmietnutý obsah e-mailu', async () => {
    const popis = popisChybySmtp(await chybaPri('DATA'), konfiguracia({ smtp_pouzivatel: 'jozko@gmail.com' }));
    expect(popis).toMatch(/^Server odmietol e-mail/);
    expect(popis).toContain('rejected as spam');
  });
});
