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
import Zapas from './Zapas';
import ZapasStatistika from './ZapasStatistika';
import Page from './Page';

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

// 4. LIGA vzťahy - FÁZA 4
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

// ===== EXPORT VŠETKÝCH MODELOV =====

export {
  User,
  Category,
  Article,
  Team,
  Player,
  Staff,
  Liga,
  Zapas,
  ZapasStatistika,
  Page,
};

// Export default objekt pre jednoduchší import
export default {
  User,
  Category,
  Article,
  Team,
  Player,
  Staff,
  Liga,
  Zapas,
  ZapasStatistika,
  Page,
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

export const getTopScorers = async (ligaId?: number, limit: number = 10) => {
  const whereConditions: any = {
    typ: 'gol',
    aktivity: true
  };

  const includeConditions: any[] = [
    {
      model: Player,
      as: 'hrac',
      attributes: ['id', 'meno', 'priezvisko', 'cislo_dresu']
    },
    {
      model: Zapas,
      as: 'zapas',
      attributes: ['id'],
      where: { aktivity: true }
    }
  ];

  if (ligaId) {
    includeConditions[1].include = [
      {
        model: Liga,
        as: 'liga',
        where: { id: ligaId }
      }
    ];
  }

  return await ZapasStatistika.findAll({
    where: whereConditions,
    include: includeConditions,
    attributes: [
      'hrac_id',
      [ZapasStatistika.sequelize?.fn('COUNT', '*') as any, 'goly_count']
    ],
    group: ['hrac_id', 'hrac.id'],
    order: [[ZapasStatistika.sequelize?.col('goly_count') as any, 'DESC']],
    limit
  });
};

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