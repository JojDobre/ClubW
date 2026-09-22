// backend/src/models/index.ts
// Definícia vzťahov medzi všetkými modelmi - KOMPLETNÁ FÁZA 4

import { Op } from 'sequelize';
import User from './user';
import Category from './Category';
import Article from './Article';
import Team from './Team';
import Player from './Player';
import Staff from './Staff';
import Liga from './Liga';
import LigaTabulka from './LigaTabulka';      // NOVÝ
import LigaTurnaj from './LigaTurnaj';        // NOVÝ
import Zapas from './Zapas';
import ZapasStatistika from './ZapasStatistika';
import ZapasZostava from './ZapasZostava';
import ZapasUdalost from './ZapasUdalost';
// Tokeny pre obnovu relácie a obnovu zabudnutého hesla
import RefreshToken from './RefreshToken';
import ResetHeslaToken from './ResetHeslaToken';
// Nastavenia klubu - white-label identita a farby
import NastaveniaKlubu from './NastaveniaKlubu';
// Sezóny a súpisky hráčov po sezónach
import Sezona from './Sezona';
import Stadion from './Stadion';
import KalendarUdalost from './KalendarUdalost';
import Media from './Media';
import SupiskaSezony from './SupiskaSezony';
// GDPR - súhlasy so spracovaním údajov a auditný záznam
import Suhlas from './Suhlas';
import AuditLog from './AuditLog';
// Sekcia KLUB — sponzori, dokumenty, ankety, fanúšikovia
import Sponzor from './Sponzor';
import Dokument from './Dokument';
import Anketa from './Anketa';
import Fanusik from './Fanusik';
// Komentáre a videá
import Komentar from './Komentar';
import Video from './Video';
import Page from './Page';
import Galeria from './Galeria';              // NOVÉ - FÁZA 7
import GaleriaObrazok from './GaleriaObrazok'; // NOVÉ - FÁZA 7

// ===== DEFINÍCIA VZŤAHOV MEDZI MODELMI =====

// 1. USER vzťahy
// User -> Articles (1:N) - používateľ môže mať viacero článkov
User.hasMany(Article, {
  foreignKey: 'autor_id',
  as: 'clanky',
  onDelete: 'RESTRICT', // Nemožno vymazať používateľa s článkami
});

Article.belongsTo(User, {
  foreignKey: 'autor_id',
  as: 'autor',
});

// User -> Team (N:1) - používateľ môže patriť k jednému tímu
User.belongsTo(Team, {
  foreignKey: 'tim_id',
  as: 'tim',
  constraints: false, // Voliteľné - používateľ nemusí mať tím
});

Team.hasMany(User, {
  foreignKey: 'tim_id',
  as: 'pouzivatelia',
  constraints: false,
});

// 2. CATEGORY vzťahy
// Category -> Articles (1:N) - kategória môže mať viacero článkov
Category.hasMany(Article, {
  foreignKey: 'kategoria_id',
  as: 'clanky',
  onDelete: 'RESTRICT', // Nemožno vymazať kategóriu s článkami
});

Article.belongsTo(Category, {
  foreignKey: 'kategoria_id',
  as: 'kategoria',
});

// Team -> Stadion (N:1) - domáci štadión tímu
Team.belongsTo(Stadion, {
  foreignKey: 'stadion_id',
  as: 'stadion',
});

Stadion.hasMany(Team, {
  foreignKey: 'stadion_id',
  as: 'timy',
});

// Team -> Sezona (N:1) - sezóna, do ktorej tím patrí
Team.belongsTo(Sezona, {
  foreignKey: 'sezona_id',
  as: 'sezona',
});

// Article -> Team (N:1) - voliteľná väzba, článok sa nemusí týkať tímu
Article.belongsTo(Team, {
  foreignKey: 'tim_id',
  as: 'tim',
});

Team.hasMany(Article, {
  foreignKey: 'tim_id',
  as: 'clanky',
});

// Team -> KalendarUdalost (1:N) - tréningy a akcie tímu.
// Kalendár z tímu berie aj farbu, pod ktorou udalosť zobrazuje.
Team.hasMany(KalendarUdalost, {
  foreignKey: 'tim_id',
  as: 'udalosti',
  onDelete: 'CASCADE',
});

KalendarUdalost.belongsTo(Team, {
  foreignKey: 'tim_id',
  as: 'tim',
});

// Media -> User (kto súbor nahral)
Media.belongsTo(User, {
  foreignKey: 'autor_id',
  as: 'autor',
  constraints: false,
});

// 3. TEAM vzťahy
// Team -> Players (1:N) - tím má viacero hráčov
Team.hasMany(Player, {
  foreignKey: 'tim_id',
  as: 'hraci',
  onDelete: 'CASCADE', // Ak sa vymaže tím, vymažú sa aj hráči
});

Player.belongsTo(Team, {
  foreignKey: 'tim_id',
  as: 'tim',
});

// Team -> Staff (1:N) - tím môže mať viacero členov realizačného tímu
Team.hasMany(Staff, {
  foreignKey: 'tim_id',
  as: 'realizacny_tim',
  constraints: false, // Voliteľné - staff môže byť pre celý klub
});

Staff.belongsTo(Team, {
  foreignKey: 'tim_id',
  as: 'tim',
  constraints: false,
});

// 4. LIGA vzťahy - ROZŠÍRENÉ FÁZA 4+
// Liga -> Zapasy (1:N) - liga má viacero zápasov
Liga.hasMany(Zapas, {
  foreignKey: 'liga_id',
  as: 'zapasy',
  onDelete: 'RESTRICT', // Nemožno vymazať ligu so zápasmi
});

Zapas.belongsTo(Liga, {
  foreignKey: 'liga_id',
  as: 'liga',
});

// Liga -> LigaTabulka (1:N) - liga má jednu tabuľku s viacerými tímami
Liga.hasMany(LigaTabulka, {
  foreignKey: 'liga_id',
  as: 'tabulka',
  onDelete: 'CASCADE', // Ak sa vymaže liga, vymaže sa aj tabuľka
});

LigaTabulka.belongsTo(Liga, {
  foreignKey: 'liga_id',
  as: 'liga',
});

// Liga -> LigaTurnaj (1:1) - liga môže mať jeden turnaj
Liga.hasOne(LigaTurnaj, {
  foreignKey: 'liga_id',
  as: 'turnaj',
  onDelete: 'CASCADE', // Ak sa vymaže liga, vymaže sa aj turnaj
});

LigaTurnaj.belongsTo(Liga, {
  foreignKey: 'liga_id',
  as: 'liga',
});

// 5. LIGA TABULKA vzťahy - NOVÉ
// LigaTabulka -> Team (N:1) - každý záznam v tabuľke patrí k jednému tímu
LigaTabulka.belongsTo(Team, {
  foreignKey: 'tim_id',
  as: 'tim',
  onDelete: 'CASCADE', // Ak sa vymaže tím, vymaže sa aj jeho záznam v tabuľke
});

Team.hasMany(LigaTabulka, {
  foreignKey: 'tim_id',
  as: 'liga_pozicie',
  onDelete: 'CASCADE',
});

// 6. LIGA TURNAJ vzťahy - NOVÉ
// Turnaj -> Team (víťazi)
LigaTurnaj.belongsTo(Team, {
  foreignKey: 'vitaz_id',
  as: 'vitaz',
  constraints: false,
});

LigaTurnaj.belongsTo(Team, {
  foreignKey: 'druhy_id',
  as: 'druhy',
  constraints: false,
});

LigaTurnaj.belongsTo(Team, {
  foreignKey: 'treti_id',
  as: 'treti',
  constraints: false,
});

Team.hasMany(LigaTurnaj, {
  foreignKey: 'vitaz_id',
  as: 'vyhrate_turnaje',
  constraints: false,
});

Team.hasMany(LigaTurnaj, {
  foreignKey: 'druhy_id',
  as: 'druhe_miesta_turnaje',
  constraints: false,
});

Team.hasMany(LigaTurnaj, {
  foreignKey: 'treti_id',
  as: 'tretie_miesta_turnaje',
  constraints: false,
});

// 5. ZAPAS vzťahy - FÁZA 4
// Zapas -> Team (domáci tím)
Zapas.belongsTo(Team, {
  foreignKey: 'domaci_tim_id',
  as: 'domaci_tim',
});

Team.hasMany(Zapas, {
  foreignKey: 'domaci_tim_id',
  as: 'domace_zapasy',
});

// Zapas -> Team (hosťujúci tím)
Zapas.belongsTo(Team, {
  foreignKey: 'hostujuci_tim_id',
  as: 'hostujuci_tim',
});

Team.hasMany(Zapas, {
  foreignKey: 'hostujuci_tim_id',
  as: 'hostujuce_zapasy',
});

// Zapas -> Article (voliteľné prepojenie na reportáž)
Zapas.belongsTo(Article, {
  foreignKey: 'clanok_id',
  as: 'clanok',
  constraints: false,
});

Article.hasOne(Zapas, {
  foreignKey: 'clanok_id',
  as: 'zapas',
  constraints: false,
});

// 6. ZAPAS ŠTATISTIKY vzťahy - FÁZA 4
// Zapas -> ZapasStatistika (1:N) - zápas má viacero štatistík
Zapas.hasMany(ZapasStatistika, {
  foreignKey: 'zapas_id',
  as: 'statistiky',
  onDelete: 'CASCADE', // Ak sa vymaže zápas, vymažú sa aj štatistiky
});

ZapasStatistika.belongsTo(Zapas, {
  foreignKey: 'zapas_id',
  as: 'zapas',
});

// Player -> ZapasStatistika (1:N) - hráč môže mať viacero štatistík
Player.hasMany(ZapasStatistika, {
  foreignKey: 'hrac_id',
  as: 'statistiky',
  onDelete: 'CASCADE', // Ak sa vymaže hráč, vymažú sa aj jeho štatistiky
});

ZapasStatistika.belongsTo(Player, {
  foreignKey: 'hrac_id',
  as: 'hrac',
});

// Zapas -> Stadion (miesto konania)
Zapas.belongsTo(Stadion, {
  foreignKey: 'stadion_id',
  as: 'stadion',
  constraints: false,
});

// Zapas -> ZapasZostava (1:N) - zostava a lavička oboch tímov
Zapas.hasMany(ZapasZostava, {
  foreignKey: 'zapas_id',
  as: 'zostava',
  onDelete: 'CASCADE',
});

ZapasZostava.belongsTo(Zapas, {
  foreignKey: 'zapas_id',
  as: 'zapas',
});

ZapasZostava.belongsTo(Player, {
  foreignKey: 'hrac_id',
  as: 'hrac',
  constraints: false,
});

// Zapas -> ZapasUdalost (1:N) - voľný textový priebeh zápasu
Zapas.hasMany(ZapasUdalost, {
  foreignKey: 'zapas_id',
  as: 'udalosti',
  onDelete: 'CASCADE',
});

ZapasUdalost.belongsTo(Zapas, {
  foreignKey: 'zapas_id',
  as: 'zapas',
});

// ZapasStatistika -> Player (striedaný hráč pri striedaní)
ZapasStatistika.belongsTo(Player, {
  foreignKey: 'striedany_hrac_id',
  as: 'striedany_hrac',
  constraints: false,
});

// 7. FOTOGALÉRIA vzťahy - FÁZA 7 (NOVÉ)
// Galeria -> GaleriaObrazok (1:N) - galéria má viacero obrázkov
Galeria.hasMany(GaleriaObrazok, {
  foreignKey: 'galeria_id',
  as: 'obrazky',
  onDelete: 'CASCADE', // Ak sa vymaže galéria, vymažú sa aj obrázky
});

GaleriaObrazok.belongsTo(Galeria, {
  foreignKey: 'galeria_id',
  as: 'galeria',
});

// Galeria -> Team (voliteľné priradenie k tímu)
Galeria.belongsTo(Team, {
  foreignKey: 'tim_id',
  as: 'tim',
  constraints: false,
});

Team.hasMany(Galeria, {
  foreignKey: 'tim_id',
  as: 'galerie',
  constraints: false,
});

// Galeria -> Article (voliteľné priradenie k článku)
Galeria.belongsTo(Article, {
  foreignKey: 'clanok_id',
  as: 'clanok',
  constraints: false,
});

Article.hasMany(Galeria, {
  foreignKey: 'clanok_id',
  as: 'galerie',
  constraints: false,
});

// Galeria -> Zapas (voliteľné priradenie k zápasu)
Galeria.belongsTo(Zapas, {
  foreignKey: 'zapas_id',
  as: 'zapas',
  constraints: false,
});

Zapas.hasMany(Galeria, {
  foreignKey: 'zapas_id',
  as: 'galerie',
  constraints: false,
});


// ===== EXPORT VŠETKÝCH MODELOV =====

export {
  User,
  Category,
  Article,
  Team,
  Player,
  Staff,
  Liga,
  LigaTabulka,        
  LigaTurnaj, 
  Zapas,
  ZapasStatistika,
  ZapasZostava,
  ZapasUdalost,
  Page,
  Galeria,          
  GaleriaObrazok,   
};

// Export default objekt pre jednoduchší import
// Článok -> Komentár (1:N)
Article.hasMany(Komentar, { foreignKey: 'clanok_id', as: 'komentare', onDelete: 'CASCADE' });
Komentar.belongsTo(Article, { foreignKey: 'clanok_id', as: 'clanok' });

// Odpovede na komentár — komentár môže mať nadradený komentár
Komentar.hasMany(Komentar, { foreignKey: 'rodic_id', as: 'odpovede', onDelete: 'CASCADE' });
Komentar.belongsTo(Komentar, { foreignKey: 'rodic_id', as: 'rodic' });

// Zápas -> Video (1:N) — zostrih patrí ku konkrétnemu zápasu
Zapas.hasMany(Video, { foreignKey: 'zapas_id', as: 'videa' });
Video.belongsTo(Zapas, { foreignKey: 'zapas_id', as: 'zapas' });

// Hráč -> Súhlas (1:N) - na každý druh spracovania jeden záznam
Player.hasMany(Suhlas, { foreignKey: 'hrac_id', as: 'suhlasy', onDelete: 'CASCADE' });
Suhlas.belongsTo(Player, { foreignKey: 'hrac_id', as: 'hrac' });

// Používateľ -> AuditLog (1:N). Po zmazaní účtu záznamy zostávajú,
// inak by sa dala história zahladiť zmazaním vlastného účtu.
User.hasMany(AuditLog, { foreignKey: 'pouzivatel_id', as: 'audit_zaznamy' });
AuditLog.belongsTo(User, { foreignKey: 'pouzivatel_id', as: 'pouzivatel' });

// Sezóna -> Liga (1:N) - každá liga patrí do konkrétnej sezóny
Sezona.hasMany(Liga, { foreignKey: 'sezona_id', as: 'ligy' });
Liga.belongsTo(Sezona, { foreignKey: 'sezona_id', as: 'sezona_entita' });

// Súpiska prepája sezónu, tím a hráča
Sezona.hasMany(SupiskaSezony, { foreignKey: 'sezona_id', as: 'supisky' });
SupiskaSezony.belongsTo(Sezona, { foreignKey: 'sezona_id', as: 'sezona' });

Team.hasMany(SupiskaSezony, { foreignKey: 'tim_id', as: 'supisky', onDelete: 'CASCADE' });
SupiskaSezony.belongsTo(Team, { foreignKey: 'tim_id', as: 'tim' });

Player.hasMany(SupiskaSezony, { foreignKey: 'hrac_id', as: 'supisky', onDelete: 'CASCADE' });
SupiskaSezony.belongsTo(Player, { foreignKey: 'hrac_id', as: 'hrac' });

// User -> RefreshToken (1:N) - používateľ môže byť prihlásený na viacerých zariadeniach
User.hasMany(RefreshToken, { foreignKey: 'pouzivatel_id', as: 'obnovovacie_tokeny', onDelete: 'CASCADE' });
RefreshToken.belongsTo(User, { foreignKey: 'pouzivatel_id', as: 'pouzivatel' });

// User -> ResetHeslaToken (1:N)
User.hasMany(ResetHeslaToken, { foreignKey: 'pouzivatel_id', as: 'reset_tokeny', onDelete: 'CASCADE' });
ResetHeslaToken.belongsTo(User, { foreignKey: 'pouzivatel_id', as: 'pouzivatel' });

export default {
  User,
  RefreshToken,
  ResetHeslaToken,
  NastaveniaKlubu,
  Sezona,
  Stadion,
  KalendarUdalost,
  Media,
  SupiskaSezony,
  Suhlas,
  AuditLog,
  Sponzor,
  Dokument,
  Anketa,
  Fanusik,
  Komentar,
  Video,
  Category,
  Article,
  Team,
  Player,
  Staff,
  Liga,
  LigaTabulka,        
  LigaTurnaj,
  Zapas,
  ZapasStatistika,
  ZapasZostava,
  ZapasUdalost,
  Page,
  Galeria,           
  GaleriaObrazok,
};

// ===== HELPER FUNKCIE PRE VZŤAHY =====

// FÁZA 3 - Funkcie pre tímy a hráčov
export const getTeamWithDetails = async (teamId: number) => {
  return await Team.findByPk(teamId, {
    include: [
      {
        model: Player,
        as: 'hraci',
        where: { aktivity: true },
        required: false,
        order: [['cislo_dresu', 'ASC']]
      },
      {
        model: Staff,
        as: 'realizacny_tim',
        where: { aktivity: true },
        required: false,
        order: [['priezvisko', 'ASC']]
      }
    ]
  });
};

export const getTeamsWithStats = async () => {
  return await Team.findAll({
    where: { aktivity: true },
    include: [
      {
        model: Player,
        as: 'hraci',
        where: { aktivity: true },
        required: false,
        attributes: []
      },
      {
        model: Staff,
        as: 'realizacny_tim',
        where: { aktivity: true },
        required: false,
        attributes: []
      }
    ],
    order: [['poradie', 'ASC'], ['nazov', 'ASC']]
  });
};

// FÁZA 4 - Funkcie pre ligy a zápasy
export const getLeaguesWithStats = async () => {
  return await Liga.findAll({
    where: { aktivity: true },
    include: [
      {
        model: Zapas,
        as: 'zapasy',
        where: { aktivity: true },
        required: false,
        attributes: []
      }
    ],
    order: [['poradie', 'ASC'], ['nazov', 'ASC']]
  });
};

export const getMatchWithDetails = async (zapasId: number) => {
  return await Zapas.findByPk(zapasId, {
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
};

// helper funkcie pre stránky
export const getPublishedPages = async () => {
  return await Page.findAll({
    where: { 
      publikovany: true 
    },
    order: [['nazov', 'ASC']]
  });
};

export const getMenuPages = async () => {
  return await Page.findAll({
    where: { 
      publikovany: true,
      v_menu: true 
    },
    attributes: ['id', 'nazov', 'slug', 'poradie_menu'],
    order: [['poradie_menu', 'ASC'], ['nazov', 'ASC']]
  });
};

export const getUserWithTeam = async (userId: number) => {
  return await User.findByPk(userId, {
    include: [{
      model: Team,
      as: 'tim',
      attributes: ['id', 'nazov', 'vekova_kategoria']
    }]
  });
};

export const getTeamWithPlayers = async (teamId: number) => {
  return await Team.findByPk(teamId, {
    include: [
      {
        model: Player,
        as: 'hraci',
        where: { aktivity: true },
        required: false,
        order: [['cislo_dresu', 'ASC']]
      },
      {
        model: Staff,
        as: 'realizacny_tim',
        where: { aktivity: true },
        required: false,
        order: [['pozicia', 'ASC']]
      }
    ]
  });
};

export const getPageBySlug = async (slug: string) => {
  return await Page.findOne({
    where: { 
      slug,
      publikovany: true 
    }
  });
};

export const getAllPagesForAdmin = async () => {
  return await Page.findAll({
    order: [['vytvoreny', 'DESC']]
  });
};

export const getMatchesByTeam = async (teamId: number, limit: number = 10) => {
  return await Zapas.findAll({
    where: {
      aktivity: true,
      [Op.or]: [
        { domaci_tim_id: teamId },
        { hostujuci_tim_id: teamId }
      ]
    },
    include: [
      {
        model: Liga,
        as: 'liga',
        attributes: ['nazov', 'sezona']
      },
      {
        model: Team,
        as: 'domaci_tim',
        attributes: ['nazov']
      },
      {
        model: Team,
        as: 'hostujuci_tim',
        attributes: ['nazov']
      }
    ],
    order: [['datum_cas', 'DESC']],
    limit
  });
};

export const getMatchesByLeague = async (ligaId: number, limit: number = 20) => {
  return await Zapas.findAll({
    where: {
      liga_id: ligaId,
      aktivity: true
    },
    include: [
      {
        model: Team,
        as: 'domaci_tim',
        attributes: ['nazov']
      },
      {
        model: Team,
        as: 'hostujuci_tim',
        attributes: ['nazov']
      }
    ],
    order: [['datum_cas', 'DESC']],
    limit
  });
};

export const getPlayerStats = async (playerId: number) => {
  return await ZapasStatistika.findAll({
    where: {
      hrac_id: playerId,
      aktivity: true
    },
    include: [
      {
        model: Zapas,
        as: 'zapas',
        attributes: ['nazov', 'datum_cas'],
        include: [
          {
            model: Liga,
            as: 'liga',
            attributes: ['nazov']
          }
        ]
      }
    ],
    order: [['vytvoreny', 'DESC']]
  });
};

// POZNÁMKA: Pôvodná funkcia getTopScorers bola z tohto súboru odstránená.
// Robila SUM nad stĺpcom "goly", ktorý v tabuľke zapas_statistiky neexistuje
// (tabuľka má stĺpec "typ" s hodnotami gol/asistencia/karta), takže by pri
// zavolaní skončila SQL chybou. Nikde nebola použitá.
// Funkčná náhrada je v backend/src/controllers/ZapasStatistikaController.ts
// a je napojená na endpoint GET /api/leagues/:id/top-scorers.

// Funkcia pre získanie kalendára zápasov
export const getMatchCalendar = async (rok: number, mesiac: number) => {
  const startDate = new Date(rok, mesiac - 1, 1);
  const endDate = new Date(rok, mesiac, 0);

  return await Zapas.findAll({
    where: {
      datum_cas: {
        [Op.between]: [startDate, endDate]
      },
      aktivity: true
    },
    include: [
      {
        model: Liga,
        as: 'liga',
        attributes: ['nazov', 'typ']
      },
      {
        model: Team,
        as: 'domaci_tim',
        attributes: ['nazov']
      },
      {
        model: Team,
        as: 'hostujuci_tim',
        attributes: ['nazov']
      }
    ],
    order: [['datum_cas', 'ASC']]
  });
};

// Získanie ligy s kompletnou tabuľkou
export const getLeagueWithTable = async (ligaId: number) => {
  return await Liga.findByPk(ligaId, {
    include: [
      {
        model: LigaTabulka,
        as: 'tabulka',
        include: [
          {
            model: Team,
            as: 'tim',
            attributes: ['id', 'nazov', 'vekova_kategoria', 'logo', 'farba_prva']
          }
        ],
        order: [['pozicia', 'ASC']]
      },
      {
        model: LigaTurnaj,
        as: 'turnaj',
        required: false,
        include: [
          {
            model: Team,
            as: 'vitaz',
            attributes: ['id', 'nazov', 'logo'],
            required: false
          },
          {
            model: Team, 
            as: 'druhy',
            attributes: ['id', 'nazov', 'logo'],
            required: false
          },
          {
            model: Team,
            as: 'treti', 
            attributes: ['id', 'nazov', 'logo'],
            required: false
          }
        ]
      }
    ]
  });
};

// Získanie tabuľky pre ligu s kompletními štatistikami
export const getLeagueTable = async (ligaId: number, includeInactive: boolean = false) => {
  const whereCondition: any = { liga_id: ligaId };
  
  return await LigaTabulka.findAll({
    where: whereCondition,
    include: [
      {
        model: Team,
        as: 'tim',
        attributes: ['id', 'nazov', 'vekova_kategoria', 'logo', 'farba_prva', 'aktivity'],
        where: includeInactive ? undefined : { aktivity: true },
        required: false, // OPRAVENÉ: LEFT JOIN namiesto INNER JOIN
      },
      {
        model: Liga,
        as: 'liga',
        attributes: ['id', 'nazov', 'sezona', 'body_za_vitazstvo', 'body_za_remizy', 'zobrazit_formu'],
        required: false // Aj toto by malo byť false
      }
    ],
    order: [['pozicia', 'ASC']]
  });
};

// Automatické prepočítanie tabuľky na základe zápasov
export const recalculateLeagueTable = async (ligaId: number) => {
  const liga = await Liga.findByPk(ligaId);
  if (!liga) throw new Error('Liga nenájdená');
  
  if (!liga.auto_update_tabulka) {
    throw new Error('Automatická aktualizácia tabuľky je vypnutá pre túto ligu');
  }

  // Zavolanie statickej metódy z LigaTabulka modelu
  await LigaTabulka.recalculateTable(
    ligaId, 
    liga.body_za_vitazstvo, 
    liga.body_za_remizy
  );
  
  // Aktualizácia Liga modelu
  await Liga.update(
    { aktualizovany: new Date() },
    { where: { id: ligaId } }
  );

  return await getLeagueTable(ligaId);
};

// Získanie turnaja pre ligu
export const getLeagueTournament = async (ligaId: number) => {
  return await LigaTurnaj.getForLeague(ligaId);
};

// Získanie štatistík ligy
export const getLeagueStats = async (ligaId: number) => {
  // Počet zápasov
  const celkoveZapasy = await Zapas.count({
    where: { liga_id: ligaId, aktivity: true }
  });

  const ukonceneZapasy = await Zapas.count({
    where: { liga_id: ligaId, aktivity: true, status: 'ukonceny' }
  });

  const naplanovaneZapasy = await Zapas.count({
    where: { liga_id: ligaId, aktivity: true, status: 'naplanovany' }
  });

  // Počet tímov v tabuľke
  const pocetTimov = await LigaTabulka.count({
    where: { liga_id: ligaId }
  });

  // Celkový počet gólov
  const golyStats = await Zapas.findAll({
    where: { 
      liga_id: ligaId, 
      aktivity: true, 
      status: 'ukonceny',
      goly_domaci: { [Op.ne]: null },
      goly_hostia: { [Op.ne]: null }
    },
    attributes: [
      [require('sequelize').fn('SUM', require('sequelize').col('goly_domaci')), 'celkove_goly_domaci'],
      [require('sequelize').fn('SUM', require('sequelize').col('goly_hostia')), 'celkove_goly_hostia'],
      [require('sequelize').fn('AVG', require('sequelize').col('goly_domaci')), 'priemer_goly_domaci'],
      [require('sequelize').fn('AVG', require('sequelize').col('goly_hostia')), 'priemer_goly_hostia']
    ],
    raw: true
  });

  // POZOR: PostgreSQL driver vracia výsledky SUM a AVG ako reťazce.
  // Bez prevodu na číslo by "12" + "8" dalo "128" namiesto 20,
  // takže štatistika celkových gólov ukazovala nezmyselné hodnoty.
  const naCislo = (hodnota: any): number => {
    const cislo = Number(hodnota);
    return Number.isFinite(cislo) ? cislo : 0;
  };

  const surovyRiadok = golyStats[0] as any;
  const golyDomaci = naCislo(surovyRiadok?.celkove_goly_domaci);
  const golyHostia = naCislo(surovyRiadok?.celkove_goly_hostia);
  const celkoveGoly = golyDomaci + golyHostia;
  const priemerGolovNaZapas = ukonceneZapasy > 0 ? (celkoveGoly / ukonceneZapasy).toFixed(2) : '0.00';

  // Lídri tabuľky
  const lidriTabulky = await LigaTabulka.findAll({
    where: { liga_id: ligaId },
    include: [
      {
        model: Team,
        as: 'tim',
        attributes: ['nazov', 'logo']
      }
    ],
    order: [['pozicia', 'ASC']],
    limit: 3
  });

  return {
    celkove_zapasy: celkoveZapasy,
    ukoncene_zapasy: ukonceneZapasy,
    naplanovane_zapasy: naplanovaneZapasy,
    pocet_timov: pocetTimov,
    celkove_goly: celkoveGoly,
    priemer_golov_na_zapas: priemerGolovNaZapas,
    lidri_tabulky: lidriTabulky.map(t => ({
      pozicia: t.pozicia,
      tim_nazov: t.tim?.nazov || t.custom_tim_nazov,
      body: t.body,
      zapasy: t.zapasy,
      logo: t.tim?.logo
    }))
  };
};

// Získanie kompletného prehľadu ligy (tabuľka + turnaj + štatistiky)
export const getLeagueOverview = async (ligaId: number) => {
  const [liga, tabulka, turnaj, stats] = await Promise.all([
    Liga.findByPk(ligaId),
    getLeagueTable(ligaId),
    getLeagueTournament(ligaId),
    getLeagueStats(ligaId)
  ]);

  if (!liga) throw new Error('Liga nenájdená');

  return {
    liga: liga.toSafeJSON(),
    tabulka: tabulka?.map(t => t.toSafeJSON()) || [],
    turnaj: turnaj?.toSafeJSON() || null,
    statistiky: stats
  };
};

// Import/Export funkcionalita
export const exportLeagueTable = async (ligaId: number, format: 'json' | 'csv' = 'json') => {
  const tabulka = await getLeagueTable(ligaId);
  
  if (format === 'csv') {
    // CSV export
    const headers = [
      'Pozícia', 'Tím', 'Zápasy', 'Víťazstvá', 'Remízy', 'Prehry', 
      'Góly za', 'Góly proti', 'Rozdiel', 'Body', 'Forma'
    ].join(',');
    
    const rows = tabulka.map(t => [
      t.pozicia,
      `"${t.getTimNazov()}"`,
      t.zapasy,
      t.vitazstva,
      t.remizy,
      t.prehry,
      t.goly_za,
      t.goly_proti,
      t.goly_rozdiel,
      t.getSkutocneBody(),
      `"${t.forma || ''}"`
    ].join(','));

    return [headers, ...rows].join('\n');
  }

  // JSON export
  return JSON.stringify(tabulka.map(t => t.toSafeJSON()), null, 2);
};

export const importLeagueTable = async (ligaId: number, data: any[], format: 'json' | 'csv' = 'json') => {
  const liga = await Liga.findByPk(ligaId);
  if (!liga) throw new Error('Liga nenájdená');

  // Validation
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error('Neplatné dáta pre import');
  }

  // Backup existujúcej tabuľky
  const existingTable = await LigaTabulka.findAll({
    where: { liga_id: ligaId }
  });

  try {
    // Vymazanie existujúcej tabuľky
    await LigaTabulka.destroy({
      where: { liga_id: ligaId }
    });

    // Import nových dát
    const importData = data.map((item, index) => ({
      liga_id: ligaId,
      tim_id: item.tim_id,
      custom_tim_nazov: item.custom_tim_nazov,
      pozicia: item.pozicia || (index + 1),
      body: item.body || 0,
      zapasy: item.zapasy || 0,
      vitazstva: item.vitazstva || 0,
      remizy: item.remizy || 0,
      prehry: item.prehry || 0,
      goly_za: item.goly_za || 0,
      goly_proti: item.goly_proti || 0,
      goly_rozdiel: (item.goly_za || 0) - (item.goly_proti || 0),
      forma: item.forma,
      manualne_upravene: true,
      poznamky: `Importované ${new Date().toISOString()}`
    }));

    await LigaTabulka.bulkCreate(importData);

    // Aktualizácia ligy
    await Liga.update(
      { 
        posledny_import: new Date(),
        aktualizovany: new Date()
      },
      { where: { id: ligaId } }
    );

    return await getLeagueTable(ligaId);

  } catch (error) {
    // Rollback - obnovenie existujúcej tabuľky
    await LigaTabulka.destroy({ where: { liga_id: ligaId } });
    
    if (existingTable.length > 0) {
      await LigaTabulka.bulkCreate(existingTable.map(t => t.toJSON()));
    }
    
    throw error;
  }
};

// FÁZA 7 - Helper funkcie pre fotogalérie (NOVÉ)
export const getGalleryWithImages = async (galeriaId: number) => {
  return await Galeria.findByPk(galeriaId, {
    include: [
      {
        model: GaleriaObrazok,
        as: 'obrazky',
        where: { aktivity: true },
        required: false,
        order: [['poradie', 'ASC'], ['vytvoreny', 'ASC']]
      },
      {
        model: Team,
        as: 'tim',
        attributes: ['id', 'nazov'],
        required: false
      },
      {
        model: Article,
        as: 'clanok',
        attributes: ['id', 'nazov', 'slug'],
        required: false
      },
      {
        model: Zapas,
        as: 'zapas',
        attributes: ['id', 'nazov', 'datum_cas'],
        required: false
      }
    ]
  });
};

export const getGalleriesByType = async (typ: 'tim' | 'clanok' | 'zapas' | 'volna', objectId?: number) => {
  const whereClause: any = { aktivity: true };
  
  if (typ === 'volna') {
    whereClause.tim_id = null;
    whereClause.clanok_id = null;
    whereClause.zapas_id = null;
  } else if (objectId) {
    whereClause[`${typ}_id`] = objectId;
  }

  return await Galeria.findAll({
    where: whereClause,
    include: [
      {
        model: GaleriaObrazok,
        as: 'obrazky',
        where: { aktivity: true },
        required: false,
        attributes: ['id', 'cesta_suboru', 'nahladovy_maly'],
        limit: 1, // Len náhľadový obrázok
        order: [['je_nahladovy', 'DESC'], ['poradie', 'ASC']]
      }
    ],
    order: [['vytvoreny', 'DESC']]
  });
};

export const getAllGalleriesForAdmin = async () => {
  return await Galeria.findAll({
    where: { aktivity: true }, // PRIDAŤ túto podmienku!
    include: [
      {
        model: GaleriaObrazok,
        as: 'obrazky',
        where: { aktivity: true },
        required: false,
        attributes: ['id'],
        limit: 1 // Len pre počet
      },
      {
        model: Team,
        as: 'tim',
        attributes: ['id', 'nazov'],
        required: false
      },
      {
        model: Article,
        as: 'clanok',
        attributes: ['id', 'nazov'],
        required: false
      },
      {
        model: Zapas,
        as: 'zapas',
        attributes: ['id', 'nazov'],
        required: false
      }
    ],
    order: [['vytvoreny', 'DESC']]
  });
};