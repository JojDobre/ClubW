// backend/src/controllers/zapasController.ts
// Controller pre správu zápasov - FÁZA 4

import { Request, Response } from 'express';
import { Op } from 'sequelize';
import Zapas from '../models/Zapas';
import ZapasStatistika from '../models/ZapasStatistika';
import Liga from '../models/Liga';
import LigaTabulka from '../models/LigaTabulka';
// Ukladanie štatistík zápasu (góly, asistencie, karty)
import { overStatistiky, ulozStatistikyZapasu } from './ZapasStatistikaController';
import Team from '../models/Team';
import Stadion from '../models/Stadion';
import Player from '../models/Player';
import Article from '../models/Article';

// ===== HELPER FUNCTIONS =====

// Jednoduchá validácia bez express-validator
/**
 * Validácia údajov zápasu.
 *
 * @param data - údaje z tela požiadavky
 * @param jeCiastocnaAktualizacia - pri true sa kontrolujú len polia, ktoré
 *   klient poslal. Slúži pre PUT, kde je bežné poslať len zmenené hodnoty
 *   (napríklad iba skóre). Pôvodne validácia vyžadovala vždy všetky povinné
 *   polia, takže zmena samotného výsledku zápasu skončila chybou.
 */
const validateZapasData = (data: any, jeCiastocnaAktualizacia: boolean = false) => {
  const errors: string[] = [];

  // Pomocník: pole treba kontrolovať, ak ide o vytváranie,
  // alebo ak ho klient pri čiastočnej aktualizácii poslal
  const kontrolovat = (nazovPola: string) =>
    !jeCiastocnaAktualizacia || data[nazovPola] !== undefined;

  // 1. Dátum je povinný
  if (kontrolovat('datum_cas')) {
    if (!data.datum_cas || !Date.parse(data.datum_cas)) {
      errors.push('Dátum a čas je povinný a musí byť platný');
    }
  }

  // 2. Liga JE povinná - buď ID alebo custom názov
  const hasLigaId = data.liga_id && !isNaN(Number(data.liga_id)) && Number(data.liga_id) > 0;
  const hasLigaNazov = data.liga_nazov && typeof data.liga_nazov === 'string' && data.liga_nazov.trim().length >= 2;

  if ((kontrolovat('liga_id') || kontrolovat('liga_nazov')) && !hasLigaId && !hasLigaNazov) {
    errors.push('Liga je povinná (buď vyberte zo zoznamu alebo zadajte vlastný názov)');
  }

  // 3. Domáci tím - aspoň jeden spôsob musí byť zadaný
  const hasDomaciTimId = data.domaci_tim_id && !isNaN(Number(data.domaci_tim_id)) && Number(data.domaci_tim_id) > 0;
  const hasDomaciTimNazov = data.domaci_tim_nazov && typeof data.domaci_tim_nazov === 'string' && data.domaci_tim_nazov.trim().length >= 2;

  if ((kontrolovat('domaci_tim_id') || kontrolovat('domaci_tim_nazov')) && !hasDomaciTimId && !hasDomaciTimNazov) {
    errors.push('Domáci tím je povinný (buď vyberte zo zoznamu alebo zadajte vlastný názov)');
  }

  // 4. Hosťujúci tím - aspoň jeden spôsob musí byť zadaný
  const hasHostujuciTimId = data.hostujuci_tim_id && !isNaN(Number(data.hostujuci_tim_id)) && Number(data.hostujuci_tim_id) > 0;
  const hasHostujuciTimNazov = data.hostujuci_tim_nazov && typeof data.hostujuci_tim_nazov === 'string' && data.hostujuci_tim_nazov.trim().length >= 2;

  if ((kontrolovat('hostujuci_tim_id') || kontrolovat('hostujuci_tim_nazov')) && !hasHostujuciTimId && !hasHostujuciTimNazov) {
    errors.push('Hosťujúci tím je povinný (buď vyberte zo zoznamu alebo zadajte vlastný názov)');
  }
  
  // 5. Tímy nemôžu byť rovnaké (len ak sú oba z databázy)
  if (hasDomaciTimId && hasHostujuciTimId && Number(data.domaci_tim_id) === Number(data.hostujuci_tim_id)) {
    errors.push('Domáci a hosťujúci tím nemôžu byť rovnaké');
  }
  
  // 6. Status validácia
  if (data.status && !['naplanovany', 'prebieha', 'ukonceny', 'odlozeny', 'zruseny'].includes(data.status)) {
    errors.push('Neplatný status');
  }
  
  // 7. Góly validácia (len ak sú zadané)
  if (data.goly_domaci !== undefined && data.goly_domaci !== null && 
      (isNaN(Number(data.goly_domaci)) || Number(data.goly_domaci) < 0 || Number(data.goly_domaci) > 50)) {
    errors.push('Góly domáci musia byť číslo medzi 0-50');
  }
  
  if (data.goly_hostia !== undefined && data.goly_hostia !== null && 
      (isNaN(Number(data.goly_hostia)) || Number(data.goly_hostia) < 0 || Number(data.goly_hostia) > 50)) {
    errors.push('Góly hostia musia byť číslo medzi 0-50');
  }
  
  // 8. Počet divákov
  if (data.pocet_divakov !== undefined && data.pocet_divakov !== null && 
      (isNaN(Number(data.pocet_divakov)) || Number(data.pocet_divakov) < 0)) {
    errors.push('Počet divákov musí byť nezáporné číslo');
  }
  
  // 9. Video URL
  if (data.video_url && typeof data.video_url === 'string' && data.video_url.trim() !== '') {
    const urlPattern = /^https?:\/\/.+/;
    if (!urlPattern.test(data.video_url)) {
      errors.push('Video URL musí začínať http:// alebo https://');
    }
  }
  
  console.log('Validation result:', errors.length === 0 ? 'PASSED' : 'FAILED');
  console.log('Errors:', errors);
  console.log('=== END VALIDATION DEBUG ===');
  
  return errors;
};

const validateZapasId = (id: string) => {
  const zapasId = parseInt(id);
  if (isNaN(zapasId) || zapasId < 1) {
    return { valid: false, error: 'ID zápasu musí byť kladné číslo' };
  }
  return { valid: true, id: zapasId };
};

// ===== VEREJNÉ API ENDPOINTS =====

// GET /api/matches - Zoznam všetkých aktívnych zápasov
export const getMatches = async (req: Request, res: Response): Promise<void> => {
  try {
    const { 
      liga_id, 
      tim_id, 
      status, 
      od_datumu, 
      do_datumu, 
      search, 
      include_details,
      page = '1',
      limit = '20'
    } = req.query;

    // Základné filter podmienky
    const whereConditions: any = { aktivity: true };

    // Filter podľa ligy
    if (liga_id && !isNaN(Number(liga_id))) {
      whereConditions.liga_id = Number(liga_id);
    }

    // Filter podľa tímu (domáci alebo hosťujúci)
    if (tim_id && !isNaN(Number(tim_id))) {
      whereConditions[Op.or] = [
        { domaci_tim_id: Number(tim_id) },
        { hostujuci_tim_id: Number(tim_id) }
      ];
    }

    // Filter podľa statusu
    if (status && ['naplanovany', 'prebieha', 'ukonceny', 'odlozeny', 'zruseny'].includes(status as string)) {
      whereConditions.status = status;
    }

    // Filter podľa dátumu
    if (od_datumu) {
      whereConditions.datum_cas = { [Op.gte]: new Date(od_datumu as string) };
    }
    if (do_datumu) {
      if (whereConditions.datum_cas) {
        whereConditions.datum_cas[Op.lte] = new Date(do_datumu as string);
      } else {
        whereConditions.datum_cas = { [Op.lte]: new Date(do_datumu as string) };
      }
    }

    // Paginácia
    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 20;
    const offset = (pageNum - 1) * limitNum;

    // Include podmienky
    const includeOptions = [];
    
    if (include_details === 'true') {
      includeOptions.push(
        {
          model: Liga,
          as: 'liga',
          attributes: ['id', 'nazov', 'sezona', 'typ']
        },
        {
          model: Team,
          as: 'domaci_tim',
          attributes: ['id', 'nazov', 'vekova_kategoria']
        },
        {
          model: Team,
          as: 'hostujuci_tim',
          attributes: ['id', 'nazov', 'vekova_kategoria']
        }
      );
    }

    const { rows: matches, count } = await Zapas.findAndCountAll({
      where: whereConditions,
      include: includeOptions,
      order: [['datum_cas', 'DESC']],
      limit: limitNum,
      offset
    });

    // Vyhľadávanie v názve (po načítaní kvôli jednoduchosti)
    let filteredMatches = matches;
    if (search) {
      const searchTerm = (search as string).toLowerCase();
      filteredMatches = matches.filter(zapas => 
        zapas.nazov.toLowerCase().includes(searchTerm) ||
        zapas.miesto?.toLowerCase().includes(searchTerm) ||
        zapas.kolo?.toLowerCase().includes(searchTerm)
      );
    }

    // Transformácia na safe JSON
    const result = filteredMatches.map(zapas => zapas.toSafeJSON());

    res.json({
      success: true,
      data: result,
      count: result.length,
      total: count,
      page: pageNum,
      totalPages: Math.ceil(count / limitNum),
      message: `Nájdených ${result.length} zápasov`
    });

  } catch (error) {
    console.error('Chyba pri načítaní zápasov:', error);
    res.status(500).json({
      success: false,
      message: 'Chyba servera pri načítaní zápasov',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};

// GET /api/matches/:id - Detail konkrétneho zápasu
export const getMatch = async (req: Request, res: Response): Promise<void> => {
  try {
    const validation = validateZapasId(req.params.id);
    if (!validation.valid) {
      res.status(400).json({
        success: false,
        message: validation.error
      });
      return;
    }

    const zapas = await Zapas.findByPk(validation.id, {
      include: [
        {
          model: Liga,
          as: 'liga',
          attributes: ['id', 'nazov', 'sezona', 'typ']
        },
        {
          model: Team,
          as: 'domaci_tim',
          attributes: ['id', 'nazov', 'vekova_kategoria']
        },
        {
          model: Team,
          as: 'hostujuci_tim',
          attributes: ['id', 'nazov', 'vekova_kategoria']
        },
        {
          model: Article,
          as: 'clanok',
          attributes: ['id', 'nazov', 'slug'],
          required: false
        },
        {
          model: ZapasStatistika,
          as: 'statistiky',
          where: { aktivity: true },
          required: false,
          include: [
            {
              model: Player,
              as: 'hrac',
              attributes: ['id', 'meno', 'priezvisko', 'cislo_dresu']
            }
          ],
          order: [['minuta', 'ASC'], ['typ', 'ASC']]
        }
      ]
    });

    if (!zapas) {
      res.status(404).json({
        success: false,
        message: 'Zápas nenájdený'
      });
      return;
    }

    if (!zapas.aktivity) {
      res.status(404).json({
        success: false,
        message: 'Zápas nie je aktívny'
      });
      return;
    }

    res.json({
      success: true,
      data: zapas.toSafeJSON(),
      message: 'Zápas úspešne načítaný'
    });

  } catch (error) {
    console.error('Chyba pri načítaní detailu zápasu:', error);
    res.status(500).json({
      success: false,
      message: 'Chyba servera pri načítaní detailu zápasu',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};

/**
 * Prepočíta ligovú tabuľku po zmene zápasu.
 *
 * PREČO: pôvodne sa tabuľka aktualizovala len po ručnom spustení prepočtu
 * cez admin rozhranie. Admin zadal výsledok a na verejnom webe zostala
 * stará tabuľka, kým si niekto nespomenul stlačiť "Prepočítať".
 *
 * Prepočet sa spúšťa len ak liga existuje a má zapnutú automatickú
 * aktualizáciu (nastavenie auto_update_tabulka, turnajové formáty vylúčené).
 *
 * Prípadná chyba sa iba zaloguje - uloženie zápasu už prebehlo úspešne
 * a nesmie zlyhať kvôli prepočtu tabuľky. Admin vie prepočet spustiť ručne.
 *
 * @param ligaId - ID ligy, do ktorej zápas patrí (môže byť null pri priateľských zápasoch)
 */
const prepocitajTabulkuAkTreba = async (ligaId: number | null | undefined): Promise<void> => {
  if (!ligaId) return; // Zápas nepatrí do žiadnej ligy

  try {
    const liga = await Liga.findByPk(ligaId);
    if (!liga || !liga.hasAutoUpdateEnabled()) {
      return;
    }

    await LigaTabulka.recalculateTable(
      ligaId,
      liga.body_za_vitazstvo,
      liga.body_za_remizy
    );

    console.log(`✅ Tabuľka ligy ${ligaId} prepočítaná po zmene zápasu`);
  } catch (error) {
    console.error(`⚠️ Nepodarilo sa prepočítať tabuľku ligy ${ligaId}:`, error);
  }
};


/** Povolené hodnoty miesta konania zápasu. */
const TYPY_ZAPASU = ['doma', 'vonku', 'neutralne'];

/**
 * Doplní miesto konania a štadión podľa toho, kde sa zápas hrá.
 *
 * Pri DOMÁCOM zápase sa oboje preberie z domáceho štadióna nášho tímu -
 * presne to žiadala požiadavka „domáci zápas sa bude hrať na domácom
 * štadióne". Používateľ tak nemusí písať to isté miesto ku každému
 * zápasu; keď ho aj tak zadá ručne, jeho hodnota má prednosť.
 *
 * Pri zápase VONKU a na NEUTRÁLNEJ pôde sa miesto nedopĺňa - tam ho
 * zadáva používateľ, lebo štadión súpera v našej databáze nie je.
 *
 * @param udaje - dáta zápasu, upravujú sa na mieste
 */
const doplnMiestoKonania = async (udaje: any): Promise<void> => {
  if (udaje.typ_zapasu !== 'doma') return;
  if (!udaje.domaci_tim_id) return;

  const tim = await Team.findByPk(udaje.domaci_tim_id);
  if (!tim || !(tim as any).stadion_id) return;

  if (!udaje.stadion_id) {
    udaje.stadion_id = (tim as any).stadion_id;
  }

  // Ručne zadané miesto neprepisujeme
  if (!udaje.miesto) {
    const stadion = await Stadion.findByPk(udaje.stadion_id);
    if (stadion) {
      udaje.miesto = stadion.nazov;
    }
  }
};

/**
 * Prevezme voliteľné polia zápasu z tela požiadavky.
 *
 * @param telo - req.body
 * @param ciel - objekt, do ktorého sa polia zapíšu
 * @param lenPoslane - pri úprave berieme len to, čo klient naozaj poslal
 */
const prevezmiVolitelnePolia = (telo: any, ciel: any, lenPoslane: boolean): string | null => {
  const poslane = (pole: string) => Object.prototype.hasOwnProperty.call(telo, pole);

  if (poslane('typ_zapasu')) {
    if (!TYPY_ZAPASU.includes(telo.typ_zapasu)) {
      return `Typ zápasu musí byť jeden z: ${TYPY_ZAPASU.join(', ')}`;
    }
    ciel.typ_zapasu = telo.typ_zapasu;
  } else if (!lenPoslane) {
    ciel.typ_zapasu = 'doma';
  }

  if (poslane('rozhodca')) {
    ciel.rozhodca = telo.rozhodca ? String(telo.rozhodca).trim() : null;
  }
  if (poslane('supier_logo')) {
    ciel.supier_logo = telo.supier_logo || null;
  }
  if (poslane('stadion_id')) {
    ciel.stadion_id = telo.stadion_id || null;
  }

  return null;
};

// POST /api/matches - Vytvorenie nového zápasu
export const createMatch = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('POST /api/matches - Received data:', req.body);

    const errors = validateZapasData(req.body);
    if (errors.length > 0) {
      res.status(400).json({
        success: false,
        message: 'Validačné chyby',
        errors
      });
      return;
    }

    // Príprava dát pre vytvorenie
    const createData: any = {
      nazov: req.body.nazov,
      datum_cas: req.body.datum_cas,
      status: req.body.status || 'naplanovany'
    };

    // Liga handling - KONTROLA LEN AK JE ZADANÉ DB ID
    if (req.body.liga_id && req.body.liga_id > 0) {
      // Kontrola existencie ligy z databázy
      const liga = await Liga.findOne({
        where: { id: req.body.liga_id, aktivity: true }
      });
      if (!liga) {
        res.status(400).json({
          success: false,
          message: 'Liga nenájdená alebo nie je aktívna'
        });
        return;
      }
      createData.liga_id = req.body.liga_id;
      createData.liga_nazov = liga.nazov; // PRIDANÉ: ulož aj názov pre DB ligu
      console.log('Using DB liga:', liga.nazov);
    } else if (req.body.liga_nazov) {
      createData.liga_nazov = req.body.liga_nazov.trim();
      console.log('Using custom liga:', createData.liga_nazov);
    }

    // Domáci tím meníme len ak ho klient poslal
    const klientPoslalDomaci = req.body.domaci_tim_id !== undefined || req.body.domaci_tim_nazov !== undefined;

    // Domáci tím handling - KONTROLA LEN AK JE ZADANÉ DB ID
    if (!klientPoslalDomaci) {
      // Klient domáci tím nespomenul - nemeníme ho
    } else if (req.body.domaci_tim_id && req.body.domaci_tim_id > 0) {
      const domaciTim = await Team.findOne({
        where: { id: req.body.domaci_tim_id, aktivity: true }
      });
      if (!domaciTim) {
        res.status(400).json({
          success: false,
          message: 'Domáci tím nenájdený alebo nie je aktívny'
        });
        return;
      }
      createData.domaci_tim_id = req.body.domaci_tim_id;
      createData.domaci_tim_nazov = domaciTim.nazov; // PRIDANÉ: ulož aj názov pre DB tím
      console.log('Using DB domaci tim:', domaciTim.nazov);
    } else if (req.body.domaci_tim_nazov) {
      createData.domaci_tim_nazov = req.body.domaci_tim_nazov.trim();
      console.log('Using custom domaci tim:', createData.domaci_tim_nazov);
    }

    // Hosťujúci tím meníme len ak ho klient poslal
    const klientPoslalHostia = req.body.hostujuci_tim_id !== undefined || req.body.hostujuci_tim_nazov !== undefined;

    // Hosťujúci tím handling - KONTROLA LEN AK JE ZADANÉ DB ID
    if (!klientPoslalHostia) {
      // Klient hosťujúci tím nespomenul - nemeníme ho
    } else if (req.body.hostujuci_tim_id && req.body.hostujuci_tim_id > 0) {
      const hostujuciTim = await Team.findOne({
        where: { id: req.body.hostujuci_tim_id, aktivity: true }
      });
      if (!hostujuciTim) {
        res.status(400).json({
          success: false,
          message: 'Hosťujúci tím nenájdený alebo nie je aktívny'
        });
        return;
      }
      createData.hostujuci_tim_id = req.body.hostujuci_tim_id;
      createData.hostujuci_tim_nazov = hostujuciTim.nazov; // PRIDANÉ: ulož aj názov pre DB tím
      console.log('Using DB hostujuci tim:', hostujuciTim.nazov);
    } else if (req.body.hostujuci_tim_nazov) {
      createData.hostujuci_tim_nazov = req.body.hostujuci_tim_nazov.trim();
      console.log('Using custom hostujuci tim:', createData.hostujuci_tim_nazov);
    }

    // Voliteľné polia
    if (req.body.kolo) createData.kolo = req.body.kolo;
    if (req.body.miesto) createData.miesto = req.body.miesto;
    if (req.body.goly_domaci !== undefined) createData.goly_domaci = req.body.goly_domaci;
    if (req.body.goly_hostia !== undefined) createData.goly_hostia = req.body.goly_hostia;
    if (req.body.pocet_divakov !== undefined) createData.pocet_divakov = req.body.pocet_divakov;
    if (req.body.poznamky) createData.poznamky = req.body.poznamky;
    if (req.body.video_url) createData.video_url = req.body.video_url;
    if (req.body.clanok_id) createData.clanok_id = req.body.clanok_id;
    if (req.body.fotogaleria_id) createData.fotogaleria_id = req.body.fotogaleria_id;

    const chybaPoli = prevezmiVolitelnePolia(req.body, createData, false);
    if (chybaPoli) {
      res.status(400).json({ success: false, message: chybaPoli });
      return;
    }

    if (createData.stadion_id) {
      const stadion = await Stadion.findByPk(createData.stadion_id);
      if (!stadion) {
        res.status(400).json({
          success: false,
          message: `Štadión s ID ${createData.stadion_id} neexistuje`,
        });
        return;
      }
    }

    // Pri domácom zápase doplníme miesto zo štadióna nášho tímu
    await doplnMiestoKonania(createData);

    console.log('Creating match with data:', createData);

    const newZapas = await Zapas.create(createData);

    // Načítanie s relačnými objektmi pre response (len tie ktoré existujú)
    const includeOptions = [];
    
    if (newZapas.liga_id) {
      includeOptions.push({
        model: Liga,
        as: 'liga',
        attributes: ['id', 'nazov', 'sezona', 'typ'],
        required: false
      });
    }
    
    if (newZapas.domaci_tim_id) {
      includeOptions.push({
        model: Team,
        as: 'domaci_tim',
        attributes: ['id', 'nazov', 'vekova_kategoria'],
        required: false
      });
    }
    
    if (newZapas.hostujuci_tim_id) {
      includeOptions.push({
        model: Team,
        as: 'hostujuci_tim',
        attributes: ['id', 'nazov', 'vekova_kategoria'],
        required: false
      });
    }

    const createdZapas = await Zapas.findByPk(newZapas.id, {
      include: includeOptions
    });

    const formattedMatch = {
      ...createdZapas!.toSafeJSON(),
      domaci_tim_nazov: createdZapas!.getDomaciTimNazov(),
      hostujuci_tim_nazov: createdZapas!.getHostujuciTimNazov(),
      liga_nazov: createdZapas!.getLigaNazov()
    };

    // Uloženie štatistík, ak ich klient poslal spolu so zápasom
    if (req.body.statistiky !== undefined) {
      const chybyStatistik = await overStatistiky(req.body.statistiky);
      if (chybyStatistik.length === 0) {
        await ulozStatistikyZapasu(newZapas.id, req.body.statistiky);
      } else {
        // Zápas je už vytvorený, preto chybu iba zalogujeme.
        // Admin vie štatistiky doplniť cez PUT /api/matches/:id/statistics
        console.warn('Štatistiky zápasu neboli uložené kvôli chybám:', chybyStatistik);
      }
    }

    // Automatický prepočet tabuľky - nový zápas môže zmeniť poradie
    await prepocitajTabulkuAkTreba(newZapas.liga_id);

    res.status(201).json({
      success: true,
      data: formattedMatch,
      message: 'Zápas úspešne vytvorený'
    });

  } catch (error) {
    console.error('Chyba pri vytváraní zápasu:', error);
    res.status(500).json({
      success: false,
      message: 'Chyba servera pri vytváraní zápasu',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};

// PUT /api/matches/:id - Aktualizácia zápasu
export const updateMatch = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log(`PUT /api/matches/${req.params.id} - Received data:`, req.body);

    const validation = validateZapasId(req.params.id);
    if (!validation.valid) {
      res.status(400).json({
        success: false,
        message: validation.error
      });
      return;
    }

    // Pri aktualizácii povolíme poslať len zmenené polia
    const errors = validateZapasData(req.body, true);
    if (errors.length > 0) {
      res.status(400).json({
        success: false,
        message: 'Validačné chyby',
        errors
      });
      return;
    }

    const zapas = await Zapas.findOne({
      where: { id: validation.id, aktivity: true }
    });

    if (!zapas) {
      res.status(404).json({
        success: false,
        message: 'Zápas nenájdený'
      });
      return;
    }

    // Pôvodnú ligu si zapamätáme pred úpravou. Ak sa zápas presunie
    // do inej ligy, treba prepočítať tabuľky oboch líg.
    const povodnaLigaId = zapas.liga_id;

    // Príprava dát pre aktualizáciu.
    // OPRAVA: meníme len polia, ktoré klient naozaj poslal.
    // Pôvodne sa nazov a datum_cas prepísali vždy (aj na undefined) a status
    // sa pri chýbajúcej hodnote nastavil na 'naplanovany' - ukončený zápas
    // tak pri úprave ticho stratil výsledok a vypadol z ligovej tabuľky.
    const updateData: any = {};

    if (req.body.nazov !== undefined) {
      updateData.nazov = req.body.nazov;
    }
    if (req.body.datum_cas !== undefined) {
      updateData.datum_cas = req.body.datum_cas;
    }
    if (req.body.status !== undefined) {
      updateData.status = req.body.status;
    }

    // Ligu meníme len vtedy, keď klient poslal liga_id alebo liga_nazov.
    // Inak zostáva pôvodná hodnota.
    const klientPoslalLigu = req.body.liga_id !== undefined || req.body.liga_nazov !== undefined;

    // Liga handling - KONTROLA LEN AK JE ZADANÉ DB ID
    if (!klientPoslalLigu) {
      // Klient ligu nespomenul - nemeníme ju
    } else if (req.body.liga_id && req.body.liga_id > 0) {
      const liga = await Liga.findOne({
        where: { id: req.body.liga_id, aktivity: true }
      });
      if (!liga) {
        res.status(400).json({
          success: false,
          message: 'Liga nenájdená alebo nie je aktívna'
        });
        return;
      }
      updateData.liga_id = req.body.liga_id;
      updateData.liga_nazov = liga.nazov; // PRIDANÉ: ulož aj názov pre DB ligu
      console.log('Using DB liga:', liga.nazov);
    } else if (req.body.liga_nazov) {
      updateData.liga_id = null; // Clear DB reference
      updateData.liga_nazov = req.body.liga_nazov.trim();
      console.log('Using custom liga:', updateData.liga_nazov);
    } else {
      updateData.liga_id = null;
      updateData.liga_nazov = null;
    }

    // Domáci tím handling - KONTROLA LEN AK JE ZADANÉ DB ID
    if (req.body.domaci_tim_id && req.body.domaci_tim_id > 0) {
      const domaciTim = await Team.findOne({
        where: { id: req.body.domaci_tim_id, aktivity: true }
      });
      if (!domaciTim) {
        res.status(400).json({
          success: false,
          message: 'Domáci tím nenájdený alebo nie je aktívny'
        });
        return;
      }
      updateData.domaci_tim_id = req.body.domaci_tim_id;
      updateData.domaci_tim_nazov = domaciTim.nazov; // PRIDANÉ: ulož aj názov pre DB tím
      console.log('Using DB domaci tim:', domaciTim.nazov);
    } else if (req.body.domaci_tim_nazov) {
      updateData.domaci_tim_id = null;
      updateData.domaci_tim_nazov = req.body.domaci_tim_nazov.trim();
      console.log('Using custom domaci tim:', updateData.domaci_tim_nazov);
    }

    // Hosťujúci tím handling - KONTROLA LEN AK JE ZADANÉ DB ID
    if (req.body.hostujuci_tim_id && req.body.hostujuci_tim_id > 0) {
      const hostujuciTim = await Team.findOne({
        where: { id: req.body.hostujuci_tim_id, aktivity: true }
      });
      if (!hostujuciTim) {
        res.status(400).json({
          success: false,
          message: 'Hosťujúci tím nenájdený alebo nie je aktívny'
        });
        return;
      }
      updateData.hostujuci_tim_id = req.body.hostujuci_tim_id;
      updateData.hostujuci_tim_nazov = hostujuciTim.nazov; // PRIDANÉ: ulož aj názov pre DB tím
      console.log('Using DB hostujuci tim:', hostujuciTim.nazov);
    } else if (req.body.hostujuci_tim_nazov) {
      updateData.hostujuci_tim_id = null;
      updateData.hostujuci_tim_nazov = req.body.hostujuci_tim_nazov.trim();
      console.log('Using custom hostujuci tim:', updateData.hostujuci_tim_nazov);
    }

    // Voliteľné polia
    // Voliteľné polia - meníme len tie, ktoré klient poslal.
    // Pôvodne sa všetky nastavovali na null, takže úprava samotného skóre
    // vymazala kolo, miesto, poznámky aj odkaz na článok a fotogalériu.
    // Prázdny reťazec berieme ako zámer pole vymazať (null).
    const volitelnePolia = [
      'kolo', 'miesto', 'goly_domaci', 'goly_hostia',
      'pocet_divakov', 'poznamky', 'video_url', 'clanok_id', 'fotogaleria_id',
    ];

    for (const pole of volitelnePolia) {
      if (req.body[pole] !== undefined) {
        updateData[pole] = req.body[pole] === '' ? null : req.body[pole];
      }
    }

    const chybaPoli = prevezmiVolitelnePolia(req.body, updateData, true);
    if (chybaPoli) {
      res.status(400).json({ success: false, message: chybaPoli });
      return;
    }

    if (updateData.stadion_id) {
      const stadion = await Stadion.findByPk(updateData.stadion_id);
      if (!stadion) {
        res.status(400).json({
          success: false,
          message: `Štadión s ID ${updateData.stadion_id} neexistuje`,
        });
        return;
      }
    }

    // Keď sa zápas prepne na domáci (alebo sa zmení domáci tím),
    // doplníme miesto zo štadióna. Rozhoduje sa podľa VÝSLEDNÉHO stavu
    // zápasu, teda podľa doterajších hodnôt prekrytých tými novými.
    const vyslednyStav: any = { ...zapas.toJSON(), ...updateData };
    await doplnMiestoKonania(vyslednyStav);

    // Späť do zápisu berieme len to, čo doplnenie naozaj zmenilo
    if (vyslednyStav.stadion_id !== (zapas as any).stadion_id) {
      updateData.stadion_id = vyslednyStav.stadion_id;
    }
    if (vyslednyStav.miesto !== zapas.miesto) {
      updateData.miesto = vyslednyStav.miesto;
    }

    console.log('Updating match with data:', updateData);

    await zapas.update(updateData);

    // Načítanie s relačnými objektmi pre response (len tie ktoré existujú)
    const includeOptions = [];
    
    if (zapas.liga_id) {
      includeOptions.push({
        model: Liga,
        as: 'liga',
        attributes: ['id', 'nazov', 'sezona', 'typ'],
        required: false
      });
    }
    
    if (zapas.domaci_tim_id) {
      includeOptions.push({
        model: Team,
        as: 'domaci_tim',
        attributes: ['id', 'nazov', 'vekova_kategoria'],
        required: false
      });
    }
    
    if (zapas.hostujuci_tim_id) {
      includeOptions.push({
        model: Team,
        as: 'hostujuci_tim',
        attributes: ['id', 'nazov', 'vekova_kategoria'],
        required: false
      });
    }

    const updatedZapas = await Zapas.findByPk(zapas.id, {
      include: includeOptions
    });

    const formattedMatch = {
      ...updatedZapas!.toSafeJSON(),
      domaci_tim_nazov: updatedZapas!.getDomaciTimNazov(),
      hostujuci_tim_nazov: updatedZapas!.getHostujuciTimNazov(),
      liga_nazov: updatedZapas!.getLigaNazov()
    };

    // Aktualizácia štatistík, ak ich klient poslal
    if (req.body.statistiky !== undefined) {
      const chybyStatistik = await overStatistiky(req.body.statistiky);
      if (chybyStatistik.length === 0) {
        await ulozStatistikyZapasu(zapas.id, req.body.statistiky);
      } else {
        console.warn('Štatistiky zápasu neboli aktualizované kvôli chybám:', chybyStatistik);
      }
    }

    // Automatický prepočet tabuľky po zmene výsledku alebo statusu.
    // Prepočítavame aj pôvodnú ligu - zápas mohol byť presunutý inam.
    await prepocitajTabulkuAkTreba(zapas.liga_id);
    if (povodnaLigaId && povodnaLigaId !== zapas.liga_id) {
      await prepocitajTabulkuAkTreba(povodnaLigaId);
    }

    res.json({
      success: true,
      data: formattedMatch,
      message: 'Zápas úspešne aktualizovaný'
    });

  } catch (error) {
    console.error('Chyba pri aktualizácii zápasu:', error);
    res.status(500).json({
      success: false,
      message: 'Chyba servera pri aktualizácii zápasu',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};

// DELETE /api/matches/:id - Soft delete zápasu
export const deleteMatch = async (req: Request, res: Response): Promise<void> => {
  try {
    const validation = validateZapasId(req.params.id);
    if (!validation.valid) {
      res.status(400).json({
        success: false,
        message: validation.error
      });
      return;
    }

    const zapas = await Zapas.findByPk(validation.id);
    if (!zapas) {
      res.status(404).json({
        success: false,
        message: 'Zápas nenájdený'
      });
      return;
    }

    // Ligu si zapamätáme pred zmazaním, aby sme vedeli, ktorú tabuľku prepočítať
    const ligaId = zapas.liga_id;

    // Soft delete - označenie ako neaktívny
    await zapas.update({ aktivity: false });

    // Automatický prepočet tabuľky - zmazaný zápas sa už nesmie počítať
    await prepocitajTabulkuAkTreba(ligaId);

    res.json({
      success: true,
      message: 'Zápas úspešne vymazaný'
    });

  } catch (error) {
    console.error('Chyba pri mazaní zápasu:', error);
    res.status(500).json({
      success: false,
      message: 'Chyba servera pri mazaní zápasu',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};

export const updateMatchStatuses = async (req: Request, res: Response): Promise<void> => {
  try {
    const now = new Date();
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

    // Nájdi všetky aktívne zápasy ktoré nie sú manuálne nastavené
    const zapasy = await Zapas.findAll({
      where: {
        aktivity: true,
        status: {
          [Op.notIn]: ['zruseny', 'odlozeny'] // Nevyber zrušené/odložené
        }
      }
    });

    let updatedCount = 0;
    const updates = [];

    for (const zapas of zapasy) {
      const currentAutoStatus = zapas.getAutoStatus();
      
      // Aktualizuj len ak sa automatický status líši od uloženého
      if (zapas.status !== currentAutoStatus) {
        await zapas.update({ status: currentAutoStatus });
        updatedCount++;
        
        updates.push({
          id: zapas.id,
          nazov: zapas.nazov,
          old_status: zapas.status,
          new_status: currentAutoStatus,
          datum_cas: zapas.datum_cas
        });
      }
    }

    res.json({
      success: true,
      message: `Aktualizovaných ${updatedCount} zápasov`,
      updated_count: updatedCount,
      total_checked: zapasy.length,
      updates: updates
    });

  } catch (error) {
    console.error('Chyba pri aktualizácii statusov:', error);
    res.status(500).json({
      success: false,
      message: 'Chyba servera pri aktualizácii statusov',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};