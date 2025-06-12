// backend/src/models/Category.ts
// Model pre rubriky (kategórie článkov)

import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

// Interface pre Category atribúty
export interface CategoryAttributes {
  id: number;
  nazov: string;
  slug: string;
  popis?: string | null;
  farba?: string | null; // Hex farba pre frontend (#ff0000)
  ikona?: string | null; // Emoji alebo CSS trieda
  poradie: number; // Pre zoradenie v menu
  aktivity: boolean;
  vytvoreny: Date;
  aktualizovany: Date;
}

// Interface pre vytvorenie kategórie (bez auto-generovaných polí)
export interface CategoryCreationAttributes extends Optional<CategoryAttributes, 'id' | 'slug' | 'vytvoreny' | 'aktualizovany'> {}

// Sequelize Model class
export class Category extends Model<CategoryAttributes, CategoryCreationAttributes> implements CategoryAttributes {
  public id!: number;
  public nazov!: string;
  public slug!: string;
  public popis!: string | null;
  public farba!: string | null;
  public ikona!: string | null;
  public poradie!: number;
  public aktivity!: boolean;
  public readonly vytvoreny!: Date;
  public readonly aktualizovany!: Date;

  // Statická metóda pre generovanie slug
  public static generateSlug(nazov: string): string {
    return nazov
      .toLowerCase()
      .normalize('NFD') // Rozdelí diakritiku
      .replace(/[\u0300-\u036f]/g, '') // Odstráni diakritiku
      .replace(/[^a-z0-9\s-]/g, '') // Odstráni špeciálne znaky
      .trim()
      .replace(/\s+/g, '-') // Nahradí medzery pomlčkami
      .replace(/-+/g, '-'); // Odstráni viacnásobné pomlčky
  }

  // Metóda pre získanie bezpečných údajov
  public toSafeJSON() {
    return {
      id: this.id,
      nazov: this.nazov,
      slug: this.slug,
      popis: this.popis,
      farba: this.farba,
      ikona: this.ikona,
      poradie: this.poradie,
      aktivity: this.aktivity,
      vytvoreny: this.vytvoreny,
      aktualizovany: this.aktualizovany,
    };
  }
}

// Definícia modelu v databáze
Category.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    nazov: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
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
        is: /^[a-z0-9-]+$/i, // Len malé písmená, číslice a pomlčky
      },
    },
    popis: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    farba: {
      type: DataTypes.STRING(7),
      allowNull: true,
      validate: {
        is: /^#[0-9A-F]{6}$/i, // Hex farba (#RRGGBB)
      },
    },
    ikona: {
      type: DataTypes.STRING(50),
      allowNull: true,
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
    tableName: 'rubriky',
    timestamps: true,
    createdAt: 'vytvoreny',
    updatedAt: 'aktualizovany',
    hooks: {
      // Automatické generovanie slug pred vytvorením
      beforeCreate: async (category: Category) => {
        if (!category.slug) {
          category.slug = Category.generateSlug(category.nazov);
        }
      },
      beforeUpdate: async (category: Category) => {
        if (category.changed('nazov') && !category.changed('slug')) {
          category.slug = Category.generateSlug(category.nazov);
        }
      },
    },
    indexes: [
      {
        unique: true,
        fields: ['slug'],
      },
      {
        fields: ['aktivity'],
      },
      {
        fields: ['poradie'],
      },
    ],
  }
);

export default Category;