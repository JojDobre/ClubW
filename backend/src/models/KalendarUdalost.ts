// Umiestnenie: backend/src/models/KalendarUdalost.ts
//
// UDALOSŤ V KALENDÁRI - tréning, sústredenie, klubová akcia.
//
// Opakovanie sa ukladá ako pravidlo (napríklad „každý utorok do konca
// júna"), nie ako samostatný záznam pre každý týždeň. Úprava tréningu
// tak zmení celý rad naraz a tabuľka nenarastá s každým týždňom.
// Rozvinutie pravidla na konkrétne dni robí controller pri čítaní.

import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export type TypOpakovania = 'ziadne' | 'denne' | 'tyzdenne' | 'dvojtyzdenne' | 'mesacne';

interface KalendarUdalostAttributes {
  id: number;
  nazov: string;
  popis: string | null;
  /** Tím, ktorého sa udalosť týka - kalendár podľa neho berie farbu */
  tim_id: number | null;
  /** Dátum prvého výskytu; pri opakovaní začiatok radu */
  datum: string;
  cas_od: string | null;
  cas_do: string | null;
  miesto: string | null;
  opakovanie: TypOpakovania;
  /** Dokedy sa udalosť opakuje; prázdne = donekonečna */
  opakovanie_do: string | null;
  aktivity: boolean;
  vytvorena: Date;
  aktualizovana: Date;
}

interface KalendarUdalostCreationAttributes
  extends Optional<
    KalendarUdalostAttributes,
    | 'id' | 'popis' | 'tim_id' | 'cas_od' | 'cas_do' | 'miesto'
    | 'opakovanie' | 'opakovanie_do' | 'aktivity' | 'vytvorena' | 'aktualizovana'
  > {}

class KalendarUdalost
  extends Model<KalendarUdalostAttributes, KalendarUdalostCreationAttributes>
  implements KalendarUdalostAttributes
{
  public id!: number;
  public nazov!: string;
  public popis!: string | null;
  public tim_id!: number | null;
  public datum!: string;
  public cas_od!: string | null;
  public cas_do!: string | null;
  public miesto!: string | null;
  public opakovanie!: TypOpakovania;
  public opakovanie_do!: string | null;
  public aktivity!: boolean;
  public readonly vytvorena!: Date;
  public readonly aktualizovana!: Date;

  public tim?: any;

  public toSafeJSON() {
    return {
      id: this.id,
      nazov: this.nazov,
      popis: this.popis,
      tim_id: this.tim_id,
      datum: this.datum,
      cas_od: this.cas_od,
      cas_do: this.cas_do,
      miesto: this.miesto,
      opakovanie: this.opakovanie,
      opakovanie_do: this.opakovanie_do,
      aktivity: this.aktivity,
      tim: this.tim
        ? { id: this.tim.id, nazov: this.tim.nazov, farba: this.tim.farba_prva }
        : null,
    };
  }
}

KalendarUdalost.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    nazov: {
      type: DataTypes.STRING(150),
      allowNull: false,
      validate: { len: { args: [2, 150], msg: 'Názov udalosti musí mať 2-150 znakov' } },
    },
    popis: { type: DataTypes.TEXT, allowNull: true },
    tim_id: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'timy', key: 'id' } },
    datum: { type: DataTypes.DATEONLY, allowNull: false },
    cas_od: { type: DataTypes.TIME, allowNull: true },
    cas_do: { type: DataTypes.TIME, allowNull: true },
    miesto: { type: DataTypes.STRING(150), allowNull: true },
    opakovanie: {
      type: DataTypes.ENUM('ziadne', 'denne', 'tyzdenne', 'dvojtyzdenne', 'mesacne'),
      allowNull: false,
      defaultValue: 'ziadne',
    },
    opakovanie_do: { type: DataTypes.DATEONLY, allowNull: true },
    aktivity: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    vytvorena: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    aktualizovana: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    sequelize,
    modelName: 'KalendarUdalost',
    tableName: 'kalendar_udalosti',
    timestamps: true,
    createdAt: 'vytvorena',
    updatedAt: 'aktualizovana',
    validate: {
      // Koniec opakovania nesmie predchádzať prvému výskytu
      opakovanieMaZmysel(this: KalendarUdalost) {
        if (this.opakovanie_do && this.datum && this.opakovanie_do < this.datum) {
          throw new Error('Koniec opakovania nemôže byť skôr než dátum udalosti');
        }
        if (this.cas_od && this.cas_do && this.cas_do < this.cas_od) {
          throw new Error('Čas do nemôže byť skôr než čas od');
        }
      },
    },
  }
);

export default KalendarUdalost;
