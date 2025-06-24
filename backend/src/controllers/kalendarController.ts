// Nahraď celý kalendarController.ts súbor

// backend/src/controllers/kalendarController.ts
// Controller pre kalendár zápasov - FÁZA 4 (KOMPLETNÝ)

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

// Helper funkcia pre číslo týždňa
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

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
          attributes: ['id', 'nazov', 'typ'],
          required: false
        },
        {
          model: Team,
          as: 'domaci_tim',
          attributes: ['id', 'nazov'],
          required: false
        },
        {
          model: Team,
          as: 'hostujuci_tim',
          attributes: ['id', 'nazov'],
          required: false
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
    const monthNames = [
      'Január', 'Február', 'Marec', 'Apríl', 'Máj', 'Jún',
      'Júl', 'August', 'September', 'Október', 'November', 'December'
    ];

    res.json({
      success: true,
      data: {
        calendar: calendarData,
        month_info: {
          rok: validation.rok,
          mesiac: validation.mesiac,
          nazov_mesiaca: monthNames[validation.mesiac - 1],
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString()
        },
        total_matches: formattedMatches.length,
        filters: { liga_id, tim_id }
      },
      message: `Kalendár pre ${monthNames[validation.mesiac - 1]} ${validation.rok}`
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
    const validation = validateYearMonth(rok, mesiac);
    if (!validation.valid) {
      res.status(400).json({
        success: false,
        message: validation.error
      });
      return;
    }

    const denNum = parseInt(den);
    if (isNaN(denNum) || denNum < 1 || denNum > 31) {
      res.status(400).json({
        success: false,
        message: 'Deň musí byť medzi 1-31'
      });
      return;
    }

    const { startDate, endDate } = getWeekDates(validation.rok, validation.mesiac, denNum);

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
          attributes: ['id', 'nazov', 'typ'],
          required: false
        },
        {
          model: Team,
          as: 'domaci_tim',
          attributes: ['id', 'nazov'],
          required: false
        },
        {
          model: Team,
          as: 'hostujuci_tim',
          attributes: ['id', 'nazov'],
          required: false
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

    res.json({
      success: true,
      data: {
        calendar: calendarData,
        week_info: {
          week_start: startDate.toLocaleDateString('sk-SK'),
          week_end: endDate.toLocaleDateString('sk-SK'),
          week_number: getWeekNumber(new Date(validation.rok, validation.mesiac - 1, denNum)),
          target_date: `${validation.rok}-${validation.mesiac.toString().padStart(2, '0')}-${denNum.toString().padStart(2, '0')}`
        },
        total_matches: formattedMatches.length,
        filters: { liga_id, tim_id }
      },
      message: `Týždenný kalendár pre ${startDate.toLocaleDateString('sk-SK')} - ${endDate.toLocaleDateString('sk-SK')}`
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

// GET /api/calendar/upcoming - Nadchádzajúce zápasy + bez výsledku
// backend/src/controllers/kalendarController.ts
// KOMPLETNÁ funkcia getUpcomingMatches - nahraď celú existujúcu funkciu

export const getUpcomingMatches = async (req: Request, res: Response): Promise<void> => {
  try {
    const { limit = '10', liga_id, tim_id, format } = req.query;
    const limitNum = parseInt(limit as string) || 10;
    const now = new Date();
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

    console.log('=== UPCOMING MATCHES DEBUG ===');
    console.log('Original URL:', req.originalUrl);
    console.log('Format query:', format);
    console.log('Query params:', req.query);

    // Základné filter podmienky pre nadchádzajúce zápasy
    const upcomingConditions: any = {
      datum_cas: {
        [Op.gte]: now // Zápasy v budúcnosti
      },
      aktivity: true
    };

    // Základné filter podmienky pre zápasy bez výsledku (ukončené ale bez skóre)
    const withoutResultConditions: any = {
      datum_cas: {
        [Op.lt]: twoHoursAgo // Zápasy staršie ako 2 hodiny
      },
      [Op.and]: [
        {
          [Op.or]: [
            { goly_domaci: null },
            { goly_hostia: null }
          ]
        }
      ],
      status: {
        [Op.notIn]: ['zruseny', 'odlozeny'] // Vylúč zrušené/odložené
      },
      aktivity: true
    };

    // Pridaj filter podľa ligy ak je zadaný
    if (liga_id && !isNaN(Number(liga_id))) {
      upcomingConditions.liga_id = Number(liga_id);
      withoutResultConditions.liga_id = Number(liga_id);
    }

    // Pridaj filter podľa tímu ak je zadaný
    if (tim_id && !isNaN(Number(tim_id))) {
      const teamFilter = {
        [Op.or]: [
          { domaci_tim_id: Number(tim_id) },
          { hostujuci_tim_id: Number(tim_id) }
        ]
      };
      upcomingConditions[Op.and] = [teamFilter];
      withoutResultConditions[Op.and] = [
        withoutResultConditions[Op.and][0], // Ponechaj existujúce AND podmienky
        teamFilter
      ];
    }

    const includeOptions = [
      {
        model: Liga,
        as: 'liga',
        attributes: ['id', 'nazov', 'typ'],
        required: false
      },
      {
        model: Team,
        as: 'domaci_tim',
        attributes: ['id', 'nazov'],
        required: false
      },
      {
        model: Team,
        as: 'hostujuci_tim',
        attributes: ['id', 'nazov'],
        required: false
      }
    ];

    // DETEKCIA FORMÁTU: Legacy alebo nový
    const isLegacyFormat = format === 'legacy' || req.originalUrl.includes('/calendar/upcoming');
    console.log('Is legacy format:', isLegacyFormat);

    // Načítaj oba typy zápasov paralelne (pre oba formáty)
    const [upcomingMatches, matchesWithoutResult] = await Promise.all([
      Zapas.findAll({
        where: upcomingConditions,
        include: includeOptions,
        order: [['datum_cas', 'ASC']],
        limit: Math.ceil(limitNum / 2) // Polovica limitu pre nadchádzajúce
      }),
      Zapas.findAll({
        where: withoutResultConditions,
        include: includeOptions,
        order: [['datum_cas', 'DESC']], // Najnovšie ukončené najprv
        limit: Math.ceil(limitNum / 2) // Polovica limitu pre bez výsledku
      })
    ]);

    // Skombiuj a formátuj výsledky
    const allMatches = [...upcomingMatches, ...matchesWithoutResult];
    const formattedMatches = allMatches.map(zapas => {
      const formatted = formatMatchForCalendar(zapas);
      
      // Určenie typu zápasu
      const isUpcoming = upcomingMatches.includes(zapas);
      const hasResult = zapas.goly_domaci !== null && zapas.goly_hostia !== null;
      
      return {
        ...formatted,
        // Pridaj informáciu o type zápasu pre frontend
        match_type: isUpcoming ? 'upcoming' : 'without_result',
        actual_status: zapas.status,
        needs_result: !hasResult
      };
    });

    // Zoraď kombinované výsledky - najprv bez výsledku, potom nadchádzajúce
    formattedMatches.sort((a, b) => {
      if (a.match_type === 'without_result' && b.match_type === 'upcoming') return -1;
      if (a.match_type === 'upcoming' && b.match_type === 'without_result') return 1;
      
      if (a.match_type === 'without_result' && b.match_type === 'without_result') {
        return new Date(b.datum_cas).getTime() - new Date(a.datum_cas).getTime(); // Najnovšie najprv
      }
      
      return new Date(a.datum_cas).getTime() - new Date(b.datum_cas).getTime(); // Najskoršie najprv
    });

    // Obmedz na požadovaný limit
    const limitedMatches = formattedMatches.slice(0, limitNum);

    // Počty pre breakdown
    const upcomingCount = limitedMatches.filter(m => m.match_type === 'upcoming').length;
    const withoutResultCount = limitedMatches.filter(m => m.match_type === 'without_result').length;

    if (isLegacyFormat) {
      // LEGACY FORMÁT: Priamo array (pre ZapasManagement)
      console.log('Using LEGACY format for ZapasManagement - s oboma typmi zápasov');
      
      res.json({
        success: true,
        data: limitedMatches, // Priamo array - ale s oboma typmi zápasov
        count: limitedMatches.length,
        breakdown: {
          upcoming: upcomingCount,
          without_result: withoutResultCount
        },
        message: `${limitedMatches.length} zápasov (nadchádzajúce + bez výsledku)`
      });
      return;
    }

    // NOVÝ FORMÁT: Nested objekt (pre KalendarManagement)
    console.log('Using NEW format for KalendarManagement');
    
    res.json({
      success: true,
      data: {
        data: limitedMatches,              // Array zápasov
        count: limitedMatches.length,      // Celkový počet
        breakdown: {
          upcoming: upcomingCount,         // Počet nadchádzajúcich
          without_result: withoutResultCount // Počet bez výsledku
        }
      },
      message: `${limitedMatches.length} zápasov (nadchádzajúce + bez výsledku)`
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