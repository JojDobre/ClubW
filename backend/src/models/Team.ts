// backend/src/models/Team.ts
// Model pre tímy - FÁZA 3

import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

// Forward declarations pre TypeScript associations
class Player extends Model {}
class Staff extends Model {}
class User extends Model {}

// Interface pre Team atribúty
export interface TeamAttributes {
  id: number;
  nazov: string;
  slug: string;
  typ: 'muzi' | 'zeny' | 'mladez';
  vekova_kategoria: string; // Napríklad: U9, U13, U16, U21, seniori
  popis?: string | null;
  /** Domáci štadión - miesto domácich zápasov sa z neho dopĺňa automaticky */
  stadion_id?: number | null;
  /** Sezóna, do ktorej tím patrí */
  sezona_id?: number | null;
  logo?: string | null; // URL loga tímu
  farba_prva?: string | null; // Hex farba prvého dresu
  farba_druha?: string | null; // Hex farba druhého dresu
  poradie: number; // Pre zoradenie tímov
  aktivity: boolean;
  vytvoreny: Date;
  aktualizovany: Date;
}

// Interface pre vytvorenie tímu (bez auto-generovaných polí)
export interface TeamCreationAttributes extends Optional<TeamAttributes, 'id' | 'slug' | 'aktivity' | 'vytvoreny' | 'aktualizovany'> {}

// Sequelize Model class
export class Team extends Model<TeamAttributes, TeamCreationAttributes> implements TeamAttributes {
  public id!: number;
  public nazov!: string;
  public slug!: string;
  public typ!: 'muzi' | 'zeny' | 'mladez';
  public vekova_kategoria!: string;
  public popis!: string | null;
  public stadion_id!: number | null;
  public sezona_id!: number | null;
  public logo!: string | null;
  public farba_prva!: string | null;
  public farba_druha!: string | null;
  public poradie!: number;
  public aktivity!: boolean;
  public readonly vytvoreny!: Date;
  public readonly aktualizovany!: Date;

  // Association properties (pre TypeScript)
  public hraci?: Player[];
  public realizacny_tim?: Staff[];
  public pouzivatelia?: User[];

  // Statická metóda pre generovanie slug
  public static generateSlug(nazov: string): string {
    return nazov
      .toLowerCase()
      .normalize('NFD') // Rozdelí diakritiku
      .replace(/[\u0300-\u036f]/g, '') // Odstráni diakritiku
      .replace(/[^a-z0-9\s-]/g, '') // Odstráni špeciálne znaky
      .trim()
      .replace(/\s+/g, '-') // Nahradí medzery pomlčkami
      .replace(/-+/g, '-') // Odstráni viacnásobné pomlčky
      .replace(/^-+|-+$/g, ''); // Odstráni pomlčky na začiatku a konci
  }

  // Metóda pre získanie bezpečných údajov
  public toSafeJSON() {
    return {
      id: this.id,
      nazov: this.nazov,
      slug: this.slug,
      typ: this.typ,
      vekova_kategoria: this.vekova_kategoria,
      popis: this.popis,
      stadion_id: this.stadion_id,
      sezona_id: this.sezona_id,
      logo: this.logo,
      farba_prva: this.farba_prva,
      farba_druha: this.farba_druha,
      poradie: this.poradie,
      aktivity: this.aktivity,
      vytvoreny: this.vytvoreny,
      aktualizovany: this.aktualizovany,
    };
  }

  // Metóda pre získanie pekného názvu s kategóriou
  public getFullName(): string {
    return `${this.nazov} ${this.vekova_kategoria}`;
  }
}

// Definícia modelu v databáze
Team.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    nazov: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [2, 100],
      },
    },
    slug: {
      type: DataTypes.STRING(120),
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true,
        len: [2, 120],
      },
    },
    typ: {
      type: DataTypes.ENUM('muzi', 'zeny', 'mladez'),
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
    vekova_kategoria: {
      type: DataTypes.STRING(20),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [2, 20],
      },
      comment: 'Napríklad: U9, U13, U16, U21, seniori, ženy'
    },
    popis: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    stadion_id: {
      // Voliteľné - nie každý tím má vlastný štadión.
      // Pri zmazaní štadióna sa len vynuluje, tím zostáva.
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'stadiony', key: 'id' },
    },
    sezona_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'sezony', key: 'id' },
    },
    logo: {
      type: DataTypes.STRING(500),
      allowNull: true,
      validate: {
        isUrl: true,
      },
    },
    farba_prva: {
      type: DataTypes.STRING(7),
      allowNull: true,
      validate: {
        is: /^#[0-9A-F]{6}$/i, // Hex farba validácia
      },
      comment: 'Hex farba prvého dresu (napríklad #FF0000)'
    },
    farba_druha: {
      type: DataTypes.STRING(7),
      allowNull: true,
      validate: {
        is: /^#[0-9A-F]{6}$/i, // Hex farba validácia
      },
      comment: 'Hex farba druhého dresu (napríklad #0000FF)'
    },
    poradie: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },
    aktivity: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    vytvoreny: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    aktualizovany: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'timy',
    timestamps: true,
    createdAt: 'vytvoreny',
    updatedAt: 'aktualizovany',
    hooks: {
      // Automatické generovanie slug pred vytvorením
      beforeCreate: async (team: Team) => {
        if (!team.slug && team.nazov) {
          team.slug = Team.generateSlug(`${team.nazov}-${team.vekova_kategoria}`);
        }
      },
      beforeUpdate: async (team: Team) => {
        if (team.changed('nazov') || team.changed('vekova_kategoria')) {
          team.slug = Team.generateSlug(`${team.nazov}-${team.vekova_kategoria}`);
        }
      },
    },
    indexes: [
      {
        unique: true,
        fields: ['slug']
      },
      {
        fields: ['typ']
      },
      {
        fields: ['aktivity']
      },
      {
        fields: ['poradie']
      }
    ]
  }
);

export default Team;