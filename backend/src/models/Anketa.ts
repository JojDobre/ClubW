// Umiestnenie: backend/src/models/Anketa.ts
// Ankety pre návštevníkov webu.
//
// Možnosti a počty hlasov držíme ako JSON v jednom stĺpci. Pri ankete
// s piatimi možnosťami by samostatná tabuľka priniesla len réžiu navyše.

import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export interface MoznostAnkety {
  id: string;
  text: string;
  hlasy: number;
}

interface AnketaAttributes {
  id: number;
  otazka: string;
  moznosti: MoznostAnkety[];
  /** Otvorená anketa prijíma hlasy */
  otvorena: boolean;
  /** Zobrazí sa na verejnom webe */
  publikovana: boolean;
  platna_od: Date | null;
  platna_do: Date | null;
  celkom_hlasov: number;
  vytvorena: Date;
  aktualizovana: Date;
}

interface AnketaCreationAttributes
  extends Optional<
    AnketaAttributes,
    'id' | 'otvorena' | 'publikovana' | 'platna_od' | 'platna_do'
    | 'celkom_hlasov' | 'vytvorena' | 'aktualizovana'
  > {}

class Anketa extends Model<AnketaAttributes, AnketaCreationAttributes> implements AnketaAttributes {
  public id!: number;
  public otazka!: string;
  public moznosti!: MoznostAnkety[];
  public otvorena!: boolean;
  public publikovana!: boolean;
  public platna_od!: Date | null;
  public platna_do!: Date | null;
  public celkom_hlasov!: number;
  public readonly vytvorena!: Date;
  public readonly aktualizovana!: Date;

  /** Prepočíta celkový počet hlasov z jednotlivých možností. */
  public prepocitajHlasy(): number {
    return (this.moznosti ?? []).reduce((suma, m) => suma + (m.hlasy || 0), 0);
  }
}

Anketa.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    otazka: {
      type: DataTypes.STRING(300),
      allowNull: false,
      validate: { notEmpty: true, len: [5, 300] },
    },
    moznosti: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
      validate: {
        // Anketa s jednou možnosťou nedáva zmysel
        asponDve(hodnota: unknown) {
          if (!Array.isArray(hodnota) || hodnota.length < 2) {
            throw new Error('Anketa musí mať aspoň dve možnosti');
          }
          if (hodnota.length > 12) {
            throw new Error('Anketa môže mať najviac 12 možností');
          }
        },
      },
    },
    otvorena: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    publikovana: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    platna_od: { type: DataTypes.DATEONLY, allowNull: true },
    platna_do: { type: DataTypes.DATEONLY, allowNull: true },
    celkom_hlasov: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    vytvorena: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    aktualizovana: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    sequelize,
    modelName: 'Anketa',
    tableName: 'ankety',
    timestamps: true,
    createdAt: 'vytvorena',
    updatedAt: 'aktualizovana',
  }
);

export default Anketa;
