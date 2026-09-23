// backend/src/controllers/staffController.ts
// Controller pre CRUD operácie realizačného tímu - FÁZA 3

import { Request, Response } from 'express';
import { odpovedzNaChybuModelu } from '../utils/odpoved';
import Staff from '../models/Staff';
import Sezona from '../models/Sezona';
import Team from '../models/Team';

// ===== HELPER FUNCTIONS =====

// Validácia dát člena realizačného tímu
const validateStaffData = (data: any) => {
  const errors: string[] = [];
  
  if (!data.meno || typeof data.meno !== 'string' || data.meno.length < 2 || data.meno.length > 50) {
    errors.push('Meno musí mať 2-50 znakov');
  }
  
  if (!data.priezvisko || typeof data.priezvisko !== 'string' || data.priezvisko.length < 2 || data.priezvisko.length > 50) {
    errors.push('Priezvisko musí mať 2-50 znakov');
  }
  
  if (!data.funkcia || typeof data.funkcia !== 'string' || data.funkcia.length < 2) {
    errors.push('Funkcia je povinná');
  }
  
  if (data.email && (!data.email.includes('@') || data.email.length > 255)) {
    errors.push('Neplatný email');
  }
  
  if (data.telefon && (data.telefon.length < 9 || data.telefon.length > 20)) {
    errors.push('Telefón musí mať 9-20 znakov');
  }
  
  if (data.datum_narodenia) {
    const birthDate = new Date(data.datum_narodenia);
    const today = new Date();
    if (birthDate >= today) {
      errors.push('Dátum narodenia nemôže byť v budúcnosti');
    }
  }
  
  if (data.tim_id && isNaN(parseInt(data.tim_id))) {
    errors.push('Neplatné ID tímu');
  }
  
  if (data.poradie && (isNaN(parseInt(data.poradie)) || parseInt(data.poradie) < 0)) {
    errors.push('Poradie musí byť nezáporné číslo');
  }
  
  return errors;
};

const validateStaffId = (id: string) => {
  const staffId = parseInt(id);
  if (isNaN(staffId) || staffId < 1) {
    return { valid: false, error: 'ID člena realizačného tímu musí byť kladné číslo' };
  }
  return { valid: true, id: staffId };
};

// ===== VEREJNÉ API ENDPOINTS =====

// GET /api/staff - Zoznam všetkých členov realizačného tímu
export const getStaff = async (req: Request, res: Response): Promise<void> => {
  try {
    const { tim_id, funkcia, search, include_team, klubovi } = req.query;

    // Základné filter podmienky
    const whereConditions: any = { aktivity: true };

    // Filter podľa tímu
    if (tim_id) {
      const teamId = parseInt(tim_id as string);
      if (!isNaN(teamId)) {
        whereConditions.tim_id = teamId;
      }
    }

    // Filter klubových členov (bez priradenia k tímu)
    if (klubovi === 'true') {
      whereConditions.tim_id = null;
    }

    // Načítame všetkých členov realizačného tímu
    let staff = await Staff.findAll({
      where: whereConditions,
      order: [['tim_id', 'ASC'], ['poradie', 'ASC']]
    });

    // Filter funkcie v JS (pre podobnosť)
    if (funkcia) {
      const funkciaTerm = (funkcia as string).toLowerCase();
      staff = staff.filter((member: any) => 
        member.funkcia.toLowerCase().includes(funkciaTerm)
      );
    }

    // Filter vyhľadávania v mene/priezvisku
    if (search) {
      const searchTerm = (search as string).toLowerCase();
      staff = staff.filter((member: any) => 
        member.meno.toLowerCase().includes(searchTerm) ||
        member.priezvisko.toLowerCase().includes(searchTerm) ||
        member.getFullName().toLowerCase().includes(searchTerm)
      );
    }

    // Voliteľne pridáme informácie o tíme
    let result;
    if (include_team === 'true') {
      // Potrebujeme načítať tímy pre každého člena
      const staffWithTeams = [];
      for (const member of staff) {
        const memberData = (member as any).toSafeJSON();
        
        if ((member as any).tim_id) {
          const team = await Team.findByPk((member as any).tim_id);
          if (team) {
            memberData.tim = (team as any).toSafeJSON();
          }
        }
        
        staffWithTeams.push(memberData);
      }
      result = staffWithTeams;
    } else {
      result = staff.map((member: any) => member.toSafeJSON());
    }

    res.json({
      success: true,
      data: result,
      message: `Nájdených ${staff.length} členov realizačného tímu`
    });

  } catch (error) {
    console.error('Chyba pri načítaní realizačného tímu:', error);
    res.status(500).json({
      success: false,
      message: 'Chyba servera pri načítaní realizačného tímu',
      debug: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
};

// GET /api/staff/:id - Detail konkrétneho člena realizačného tímu
export const getStaffById = async (req: Request, res: Response): Promise<void> => {
  try {
    const validation = validateStaffId(req.params.id);
    if (!validation.valid) {
      res.status(400).json({
        success: false,
        message: validation.error
      });
      return;
    }

    const staffId = validation.id!;
    const { include_team } = req.query;

    const staffMember = await Staff.findOne({
      where: { id: staffId, aktivity: true }
    });

    if (!staffMember) {
      res.status(404).json({
        success: false,
        message: 'Člen realizačného tímu nebol nájdený'
      });
      return;
    }

    let result = (staffMember as any).toSafeJSON();

    // Voliteľne pridáme informácie o tíme
    if (include_team === 'true' && (staffMember as any).tim_id) {
      const team = await Team.findByPk((staffMember as any).tim_id);
      if (team) {
        result.tim = (team as any).toSafeJSON();
      }
    }

    res.json({
      success: true,
      data: result,
      message: 'Člen realizačného tímu úspešne načítaný'
    });

  } catch (error) {
    console.error('Chyba pri načítaní člena realizačného tímu:', error);
    res.status(500).json({
      success: false,
      message: 'Chyba servera pri načítaní člena realizačného tímu',
      debug: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
};

// ===== ADMIN API ENDPOINTS =====


/**
 * Overí dátumy členstva a existenciu sezóny.
 *
 * @returns text chyby, alebo null keď je všetko v poriadku
 */
const overClenstvoStaff = async (udaje: any): Promise<string | null> => {
  const od = udaje.datum_pripojenia ? new Date(udaje.datum_pripojenia) : null;
  const do_ = udaje.datum_odpojenia ? new Date(udaje.datum_odpojenia) : null;

  if (od && isNaN(od.getTime())) return 'Dátum pripojenia do klubu je neplatný';
  if (do_ && isNaN(do_.getTime())) return 'Dátum odpojenia z klubu je neplatný';
  if (od && do_ && do_ < od) {
    return 'Dátum odpojenia nemôže byť skôr než dátum pripojenia do klubu';
  }

  if (udaje.sezona_id) {
    const sezona = await Sezona.findOne({ where: { id: udaje.sezona_id, aktivity: true } });
    if (!sezona) return `Sezóna s ID ${udaje.sezona_id} neexistuje`;
  }

  return null;
};

// POST /api/staff - Vytvorenie nového člena realizačného tímu
export const createStaff = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('POST /api/staff - Received data:', req.body);

    // Validácia vstupných dát
    const validationErrors = validateStaffData(req.body);
    if (validationErrors.length > 0) {
      res.status(400).json({
        success: false,
        message: 'Neplatné údaje',
        errors: validationErrors
      });
      return;
    }

    const staffData = req.body;

    // Skontrolujeme existenciu tímu (ak je priradený)
    if (staffData.tim_id) {
      const team = await Team.findOne({
        where: { id: staffData.tim_id, aktivity: true }
      });

      if (!team) {
        res.status(404).json({
          success: false,
          message: 'Tím nebol nájdený'
        });
        return;
      }
    }

    // Skontrolujeme duplicitný email (ak je poskytnutý)
    if (staffData.email) {
      const existingStaff = await Staff.findOne({
        where: { email: staffData.email, aktivity: true }
      });

      if (existingStaff) {
        res.status(409).json({
          success: false,
          message: `Email ${staffData.email} už je používaný`
        });
        return;
      }
    }

    const chybaClenstva = await overClenstvoStaff(staffData);
    if (chybaClenstva) {
      res.status(400).json({ success: false, message: chybaClenstva });
      return;
    }

    // Vytvorenie člena realizačného tímu
    const newStaff = await Staff.create({
      meno: staffData.meno,
      priezvisko: staffData.priezvisko,
      funkcia: staffData.funkcia,
      email: staffData.email || null,
      telefon: staffData.telefon || null,
      datum_narodenia: staffData.datum_narodenia || null,
      kvalifikacia: staffData.kvalifikacia || null,
      fotka: staffData.fotka || null,
      tim_id: staffData.tim_id || null,
      narodnost: staffData.narodnost || null,
      sezona_id: staffData.sezona_id || null,
      datum_pripojenia: staffData.datum_pripojenia || null,
      datum_odpojenia: staffData.datum_odpojenia || null,
      poznamky: staffData.poznamky || null,
      poradie: staffData.poradie || 0
    });

    console.log('Staff member created successfully:', newStaff.id);

    res.status(201).json({
      success: true,
      data: (newStaff as any).toSafeJSON(),
      message: `Člen realizačného tímu ${(newStaff as any).getFullName()} bol úspešne vytvorený`
    });

  } catch (error) {
    if (odpovedzNaChybuModelu(error, res)) return;
    console.error('Chyba pri vytváraní člena realizačného tímu:', error);
    res.status(500).json({
      success: false,
      message: 'Chyba servera pri vytváraní člena realizačného tímu',
      debug: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
};

// PUT /api/staff/:id - Aktualizácia člena realizačného tímu
export const updateStaff = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log(`PUT /api/staff/${req.params.id} - Received data:`, req.body);

    const validation = validateStaffId(req.params.id);
    if (!validation.valid) {
      res.status(400).json({
        success: false,
        message: validation.error
      });
      return;
    }

    const staffId = validation.id!;

    // Pre UPDATE validujeme len polia, ktoré sa posielajú.
    // Prázdny reťazec z formulára znamená „bez hodnoty".
    const updateData: Record<string, any> = {};
    for (const [kluc, hodnota] of Object.entries(req.body || {})) {
      updateData[kluc] = hodnota === '' ? null : hodnota;
    }

    const chybaClenstva = await overClenstvoStaff(updateData);
    if (chybaClenstva) {
      res.status(400).json({ success: false, message: chybaClenstva });
      return;
    }

    const validationErrors: string[] = [];
    
    if (updateData.meno !== undefined && (!updateData.meno || typeof updateData.meno !== 'string' || updateData.meno.length < 2 || updateData.meno.length > 50)) {
      validationErrors.push('Meno musí mať 2-50 znakov');
    }
    
    if (updateData.priezvisko !== undefined && (!updateData.priezvisko || typeof updateData.priezvisko !== 'string' || updateData.priezvisko.length < 2 || updateData.priezvisko.length > 50)) {
      validationErrors.push('Priezvisko musí mať 2-50 znakov');
    }
    
    if (updateData.funkcia !== undefined && (!updateData.funkcia || typeof updateData.funkcia !== 'string' || updateData.funkcia.length < 2)) {
      validationErrors.push('Funkcia je povinná');
    }
    
    if (updateData.email !== undefined && updateData.email && (!updateData.email.includes('@') || updateData.email.length > 255)) {
      validationErrors.push('Neplatný email');
    }
    
    if (updateData.telefon !== undefined && updateData.telefon && (updateData.telefon.length < 9 || updateData.telefon.length > 20)) {
      validationErrors.push('Telefón musí mať 9-20 znakov');
    }
    
    if (updateData.datum_narodenia !== undefined && updateData.datum_narodenia) {
      const birthDate = new Date(updateData.datum_narodenia);
      const today = new Date();
      if (birthDate >= today) {
        validationErrors.push('Dátum narodenia nemôže byť v budúcnosti');
      }
    }
    
    if (updateData.tim_id !== undefined && updateData.tim_id !== null && isNaN(parseInt(updateData.tim_id))) {
      validationErrors.push('Neplatné ID tímu');
    }
    
    if (updateData.poradie !== undefined && (isNaN(parseInt(updateData.poradie)) || parseInt(updateData.poradie) < 0)) {
      validationErrors.push('Poradie musí byť nezáporné číslo');
    }
    
    if (validationErrors.length > 0) {
      res.status(400).json({
        success: false,
        message: 'Neplatné údaje',
        errors: validationErrors
      });
      return;
    }

    // Nájdenie existujúceho člena realizačného tímu
    const existingStaff = await Staff.findOne({
      where: { id: staffId, aktivity: true }
    });

    if (!existingStaff) {
      res.status(404).json({
        success: false,
        message: 'Člen realizačného tímu nebol nájdený'
      });
      return;
    }

    // Skontrolujeme existenciu tímu (ak sa mení)
    if (updateData.tim_id && updateData.tim_id !== (existingStaff as any).tim_id) {
      const team = await Team.findOne({
        where: { id: updateData.tim_id, aktivity: true }
      });

      if (!team) {
        res.status(404).json({
          success: false,
          message: 'Tím nebol nájdený'
        });
        return;
      }
    }

    // Skontrolujeme duplicitný email (ak sa mení)
    if (updateData.email && updateData.email !== (existingStaff as any).email) {
      const duplicateStaff = await Staff.findOne({
        where: { 
          email: updateData.email, 
          aktivity: true,
          id: { [require('sequelize').Op.ne]: staffId }
        }
      });

      if (duplicateStaff) {
        res.status(409).json({
          success: false,
          message: `Email ${updateData.email} už je používaný`
        });
        return;
      }
    }

    // Aktualizácia člena realizačného tímu
    await existingStaff.update({
      meno: updateData.meno || (existingStaff as any).meno,
      priezvisko: updateData.priezvisko || (existingStaff as any).priezvisko,
      funkcia: updateData.funkcia || (existingStaff as any).funkcia,
      email: updateData.email !== undefined ? updateData.email : (existingStaff as any).email,
      telefon: updateData.telefon !== undefined ? updateData.telefon : (existingStaff as any).telefon,
      datum_narodenia: updateData.datum_narodenia !== undefined ? updateData.datum_narodenia : (existingStaff as any).datum_narodenia,
      kvalifikacia: updateData.kvalifikacia !== undefined ? updateData.kvalifikacia : (existingStaff as any).kvalifikacia,
      fotka: updateData.fotka !== undefined ? updateData.fotka : (existingStaff as any).fotka,
      tim_id: updateData.tim_id !== undefined ? updateData.tim_id : (existingStaff as any).tim_id,
      // Tieto polia sa pri úprave predtým vôbec neukladali
      narodnost: updateData.narodnost !== undefined ? updateData.narodnost : (existingStaff as any).narodnost,
      sezona_id: updateData.sezona_id !== undefined ? updateData.sezona_id : (existingStaff as any).sezona_id,
      datum_pripojenia: updateData.datum_pripojenia !== undefined ? updateData.datum_pripojenia : (existingStaff as any).datum_pripojenia,
      datum_odpojenia: updateData.datum_odpojenia !== undefined ? updateData.datum_odpojenia : (existingStaff as any).datum_odpojenia,
      poznamky: updateData.poznamky !== undefined ? updateData.poznamky : (existingStaff as any).poznamky,
      poradie: updateData.poradie !== undefined ? updateData.poradie : (existingStaff as any).poradie
    });

    console.log('Staff member updated successfully:', staffId);

    res.json({
      success: true,
      data: (existingStaff as any).toSafeJSON(),
      message: `Člen realizačného tímu ${(existingStaff as any).getFullName()} bol úspešne aktualizovaný`
    });

  } catch (error) {
    if (odpovedzNaChybuModelu(error, res)) return;
    console.error('Chyba pri aktualizácii člena realizačného tímu:', error);
    res.status(500).json({
      success: false,
      message: 'Chyba servera pri aktualizácii člena realizačného tímu',
      debug: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
};

// DELETE /api/staff/:id - Vymazanie člena realizačného tímu (soft delete)
export const deleteStaff = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log(`DELETE /api/staff/${req.params.id}`);

    const validation = validateStaffId(req.params.id);
    if (!validation.valid) {
      res.status(400).json({
        success: false,
        message: validation.error
      });
      return;
    }

    const staffId = validation.id!;

    // Nájdenie existujúceho člena realizačného tímu
    const existingStaff = await Staff.findOne({
      where: { id: staffId, aktivity: true }
    });

    if (!existingStaff) {
      res.status(404).json({
        success: false,
        message: 'Člen realizačného tímu nebol nájdený'
      });
      return;
    }

    // Soft delete - nastavenie aktivity na false
    await existingStaff.update({ aktivity: false });

    console.log('Staff member soft deleted successfully:', staffId);

    res.json({
      success: true,
      message: `Člen realizačného tímu ${(existingStaff as any).getFullName()} bol úspešne vymazaný`
    });

  } catch (error) {
    console.error('Chyba pri vymazávaní člena realizačného tímu:', error);
    res.status(500).json({
      success: false,
      message: 'Chyba servera pri vymazávaní člena realizačného tímu',
      debug: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
};