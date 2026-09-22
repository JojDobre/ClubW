// backend/src/models/ZapasStatistika.ts
// Model pre štatistiky zápasu (góly, karty, asistencie) - FÁZA 4

import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

// Interface pre atribúty ZapasStatistika
interface ZapasStatistikaAttributes {
  id: number;
  zapas_id: number;
  /** Náš hráč. Pri hosťujúcom hráčovi zostáva prázdne. */
  hrac_id: number | null;
  /** Meno hosťujúceho hráča, ktorý nie je v našej databáze */
  hostujuci_hrac_meno: string | null;
  hostujuci_hrac_cislo: number | null;
  typ: 'gol' | 'asistencia' | 'zlta_karta' | 'cervena_karta' | 'vlastny_gol' | 'striedanie';
  /** Pri striedaní: koho hráč vystriedal (náš hráč) */
  striedany_hrac_id: number | null;
  /** Pri striedaní: koho vystriedal, ak to nie je náš hráč */
  striedany_hrac_meno: string | null;
  minuta?: number | null;
  poznamka?: string | null;
  aktivity: boolean;
  vytvoreny: Date;
  aktualizovany: Date;
}

// Interface pre vytvorenie novej ZapasStatistika (bez automatických polí)
interface ZapasStatistikaCreationAttributes extends Optional<ZapasStatistikaAttributes,
  'id' | 'minuta' | 'poznamka' | 'aktivity' | 'hrac_id' |
  'hostujuci_hrac_meno' | 'hostujuci_hrac_cislo' |
  'striedany_hrac_id' | 'striedany_hrac_meno' |
  'vytvoreny' | 'aktualizovany'> {}

// Trieda pre model ZapasStatistika
class ZapasStatistika extends Model<ZapasStatistikaAttributes, ZapasStatistikaCreationAttributes> implements ZapasStatistikaAttributes {
  public id!: number;
  public zapas_id!: number;
  public hrac_id!: number | null;
  public hostujuci_hrac_meno!: string | null;
  public hostujuci_hrac_cislo!: number | null;
  public typ!: 'gol' | 'asistencia' | 'zlta_karta' | 'cervena_karta' | 'vlastny_gol' | 'striedanie';
  public striedany_hrac_id!: number | null;
  public striedany_hrac_meno!: string | null;
  public minuta!: number | null;
  public poznamka!: string | null;
  public aktivity!: boolean;
  public vytvoreny!: Date;
  public aktualizovany!: Date;

  // Association properties (pridáme neskôr)
  public zapas?: any;
  public hrac?: any;

  // Helper method - vracia typ čitateľne
  public getTypName(): string {
    const typNames = {
      'gol': 'Gól',
      'asistencia': 'Asistencia',
      'zlta_karta': 'Žltá karta',
      'cervena_karta': 'Červená karta',
      'vlastny_gol': 'Vlastný gól',
      'striedanie': 'Striedanie'
    };
    return typNames[this.typ] || this.typ;
  }

  // Helper method - kontroluje či je to gól
  public isGol(): boolean {
    return this.typ === 'gol' || this.typ === 'vlastny_gol';
  }

  // Helper method - kontroluje či je to karta
  public isKarta(): boolean {
    return this.typ === 'zlta_karta' || this.typ === 'cervena_karta';
  }

  // Helper method - vracia popis s minútou
  public getDescription(): string {
    const typ = this.getTypName();
    if (this.minuta) {
      return `${typ} (${this.minuta}')`;
    }
    return typ;
  }

  // Helper method - vracia emoji pre typ
  public getEmoji(): string {
    const emojis = {
      'gol': '⚽',
      'asistencia': '🅰️',
      'zlta_karta': '🟨',
      'cervena_karta': '🟥',
      'vlastny_gol': '🥅',
      'striedanie': '🔄'
    };
    return emojis[this.typ] || '📝';
  }

  // Helper method pre JSON response
  public toSafeJSON() {
    return {
      id: this.id,
      zapas_id: this.zapas_id,
      hrac_id: this.hrac_id,
      hostujuci_hrac_meno: this.hostujuci_hrac_meno,
      hostujuci_hrac_cislo: this.hostujuci_hrac_cislo,
      striedany_hrac_id: this.striedany_hrac_id,
      striedany_hrac_meno: this.striedany_hrac_meno,
      typ: this.typ,
      minuta: this.minuta,
      poznamka: this.poznamka,
      aktivity: this.aktivity,
      // Helper fields
      typ_name: this.getTypName(),
      is_gol: this.isGol(),
      is_karta: this.isKarta(),
      description: this.getDescription(),
      emoji: this.getEmoji(),
      vytvoreny: this.vytvoreny,
      aktualizovany: this.aktualizovany,
    };
  }
}

// Definícia modelu v databáze
ZapasStatistika.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    zapas_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'zapasy',
        key: 'id',
      },
    },
    hrac_id: {
      // Voliteľné: hosťujúci hráč v našej databáze nie je a zapisuje sa
      // menom nižšie. Databáza stráži, že záznam má aspoň jedno z oboch.
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'hraci',
        key: 'id',
      },
    },
    hostujuci_hrac_meno: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    hostujuci_hrac_cislo: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: { args: [0], msg: 'Číslo dresu nemôže byť záporné' },
        max: { args: [999], msg: 'Číslo dresu je príliš vysoké' },
      },
    },
    striedany_hrac_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'hraci', key: 'id' },
    },
    striedany_hrac_meno: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    typ: {
      type: DataTypes.ENUM('gol', 'asistencia', 'zlta_karta', 'cervena_karta', 'vlastny_gol', 'striedanie'),
      allowNull: false,
    },
    minuta: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 1,
        max: 120, // Môže byť aj predĺženie
      },
    },
    poznamka: {
      type: DataTypes.STRING(500),
      allowNull: true,
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
    tableName: 'zapas_statistiky',
    timestamps: true,
    createdAt: 'vytvoreny',
    updatedAt: 'aktualizovany',
    indexes: [
      {
        fields: ['zapas_id'],
      },
      {
        fields: ['hrac_id'],
      },
      {
        fields: ['typ'],
      },
      {
        fields: ['aktivity'],
      },
      {
        // Composite index pre rýchle vyhľadávanie štatistík zápasu
        fields: ['zapas_id', 'typ'],
      },
    ],
    validate: {
      // Validácia že gól musí mať minútu
      golMusiMatMinutu() {
        if ((this.typ === 'gol' || this.typ === 'vlastny_gol') && !this.minuta) {
          throw new Error('Gól musí mať zadanú minútu');
        }
      }
    }
  }
);

export default ZapasStatistika;