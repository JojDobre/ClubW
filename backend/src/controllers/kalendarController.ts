// backend/src/controllers/kalendarController.ts
// Controller pre kalendár zápasov - FÁZA 4

import { Request, Response } from 'express';
import { Op } from 'sequelize';
import Zapas from '../models/Zapas';
import Liga from '../models/Liga';
import Team from '../models/Team';

// ===== HELPER FUNCTIONS =====

// Validácia dátumu
const validateDate = (dateString: string) => {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    return { valid: false, error: 'Neplatný formát dátumu' };
  }
  return { valid: true, date };
};

// Validácia roku a mesiaca
const validateYearMonth = (rok: string, mesiac: string): { valid: false; error: string } | { valid: true; rok: number; mesiac: number } => {
  const rokNum = parseInt(rok);
  const mesiacNum = parseInt(mesiac);
  
  if (isNaN(rokNum) || rokNum < 2020 || rokNum > 2030) {
    return { valid: false, error: 'Rok musí byť medzi 2020-2030' };
  }
  
  if (isNaN(mesiacNum) || mesiacNum < 1 || mesiacNum > 12) {
    return { valid: false, error: 'Mesiac musí byť medzi 1-12' };
  }
  
  return { valid: true, rok: rokNum, mesiac: mesiacNum };
};

// Získanie dátumov pre mesiac
const getMonthDates = (rok: number, mesiac: number) => {
  const startDate = new Date(rok, mesiac - 1, 1); // Prvý deň mesiaca
  const endDate = new Date(rok, mesiac, 0, 23, 59, 59); // Posledný deň mesiaca
  return { startDate, endDate };
};

// Získanie dátumov pre týždeň
const getWeekDates = (rok: number, mesiac: number, den: number) => {
  const targetDate = new Date(rok, mesiac - 1, den);
  const dayOfWeek = targetDate.getDay(); // 0 = nedeľa, 1 = pondelok, ...
  
  // Začiatok týždňa (pondelok)
  const startDate = new Date(targetDate);
  startDate.setDate(targetDate.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  startDate.setHours(0, 0, 0, 0);
  
  // Koniec týždňa (nedeľa)
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 6);
  endDate.setHours(23, 59, 59, 999);
  
  return { startDate, endDate };
};

// Formátovanie zápasu pre kalendár
const formatMatchForCalendar = (zapas: any) => {
  return {
    id: zapas.id,
    nazov: zapas.nazov,
    datum_cas: zapas.datum_cas,
    miesto: zapas.miesto,
    kolo: zapas.kolo,
    status: zapas.status,
    vysledok: zapas.getVysledok(),
    vitaz: zapas.getVitaz(),
    liga: zapas.liga ? {
      id: zapas.liga.id,
      nazov: zapas.liga.nazov,
      typ: zapas.liga.typ
    } : null,
    domaci_tim: zapas.domaci_tim ? {
      id: zapas.domaci_tim.id,
      nazov: zapas.domaci_tim.nazov
    } : null,
    hostujuci_tim: zapas.hostujuci_tim ? {
      id: zapas.hostujuci_tim.id,
      nazov: zapas.hostujuci_tim.nazov
    } : null,
    cas: zapas.datum_cas.toLocaleTimeString('sk-SK', { 
      hour: '2-digit', 
      minute: '2-digit' 
    }),
    datum: zapas.datum_cas.toLocaleDateString('sk-SK')
  };
};

// ===== API ENDPOINTS =====

// GET /api/calendar/month/:rok/:mesiac - Mesačný kalendár
export const getMonthCalendar = async (req: Request, res: Response): Promise<void> => {
  try {
    const { rok, mesiac } = req.params;
    const { liga_id, tim_id } = req.query;

    // Validácia parametrov
    const validation = validateYearMonth(rok, mesiac);
    if (!validation.valid) {
      res.status(400).json({
        success: false,
        message: validation.error
      });
      return;
    }

    const { startDate, endDate } = getMonthDates(validation.rok, validation.mesiac);

    // Základné filter podmienky
    const whereConditions: any = {
      datum_cas: {
        [Op.between]: [startDate, endDate]
      },
      aktivity: true
    };

    // Filter podľa ligy
    if (liga_id && !isNaN(Number(liga_id))) {
      whereConditions.liga_id = Number(liga_id);
    }

    // Filter podľa tímu
    if (tim_id && !isNaN(Number(tim_id))) {
      whereConditions[Op.or] = [
        { domaci_tim_id: Number(tim_id) },
        { hostujuci_tim_id: Number(tim_id) }
      ];
    }

    const zapasy = await Zapas.findAll({
      where: whereConditions,
      include: [
        {
          model: Liga,
          as: 'liga',
          attributes: ['id', 'nazov', 'typ']
        },
        {
          model: Team,
          as: 'domaci_tim',
          attributes: ['id', 'nazov']
        },
        {
          model: Team,
          as: 'hostujuci_tim',
          attributes: ['id', 'nazov']
        }
      ],
      order: [['datum_cas', 'ASC']]
    });

    // Zoskupenie zápasov podle dní
    const calendarData: { [key: string]: any[] } = {};
    const formattedMatches = zapasy.map(formatMatchForCalendar);

    formattedMatches.forEach(zapas => {
      const dateKey = zapas.datum;
      if (!calendarData[dateKey]) {
        calendarData[dateKey] = [];
      }
      calendarData[dateKey].push(zapas);
    });

    // Informácie o mesiaci
    const monthInfo = {
      rok: validation.rok,
      mesiac: validation.mesiac,
      nazov_mesiaca: new Date(validation.rok, validation.mesiac - 1).toLocaleDateString('sk-SK', { 
        month: 'long', 
        year: 'numeric' 
      }),
      pocet_dni: new Date(validation.rok, validation.mesiac, 0).getDate(),
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString()
    };

    res.json({
      success: true,
      data: {
        month_info: monthInfo,
        calendar: calendarData,
        matches: formattedMatches,
        total_matches: formattedMatches.length
      },
      message: `Kalendár pre ${monthInfo.nazov_mesiaca} - ${formattedMatches.length} zápasov`
    });

  } catch (error) {
    console.error('Chyba pri načítaní mesačného kalendára:', error);
    res.status(500).json({
      success: false,
      message: 'Chyba servera pri načítaní mesačného kalendára',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};

// GET /api/calendar/week/:rok/:mesiac/:den - Týždenný kalendár
export const getWeekCalendar = async (req: Request, res: Response): Promise<void> => {
  try {
    const { rok, mesiac, den } = req.params;
    const { liga_id, tim_id } = req.query;

    // Validácia parametrov
    const rokNum = parseInt(rok);
    const mesiacNum = parseInt(mesiac);
    const denNum = parseInt(den);

    if (isNaN(rokNum) || isNaN(mesiacNum) || isNaN(denNum)) {
      res.status(400).json({
        success: false,
        message: 'Neplatné parametre dátumu'
      });
      return;
    }

    const { startDate, endDate } = getWeekDates(rokNum, mesiacNum, denNum);

    // Základné filter podmienky
    const whereConditions: any = {
      datum_cas: {
        [Op.between]: [startDate, endDate]
      },
      aktivity: true
    };

    // Filter podľa ligy
    if (liga_id && !isNaN(Number(liga_id))) {
      whereConditions.liga_id = Number(liga_id);
    }

    // Filter podľa tímu
    if (tim_id && !isNaN(Number(tim_id))) {
      whereConditions[Op.or] = [
        { domaci_tim_id: Number(tim_id) },
        { hostujuci_tim_id: Number(tim_id) }
      ];
    }

    const zapasy = await Zapas.findAll({
      where: whereConditions,
      include: [
        {
          model: Liga,
          as: 'liga',
          attributes: ['id', 'nazov', 'typ']
        },
        {
          model: Team,
          as: 'domaci_tim',
          attributes: ['id', 'nazov']
        },
        {
          model: Team,
          as: 'hostujuci_tim',
          attributes: ['id', 'nazov']
        }
      ],
      order: [['datum_cas', 'ASC']]
    });

    // Zoskupenie zápasov podľa dní
    const calendarData: { [key: string]: any[] } = {};
    const formattedMatches = zapasy.map(formatMatchForCalendar);

    formattedMatches.forEach(zapas => {
      const dateKey = zapas.datum;
      if (!calendarData[dateKey]) {
        calendarData[dateKey] = [];
      }
      calendarData[dateKey].push(zapas);
    });

    // Informácie o týždni
    const weekInfo = {
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString(),
      week_start: startDate.toLocaleDateString('sk-SK'),
      week_end: endDate.toLocaleDateString('sk-SK'),
      week_number: getWeekNumber(startDate)
    };

    res.json({
      success: true,
      data: {
        week_info: weekInfo,
        calendar: calendarData,
        matches: formattedMatches,
        total_matches: formattedMatches.length
      },
      message: `Týždenný kalendár ${weekInfo.week_start} - ${weekInfo.week_end} - ${formattedMatches.length} zápasov`
    });

  } catch (error) {
    console.error('Chyba pri načítaní týždenného kalendára:', error);
    res.status(500).json({
      success: false,
      message: 'Chyba servera pri načítaní týždenného kalendára',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};

// GET /api/calendar/upcoming - Nadchádzajúce zápasy
export const getUpcomingMatches = async (req: Request, res: Response): Promise<void> => {
  try {
    const { limit = '10', liga_id, tim_id } = req.query;
    const limitNum = parseInt(limit as string) || 10;

    // Základné filter podmienky
    const whereConditions: any = {
      datum_cas: {
        [Op.gte]: new Date() // Len budúce zápasy
      },
      aktivity: true
    };

    // Filter podľa ligy
    if (liga_id && !isNaN(Number(liga_id))) {
      whereConditions.liga_id = Number(liga_id);
    }

    // Filter podľa tímu
    if (tim_id && !isNaN(Number(tim_id))) {
      whereConditions[Op.or] = [
        { domaci_tim_id: Number(tim_id) },
        { hostujuci_tim_id: Number(tim_id) }
      ];
    }

    const zapasy = await Zapas.findAll({
      where: whereConditions,
      include: [
        {
          model: Liga,
          as: 'liga',
          attributes: ['id', 'nazov', 'typ']
        },
        {
          model: Team,
          as: 'domaci_tim',
          attributes: ['id', 'nazov']
        },
        {
          model: Team,
          as: 'hostujuci_tim',
          attributes: ['id', 'nazov']
        }
      ],
      order: [['datum_cas', 'ASC']],
      limit: limitNum
    });

    const formattedMatches = zapasy.map(formatMatchForCalendar);

    res.json({
      success: true,
      data: formattedMatches,
      count: formattedMatches.length,
      message: `Nadchádzajúcich ${formattedMatches.length} zápasov`
    });

  } catch (error) {
    console.error('Chyba pri načítaní nadchádzajúcich zápasov:', error);
    res.status(500).json({
      success: false,
      message: 'Chyba servera pri načítaní nadchádzajúcich zápasov',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};

// Helper funkcia pre číslo týždňa
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}