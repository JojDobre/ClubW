// backend/src/models/GaleriaObrazok.ts
// Model pre jednotlivé obrázky v galérii - FÁZA 7

import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

// Forward declaration pre TypeScript associations
class Galeria extends Model {}

// Interface pre GaleriaObrazok atribúty
export interface GaleriaObrazokAttributes {
  id: number;
  galeria_id: number;             // Odkaz na galériu
  
  // Informácie o obrázku
  nazov?: string | null;          // Voliteľný názov obrázka
  popis?: string | null;          // Voliteľný popis obrázka
  
  // Súborové informácie
  cesta_suboru: string;           // Relatívna cesta k súboru (napr. /uploads/galerie/2024/obr1.jpg)
  originalny_nazov: string;       // Pôvodný názov súboru
  velkost_suboru: number;         // Veľkosť v bytoch
  mime_typ: string;               // Typ súboru (image/jpeg, image/png, atď.)
  
  // Rozmery obrázka
  sirka?: number | null;          // Šírka v pixeloch
  vyska?: number | null;          // Výška v pixeloch
  
  // Náhľadové obrázky (pre optimalizáciu)
  nahladovy_maly?: string | null;   // Malý náhľad (150x150)
  nahladovy_stredny?: string | null; // Stredný náhľad (400x400)
  
  // Metadata
  poradie: number;                // Poradie v galérii
  je_nahladovy: boolean;          // Či je toto náhľadový obrázok galérie
  
  // Štatistiky
  zobrazenia: number;             // Počet zobrazení
  
  // Systémové
  aktivity: boolean;
  vytvoreny: Date;
  aktualizovany: Date;
}

// Interface pre vytvorenie obrázka (bez auto-generovaných polí)
export interface GaleriaObrazokCreationAttributes extends Optional<GaleriaObrazokAttributes, 'id' | 'poradie' | 'je_nahladovy' | 'zobrazenia' | 'aktivity' | 'vytvoreny' | 'aktualizovany'> {}

// Sequelize Model class
export class GaleriaObrazok extends Model<GaleriaObrazokAttributes, GaleriaObrazokCreationAttributes> implements GaleriaObrazokAttributes {
  public id!: number;
  public galeria_id!: number;
  public nazov!: string | null;
  public popis!: string | null;
  public cesta_suboru!: string;
  public originalny_nazov!: string;
  public velkost_suboru!: number;
  public mime_typ!: string;
  public sirka!: number | null;
  public vyska!: number | null;
  public nahladovy_maly!: string | null;
  public nahladovy_stredny!: string | null;
  public poradie!: number;
  public je_nahladovy!: boolean;
  public zobrazenia!: number;
  public aktivity!: boolean;
  public vytvoreny!: Date;
  public aktualizovany!: Date;

  // Association properties (pre TypeScript)
  public galeria?: Galeria;

  // Metóda pre získanie URL obrázka
  public getImageUrl(typ: 'original' | 'maly' | 'stredny' = 'original'): string {
    const baseUrl = process.env.UPLOADS_URL || '/uploads';
    const cesta =
      typ === 'maly' ? this.nahladovy_maly || this.cesta_suboru
        : typ === 'stredny' ? this.nahladovy_stredny || this.cesta_suboru
          : this.cesta_suboru;
    if (!cesta) return '';
    // Cesty sa ukladajú už s predponou /uploads - druhý raz ju nepridávame
    if (/^https?:\/\//.test(cesta) || cesta.startsWith('/uploads/')) return cesta;
    return `${baseUrl}${cesta.startsWith('/') ? '' : '/'}${cesta}`;
  }

  // Metóda pre získanie informácií o veľkosti súboru
  public getFormattedFileSize(): string {
    const bytes = this.velkost_suboru;
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Metóda pre kontrolu, či je obrázok
  public static isValidImageType(mimeType: string): boolean {
    const validTypes = [
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/gif',
      'image/webp',
      'image/bmp',
      'image/svg+xml'
    ];
    return validTypes.includes(mimeType.toLowerCase());
  }

  // Metóda pre export na frontend
  public toJSON() {
    return {
      id: this.id,
      galeria_id: this.galeria_id,
      nazov: this.nazov,
      popis: this.popis,
      originalny_nazov: this.originalny_nazov,
      velkost_suboru: this.velkost_suboru,
      velkost_formatovane: this.getFormattedFileSize(),
      mime_typ: this.mime_typ,
      sirka: this.sirka,
      vyska: this.vyska,
      poradie: this.poradie,
      je_nahladovy: this.je_nahladovy,
      zobrazenia: this.zobrazenia,

      // Uložené cesty - používa ich administrácia aj verejná stránka
      cesta_suboru: this.cesta_suboru,
      nahladovy_maly: this.nahladovy_maly,
      nahladovy_stredny: this.nahladovy_stredny,
      
      // URL adresy
      url_original: this.getImageUrl('original'),
      url_maly: this.getImageUrl('maly'),
      url_stredny: this.getImageUrl('stredny'),
      
      aktivity: this.aktivity,
      vytvoreny: this.vytvoreny,
      aktualizovany: this.aktualizovany,
    };
  }
}

// Definícia modelu v databáze
GaleriaObrazok.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    galeria_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'galerie',
        key: 'id',
      },
      onDelete: 'CASCADE', // Pri vymazaní galérie sa vymažú aj obrázky
    },
    nazov: {
      type: DataTypes.STRING(200),
      allowNull: true,
      validate: {
        len: [0, 200],
      },
    },
    popis: {
      type: DataTypes.TEXT,
      allowNull: true,
      validate: {
        len: [0, 500],
      },
    },
    cesta_suboru: {
      type: DataTypes.STRING(500),
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
    originalny_nazov: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
    velkost_suboru: {
      type: DataTypes.BIGINT,
      allowNull: false,
      validate: {
        min: 1,
        max: 50 * 1024 * 1024, // Max 50MB
      },
    },
    mime_typ: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: true,
        isValidImageType(value: string) {
          if (!GaleriaObrazok.isValidImageType(value)) {
            throw new Error('Nepodporovaný typ obrázka');
          }
        },
      },
    },
    sirka: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 1,
        max: 10000,
      },
    },
    vyska: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 1,
        max: 10000,
      },
    },
    nahladovy_maly: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    nahladovy_stredny: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    poradie: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      validate: {
        min: 1,
      },
    },
    je_nahladovy: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    zobrazenia: {
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
    modelName: 'GaleriaObrazok',
    tableName: 'galeria_obrazky',
    timestamps: false, // Používame vlastné polia vytvoreny/aktualizovany
    hooks: {
      beforeUpdate: (obrazok: GaleriaObrazok) => {
        obrazok.aktualizovany = new Date();
      },
      beforeCreate: (obrazok: GaleriaObrazok) => {
        const now = new Date();
        obrazok.vytvoreny = now;
        obrazok.aktualizovany = now;
      },
    },
    indexes: [
      {
        fields: ['galeria_id'],
      },
      {
        fields: ['galeria_id', 'poradie'],
      },
      {
        fields: ['je_nahladovy'],
      },
      {
        fields: ['aktivity'],
      },
      {
        fields: ['vytvoreny'],
      },
      // Unikátny index pre nahľadový obrázok v galérii (len jeden môže byť)
      {
        fields: ['galeria_id', 'je_nahladovy'],
        unique: true,
        where: {
          je_nahladovy: true,
          aktivity: true,
        },
      },
    ],
  }
);

export default GaleriaObrazok;