// backend/src/models/index.ts
// Definícia vzťahov medzi všetkými modelmi - FÁZA 3 KOMPLETNÁ

import User from './user';
import Category from './Category';
import Article from './Article';
import Team from './Team';
import Player from './Player';
import Staff from './Staff';

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

// ===== EXPORT VŠETKÝCH MODELOV =====

export {
  User,
  Category,
  Article,
  Team,
  Player,
  Staff,
};

// Export default objekt pre jednoduchší import
export default {
  User,
  Category,
  Article,
  Team,
  Player,
  Staff,
};

// ===== HELPER FUNKCIE PRE VZŤAHY =====

// Funkcia pre načítanie tímu s hráčmi a realizačným tímom
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
        order: [['poradie', 'ASC']]
      }
    ]
  });
};

// Funkcia pre načítanie všetkých tímov s počtom hráčov
export const getTeamsWithStats = async () => {
  return await Team.findAll({
    where: { aktivity: true },
    include: [
      {
        model: Player,
        as: 'hraci',
        attributes: [],
        where: { aktivity: true },
        required: false
      },
      {
        model: Staff,
        as: 'realizacny_tim',
        attributes: [],
        where: { aktivity: true },
        required: false
      }
    ],
    attributes: {
      include: [
        // Počet aktívnych hráčov
        [
          require('sequelize').fn('COUNT', 
            require('sequelize').fn('DISTINCT', 
              require('sequelize').col('hraci.id')
            )
          ),
          'pocet_hracov'
        ],
        // Počet členov realizačného tímu
        [
          require('sequelize').fn('COUNT', 
            require('sequelize').fn('DISTINCT', 
              require('sequelize').col('realizacny_tim.id')
            )
          ),
          'pocet_realizacny_tim'
        ]
      ]
    },
    group: ['Team.id'],
    order: [['poradie', 'ASC']]
  });
};

// Funkcia pre vyhľadávanie hráčov naprieč tímami
export const searchPlayers = async (searchTerm: string) => {
  const { Op } = require('sequelize');
  
  return await Player.findAll({
    where: {
      aktivity: true,
      [Op.or]: [
        { meno: { [Op.iLike]: `%${searchTerm}%` } },
        { priezvisko: { [Op.iLike]: `%${searchTerm}%` } },
        { pozicia: { [Op.iLike]: `%${searchTerm}%` } }
      ]
    },
    include: [
      {
        model: Team,
        as: 'tim',
        attributes: ['id', 'nazov', 'vekova_kategoria', 'typ']
      }
    ],
    order: [['priezvisko', 'ASC'], ['meno', 'ASC']]
  });
};

// Funkcia pre načítanie článkov s informáciami o autorovi a kategórii
export const getArticlesWithDetails = async (limit = 10, offset = 0) => {
  return await Article.findAndCountAll({
    where: { status: 'published' },
    include: [
      {
        model: User,
        as: 'autor',
        attributes: ['id', 'meno', 'email']
      },
      {
        model: Category,
        as: 'kategoria',
        attributes: ['id', 'nazov', 'slug', 'farba', 'ikona']
      }
    ],
    order: [['publikovany_datum', 'DESC']],
    limit,
    offset
  });
};

// ===== TYPY PRE TYPESCRIPT =====

// Typ pre tím s detailmi
export interface TeamWithDetails {
  id: number;
  nazov: string;
  typ: string;
  vekova_kategoria: string;
  hraci?: Player[];
  realizacny_tim?: Staff[];
  pocet_hracov?: number;
  pocet_realizacny_tim?: number;
}

// Typ pre hráča s tímom
export interface PlayerWithTeam extends Player {
  tim?: Team;
}

// Typ pre článok s autormi a kategóriou
export interface ArticleWithDetails extends Article {
  autor?: User;
  kategoria?: Category;
}