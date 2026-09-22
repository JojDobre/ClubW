// backend/src/controllers/ligaController.ts
// Rozšírený controller pre správu líg s tabuľkami a turnajmi - FÁZA 4+

import { Request, Response } from 'express';
import { overObrazkovySubor } from '../utils/obrazokValidator';
import { Op } from 'sequelize';
import sequelize from '../config/database';
import Liga from '../models/Liga';
import LigaTabulka from '../models/LigaTabulka';
import LigaTurnaj from '../models/LigaTurnaj';
import Team from '../models/Team';
import { 
  getLeagueWithTable,
  getLeagueTable,
  getLeagueTournament,
  getLeagueStats,
  getLeagueOverview,
  recalculateLeagueTable,
  exportLeagueTable,
  importLeagueTable
} from '../models';

// ===== HELPER FUNCTIONS =====

// Validácia ligových dát (rozšírená)
const validateLigaData = (data: any) => {
  const errors: string[] = [];
  
  // Základné validácie
  if (!data.nazov || typeof data.nazov !== 'string' || data.nazov.length < 2 || data.nazov.length > 100) {
    errors.push('Názov musí mať 2-100 znakov');
  }
  
  if (!data.sezona || typeof data.sezona !== 'string' || data.sezona.length < 4 || data.sezona.length > 20) {
    errors.push('Sezóna je povinná a musí mať 4-20 znakov');
  }
  
  if (data.sezona && !/^[0-9/\-\s]+$/.test(data.sezona)) {
    errors.push('Sezóna môže obsahovať len čísla, lomky, pomlčky a medzery');
  }
  
  if (!data.typ || !['sutaz', 'pohar', 'priatelska'].includes(data.typ)) {
    errors.push('Typ musí byť: sutaz, pohar alebo priatelska');
  }

  // Validácia dátumov
  if (data.datum_start && !Date.parse(data.datum_start)) {
    errors.push('Neplatný dátum začiatku');
  }
  
  if (data.datum_koniec && !Date.parse(data.datum_koniec)) {
    errors.push('Neplatný dátum ukončenia');
  }
  
  if (data.datum_start && data.datum_koniec && new Date(data.datum_start) >= new Date(data.datum_koniec)) {
    errors.push('Dátum ukončenia musí byť po dátume začiatku');
  }

  // Validácia formátu súťaže
  if (data.format && !['tabulka', 'turnaj', 'kombinovany'].includes(data.format)) {
    errors.push('Formát musí byť: tabulka, turnaj alebo kombinovany');
  }

  // Validácia bodového systému
  if (data.body_za_vitazstvo !== undefined) {
    const body = Number(data.body_za_vitazstvo);
    if (isNaN(body) || body < 0 || body > 10) {
      errors.push('Body za víťazstvo musia byť číslo medzi 0-10');
    }
  }

  if (data.body_za_remizy !== undefined) {
    const body = Number(data.body_za_remizy);
    if (isNaN(body) || body < 0 || body > 10) {
      errors.push('Body za remízy musia byť číslo medzi 0-10');
    }
  }

  if (data.body_za_prehru !== undefined) {
    const body = Number(data.body_za_prehru);
    if (isNaN(body) || body < 0 || body > 10) {
      errors.push('Body za prehru musia byť číslo medzi 0-10');
    }
  }

  // Validácia počtu tímov
  if (data.pocet_timov !== undefined) {
    const pocet = Number(data.pocet_timov);
    if (isNaN(pocet) || pocet < 2 || pocet > 100) {
      errors.push('Počet tímov musí byť číslo medzi 2-100');
    }
  }

  // Validácia turnajových nastavení
  if (data.turnaj_typ && !['single_elimination', 'double_elimination', 'round_robin', 'groups_playoff'].includes(data.turnaj_typ)) {
    errors.push('Neplatný typ turnaja');
  }

  // Validácia externých URL
  if (data.external_widget_url && typeof data.external_widget_url === 'string') {
    const urlPattern = /^https?:\/\/.+/;
    if (!urlPattern.test(data.external_widget_url)) {
      errors.push('External widget URL musí byť platná URL');
    }
  }
  
  // Logo býva nahraté do uploads, nie externá adresa. Pôvodná kontrola
  // prijímala len https://..., takže logo z media knižnice sa nedalo
  // uložiť vôbec.
  if (data.logo && typeof data.logo === 'string') {
    try {
      overObrazkovySubor(data.logo);
    } catch (chyba) {
      errors.push((chyba as Error).message);
    }
  }
  
  // Validácia farby
  if (data.farba && typeof data.farba === 'string') {
    const hexPattern = /^#[0-9A-F]{6}$/i;
    if (!hexPattern.test(data.farba)) {
      errors.push('Farba musí byť platný hex kód (#RRGGBB)');
    }
  }
  
  return errors;
};

/**
 * Overí ručne zadanú formu tímu.
 *
 * Forma je reťazec posledných zápasov, napríklad "WWDLW"
 * (W = výhra, D = remíza, L = prehra). Zadáva sa ručne najmä v ligách,
 * kde sa vedú len body a automatický prepočet nemá z čoho formu odvodiť.
 *
 * @returns text chyby, alebo null keď je hodnota v poriadku
 */
const overFormu = (hodnota: unknown): string | null => {
  if (hodnota === undefined || hodnota === null || hodnota === '') {
    return null;
  }

  if (typeof hodnota !== 'string') {
    return 'Forma musí byť text (napríklad "WWDLW")';
  }

  const normalizovana = hodnota.trim().toUpperCase();

  if (normalizovana.length > 10) {
    return 'Forma môže mať najviac 10 znakov';
  }

  if (!/^[WDL]+$/.test(normalizovana)) {
    return 'Forma smie obsahovať len znaky W (výhra), D (remíza) a L (prehra)';
  }

  return null;
};

/** Zjednotí zápis formy - veľké písmená bez okrajových medzier. */
const normalizujFormu = (hodnota: unknown): string | null => {
  if (hodnota === undefined || hodnota === null || hodnota === '') {
    return null;
  }
  return String(hodnota).trim().toUpperCase();
};

// Validácia ID ligy
const validateLigaId = (id: string) => {
  const ligaId = parseInt(id);
  if (isNaN(ligaId) || ligaId < 1) {
    return { valid: false, error: 'ID ligy musí byť kladné číslo' };
  }
  return { valid: true, id: ligaId };
};

// ===== ZÁKLADNÉ CRUD OPERÁCIE =====

// GET /api/leagues - Zoznam všetkých aktívnych líg (rozšírený)
export const getLeagues = async (req: Request, res: Response): Promise<void> => {
  try {
    const { typ, search, format, status, include_stats, include_table, limit = 50, offset = 0 } = req.query;

    // Základné filter podmienky
    const whereConditions: any = { aktivity: true };

    // Filter podľa typu
    if (typ && ['sutaz', 'pohar', 'priatelska'].includes(typ as string)) {
      whereConditions.typ = typ;
    }

    // Filter podľa formátu
    if (format && ['tabulka', 'turnaj', 'kombinovany'].includes(format as string)) {
      whereConditions.format = format;
    }

    // Filter podľa statusu (na základe dátumov)
    if (status) {
      const now = new Date();
      switch (status) {
        case 'upcoming':
          whereConditions.datum_start = { [Op.gt]: now };
          break;
        case 'active':
          whereConditions[Op.and] = [
            { [Op.or]: [{ datum_start: null }, { datum_start: { [Op.lte]: now } }] },
            { [Op.or]: [{ datum_koniec: null }, { datum_koniec: { [Op.gte]: now } }] }
          ];
          break;
        case 'finished':
          whereConditions.datum_koniec = { [Op.lt]: now };
          break;
      }
    }

    // Include nastavenia
    const includeOptions: any[] = [];
    
    if (include_table === 'true') {
      includeOptions.push({
        model: LigaTabulka,
        as: 'tabulka',
        include: [{
          model: Team,
          as: 'tim',
          attributes: ['id', 'nazov', 'logo'],
          required: false
        }],
        order: [['pozicia', 'ASC']],
        limit: 10, // Top 10 tímov pre prehľad
        required: false
      });
    }

    let leagues = await Liga.findAll({
      where: whereConditions,
      include: includeOptions,
      order: [['poradie', 'ASC'], ['nazov', 'ASC']],
      limit: parseInt(limit as string),
      offset: parseInt(offset as string)
    });

    // Vyhľadávanie v názve a sezóne
    if (search) {
      const searchTerm = (search as string).toLowerCase();
      leagues = leagues.filter(liga => 
        liga.nazov.toLowerCase().includes(searchTerm) ||
        liga.sezona.toLowerCase().includes(searchTerm) ||
        (liga.popis && liga.popis.toLowerCase().includes(searchTerm))
      );
    }

    // Pridanie štatistík ak je požadované
    const result = await Promise.all(leagues.map(async (liga) => {
      let ligaData: any = liga.toSafeJSON();
      
      if (include_stats === 'true') {
        try {
          const stats = await getLeagueStats(liga.id);
          ligaData.statistiky = stats;
        } catch (error) {
          console.warn(`Chyba pri načítaní štatistík pre ligu ${liga.id}:`, error);
          ligaData.statistiky = null;
        }
      }
      
      return ligaData;
    }));

    res.json({
      success: true,
      data: result,
      count: result.length,
      total: leagues.length, // Pre pagináciu
      message: `Nájdených ${result.length} líg`
    });

  } catch (error) {
    console.error('Chyba pri načítaní líg:', error);
    res.status(500).json({
      success: false,
      message: 'Chyba servera pri načítaní líg',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};

// GET /api/leagues/:id - Detail konkrétnej ligy (rozšírený)
export const getLeague = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { include_table, include_tournament, include_stats, include_matches } = req.query;

    const validation = validateLigaId(id);
    if (!validation.valid) {
      res.status(400).json({
        success: false,
        message: validation.error
      });
      return;
    }

    // Základné načítanie ligy
    let liga = await Liga.findByPk(validation.id);
    
    if (!liga) {
      res.status(404).json({
        success: false,
        message: 'Liga nenájdená'
      });
      return;
    }

    const result: any = liga.toSafeJSON();

    // Pridanie tabuľky ak je požadované
    if (include_table === 'true') {
      try {
        const tabulka = await getLeagueTable(validation.id!);
        result.tabulka = tabulka.map(t => t.toSafeJSON());
      } catch (error) {
        console.warn(`Chyba pri načítaní tabuľky pre ligu ${validation.id}:`, error);
        result.tabulka = [];
      }
    }

    // Pridanie turnaja ak je požadované
    if (include_tournament === 'true') {
    try {
      const turnaj = await getLeagueTournament(validation.id!);
      result.turnaj = turnaj ? turnaj.toSafeJSON() : null;
    } catch (error) {
        console.warn(`Chyba pri načítaní turnaja pre ligu ${validation.id}:`, error);
        result.turnaj = null;
      }
    }

    // Pridanie štatistík ak je požadované
    if (include_stats === 'true') {
      try {
        const stats = await getLeagueStats(validation.id!);
        result.statistiky = stats;
      } catch (error) {
        console.warn(`Chyba pri načítaní štatistík pre ligu ${validation.id}:`, error);
        result.statistiky = null;
      }
    }

    // Pridanie posledných zápasov ak je požadované
    if (include_matches === 'true') {
      try {
        const { getMatchesByLeague } = require('../models');
        const zapasy = await getMatchesByLeague(validation.id, 10);
        result.posledne_zapasy = zapasy.map((z: any) => z.toSafeJSON());
      } catch (error) {
        console.warn(`Chyba pri načítaní zápasov pre ligu ${validation.id}:`, error);
        result.posledne_zapasy = [];
      }
    }

    res.json({
      success: true,
      data: result,
      message: 'Liga úspešne načítaná'
    });

  } catch (error) {
    console.error('Chyba pri načítaní ligy:', error);
    res.status(500).json({
      success: false,
      message: 'Chyba servera pri načítaní ligy',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};

// POST /api/leagues - Vytvorenie novej ligy (rozšírené)
export const createLeague = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('📝 Vytváranie novej ligy:', req.body);

    const validationErrors = validateLigaData(req.body);
    if (validationErrors.length > 0) {
      res.status(400).json({
        success: false,
        message: 'Validačné chyby',
        errors: validationErrors
      });
      return;
    }

    // Kontrola duplicity názvu a sezóny
    const existingLeague = await Liga.findOne({
      where: {
        nazov: req.body.nazov,
        sezona: req.body.sezona,
        aktivity: true
      }
    });

    if (existingLeague) {
      res.status(409).json({
        success: false,
        message: `Liga "${req.body.nazov}" pre sezónu ${req.body.sezona} už existuje`
      });
      return;
    }

    // Príprava dát pre vytvorenie
    const createData: any = {
      nazov: req.body.nazov,
      sezona: req.body.sezona,
      typ: req.body.typ,
      popis: req.body.popis,
      external_widget_url: req.body.external_widget_url,
      logo: req.body.logo,
      farba: req.body.farba,
      poradie: req.body.poradie,
      // Väzby: náš tím, ktorého sa súťaž týka, a sezóna.
      // Bez nich by sa hodnoty z tela ticho zahodili, lebo liga sa
      // skladá z vymenovaného zoznamu polí.
      tim_id: req.body.tim_id || null,
      sezona_id: req.body.sezona_id || null,

      // Nové rozšírené polia
      datum_start: req.body.datum_start,
      datum_koniec: req.body.datum_koniec,
      format: req.body.format || 'tabulka',
      pocet_timov: req.body.pocet_timov,
      body_za_vitazstvo: req.body.body_za_vitazstvo || 3,
      body_za_remizy: req.body.body_za_remizy || 1,
      body_za_prehru: req.body.body_za_prehru || 0,
      auto_update_tabulka: req.body.auto_update_tabulka !== false, // Default true
      zobrazit_formu: req.body.zobrazit_formu !== false, // Default true
      min_zapasov: req.body.min_zapasov || 0,
      turnaj_typ: req.body.turnaj_typ,
      turnaj_pocet_postupujucich: req.body.turnaj_pocet_postupujucich,
      external_sync: req.body.external_sync || false
    };

    console.log('📊 Dáta pre vytvorenie ligy:', createData);

    const newLiga = await Liga.create(createData);

    // Vytvorenie turnaja ak je potrebný
    if (newLiga.format === 'turnaj' || newLiga.format === 'kombinovany') {
      if (!newLiga.turnaj_typ) {
        res.status(400).json({
        success: false,
        message: 'Pre turnajový formát je potrebné zvoliť typ turnaja'
      });
      return;
    }

      try {
        const turnajData = {
          liga_id: newLiga.id,
          nazov: `${newLiga.nazov} - Turnaj`,
          typ: newLiga.turnaj_typ,
          pocet_timov: newLiga.pocet_timov || 8,
          pocet_postupujucich: newLiga.turnaj_pocet_postupujucich,
          celkove_fazy: [],
          aktualna_faza: 'priprova',
          status: 'pripravuje' as const,
          ma_tretie_miesto: true
        };

        await LigaTurnaj.create(turnajData);
        console.log('🏆 Turnaj vytvorený pre ligu:', newLiga.id);
      } catch (turnajError) {
        console.warn('⚠️ Chyba pri vytváraní turnaja:', turnajError);
        // Pokračujeme aj bez turnaja
      }
    }

    // Načítanie vytvorenej ligy s rozšírenými dátami
    const createdLiga = await Liga.findByPk(newLiga.id);
    
    res.status(201).json({
      success: true,
      data: createdLiga!.toSafeJSON(),
      message: 'Liga úspešne vytvorená'
    });

  } catch (error) {
    console.error('Chyba pri vytváraní ligy:', error);
    res.status(500).json({
      success: false,
      message: 'Chyba servera pri vytváraní ligy',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};

// PUT /api/leagues/:id - Aktualizácia existujúcej ligy (rozšírené)
export const updateLeague = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    console.log('✏️ Aktualizácia ligy:', id, req.body);

    const validation = validateLigaId(id);
    if (!validation.valid) {
      res.status(400).json({
        success: false,
        message: validation.error
      });
      return;
    }

    const validationErrors = validateLigaData(req.body);
    if (validationErrors.length > 0) {
      res.status(400).json({
        success: false,
        message: 'Validačné chyby',
        errors: validationErrors
      });
      return;
    }

    const liga = await Liga.findByPk(validation.id);
    if (!liga) {
      res.status(404).json({
        success: false,
        message: 'Liga nenájdená'
      });
      return;
    }

    // Kontrola duplicity názvu a sezóny (okrem aktuálnej ligy)
    if (req.body.nazov || req.body.sezona) {
      const existingLeague = await Liga.findOne({
        where: {
          nazov: req.body.nazov || liga.nazov,
          sezona: req.body.sezona || liga.sezona,
          aktivity: true,
          id: { [Op.ne]: validation.id }
        }
      });

      if (existingLeague) {
        res.status(409).json({
          success: false,
          message: `Liga "${req.body.nazov || liga.nazov}" pre sezónu ${req.body.sezona || liga.sezona} už existuje`
        });
        return;
      }
    }

    // Príprava dát pre aktualizáciu
    const updateData: any = {};
    
    // Základné polia
    if (req.body.nazov !== undefined) updateData.nazov = req.body.nazov;
    if (req.body.sezona !== undefined) updateData.sezona = req.body.sezona;
    if (req.body.typ !== undefined) updateData.typ = req.body.typ;
    if (req.body.popis !== undefined) updateData.popis = req.body.popis;
    if (req.body.external_widget_url !== undefined) updateData.external_widget_url = req.body.external_widget_url;
    if (req.body.logo !== undefined) updateData.logo = req.body.logo;
    if (req.body.farba !== undefined) updateData.farba = req.body.farba;
    if (req.body.poradie !== undefined) updateData.poradie = req.body.poradie;
    
    // Rozšírené polia
    if (req.body.datum_start !== undefined) updateData.datum_start = req.body.datum_start;
    if (req.body.datum_koniec !== undefined) updateData.datum_koniec = req.body.datum_koniec;
    if (req.body.format !== undefined) updateData.format = req.body.format;
    if (req.body.pocet_timov !== undefined) updateData.pocet_timov = req.body.pocet_timov;
    if (req.body.body_za_vitazstvo !== undefined) updateData.body_za_vitazstvo = req.body.body_za_vitazstvo;
    if (req.body.body_za_remizy !== undefined) updateData.body_za_remizy = req.body.body_za_remizy;
    if (req.body.body_za_prehru !== undefined) updateData.body_za_prehru = req.body.body_za_prehru;
    if (req.body.auto_update_tabulka !== undefined) updateData.auto_update_tabulka = req.body.auto_update_tabulka;
    if (req.body.zobrazit_formu !== undefined) updateData.zobrazit_formu = req.body.zobrazit_formu;
    if (req.body.min_zapasov !== undefined) updateData.min_zapasov = req.body.min_zapasov;
    if (req.body.turnaj_typ !== undefined) updateData.turnaj_typ = req.body.turnaj_typ;
    if (req.body.turnaj_pocet_postupujucich !== undefined) updateData.turnaj_pocet_postupujucich = req.body.turnaj_pocet_postupujucich;
    if (req.body.external_sync !== undefined) updateData.external_sync = req.body.external_sync;

    console.log('📊 Dáta pre aktualizáciu:', updateData);

    await Liga.update(updateData, {
      where: { id: validation.id }
    });

    // Spracovanie zmien formátu ligy
    const formatChanged = req.body.format && req.body.format !== liga.format;
    
    if (formatChanged) {
      // Ak sa zmenil formát na turnaj, vytvoríme turnaj
      if ((req.body.format === 'turnaj' || req.body.format === 'kombinovany') && req.body.turnaj_typ) {
        try {
          // Kontrola či turnaj už existuje
          const existujuciTurnaj = await LigaTurnaj.findOne({
            where: { liga_id: validation.id, aktivity: true }
          });

          if (!existujuciTurnaj) {
            const turnajData = {
              liga_id: validation.id!, // Pridaj ! na koniec
              nazov: `${updateData.nazov || liga.nazov} - Turnaj`,
              typ: req.body.turnaj_typ,
              pocet_timov: req.body.pocet_timov || liga.pocet_timov || 8,
              pocet_postupujucich: req.body.turnaj_pocet_postupujucich || liga.turnaj_pocet_postupujucich,
              celkove_fazy: [],
              aktualna_faza: 'priprova',
              status: 'pripravuje' as const,
              ma_tretie_miesto: true
            };

            await LigaTurnaj.create(turnajData);
            console.log('🏆 Nový turnaj vytvorený pre ligu:', validation.id);
          }
        } catch (turnajError) {
          console.warn('⚠️ Chyba pri vytváraní turnaja:', turnajError);
        }
      }
      
      // Ak sa zmenil formát z turnaja na tabuľku, deaktivujeme turnaj
      if (req.body.format === 'tabulka' && liga.format !== 'tabulka') {
        try {
          await LigaTurnaj.update(
            { aktivity: false },
            { where: { liga_id: validation.id } }
          );
          console.log('🏆 Turnaj deaktivovaný pre ligu:', validation.id);
        } catch (turnajError) {
          console.warn('⚠️ Chyba pri deaktivácii turnaja:', turnajError);
        }
      }
    }

    // Načítanie aktualizovanej ligy
    const updatedLiga = await Liga.findByPk(validation.id);
    
    res.json({
      success: true,
      data: updatedLiga!.toSafeJSON(),
      message: 'Liga úspešne aktualizovaná'
    });

  } catch (error) {
    console.error('Chyba pri aktualizácii ligy:', error);
    res.status(500).json({
      success: false,
      message: 'Chyba servera pri aktualizácii ligy',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};

// DELETE /api/leagues/:id - Soft delete ligy
export const deleteLeague = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    console.log('🗑️ Mazanie ligy:', id);

    const validation = validateLigaId(id);
    if (!validation.valid) {
      res.status(400).json({
        success: false,
        message: validation.error
      });
      return;
    }

    const liga = await Liga.findByPk(validation.id);
    if (!liga) {
      res.status(404).json({
        success: false,
        message: 'Liga nenájdená'
      });
      return;
    }

    // Kontrola či má liga zápasy
    const { getMatchesByLeague } = require('../models');
    const zapasy = await getMatchesByLeague(validation.id, 1);
    
    if (zapasy.length > 0) {
      res.status(409).json({
        success: false,
        message: 'Nemožno vymazať ligu, ktorá má zápasy. Najprv vymažte všetky zápasy.'
      });
      return;
    }

    // Soft delete - označenie ako neaktívna
    await Liga.update(
      { aktivity: false },
      { where: { id: validation.id } }
    );

    // Deaktivácia turnaja ak existuje
    await LigaTurnaj.update(
      { aktivity: false },
      { where: { liga_id: validation.id } }
    );

    // Vymazanie tabuľky
    await LigaTabulka.destroy({
      where: { liga_id: validation.id }
    });

    res.json({
      success: true,
      message: 'Liga úspešne vymazaná'
    });

  } catch (error) {
    console.error('Chyba pri mazaní ligy:', error);
    res.status(500).json({
      success: false,
      message: 'Chyba servera pri mazaní ligy',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};

// ===== NOVÉ ENDPOINTY PRE TABUĽKY A TURNAJE =====

// GET /api/leagues/:id/table - Získanie tabuľky ligy
export const getLeagueTableEndpoint = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { include_inactive = 'false' } = req.query;

    const validation = validateLigaId(id);
    if (!validation.valid) {
      res.status(400).json({
        success: false,
        message: validation.error
      });
      return;
    }

    const tabulka = await getLeagueTable(validation.id!, include_inactive === 'true');
    
    res.json({
      success: true,
      data: tabulka.map(t => t.toSafeJSON()),
      count: tabulka.length,
      message: 'Tabuľka úspešne načítaná'
    });

  } catch (error) {
    console.error('Chyba pri načítaní tabuľky:', error);
    res.status(500).json({
      success: false,
      message: 'Chyba servera pri načítaní tabuľky',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};

// POST /api/leagues/:id/table/recalculate - Prepočítanie tabuľky
export const recalculateLeagueTableEndpoint = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const validation = validateLigaId(id);
    if (!validation.valid) {
      res.status(400).json({
        success: false,
        message: validation.error
      });
      return;
    }

    const tabulka = await recalculateLeagueTable(validation.id!);
    
    res.json({
      success: true,
      data: tabulka.map(t => t.toSafeJSON()),
      message: 'Tabuľka úspešne prepočítaná'
    });

  } catch (error) {
    console.error('Chyba pri prepočítaní tabuľky:', error);
    
    let message = 'Chyba servera pri prepočítaní tabuľky';
    let status = 500;
    
    if (error instanceof Error) {
      if (error.message.includes('automatická aktualizácia')) {
        message = error.message;
        status = 400;
      }
    }
    
    res.status(status).json({
      success: false,
      message,
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};

// PUT /api/leagues/:id/table - Manuálna úprava tabuľky
export const updateLeagueTableEndpoint = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { tabulka_data } = req.body;

    console.log('🔄 Aktualizácia tabuľky pre ligu ID:', id);
    console.log('📊 Prijaté dáta:', tabulka_data);

    const validation = validateLigaId(id);
    if (!validation.valid) {
      res.status(400).json({
        success: false,
        message: validation.error
      });
      return;
    }

    if (!Array.isArray(tabulka_data) || tabulka_data.length === 0) {
      res.status(400).json({
        success: false,
        message: 'Neplatné dáta tabuľky'
      });
      return;
    }

    // Rozdelenie na existujúce a nové záznamy
    const existingRecords = tabulka_data.filter(item => item.id && !String(item.id).startsWith('temp-'));
    const newRecords = tabulka_data.filter(item => !item.id || String(item.id).startsWith('temp-'));

    console.log(`📝 Existujúce záznamy: ${existingRecords.length}`);
    console.log(`🆕 Nové záznamy: ${newRecords.length}`);

    // Overenie vstupov PRED otvorením transakcie - zbytočne nezačíname
    // zápis, o ktorom vopred vieme, že skončí výnimkou.
    const chybyVstupu: string[] = [];

    for (const item of existingRecords) {
      if (!item.pozicia) {
        chybyVstupu.push(`Existujúci záznam ID ${item.id} musí mať pozíciu`);
      }
      const chybaFormy = overFormu(item.forma);
      if (chybaFormy) chybyVstupu.push(`Záznam ID ${item.id}: ${chybaFormy}`);
    }

    for (const item of newRecords) {
      if (!item.pozicia) {
        chybyVstupu.push('Nový záznam musí mať pozíciu');
      }
      if (!item.tim_id && !item.custom_tim_nazov) {
        chybyVstupu.push('Nový záznam musí mať buď tim_id alebo custom_tim_nazov');
      }
      const chybaFormy = overFormu(item.forma);
      if (chybaFormy) chybyVstupu.push(`Nový záznam: ${chybaFormy}`);
    }

    if (chybyVstupu.length > 0) {
      res.status(400).json({
        success: false,
        message: 'Neplatné dáta tabuľky',
        errors: chybyVstupu
      });
      return;
    }

    // Celý zápis beží v JEDNEJ TRANSAKCII. Pôvodne šlo o Promise.all nad
    // samostatnými dotazmi: keď jeden padol, ostatné už boli zapísané
    // a tabuľka zostala rozbitá v polovici. Transakcia navyše umožňuje
    // výmenu poradia - odložený constraint liga_tabulky_liga_pozicia sa
    // vyhodnotí až pri COMMIT-e, takže medzistav s dvoma rovnakými
    // pozíciami je v poriadku.
    //
    // Operácie idú ZA SEBOU, nie cez Promise.all: transakcia drží jedno
    // spojenie a súbežné dotazy nad ním si navzájom prekrývajú stav.
    await sequelize.transaction(async (transakcia) => {
      // 1. AKTUALIZÁCIA EXISTUJÚCICH ZÁZNAMOV
      for (const item of existingRecords as any[]) {
        const updateData: any = {
          pozicia: item.pozicia,
          manualne_upravene: true
        };

        // Voliteľné polia
        if (item.body !== undefined) updateData.body = item.body;
        if (item.zapasy !== undefined) updateData.zapasy = item.zapasy;
        if (item.vitazstva !== undefined) updateData.vitazstva = item.vitazstva;
        if (item.remizy !== undefined) updateData.remizy = item.remizy;
        if (item.prehry !== undefined) updateData.prehry = item.prehry;
        if (item.goly_za !== undefined) updateData.goly_za = item.goly_za;
        if (item.goly_proti !== undefined) updateData.goly_proti = item.goly_proti;
        if (item.penalizacne_body !== undefined) updateData.penalizacne_body = item.penalizacne_body;
        if (item.bonus_body !== undefined) updateData.bonus_body = item.bonus_body;
        if (item.poznamky !== undefined) updateData.poznamky = item.poznamky;
        // Forma a séria sa dajú zadať ručne - pri lige, kde sa vedú len
        // body, ich nemá z čoho dopočítať automatický prepočet.
        if (item.forma !== undefined) updateData.forma = normalizujFormu(item.forma);
        if (item.serie_zapasov !== undefined) updateData.serie_zapasov = item.serie_zapasov;
        if (item.custom_tim_nazov !== undefined) updateData.custom_tim_nazov = item.custom_tim_nazov;
        if (item.custom_tim_logo !== undefined) updateData.custom_tim_logo = item.custom_tim_logo || null;

        // Automatický výpočet gólovej bilancie
        if (item.goly_za !== undefined && item.goly_proti !== undefined) {
          updateData.goly_rozdiel = item.goly_za - item.goly_proti;
        }

        console.log(`🔄 Aktualizujem záznam ID ${item.id}:`, updateData);

        await LigaTabulka.update(updateData, {
          where: { id: item.id, liga_id: validation.id },
          transaction: transakcia
        });
      }

      // 2. VYTVORENIE NOVÝCH ZÁZNAMOV
      for (const item of newRecords as any[]) {
        const createData: any = {
          liga_id: validation.id,
          pozicia: item.pozicia,
          body: item.body || 0,
          zapasy: item.zapasy || 0,
          vitazstva: item.vitazstva || 0,
          remizy: item.remizy || 0,
          prehry: item.prehry || 0,
          goly_za: item.goly_za || 0,
          goly_proti: item.goly_proti || 0,
          goly_rozdiel: (item.goly_za || 0) - (item.goly_proti || 0),
          manualne_upravene: true
        };

        // Tím z databázy alebo custom názov
        if (item.tim_id) {
          createData.tim_id = item.tim_id;
        } else {
          createData.custom_tim_nazov = item.custom_tim_nazov;
          // Externý tím má vlastné logo - náš ho má na sebe
          createData.custom_tim_logo = item.custom_tim_logo || null;
        }

        // Voliteľné polia
        if (item.penalizacne_body !== undefined) createData.penalizacne_body = item.penalizacne_body;
        if (item.bonus_body !== undefined) createData.bonus_body = item.bonus_body;
        if (item.poznamky !== undefined) createData.poznamky = item.poznamky;
        if (item.forma !== undefined) createData.forma = normalizujFormu(item.forma);
        if (item.serie_zapasov !== undefined) createData.serie_zapasov = item.serie_zapasov;

        console.log('🆕 Vytváram nový záznam:', createData);

        await LigaTabulka.create(createData, { transaction: transakcia });
      }
    });

    // Načítanie aktualizovanej tabuľky
    console.log('📊 Načítavam aktualizovanú tabuľku...');
    const updatedTable = await getLeagueTable(validation.id!);
    
    console.log(`✅ Tabuľka úspešne aktualizovaná: ${updatedTable.length} záznamov`);

    res.json({
      success: true,
      data: updatedTable.map(t => t.toSafeJSON()),
      count: updatedTable.length,
      message: `Tabuľka úspešne aktualizovaná (${existingRecords.length} upravených, ${newRecords.length} nových)`
    });

  } catch (error: any) {
    // Neplatná hodnota (napríklad nezmyselné logo) je chyba vstupu,
    // nie servera - vracala sa ako 500 s technickou hláškou.
    if (error?.name === 'SequelizeValidationError') {
      res.status(400).json({
        success: false,
        message: 'Neplatné údaje v tabuľke',
        errors: error.errors.map((e: any) => e.message),
      });
      return;
    }

    console.error('❌ Chyba pri aktualizácii tabuľky:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Chyba servera pri aktualizácii tabuľky',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};

// GET /api/leagues/:id/tournament - Získanie turnaja ligy
export const getLeagueTournamentEndpoint = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const validation = validateLigaId(id);
    if (!validation.valid) {
      res.status(400).json({
        success: false,
        message: validation.error
      });
      return;
    }

    const turnaj = await getLeagueTournament(validation.id!);
    
    if (!turnaj) {
      res.status(404).json({
        success: false,
        message: 'Turnaj pre túto ligu neexistuje'
      });
      return;
    }

    res.json({
      success: true,
      data: turnaj.toSafeJSON(),
      message: 'Turnaj úspešne načítaný'
    });

  } catch (error) {
    console.error('Chyba pri načítaní turnaja:', error);
    res.status(500).json({
      success: false,
      message: 'Chyba servera pri načítaní turnaja',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};

// GET /api/leagues/:id/stats - Získanie štatistík ligy
export const getLeagueStatsEndpoint = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const validation = validateLigaId(id);
    if (!validation.valid) {
      res.status(400).json({
        success: false,
        message: validation.error
      });
      return;
    }

    const stats = await getLeagueStats(validation.id!);
    
    res.json({
      success: true,
      data: stats,
      message: 'Štatistiky úspešne načítané'
    });

  } catch (error) {
    console.error('Chyba pri načítaní štatistík:', error);
    res.status(500).json({
      success: false,
      message: 'Chyba servera pri načítaní štatistík',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};

// GET /api/leagues/:id/overview - Kompletný prehľad ligy
export const getLeagueOverviewEndpoint = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const validation = validateLigaId(id);
    if (!validation.valid) {
      res.status(400).json({
        success: false,
        message: validation.error
      });
      return;
    }

    const overview = await getLeagueOverview(validation.id!);
    
    res.json({
      success: true,
      data: overview,
      message: 'Prehľad ligy úspešne načítaný'
    });

  } catch (error) {
    console.error('Chyba pri načítaní prehľadu ligy:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Chyba servera pri načítaní prehľadu ligy',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};

// ===== IMPORT/EXPORT ENDPOINTY =====

// GET /api/leagues/:id/export - Export tabuľky
export const exportLeagueTableEndpoint = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { format = 'json' } = req.query;

    const validation = validateLigaId(id);
    if (!validation.valid) {
      res.status(400).json({
        success: false,
        message: validation.error
      });
      return;
    }

    if (!['json', 'csv'].includes(format as string)) {
      res.status(400).json({
        success: false,
        message: 'Podporované formáty: json, csv'
      });
      return;
    }

    const exportData = await exportLeagueTable(validation.id!, format as 'json' | 'csv');
    
    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=liga_${id}_tabulka.csv`);
      res.send(exportData);
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename=liga_${id}_tabulka.json`);
      res.send(exportData);
    }

  } catch (error) {
    console.error('Chyba pri exporte tabuľky:', error);
    res.status(500).json({
      success: false,
      message: 'Chyba servera pri exporte tabuľky',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};

// POST /api/leagues/:id/import - Import tabuľky
export const importLeagueTableEndpoint = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { data, format = 'json' } = req.body;

    const validation = validateLigaId(id);
    if (!validation.valid) {
      res.status(400).json({
        success: false,
        message: validation.error
      });
      return;
    }

    if (!data) {
      res.status(400).json({
        success: false,
        message: 'Dáta na import sú povinné'
      });
      return;
    }

    const importedTable = await importLeagueTable(validation.id!, data, format);
    
    res.json({
      success: true,
      data: importedTable.map(t => t.toSafeJSON()),
      message: 'Tabuľka úspešne importovaná'
    });

  } catch (error) {
    console.error('Chyba pri importe tabuľky:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Chyba servera pri importe tabuľky',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};

/**
 * DELETE /api/leagues/:id/table/:rowId
 *
 * Odstráni jeden tím z tabuľky.
 *
 * PREČO SAMOSTATNE: PUT tabuľky riadok, ktorý mu klient nepošle, ticho
 * ponechá. Tím sa teda z tabuľky nedal odstrániť vôbec.
 */
export const deleteLeagueTableRowEndpoint = async (req: Request, res: Response): Promise<void> => {
  try {
    const validation = validateLigaId(req.params.id);
    if (!validation.valid) {
      res.status(400).json({ success: false, message: validation.error });
      return;
    }

    const riadokId = Number(req.params.rowId);
    if (!Number.isInteger(riadokId) || riadokId < 1) {
      res.status(400).json({ success: false, message: 'ID riadku musí byť kladné celé číslo' });
      return;
    }

    const riadok = await LigaTabulka.findOne({
      where: { id: riadokId, liga_id: validation.id },
    });

    if (!riadok) {
      res.status(404).json({ success: false, message: 'Riadok v tabuľke tejto ligy nebol nájdený' });
      return;
    }

    const nazov = riadok.getTimNazov();
    const uvolnenaPozicia = riadok.pozicia;

    // Po odstránení posunieme zvyšné tímy nahor, aby v tabuľke
    // nezostala diera. Celé v transakcii kvôli odloženému constraintu
    // na dvojici (liga_id, pozicia).
    await sequelize.transaction(async (transakcia) => {
      await riadok.destroy({ transaction: transakcia });

      const nizsie = await LigaTabulka.findAll({
        where: { liga_id: validation.id, pozicia: { [Op.gt]: uvolnenaPozicia } },
        order: [['pozicia', 'ASC']],
        transaction: transakcia,
      });

      for (const r of nizsie) {
        await r.update({ pozicia: r.pozicia - 1 }, { transaction: transakcia });
      }
    });

    const tabulka = await getLeagueTable(validation.id!);

    res.json({
      success: true,
      data: tabulka.map((t) => t.toSafeJSON()),
      message: `Tím ${nazov} bol odstránený z tabuľky`,
    });
  } catch (error) {
    console.error('Chyba pri mazaní riadku tabuľky:', error);
    res.status(500).json({ success: false, message: 'Chyba servera pri mazaní riadku tabuľky' });
  }
};

/**
 * POST /api/leagues/:id/duplicate
 *
 * Vytvorí kópiu ligy pre novú sezónu aj s tímami v tabuľke.
 *
 * PREČO: požiadavka hovorí „Všetky ligy sa dajú duplikovať na novú
 * sezónu. Tak aby človek nemusel každú sezónu prepisovať všetky tímy.
 * Pri duplikovaní sa opýta, či zachovať aj body alebo iba tímy."
 *
 * Telo: { "sezona": "2027/2028", "sezona_id": 4, "zachovat_body": false }
 */
export const duplicateLeagueEndpoint = async (req: Request, res: Response): Promise<void> => {
  try {
    const validation = validateLigaId(req.params.id);
    if (!validation.valid) {
      res.status(400).json({ success: false, message: validation.error });
      return;
    }

    const povodna = await Liga.findOne({ where: { id: validation.id, aktivity: true } });
    if (!povodna) {
      res.status(404).json({ success: false, message: 'Liga nebola nájdená' });
      return;
    }

    const novaSezona = String(req.body.sezona || '').trim();
    if (novaSezona.length < 4) {
      res.status(400).json({
        success: false,
        message: 'Uveďte sezónu novej ligy, napríklad "2027/2028"',
      });
      return;
    }

    // Bez výslovného súhlasu sa body neprenášajú - nová sezóna sa
    // začína od nuly, čo je bežnejší prípad
    const zachovatBody = req.body.zachovat_body === true;

    const duplicitna = await Liga.findOne({
      where: { nazov: povodna.nazov, sezona: novaSezona, aktivity: true },
    });
    if (duplicitna) {
      res.status(409).json({
        success: false,
        message: `Liga ${povodna.nazov} pre sezónu ${novaSezona} už existuje`,
      });
      return;
    }

    const povodnaTabulka = await LigaTabulka.findAll({
      where: { liga_id: povodna.id },
      order: [['pozicia', 'ASC']],
    });

    const novaLiga = await sequelize.transaction(async (transakcia) => {
      const nova = await Liga.create(
        {
          nazov: povodna.nazov,
          sezona: novaSezona,
          sezona_id: req.body.sezona_id || null,
          tim_id: povodna.tim_id,
          typ: povodna.typ,
          popis: povodna.popis,
          logo: povodna.logo,
          farba: povodna.farba,
          poradie: povodna.poradie,
          format: povodna.format,
          pocet_timov: povodna.pocet_timov,
          body_za_vitazstvo: povodna.body_za_vitazstvo,
          body_za_remizy: povodna.body_za_remizy,
          body_za_prehru: povodna.body_za_prehru,
          auto_update_tabulka: povodna.auto_update_tabulka,
          zobrazit_formu: povodna.zobrazit_formu,
          min_zapasov: povodna.min_zapasov,
          turnaj_typ: povodna.turnaj_typ,
          turnaj_pocet_postupujucich: povodna.turnaj_pocet_postupujucich,
        } as any,
        { transaction: transakcia }
      );

      for (const riadok of povodnaTabulka) {
        await LigaTabulka.create(
          {
            liga_id: nova.id,
            tim_id: riadok.tim_id,
            custom_tim_nazov: riadok.custom_tim_nazov,
            custom_tim_logo: riadok.custom_tim_logo,
            pozicia: riadok.pozicia,
            // Pri "iba tímy" sa všetky štatistiky nulujú
            body: zachovatBody ? riadok.body : 0,
            zapasy: zachovatBody ? riadok.zapasy : 0,
            vitazstva: zachovatBody ? riadok.vitazstva : 0,
            remizy: zachovatBody ? riadok.remizy : 0,
            prehry: zachovatBody ? riadok.prehry : 0,
            goly_za: zachovatBody ? riadok.goly_za : 0,
            goly_proti: zachovatBody ? riadok.goly_proti : 0,
            goly_rozdiel: zachovatBody ? riadok.goly_rozdiel : 0,
            forma: zachovatBody ? riadok.forma : null,
            serie_zapasov: zachovatBody ? riadok.serie_zapasov : null,
            penalizacne_body: zachovatBody ? riadok.penalizacne_body : 0,
            bonus_body: zachovatBody ? riadok.bonus_body : 0,
            manualne_upravene: true,
          } as any,
          { transaction: transakcia }
        );
      }

      return nova;
    });

    const novaTabulka = await getLeagueTable(novaLiga.id);

    res.status(201).json({
      success: true,
      data: {
        liga: novaLiga.toSafeJSON(),
        tabulka: novaTabulka.map((t) => t.toSafeJSON()),
      },
      message:
        `Liga ${novaLiga.nazov} bola duplikovaná na sezónu ${novaSezona} ` +
        `(${povodnaTabulka.length} tímov, ${zachovatBody ? 'aj s bodmi' : 'bez bodov'})`,
    });
  } catch (error) {
    console.error('Chyba pri duplikovaní ligy:', error);
    res.status(500).json({ success: false, message: 'Chyba servera pri duplikovaní ligy' });
  }
};

