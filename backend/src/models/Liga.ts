// backend/src/models/Liga.ts
// Model pre ligy - FÁZA 4

import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

// Interface pre atribúty Ligy
interface LigaAttributes {
  id: number;
  nazov: string;
  sezona: string;
  typ: 'sutaz' | 'pohar' | 'priatelska';
  popis?: string | null;
  external_widget_url?: string | null;
  logo?: string | null;
  farba?: string | null;
  poradie: number;
  aktivity: boolean;
  vytvoreny: Date;
  aktualizovany: Date;
}

// Interface pre vytvorenie novej Ligy (bez automatických polí)
interface LigaCreationAttributes extends Optional<LigaAttributes, 'id' | 'popis' | 'external_widget_url' | 'logo' | 'farba' | 'poradie' | 'aktivity' | 'vytvoreny' | 'aktualizovany'> {}

// Trieda pre model Liga
class Liga extends Model<LigaAttributes, LigaCreationAttributes> implements LigaAttributes {
  public id!: number;
  public nazov!: string;
  public sezona!: string;
  public typ!: 'sutaz' | 'pohar' | 'priatelska';
  public popis!: string | null;
  public external_widget_url!: string | null;
  public logo!: string | null;
  public farba!: string | null;
  public poradie!: number;
  public aktivity!: boolean;
  public vytvoreny!: Date;
  public aktualizovany!: Date;

  // Helper method - vracia plný názov s sezónou
  public getFullName(): string {
    return `${this.nazov} ${this.sezona}`;
  }

  // Helper method - vracia typ čitateľne
  public getTypeName(): string {
    const types = {
      'sutaz': 'Súťaž',
      'pohar': 'Pohár', 
      'priatelska': 'Priateľská'
    };
    return types[this.typ] || this.typ;
  }

  // Helper method - kontroluje či má external widget
  public hasExternalWidget(): boolean {
    return !!(this.external_widget_url && this.external_widget_url.length > 0);
  }

  // Helper method pre JSON response (bez citlivých dát)
  public toSafeJSON() {
    return {
      id: this.id,
      nazov: this.nazov,
      sezona: this.sezona,
      typ: this.typ,
      popis: this.popis,
      external_widget_url: this.external_widget_url,
      logo: this.logo,
      farba: this.farba,
      poradie: this.poradie,
      aktivity: this.aktivity,
      full_name: this.getFullName(),
      typ_name: this.getTypeName(),
      has_external_widget: this.hasExternalWidget(),
      vytvoreny: this.vytvoreny,
      aktualizovany: this.aktualizovany,
    };
  }
}

// Definícia modelu v databáze
Liga.init(
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
    sezona: {
      type: DataTypes.STRING(20),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [4, 20], // napr. "2024/2025" alebo "2024"
        is: /^[0-9/\-\s]+$/, // Len čísla, lomky, pomlčky a medzery
      },
    },
    typ: {
      type: DataTypes.ENUM('sutaz', 'pohar', 'priatelska'),
      allowNull: false,
      defaultValue: 'sutaz',
    },
    popis: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    external_widget_url: {
      type: DataTypes.STRING(500),
      allowNull: true,
      validate: {
        isUrl: true,
      },
    },
    logo: {
      type: DataTypes.STRING(255),
      allowNull: true,
      validate: {
        isUrl: true,
      },
    },
    farba: {
      type: DataTypes.STRING(7), // Pre hex farby #RRGGBB
      allowNull: true,
      validate: {
        is: /^#[0-9A-F]{6}$/i,
      },
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
    tableName: 'ligy',
    timestamps: true,
    createdAt: 'vytvoreny',
    updatedAt: 'aktualizovany',
    indexes: [
      {
        unique: true,
        fields: ['nazov', 'sezona'], // Jedinečná kombinácia názvu a sezóny
      },
      {
        fields: ['typ'],
      },
      {
        fields: ['aktivity'],
      },
      {
        fields: ['poradie'],
      },
    ],
    hooks: {
      // Hook pre automatické generovanie poradia
      beforeCreate: async (liga: Liga) => {
        if (liga.poradie === 0) {
          const maxPoradie = await Liga.max('poradie', {
            where: { aktivity: true }
          }) as number;
          liga.poradie = (maxPoradie || 0) + 1;
        }
      },
    },
  }
);

export default Liga;