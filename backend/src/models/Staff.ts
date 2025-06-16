// backend/src/models/Staff.ts
// Model pre realizačný tím - FÁZA 3

import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

// Forward declaration pre TypeScript association
class Team extends Model {}

// Interface pre Staff atribúty
export interface StaffAttributes {
  id: number;
  meno: string;
  priezvisko: string;
  funkcia: string; // Napríklad: hlavný tréner, asistent, lekár, masér, manažer
  email?: string | null;
  telefon?: string | null;
  datum_narodenia?: Date | null;
  kvalifikacia?: string | null; // Trénerské licencie, vzdelanie
  fotka?: string | null; // URL fotky
  tim_id?: number | null; // Foreign key na tím (voliteľné - môže byť pre celý klub)
  aktivity: boolean;
  poznamky?: string | null; // Interné poznámky
  poradie: number; // Pre zoradenie v zozname
  vytvoreny: Date;
  aktualizovany: Date;
}

// Interface pre vytvorenie člena realizačného tímu (bez auto-generovaných polí)
export interface StaffCreationAttributes extends Optional<StaffAttributes, 'id' | 'aktivity' | 'poradie' | 'vytvoreny' | 'aktualizovany'> {}

// Sequelize Model class
export class Staff extends Model<StaffAttributes, StaffCreationAttributes> implements StaffAttributes {
  public id!: number;
  public meno!: string;
  public priezvisko!: string;
  public funkcia!: string;
  public email!: string | null;
  public telefon!: string | null;
  public datum_narodenia!: Date | null;
  public kvalifikacia!: string | null;
  public fotka!: string | null;
  public tim_id!: number | null;
  public aktivity!: boolean;
  public poznamky!: string | null;
  public poradie!: number;
  public readonly vytvoreny!: Date;
  public readonly aktualizovany!: Date;

  // Association properties (pre TypeScript)
  public tim?: Team;

  // Metóda pre získanie celého mena
  public getFullName(): string {
    return `${this.meno} ${this.priezvisko}`;
  }

  // Metóda pre výpočet veku (ak je datum narodenia zadaný)
  public getAge(): number | null {
    if (!this.datum_narodenia) return null;
    
    const today = new Date();
    const birthDate = new Date(this.datum_narodenia);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  }

  // Metóda pre získanie kontaktných údajov
  public getContactInfo(): { email?: string; telefon?: string } {
    const contact: { email?: string; telefon?: string } = {};
    
    if (this.email) contact.email = this.email;
    if (this.telefon) contact.telefon = this.telefon;
    
    return contact;
  }

  // Metóda pre kontrolu či má kontaktné údaje
  public hasContactInfo(): boolean {
    return !!(this.email || this.telefon);
  }

  // Metóda pre získanie bezpečných údajov
  public toSafeJSON() {
    return {
      id: this.id,
      meno: this.meno,
      priezvisko: this.priezvisko,
      funkcia: this.funkcia,
      email: this.email,
      telefon: this.telefon,
      datum_narodenia: this.datum_narodenia,
      kvalifikacia: this.kvalifikacia,
      fotka: this.fotka,
      tim_id: this.tim_id,
      aktivity: this.aktivity,
      poznamky: this.poznamky,
      poradie: this.poradie,
      vytvoreny: this.vytvoreny,
      aktualizovany: this.aktualizovany,
      // Vypočítané hodnoty
      full_name: this.getFullName(),
      vek: this.getAge(),
      kontakt: this.getContactInfo(),
      ma_kontakt: this.hasContactInfo(),
    };
  }

  // Statická metóda pre získanie dostupných funkcií
  public static getAvailableFunctions(): string[] {
    return [
      'hlavný tréner',
      'asistent trénera',
      'tréner brankárov',
      'fyzioterapeut',
      'lekár',
      'masér',
      'manažer',
      'sekretár',
      'vedúci mužstva',
      'skaut',
      'kondičný tréner',
      'mentálny kouč',
      'ostatné'
    ];
  }
}

// Definícia modelu v databáze
Staff.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    meno: {
      type: DataTypes.STRING(50),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [2, 50],
      },
    },
    priezvisko: {
      type: DataTypes.STRING(50),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [2, 50],
      },
    },
    funkcia: {
      type: DataTypes.STRING(50),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [2, 50],
      },
      comment: 'Funkcia v realizačnom tíme (tréner, lekár, masér, etc.)'
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: true,
      validate: {
        isEmail: true,
      },
    },
    telefon: {
      type: DataTypes.STRING(20),
      allowNull: true,
      validate: {
        len: [9, 20], // Minimálne 9 znakov pre telefónne číslo
      },
    },
    datum_narodenia: {
      type: DataTypes.DATEONLY, // Len dátum bez času
      allowNull: true,
      validate: {
        isDate: true,
        isBefore: new Date().toISOString(), // Nemôže byť v budúcnosti
      },
    },
    kvalifikacia: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Trénerské licencie, vzdelanie, certifikáty'
    },
    fotka: {
      type: DataTypes.STRING(500),
      allowNull: true,
      validate: {
        isUrl: true,
      },
    },
    tim_id: {
      type: DataTypes.INTEGER,
      allowNull: true, // Môže byť null - člen pracuje pre celý klub
      references: {
        model: 'timy',
        key: 'id',
      },
      onDelete: 'SET NULL', // Ak sa vymaže tím, nastaví sa na NULL
      onUpdate: 'CASCADE',
    },
    aktivity: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    poznamky: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    poradie: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
      },
      comment: 'Poradie zobrazovania v zozname'
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
    tableName: 'realizacny_tim',
    timestamps: true,
    createdAt: 'vytvoreny',
    updatedAt: 'aktualizovany',
    indexes: [
      {
        fields: ['tim_id']
      },
      {
        fields: ['aktivity']
      },
      {
        fields: ['funkcia']
      },
      {
        fields: ['poradie']
      },
      {
        fields: ['email'],
        unique: true,
        where: {
          email: {
            [require('sequelize').Op.ne]: null
          }
        }
      }
    ]
  }
);

export default Staff;