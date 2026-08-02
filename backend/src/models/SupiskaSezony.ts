// Umiestnenie: backend/src/models/SupiskaSezony.ts
// Príslušnosť hráča k tímu v konkrétnej sezóne.
//
// PREČO VZNIKLA: hráč mal doteraz jediné pole tim_id. Po prestupe alebo
// posune z dorastu do mužov sa prepísalo, takže sa už nedalo zistiť,
// za ktorý tím hral vlani. Pri mládežníckom klube, kde hráči každý rok
// postupujú do vyššej kategórie, sa tým strácala celá história.
//
// VZŤAH K POĽU Player.tim_id: pole zostáva a znamená "aktuálny tím".
// Používa ho existujúci kód a je praktické pre bežné výpisy. Súpiska
// je záznam navyše - drží históriu po sezónach. Pri zmene aktuálneho tímu
// treba doplniť aj záznam do súpisky pre práve prebiehajúcu sezónu.

import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface SupiskaSezonyAttributes {
  id: number;
  sezona_id: number;
  tim_id: number;
  hrac_id: number;
  // Číslo dresu sa môže medzi sezónami meniť, preto patrí sem,
  // nie k hráčovi natrvalo
  cislo_dresu: number | null;
  // Pozícia v danej sezóne - hráč môže časom prejsť z útoku do zálohy
  pozicia: string | null;
  // Kapitán tímu v danej sezóne
  kapitan: boolean;
  // Dátumy platia pre prestupy uprostred sezóny
  od: Date | null;
  do: Date | null;
  poznamka: string | null;
  aktivny: boolean;
  vytvoreny: Date;
  aktualizovany: Date;
}

interface SupiskaSezonyCreationAttributes
  extends Optional<
    SupiskaSezonyAttributes,
    | 'id' | 'cislo_dresu' | 'pozicia' | 'kapitan' | 'od' | 'do'
    | 'poznamka' | 'aktivny' | 'vytvoreny' | 'aktualizovany'
  > {}

class SupiskaSezony
  extends Model<SupiskaSezonyAttributes, SupiskaSezonyCreationAttributes>
  implements SupiskaSezonyAttributes
{
  public id!: number;
  public sezona_id!: number;
  public tim_id!: number;
  public hrac_id!: number;
  public cislo_dresu!: number | null;
  public pozicia!: string | null;
  public kapitan!: boolean;
  public od!: Date | null;
  public do!: Date | null;
  public poznamka!: string | null;
  public aktivny!: boolean;
  public readonly vytvoreny!: Date;
  public readonly aktualizovany!: Date;

  /**
   * Zapíše hráča na súpisku tímu pre danú sezónu.
   * Ak už záznam existuje, aktualizuje ho namiesto vytvárania duplicity.
   */
  public static async zapisHraca(udaje: {
    sezona_id: number;
    tim_id: number;
    hrac_id: number;
    cislo_dresu?: number | null;
    pozicia?: string | null;
    kapitan?: boolean;
  }): Promise<SupiskaSezony> {
    const existujuci = await SupiskaSezony.findOne({
      where: {
        sezona_id: udaje.sezona_id,
        tim_id: udaje.tim_id,
        hrac_id: udaje.hrac_id,
      },
    });

    if (existujuci) {
      await existujuci.update({
        cislo_dresu: udaje.cislo_dresu ?? existujuci.cislo_dresu,
        pozicia: udaje.pozicia ?? existujuci.pozicia,
        kapitan: udaje.kapitan ?? existujuci.kapitan,
        aktivny: true,
      });
      return existujuci;
    }

    return SupiskaSezony.create({
      sezona_id: udaje.sezona_id,
      tim_id: udaje.tim_id,
      hrac_id: udaje.hrac_id,
      cislo_dresu: udaje.cislo_dresu ?? null,
      pozicia: udaje.pozicia ?? null,
      kapitan: udaje.kapitan ?? false,
    });
  }
}

SupiskaSezony.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    sezona_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'sezony', key: 'id' },
      // Sezónu s existujúcou súpiskou nemožno zmazať - je to história
      onDelete: 'RESTRICT',
    },
    tim_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'timy', key: 'id' },
      onDelete: 'CASCADE',
    },
    hrac_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'hraci', key: 'id' },
      onDelete: 'CASCADE',
    },
    cislo_dresu: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: { min: 1, max: 99 },
    },
    pozicia: {
      type: DataTypes.STRING(30),
      allowNull: true,
    },
    kapitan: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    od: { type: DataTypes.DATEONLY, allowNull: true },
    do: { type: DataTypes.DATEONLY, allowNull: true },
    poznamka: { type: DataTypes.TEXT, allowNull: true },
    aktivny: {
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
    modelName: 'SupiskaSezony',
    tableName: 'supisky_sezon',
    timestamps: true,
    createdAt: 'vytvoreny',
    updatedAt: 'aktualizovany',
    indexes: [
      // Hráč môže byť v jednej sezóne na súpiske tímu len raz
      {
        fields: ['sezona_id', 'tim_id', 'hrac_id'],
        unique: true,
        name: 'supisky_sezona_tim_hrac',
      },
      { fields: ['sezona_id'], name: 'supisky_sezona' },
      { fields: ['tim_id'], name: 'supisky_tim' },
      { fields: ['hrac_id'], name: 'supisky_hrac' },
    ],
  }
);

export default SupiskaSezony;
