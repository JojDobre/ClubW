// backend/src/models/Galeria.ts
// Model pre fotogalérie - FÁZA 7

import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';
import { overObrazkovySubor } from '../utils/obrazokValidator';

// Forward declarations pre TypeScript associations
class Team extends Model {}
class Article extends Model {}
class Zapas extends Model {}
class GaleriaObrazok extends Model {}

// Interface pre Galeria atribúty
export interface GaleriaAttributes {
  id: number;
  nazov: string;
  popis?: string | null;
  slug: string;                    // Pre URL (auto-generovaný z názvu)
  
  // Voliteľné priradenia (len jedno môže byť nastavené)
  tim_id?: number | null;         // Priradenie k tímu
  clanok_id?: number | null;      // Priradenie k článku  
  zapas_id?: number | null;       // Priradenie k zápasu
  
  // Štatistiky
  pocet_obrazkov: number;         // Počet obrázkov v galérii
  nahladovy_obrazok?: string | null; // URL náhľadového obrázka
  
  // Metadata
  /** Zobrazuje sa galéria návštevníkom? (skrytie, nie zmazanie) */
  zobrazit_na_webe: boolean;
  /** false = galéria je zmazaná (mäkké mazanie) */
  aktivity: boolean;
  vytvoreny: Date;
  aktualizovany: Date;
}

// Interface pre vytvorenie galérie (bez auto-generovaných polí)
export interface GaleriaCreationAttributes extends Optional<GaleriaAttributes, 'id' | 'slug' | 'pocet_obrazkov' | 'zobrazit_na_webe' | 'aktivity' | 'vytvoreny' | 'aktualizovany'> {}

// Sequelize Model class
export class Galeria extends Model<GaleriaAttributes, GaleriaCreationAttributes> implements GaleriaAttributes {
  public id!: number;
  public nazov!: string;
  public popis!: string | null;
  public slug!: string;
  public tim_id!: number | null;
  public clanok_id!: number | null;
  public zapas_id!: number | null;
  public pocet_obrazkov!: number;
  public nahladovy_obrazok!: string | null;
  public zobrazit_na_webe!: boolean;
  public aktivity!: boolean;
  public vytvoreny!: Date;
  public aktualizovany!: Date;

  // Association properties (pre TypeScript)
  public tim?: Team;
  public clanok?: Article;
  public zapas?: Zapas;
  public obrazky?: GaleriaObrazok[];

  // Statická metóda pre generovanie slug z názvu
  public static generateSlug(nazov: string): string {
    return nazov
      .toLowerCase()
      .normalize('NFD')                    // Rozloží akcenty
      .replace(/[\u0300-\u036f]/g, '')    // Odstráni akcenty
      .replace(/[^a-z0-9\s-]/g, '')       // Odstráni špeciálne znaky
      .replace(/\s+/g, '-')               // Medzery na pomlčky
      .replace(/-+/g, '-')                // Viacnásobné pomlčky na jednu
      .replace(/^-|-$/g, '');             // Odstráni pomlčky na začiatku/konci
  }

  // Metóda pre získanie typu priradenia
  public getTypPriradenia(): 'tim' | 'clanok' | 'zapas' | 'volna' {
    if (this.tim_id) return 'tim';
    if (this.clanok_id) return 'clanok';
    if (this.zapas_id) return 'zapas';
    return 'volna';
  }

  // Metóda pre export na frontend
  public toJSON() {
    return {
      id: this.id,
      nazov: this.nazov,
      popis: this.popis,
      slug: this.slug,
      tim_id: this.tim_id,
      clanok_id: this.clanok_id,
      zapas_id: this.zapas_id,
      pocet_obrazkov: this.pocet_obrazkov,
      nahladovy_obrazok: this.nahladovy_obrazok,
      typ_priradenia: this.getTypPriradenia(),
      zobrazit_na_webe: this.zobrazit_na_webe,
      aktivity: this.aktivity,
      vytvoreny: this.vytvoreny,
      aktualizovany: this.aktualizovany,
    };
  }
}

// Definícia modelu v databáze
Galeria.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    nazov: {
      type: DataTypes.STRING(150),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [3, 150],
      },
    },
    popis: {
      type: DataTypes.TEXT,
      allowNull: true,
      validate: {
        len: [0, 1000],
      },
    },
    slug: {
      type: DataTypes.STRING(170),
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true,
        is: /^[a-z0-9-]+$/,
      },
    },
    tim_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'timy',
        key: 'id',
      },
    },
    clanok_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'clanky',  // Opravené z 'articles' na 'clanky'
        key: 'id',
      },
    },
    zapas_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'zapasy',
        key: 'id',
      },
    },
    pocet_obrazkov: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },
    nahladovy_obrazok: {
      type: DataTypes.STRING(500),
      allowNull: true,
      validate: {
        // isUrl: false validátor NEVYPNE - Sequelize ho aj tak spustí.
        // Tento prijíma nahratý súbor aj externú adresu.
        jePlatnyObrazok: overObrazkovySubor,
      },
    },
    zobrazit_na_webe: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
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
    modelName: 'Galeria',
    tableName: 'galerie',
    timestamps: false, // Používame vlastné polia vytvoreny/aktualizovany
    hooks: {
      beforeValidate: (galeria: Galeria) => {
        // Automatické generovanie slug ak nie je zadaný
        if (!galeria.slug) {
          galeria.slug = Galeria.generateSlug(galeria.nazov);
        }
        
        // Validácia: len jedno priradenie môže byť aktívne
        const assignments = [galeria.tim_id, galeria.clanok_id, galeria.zapas_id].filter(Boolean);
        if (assignments.length > 1) {
          throw new Error('Galéria môže byť priradená len k jednému objektu (tím, článok alebo zápas)');
        }
      },
      beforeUpdate: (galeria: Galeria) => {
        galeria.aktualizovany = new Date();
      },
      beforeCreate: (galeria: Galeria) => {
        const now = new Date();
        galeria.vytvoreny = now;
        galeria.aktualizovany = now;
      },
    },
    indexes: [
      {
        fields: ['slug'],
        unique: true,
      },
      {
        fields: ['tim_id'],
      },
      {
        fields: ['clanok_id'],
      },
      {
        fields: ['zapas_id'],
      },
      {
        fields: ['aktivity'],
      },
      {
        fields: ['vytvoreny'],
      },
    ],
  }
);

export default Galeria;