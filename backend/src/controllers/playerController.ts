// backend/src/controllers/playerController.ts
// Controller pre CRUD operácie hráčov - FÁZA 3

import { Request, Response } from 'express';
import { odpovedzNaChybuModelu } from '../utils/odpoved';
import { Op } from 'sequelize';
import Player from '../models/Player';
import Team from '../models/Team';
import Sezona from '../models/Sezona';
import SupiskaSezony from '../models/SupiskaSezony';
// Filtrovanie osobných údajov maloletých pre verejné rozhranie
import { filtrujZoznamHracov, filtrujJednehoHraca } from '../utils/gdprFilter';

// ===== HELPER FUNCTIONS =====

/** Prihlásený člen vedenia klubu vidí údaje hráčov bez GDPR orezania. */
const smieVidietOsobneUdaje = (req: Request): boolean =>
  ['admin', 'redaktor', 'trener'].includes(String((req as any).user?.rola || ''));

// Validácia hráčskych dát
const validatePlayerData = (data: any) => {
  const errors: string[] = [];
  
  if (!data.meno || typeof data.meno !== 'string' || data.meno.length < 2 || data.meno.length > 50) {
    errors.push('Meno musí mať 2-50 znakov');
  }
  
  if (!data.priezvisko || typeof data.priezvisko !== 'string' || data.priezvisko.length < 2 || data.priezvisko.length > 50) {
    errors.push('Priezvisko musí mať 2-50 znakov');
  }
  
  if (!data.datum_narodenia) {
    errors.push('Dátum narodenia je povinný');
  } else {
    const birthDate = new Date(data.datum_narodenia);
    const today = new Date();
    if (birthDate >= today) {
      errors.push('Dátum narodenia nemôže byť v budúcnosti');
    }
  }
  
  if (!data.pozicia || typeof data.pozicia !== 'string' || data.pozicia.length < 2) {
    errors.push('Pozícia je povinná');
  }
  
  if (!data.tim_id || isNaN(parseInt(data.tim_id))) {
    errors.push('Tím je povinný');
  }
  
  if (data.cislo_dresu) {
    const cislo = parseInt(data.cislo_dresu);
    if (isNaN(cislo) || cislo < 1 || cislo > 99) {
      errors.push('Číslo dresu musí byť 1-99');
    }
  }
  
  if (data.vaha) {
    const vaha = parseFloat(data.vaha);
    if (isNaN(vaha) || vaha < 30 || vaha > 200) {
      errors.push('Váha musí byť 30-200 kg');
    }
  }
  
  if (data.vyska) {
    const vyska = parseInt(data.vyska);
    if (isNaN(vyska) || vyska < 120 || vyska > 250) {
      errors.push('Výška musí byť 120-250 cm');
    }
  }

  // PRIDAJ validáciu fotky:
  if (data.fotka && typeof data.fotka === 'string' && data.fotka.length > 500) {
    errors.push('URL fotky je príliš dlhé');
  }
  
  return errors;
};

/**
 * Zapíše hráča na súpisku sezóny (predvolene aktuálnej).
 *
 * Hráč tak patrí k sezóne - požiadavka „sezóna" pri hráčovi. Pri presune
 * do iného tímu sa starý záznam v tej istej sezóne označí ako neaktívny,
 * takže história prestupov zostane zachovaná.
 *
 * Uzavretú sezónu nemeníme. Chyba súpisky nesmie zhodiť uloženie hráča.
 */
const zapisNaSupiskuSezony = async (
  hrac: any,
  sezonaId: number | null | undefined,
  povodnyTimId?: number | null
): Promise<void> => {
  try {
    const sezona = sezonaId
      ? await Sezona.findOne({ where: { id: sezonaId, aktivity: true } })
      : await Sezona.findOne({ where: { aktualna: true, aktivity: true } });
    if (!sezona || (sezona as any).uzavreta) return;

    if (povodnyTimId && povodnyTimId !== hrac.tim_id) {
      await SupiskaSezony.update(
        { aktivny: false } as any,
        { where: { sezona_id: sezona.id, tim_id: povodnyTimId, hrac_id: hrac.id } }
      );
    }

    await SupiskaSezony.zapisHraca({
      sezona_id: sezona.id,
      tim_id: hrac.tim_id,
      hrac_id: hrac.id,
      cislo_dresu: hrac.cislo_dresu ?? null,
      pozicia: hrac.pozicia ?? null,
    });
  } catch (chyba) {
    console.warn('Hráča sa nepodarilo zapísať na súpisku sezóny:', chyba);
  }
};

const validatePlayerId = (id: string) => {
  const playerId = parseInt(id);
  if (isNaN(playerId) || playerId < 1) {
    return { valid: false, error: 'ID hráča musí byť kladné číslo' };
  }
  return { valid: true, id: playerId };
};

// ===== VEREJNÉ API ENDPOINTS =====

// GET /api/players - Zoznam všetkých hráčov
export const getPlayers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { tim_id, pozicia, search, include_team } = req.query;

    // Základné filter podmienky
    const whereConditions: any = { aktivity: true };

    // Filter podľa tímu
    if (tim_id) {
      const teamId = parseInt(tim_id as string);
      if (!isNaN(teamId)) {
        whereConditions.tim_id = teamId;
      }
    }

    let players = await Player.findAll({
      where: whereConditions,
      order: [['tim_id', 'ASC'], ['cislo_dresu', 'ASC'], ['priezvisko', 'ASC']]
    });

    // Filter pozície v JS
    if (pozicia) {
      const poziciaTerm = (pozicia as string).toLowerCase();
      players = players.filter((player: any) => 
        player.pozicia.toLowerCase().includes(poziciaTerm)
      );
    }

    // Vyhľadávanie v mene/priezvisku
    if (search) {
      const searchTerm = (search as string).toLowerCase();
      players = players.filter((player: any) => 
        player.meno.toLowerCase().includes(searchTerm) ||
        player.priezvisko.toLowerCase().includes(searchTerm)
      );
    }

    // Ak chceme info o tíme
    let result;
    if (include_team === 'true') {
      result = await Promise.all(players.map(async (player: any) => {
        const team = await Team.findByPk(player.tim_id);
        return {
          ...player.toSafeJSON(),
          tim: team ? team.toSafeJSON() : null
        };
      }));
    } else {
      result = players.map((player: any) => player.toSafeJSON());
    }

    // Pri maloletých hráčoch odstránime údaje, na ktoré chýba súhlas
    // zákonného zástupcu (fotka, plné meno, presný dátum narodenia)
    // Administrácia (redaktor, správca, tréner) potrebuje úplné údaje -
    // inak by pri uložení prepísala meno maloletého skratkou „J."
    if (!smieVidietOsobneUdaje(req)) {
      result = await filtrujZoznamHracov(result);
    }

    res.json({
      success: true,
      data: result,
      message: `Nájdených ${result.length} hráčov`
    });

  } catch (error) {
    console.error('Chyba pri načítaní hráčov:', error);
    res.status(500).json({
      success: false,
      message: 'Chyba servera pri načítaní hráčov',
      debug: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
};

// GET /api/players/:id - Detail konkrétneho hráča
export const getPlayerById = async (req: Request, res: Response): Promise<void> => {
  try {
    const validation = validatePlayerId(req.params.id);
    if (!validation.valid) {
      res.status(400).json({
        success: false,
        message: validation.error
      });
      return;
    }

    const playerId = validation.id!;
    const { include_team } = req.query;

    const player = await Player.findOne({
      where: { id: playerId, aktivity: true }
    });

    if (!player) {
      res.status(404).json({
        success: false,
        message: 'Hráč nebol nájdený'
      });
      return;
    }

    let playerData: any = (player as any).toSafeJSON();

    // Voliteľne pridáme info o tíme
    if (include_team === 'true') {
      const team = await Team.findByPk((player as any).tim_id);
      playerData.tim = team ? team.toSafeJSON() : null;
    }

    // Rovnaké filtrovanie ako pri výpise
    const verejneUdaje = smieVidietOsobneUdaje(req) ? playerData : await filtrujJednehoHraca(playerData);

    res.json({
      success: true,
      data: verejneUdaje,
      message: 'Hráč úspešne načítaný'
    });

  } catch (error) {
    console.error('Chyba pri načítaní hráča:', error);
    res.status(500).json({
      success: false,
      message: 'Chyba servera pri načítaní hráča',
      debug: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
};


/**
 * Overí dátumy členstva v klube.
 *
 * @returns text chyby, alebo null keď je všetko v poriadku
 */
const overDatumyClenstva = (udaje: any): string | null => {
  const od = udaje.datum_pripojenia ? new Date(udaje.datum_pripojenia) : null;
  const do_ = udaje.datum_odpojenia ? new Date(udaje.datum_odpojenia) : null;

  if (od && isNaN(od.getTime())) return 'Dátum pripojenia do klubu je neplatný';
  if (do_ && isNaN(do_.getTime())) return 'Dátum odpojenia z klubu je neplatný';
  if (od && do_ && do_ < od) {
    return 'Dátum odpojenia nemôže byť skôr než dátum pripojenia do klubu';
  }
  return null;
};

/** Povolené hodnoty stavu hráča v kádri. */
const STAVY_HRACA = ['aktivny', 'neaktivny'];

// POST /api/players - Vytvorenie nového hráča
export const createPlayer = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('POST /api/players - Received data:', JSON.stringify(req.body, null, 2));

    // PRIDAJ tento debug:
    console.log('Fotka URL:', req.body.fotka);
    console.log('Type fotky:', typeof req.body.fotka);


    // Validácia vstupných dát
    const validationErrors = validatePlayerData(req.body);
    if (validationErrors.length > 0) {
      res.status(400).json({
        success: false,
        message: 'Neplatné údaje',
        errors: validationErrors
      });
      return;
    }

    const playerData = req.body;

    // Skontrolujeme, či tím existuje
    const team = await Team.findOne({
      where: { id: playerData.tim_id, aktivity: true }
    });

    if (!team) {
      res.status(404).json({
        success: false,
        message: 'Tím nebol nájdený'
      });
      return;
    }

    // Skontrolujeme číslo dresu (ak je zadané)
    if (playerData.cislo_dresu) {
      const existingPlayer = await Player.findOne({
        where: {
          cislo_dresu: playerData.cislo_dresu,
          tim_id: playerData.tim_id,
          aktivity: true
        }
      });

      if (existingPlayer) {
        res.status(409).json({
          success: false,
          message: `Číslo dresu ${playerData.cislo_dresu} je už obsadené v tíme ${team.getFullName()}`
        });
        return;
      }
    }

    const chybaDatumov = overDatumyClenstva(playerData);
    if (chybaDatumov) {
      res.status(400).json({ success: false, message: chybaDatumov });
      return;
    }

    if (playerData.stav && !STAVY_HRACA.includes(playerData.stav)) {
      res.status(400).json({
        success: false,
        message: `Stav musí byť jeden z: ${STAVY_HRACA.join(', ')}`,
      });
      return;
    }

    // Vytvorenie hráča
    const newPlayer = await Player.create({
      meno: playerData.meno,
      priezvisko: playerData.priezvisko,
      datum_narodenia: playerData.datum_narodenia,
      cislo_dresu: playerData.cislo_dresu || null,
      pozicia: playerData.pozicia,
      narodnost: playerData.narodnost || null,
      vaha: playerData.vaha || null,
      vyska: playerData.vyska || null,
      fotka: playerData.fotka || null,
      tim_id: playerData.tim_id,
      datum_pripojenia: playerData.datum_pripojenia || null,
      datum_odpojenia: playerData.datum_odpojenia || null,
      stav: playerData.stav || 'aktivny',
      poznamky: playerData.poznamky || null
    });

    console.log('Player created successfully:', newPlayer.id);

    // Keď administrácia zvolila sezónu, hráč sa zapíše na jej súpisku
    if (playerData.sezona_id) {
      await zapisNaSupiskuSezony(newPlayer, Number(playerData.sezona_id));
    }

    res.status(201).json({
      success: true,
      data: (newPlayer as any).toSafeJSON(),
      message: `Hráč ${(newPlayer as any).getFullName()} bol úspešne vytvorený`
    });

  } catch (error) {
    if (odpovedzNaChybuModelu(error, res)) return;
    console.error('Chyba pri vytváraní hráča:', error);
    res.status(500).json({
      success: false,
      message: 'Chyba servera pri vytváraní hráča',
      debug: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
};

// PUT /api/players/:id - Aktualizácia hráča
export const updatePlayer = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log(`PUT /api/players/${req.params.id} - Received data:`, req.body);

    const validation = validatePlayerId(req.params.id);
    if (!validation.valid) {
      res.status(400).json({
        success: false,
        message: validation.error
      });
      return;
    }

    const playerId = validation.id!;

    // Meniť sa smú len tieto polia - pôvodne išlo do update() celé telo
    // požiadavky, takže sa dalo prepísať aj aktivity či id
    const POLIA = [
      'meno', 'priezvisko', 'datum_narodenia', 'cislo_dresu', 'pozicia', 'narodnost',
      'vaha', 'vyska', 'fotka', 'tim_id', 'datum_pripojenia', 'datum_odpojenia', 'stav', 'poznamky',
    ];
    const updateData: Record<string, any> = {};
    for (const pole of POLIA) {
      if (req.body[pole] === undefined) continue;
      updateData[pole] = req.body[pole] === '' ? null : req.body[pole];
    }

    if (updateData.stav !== undefined && !STAVY_HRACA.includes(updateData.stav)) {
      res.status(400).json({
        success: false,
        message: `Stav musí byť jeden z: ${STAVY_HRACA.join(', ')}`,
      });
      return;
    }

    const player = await Player.findOne({
      where: { id: playerId, aktivity: true }
    });

    if (!player) {
      res.status(404).json({
        success: false,
        message: 'Hráč nebol nájdený'
      });
      return;
    }

    // Kontrola výsledného hráča - aj polí, ktoré sa nemenili
    const vysledny = { ...(player as any).toSafeJSON(), ...updateData };
    const chybyUdajov = validatePlayerData(vysledny);
    if (chybyUdajov.length > 0) {
      res.status(400).json({ success: false, message: chybyUdajov[0], errors: chybyUdajov });
      return;
    }

    const chybaDatumov = overDatumyClenstva(vysledny);
    if (chybaDatumov) {
      res.status(400).json({ success: false, message: chybaDatumov });
      return;
    }

    // Presun do iného tímu - cieľový tím musí existovať
    const cielovyTimId = Number(vysledny.tim_id);
    const menitTim = cielovyTimId !== Number((player as any).tim_id);
    if (menitTim) {
      const cielovy = await Team.findOne({ where: { id: cielovyTimId, aktivity: true } });
      if (!cielovy) {
        res.status(400).json({ success: false, message: 'Cieľový tím neexistuje' });
        return;
      }
    }

    // Číslo dresu musí byť voľné v tíme, kde hráč bude hrať
    const cislo = vysledny.cislo_dresu ? Number(vysledny.cislo_dresu) : null;
    if (cislo && (menitTim || cislo !== Number((player as any).cislo_dresu))) {
      const existingPlayer = await Player.findOne({
        where: {
          cislo_dresu: cislo,
          tim_id: cielovyTimId,
          aktivity: true,
          id: { [Op.ne]: playerId }
        }
      });

      if (existingPlayer) {
        res.status(409).json({
          success: false,
          message: `Číslo dresu ${cislo} je v ${menitTim ? 'cieľovom' : 'tomto'} tíme už obsadené ` +
            `(${(existingPlayer as any).getFullName()})`
        });
        return;
      }
    }

    const povodnyTimId = Number((player as any).tim_id);

    // Aktualizácia
    await player.update(updateData);

    // Presun do iného tímu alebo výslovne zvolená sezóna - súpiska sa
    // prispôsobí (v pôvodnom tíme zostane záznam ako história)
    if (menitTim || req.body.sezona_id) {
      await zapisNaSupiskuSezony(
        player,
        req.body.sezona_id ? Number(req.body.sezona_id) : null,
        menitTim ? povodnyTimId : null
      );
    }

    console.log('Player updated successfully:', player.id);

    res.json({
      success: true,
      data: (player as any).toSafeJSON(),
      message: `Hráč ${(player as any).getFullName()} bol úspešne aktualizovaný`
    });

  } catch (error) {
    if (odpovedzNaChybuModelu(error, res)) return;
    console.error('Chyba pri aktualizácii hráča:', error);
    res.status(500).json({
      success: false,
      message: 'Chyba servera pri aktualizácii hráča',
      debug: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
};

// DELETE /api/players/:id - Soft delete hráča
export const deletePlayer = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log(`DELETE /api/players/${req.params.id}`);

    const validation = validatePlayerId(req.params.id);
    if (!validation.valid) {
      res.status(400).json({
        success: false,
        message: validation.error
      });
      return;
    }

    const playerId = validation.id!;

    const player = await Player.findOne({
      where: { id: playerId, aktivity: true }
    });

    if (!player) {
      res.status(404).json({
        success: false,
        message: 'Hráč nebol nájdený'
      });
      return;
    }

    // Fotka hráča sa ZÁMERNE NEMAŽE.
    //
    // Toto je mäkké odstránenie - hráč putuje do archívu a dá sa odtiaľ
    // obnoviť (POST /api/admin/archive/hraci/:id/restore). Pôvodná verzia
    // tu fotku fyzicky mazala z disku, takže archivácia síce zachovala
    // záznam a štatistiky, ale obnovený hráč zostal bez fotky - a vrátiť
    // sa už nedala. Súbor preto necháme na mieste; upratať ho patrí
    // k trvalému zmazaniu z archívu, nie k archivácii.

    // Soft delete
    await player.update({ aktivity: false });

    console.log('Player deleted successfully:', player.id);

    res.json({
      success: true,
      message: `Hráč ${(player as any).getFullName()} bol úspešne vymazaný`
    });

  } catch (error) {
    console.error('Chyba pri mazaní hráča:', error);
    res.status(500).json({
      success: false,
      message: 'Chyba servera pri mazaní hráča',
      debug: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
};