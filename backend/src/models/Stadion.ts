// Umiestnenie: backend/src/models/Stadion.ts
// Štadióny klubu.
//
// Slúžia na dve veci: na stránke tímu sa zobrazí, kde hráva, a pri
// domácom zápase sa miesto konania doplní automaticky z domáceho
// štadióna tímu, takže ho netreba písať ručne ku každému zápasu.

import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface StadionAttributes {
  id: number;
  nazov: string;
  adresa: string | null;
  fotka: string | null;
  kapacita: number | null;
  poznamka: string | null;
  /** Archivácia - rovnaký význam ako pri tímoch a hráčoch */
  aktivity: boolean;
  vytvoreny: Date;
  aktualizovany: Date;
}

interface StadionCreationAttributes
  extends Optional<
    StadionAttributes,
    'id' | 'adresa' | 'fotka' | 'kapacita' | 'poznamka' | 'aktivity' | 'vytvoreny' | 'aktualizovany'
  > {}

class Stadion
  extends Model<StadionAttributes, StadionCreationAttributes>
  implements StadionAttributes
{
  public id!: number;
  public nazov!: string;
  public adresa!: string | null;
  public fotka!: string | null;
  public kapacita!: number | null;
  public poznamka!: string | null;
  public aktivity!: boolean;
  public readonly vytvoreny!: Date;
  public readonly aktualizovany!: Date;

  /** Tvar pre API - štadión nemá nič citlivé, vraciame ho celý. */
  public toSafeJSON() {
    return {
      id: this.id,
      nazov: this.nazov,
      adresa: this.adresa,
      fotka: this.fotka,
      kapacita: this.kapacita,
      poznamka: this.poznamka,
      aktivity: this.aktivity,
      vytvoreny: this.vytvoreny,
      aktualizovany: this.aktualizovany,
    };
  }
}

Stadion.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    nazov: {
      type: DataTypes.STRING(120),
      allowNull: false,
      validate: {
        len: {
          args: [2, 120],
          msg: 'Názov štadióna musí mať 2-120 znakov',
        },
        notEmpty: true,
      },
    },
    adresa: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    fotka: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    kapacita: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: {
          args: [0],
          msg: 'Kapacita nemôže byť záporná',
        },
      },
    },
    poznamka: {
      type: DataTypes.TEXT,
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
    modelName: 'Stadion',
    tableName: 'stadiony',
    timestamps: true,
    createdAt: 'vytvoreny',
    updatedAt: 'aktualizovany',
  }
);

export default Stadion;
