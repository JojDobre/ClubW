// backend/src/models/ZapasStatistika.ts
// Model pre štatistiky zápasu (góly, karty, asistencie) - FÁZA 4

import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

// Interface pre atribúty ZapasStatistika
interface ZapasStatistikaAttributes {
  id: number;
  zapas_id: number;
  hrac_id: number;
  typ: 'gol' | 'asistencia' | 'zlta_karta' | 'cervena_karta' | 'vlastny_gol';
  minuta?: number | null;
  poznamka?: string | null;
  aktivity: boolean;
  vytvoreny: Date;
  aktualizovany: Date;
}

// Interface pre vytvorenie novej ZapasStatistika (bez automatických polí)
interface ZapasStatistikaCreationAttributes extends Optional<ZapasStatistikaAttributes, 'id' | 'minuta' | 'poznamka' | 'aktivity' | 'vytvoreny' | 'aktualizovany'> {}

// Trieda pre model ZapasStatistika
class ZapasStatistika extends Model<ZapasStatistikaAttributes, ZapasStatistikaCreationAttributes> implements ZapasStatistikaAttributes {
  public id!: number;
  public zapas_id!: number;
  public hrac_id!: number;
  public typ!: 'gol' | 'asistencia' | 'zlta_karta' | 'cervena_karta' | 'vlastny_gol';
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
      'vlastny_gol': 'Vlastný gól'
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
      'vlastny_gol': '🥅'
    };
    return emojis[this.typ] || '📝';
  }

  // Helper method pre JSON response
  public toSafeJSON() {
    return {
      id: this.id,
      zapas_id: this.zapas_id,
      hrac_id: this.hrac_id,
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
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'hraci',
        key: 'id',
      },
    },
    typ: {
      type: DataTypes.ENUM('gol', 'asistencia', 'zlta_karta', 'cervena_karta', 'vlastny_gol'),
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