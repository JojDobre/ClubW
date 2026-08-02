// Umiestnenie: backend/src/controllers/hesloController.ts
// Obnovovacie tokeny a obnova zabudnutého hesla.
//
// Oddelené od authController.ts, ktorý rieši samotné prihlásenie,
// aby zostal prehľadný.

import { Request, Response } from 'express';
import { Op } from 'sequelize';
import jwt from 'jsonwebtoken';
import sequelize from '../config/database';
import User from '../models/user';
import RefreshToken from '../models/RefreshToken';
import ResetHeslaToken from '../models/ResetHeslaToken';
import { overSiluHesla } from '../utils/heslo';
import { posliEmail } from '../utils/email';

// Ako dlho platí obnovovací token
const PLATNOST_REFRESH_DNI = 30;

// Ako dlho platí odkaz na obnovu hesla
const PLATNOST_RESETU_MINUT = 60;

/**
 * Vytvorí prístupový (krátkodobý) token.
 */
const vytvorPristupovyToken = (user: User): string => {
  const tajomstvo = process.env.JWT_SECRET;
  if (!tajomstvo) {
    throw new Error('JWT_SECRET nie je nastavený');
  }

  return jwt.sign(
    { userId: user.id, email: user.email, rola: user.rola },
    tajomstvo,
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' } as any
  );
};

/**
 * Vytvorí a uloží obnovovací token.
 *
 * @returns samotný token - v databáze zostáva len jeho odtlačok
 */
export const vytvorObnovovaciToken = async (
  user: User,
  req: Request
): Promise<string> => {
  const token = RefreshToken.vygenerujToken();

  const platnyDo = new Date();
  platnyDo.setDate(platnyDo.getDate() + PLATNOST_REFRESH_DNI);

  await RefreshToken.create({
    pouzivatel_id: user.id,
    odtlacok: RefreshToken.odtlacokTokenu(token),
    platny_do: platnyDo,
    ip_adresa: req.ip || null,
    // Hlavičku skrátime - dlhé reťazce by len zaberali miesto
    prehliadac: (req.header('User-Agent') || '').slice(0, 255) || null,
  });

  return token;
};

/**
 * Zruší všetky obnovovacie tokeny používateľa.
 * Volá sa pri zmene hesla, odobratí práv alebo podozrení na zneužitie.
 */
export const zrusVsetkyTokeny = async (
  pouzivatelId: number,
  dovod: string
): Promise<number> => {
  const [pocet] = await RefreshToken.update(
    { zruseny: true, dovod_zrusenia: dovod },
    { where: { pouzivatel_id: pouzivatelId, zruseny: false } }
  );
  return pocet;
};

/**
 * POST /api/auth/refresh
 * Vymení obnovovací token za nový prístupový token.
 *
 * Pôvodná verzia vyžadovala platný prístupový token, takže obnoviť sa dal
 * len token, ktorý ešte nevypršal - to nemá praktický zmysel. Teraz sa
 * používa samostatný dlhodobý token uložený v databáze.
 */
export const obnovToken = async (req: Request, res: Response): Promise<void> => {
  try {
    // Token prijímame z tela požiadavky alebo z cookie
    const token: string | undefined =
      req.body?.refreshToken || (req as any).cookies?.clubw_refresh;

    if (!token || typeof token !== 'string') {
      res.status(400).json({
        success: false,
        message: 'Chýba obnovovací token',
      });
      return;
    }

    const odtlacok = RefreshToken.odtlacokTokenu(token);
    const zaznam = await RefreshToken.findOne({ where: { odtlacok } });

    if (!zaznam) {
      res.status(401).json({ success: false, message: 'Neplatný obnovovací token' });
      return;
    }

    // Použitie už zrušeného tokenu je podozrivé - mohol byť odcudzený.
    // Pre istotu zrušíme všetky tokeny daného používateľa.
    if (zaznam.zruseny) {
      const pocet = await zrusVsetkyTokeny(zaznam.pouzivatel_id, 'podozrenie_na_zneuzitie');
      console.warn(
        `⚠️ Opakované použitie zrušeného tokenu (používateľ ${zaznam.pouzivatel_id}). ` +
        `Zrušených ${pocet} tokenov.`
      );
      res.status(401).json({
        success: false,
        message: 'Obnovovací token bol zrušený. Prihláste sa znova.',
      });
      return;
    }

    if (new Date(zaznam.platny_do) <= new Date()) {
      res.status(401).json({
        success: false,
        message: 'Platnosť obnovovacieho tokenu vypršala. Prihláste sa znova.',
      });
      return;
    }

    // Používateľ musí stále existovať a byť aktívny.
    // Toto rieši aj pôvodný problém, že deaktivácia účtu sa prejavila
    // až po vypršaní prístupového tokenu.
    const user = await User.findByPk(zaznam.pouzivatel_id);
    if (!user || !user.aktivity) {
      await zrusVsetkyTokeny(zaznam.pouzivatel_id, 'ucet_deaktivovany');
      res.status(401).json({
        success: false,
        message: 'Účet je deaktivovaný',
      });
      return;
    }

    // Rotácia: starý token zrušíme a vydáme nový.
    // Odcudzený token tak prestane platiť pri prvom použití pôvodným
    // majiteľom (alebo naopak - a to sa odhalí kontrolou vyššie).
    await sequelize.transaction(async (t) => {
      await zaznam.update(
        { zruseny: true, dovod_zrusenia: 'rotacia' },
        { transaction: t }
      );
    });

    const novyObnovovaci = await vytvorObnovovaciToken(user, req);
    const pristupovy = vytvorPristupovyToken(user);

    res.json({
      success: true,
      data: {
        token: pristupovy,
        refreshToken: novyObnovovaci,
        user: user.toSafeJSON(),
      },
      message: 'Token obnovený',
    });
  } catch (error) {
    console.error('Chyba pri obnove tokenu:', error);
    res.status(500).json({ success: false, message: 'Chyba servera pri obnove tokenu' });
  }
};

/**
 * POST /api/auth/logout
 * Zruší obnovovací token, aby sa relácia nedala predĺžiť.
 */
export const odhlas = async (req: Request, res: Response): Promise<void> => {
  try {
    const token: string | undefined =
      req.body?.refreshToken || (req as any).cookies?.clubw_refresh;

    if (token && typeof token === 'string') {
      await RefreshToken.update(
        { zruseny: true, dovod_zrusenia: 'odhlasenie' },
        { where: { odtlacok: RefreshToken.odtlacokTokenu(token), zruseny: false } }
      );
    }

    // Cookie zmažeme bez ohľadu na to, či bol token platný
    res.clearCookie('clubw_token');
    res.clearCookie('clubw_refresh');

    res.json({ success: true, message: 'Odhlásenie prebehlo úspešne' });
  } catch (error) {
    console.error('Chyba pri odhlásení:', error);
    res.status(500).json({ success: false, message: 'Chyba servera pri odhlásení' });
  }
};

/**
 * POST /api/auth/odhlas-vsade
 * Zruší všetky relácie používateľa na všetkých zariadeniach.
 */
export const odhlasVsade = async (req: Request, res: Response): Promise<void> => {
  try {
    const pouzivatelId = (req as any).userId;
    const pocet = await zrusVsetkyTokeny(pouzivatelId, 'odhlasenie_vsade');

    res.clearCookie('clubw_token');
    res.clearCookie('clubw_refresh');

    res.json({
      success: true,
      message: `Odhlásené na všetkých zariadeniach (${pocet} relácií)`,
    });
  } catch (error) {
    console.error('Chyba pri hromadnom odhlásení:', error);
    res.status(500).json({ success: false, message: 'Chyba servera' });
  }
};

/**
 * POST /api/auth/zabudnute-heslo
 * Vyžiadanie odkazu na obnovu hesla.
 *
 * Odpoveď je zámerne rovnaká bez ohľadu na to, či e-mail existuje.
 * Inak by sa dal endpoint použiť na zisťovanie registrovaných adries.
 */
export const zabudnuteHeslo = async (req: Request, res: Response): Promise<void> => {
  // Rovnaká odpoveď pre všetky prípady
  const vseobecnaOdpoved = {
    success: true,
    message:
      'Ak je e-mailová adresa registrovaná, poslali sme na ňu odkaz na obnovu hesla. ' +
      'Skontrolujte si aj priečinok s nevyžiadanou poštou.',
  };

  try {
    const email = String(req.body?.email || '').trim().toLowerCase();

    if (!email || !email.includes('@')) {
      res.status(400).json({ success: false, message: 'Zadajte platnú e-mailovú adresu' });
      return;
    }

    const user = await User.findOne({ where: { email } });

    // Neexistujúci alebo neaktívny účet - odpovieme rovnako, ale nič neposielame
    if (!user || !user.aktivity) {
      res.json(vseobecnaOdpoved);
      return;
    }

    // Staré nespotrebované tokeny zrušíme - platiť má vždy len najnovší odkaz
    await ResetHeslaToken.update(
      { pouzity: true },
      { where: { pouzivatel_id: user.id, pouzity: false } }
    );

    const token = ResetHeslaToken.vygenerujToken();
    const platnyDo = new Date(Date.now() + PLATNOST_RESETU_MINUT * 60 * 1000);

    await ResetHeslaToken.create({
      pouzivatel_id: user.id,
      odtlacok: ResetHeslaToken.odtlacokTokenu(token),
      platny_do: platnyDo,
      ip_adresa: req.ip || null,
    });

    const adresaWebu = process.env.FRONTEND_URL || 'http://localhost:3002';
    const odkaz = `${adresaWebu}/obnova-hesla?token=${encodeURIComponent(token)}`;

    await posliEmail({
      prijemca: user.email,
      predmet: 'Obnova hesla — ClubW',
      text:
        `Dobrý deň, ${user.meno},\n\n` +
        `pre nastavenie nového hesla otvorte tento odkaz:\n${odkaz}\n\n` +
        `Odkaz platí ${PLATNOST_RESETU_MINUT} minút a dá sa použiť len raz.\n\n` +
        `Ak ste o obnovu hesla nežiadali, túto správu ignorujte — ` +
        `vaše heslo zostáva nezmenené.`,
    });

    res.json(vseobecnaOdpoved);
  } catch (error) {
    console.error('Chyba pri vyžiadaní obnovy hesla:', error);
    // Aj pri chybe odpovedáme rovnako, aby sa nedal zisťovať stav účtov
    res.json(vseobecnaOdpoved);
  }
};

/**
 * POST /api/auth/obnova-hesla
 * Nastavenie nového hesla pomocou tokenu z e-mailu.
 */
export const obnovHeslo = async (req: Request, res: Response): Promise<void> => {
  try {
    const token = String(req.body?.token || '');
    const noveHeslo = req.body?.heslo;

    if (!token) {
      res.status(400).json({ success: false, message: 'Chýba token na obnovu hesla' });
      return;
    }

    const zaznam = await ResetHeslaToken.findOne({
      where: { odtlacok: ResetHeslaToken.odtlacokTokenu(token) },
    });

    // Neplatný, použitý alebo vypršaný token - rovnaká hláška,
    // aby sa nedalo zisťovať, ktorá z možností nastala
    if (!zaznam || !zaznam.jePouzitelny()) {
      res.status(400).json({
        success: false,
        message: 'Odkaz na obnovu hesla je neplatný alebo mu vypršala platnosť. Vyžiadajte si nový.',
      });
      return;
    }

    const user = await User.findByPk(zaznam.pouzivatel_id);
    if (!user || !user.aktivity) {
      res.status(400).json({ success: false, message: 'Účet nie je dostupný' });
      return;
    }

    // Kontrola sily nového hesla
    const chyby = overSiluHesla(noveHeslo, { meno: user.meno, email: user.email });
    if (chyby.length > 0) {
      res.status(400).json({
        success: false,
        message: 'Heslo nespĺňa bezpečnostné požiadavky',
        errors: chyby,
      });
      return;
    }

    // Zmena hesla, spotrebovanie tokenu a zrušenie relácií naraz.
    // Ak by ktorákoľvek časť zlyhala, nesmie ostať polovičný stav.
    await sequelize.transaction(async (t) => {
      // Model má hook, ktorý heslo pri uložení zahashuje
      await user.update({ heslo: noveHeslo }, { transaction: t });
      await zaznam.update({ pouzity: true }, { transaction: t });

      // Po zmene hesla musia skončiť všetky existujúce relácie -
      // ak účet niekto zneužíval, týmto ho odstrihneme
      await RefreshToken.update(
        { zruseny: true, dovod_zrusenia: 'zmena_hesla' },
        { where: { pouzivatel_id: user.id, zruseny: false }, transaction: t }
      );
    });

    console.log(`✅ Heslo obnovené pre používateľa ${user.email}`);

    res.json({
      success: true,
      message: 'Heslo bolo zmenené. Môžete sa prihlásiť novým heslom.',
    });
  } catch (error) {
    console.error('Chyba pri obnove hesla:', error);
    res.status(500).json({ success: false, message: 'Chyba servera pri obnove hesla' });
  }
};

/**
 * POST /api/auth/zmena-hesla
 * Zmena hesla prihláseným používateľom (vyžaduje pôvodné heslo).
 */
export const zmenHeslo = async (req: Request, res: Response): Promise<void> => {
  try {
    const pouzivatelId = (req as any).userId;
    const { stareHeslo, noveHeslo } = req.body || {};

    const user = await User.findByPk(pouzivatelId);
    if (!user) {
      res.status(404).json({ success: false, message: 'Používateľ nenájdený' });
      return;
    }

    // Overenie pôvodného hesla - bez neho by útočník s ukradnutým
    // tokenom mohol prevziať účet natrvalo
    const sedi = await user.overHeslo(String(stareHeslo || ''));
    if (!sedi) {
      res.status(401).json({ success: false, message: 'Pôvodné heslo nie je správne' });
      return;
    }

    const chyby = overSiluHesla(noveHeslo, { meno: user.meno, email: user.email });
    if (chyby.length > 0) {
      res.status(400).json({
        success: false,
        message: 'Heslo nespĺňa bezpečnostné požiadavky',
        errors: chyby,
      });
      return;
    }

    if (stareHeslo === noveHeslo) {
      res.status(400).json({
        success: false,
        message: 'Nové heslo musí byť iné ako pôvodné',
      });
      return;
    }

    await sequelize.transaction(async (t) => {
      await user.update({ heslo: noveHeslo }, { transaction: t });

      // Ostatné relácie ukončíme, aktuálnu necháme bežať
      await RefreshToken.update(
        { zruseny: true, dovod_zrusenia: 'zmena_hesla' },
        { where: { pouzivatel_id: user.id, zruseny: false }, transaction: t }
      );
    });

    // Používateľovi vydáme novú dvojicu tokenov, aby nebol odhlásený
    const novyObnovovaci = await vytvorObnovovaciToken(user, req);

    res.json({
      success: true,
      data: {
        token: vytvorPristupovyToken(user),
        refreshToken: novyObnovovaci,
      },
      message: 'Heslo bolo zmenené. Ostatné zariadenia boli odhlásené.',
    });
  } catch (error) {
    console.error('Chyba pri zmene hesla:', error);
    res.status(500).json({ success: false, message: 'Chyba servera pri zmene hesla' });
  }
};

/**
 * Upratanie starých tokenov.
 * Spúšťa sa periodicky pri behu servera - bez toho by tabuľky
 * postupne narastali o záznamy, ktoré už nikomu neslúžia.
 */
export const uprataStareTokeny = async (): Promise<void> => {
  try {
    const hranica = new Date();
    hranica.setDate(hranica.getDate() - 7);

    const zmazaneObnovovacie = await RefreshToken.destroy({
      where: {
        [Op.or]: [
          { platny_do: { [Op.lt]: hranica } },
          { zruseny: true, aktualizovany: { [Op.lt]: hranica } },
        ],
      },
    });

    const zmazaneResety = await ResetHeslaToken.destroy({
      where: { platny_do: { [Op.lt]: hranica } },
    });

    if (zmazaneObnovovacie > 0 || zmazaneResety > 0) {
      console.log(
        `🧹 Upratané staré tokeny: ${zmazaneObnovovacie} obnovovacích, ${zmazaneResety} resetovacích`
      );
    }
  } catch (error) {
    console.error('Chyba pri upratovaní tokenov:', error);
  }
};
