// Umiestnenie: backend/src/models/FormularOdpoved.ts
//
// VYPLNENÝ FORMULÁR
//
// Údaje sú JSON mapa kód poľa -> hodnota. Definícia formulára sa môže
// časom zmeniť, ale už odoslané odpovede musia zostať čitateľné aj
// potom, takže sa ukladá to, čo návštevník naozaj vyplnil.

import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface FormularOdpovedAttributes {
  id: number;
  formular_id: number;
  udaje: Record<string, unknown>;
  precitane: boolean;
  ip_adresa: string | null;
  vytvorena: Date;
  aktualizovana: Date;
}

interface FormularOdpovedCreationAttributes
  extends Optional<
    FormularOdpovedAttributes,
    'id' | 'udaje' | 'precitane' | 'ip_adresa' | 'vytvorena' | 'aktualizovana'
  > {}

class FormularOdpoved
  extends Model<FormularOdpovedAttributes, FormularOdpovedCreationAttributes>
  implements FormularOdpovedAttributes
{
  public id!: number;
  public formular_id!: number;
  public udaje!: Record<string, unknown>;
  public precitane!: boolean;
  public ip_adresa!: string | null;
  public readonly vytvorena!: Date;
  public readonly aktualizovana!: Date;

  public formular?: any;

  public toSafeJSON() {
    return {
      id: this.id,
      formular_id: this.formular_id,
      udaje: this.udaje,
      precitane: this.precitane,
      ip_adresa: this.ip_adresa,
      vytvorena: this.vytvorena,
    };
  }
}

FormularOdpoved.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    formular_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'formulare', key: 'id' },
    },
    udaje: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
    precitane: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    ip_adresa: { type: DataTypes.STRING(45), allowNull: true },
    vytvorena: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    aktualizovana: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    sequelize,
    modelName: 'FormularOdpoved',
    tableName: 'formular_odpovede',
    timestamps: true,
    createdAt: 'vytvorena',
    updatedAt: 'aktualizovana',
  }
);

export default FormularOdpoved;
