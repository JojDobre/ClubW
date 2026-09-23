// Umiestnenie: backend/src/models/Sponzor.ts
// Sponzori a partneri klubu.

import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

/** Úroveň partnerstva určuje veľkosť loga na webe. */
export type UrovenSponzora = 'generalny' | 'hlavny' | 'partner' | 'dodavatel';

interface SponzorAttributes {
  id: number;
  nazov: string;
  /** Pôvodná pevná úroveň - ponechaná kvôli návratu migrácie */
  uroven: UrovenSponzora | null;
  /** Úroveň partnerstva zo spravovateľného zoznamu */
  uroven_id: number | null;
  logo: string | null;
  web_url: string | null;
  popis: string | null;
  /** Obdobie partnerstva */
  platny_od: Date | null;
  platny_do: Date | null;
  poradie: number;
  aktivity: boolean;
  vytvoreny: Date;
  aktualizovany: Date;
}

interface SponzorCreationAttributes
  extends Optional<
    SponzorAttributes,
    'id' | 'uroven' | 'uroven_id' | 'logo' | 'web_url' | 'popis' | 'platny_od' | 'platny_do'
    | 'poradie' | 'aktivity' | 'vytvoreny' | 'aktualizovany'
  > {}

class Sponzor extends Model<SponzorAttributes, SponzorCreationAttributes> implements SponzorAttributes {
  public id!: number;
  public nazov!: string;
  public uroven!: UrovenSponzora | null;
  public uroven_id!: number | null;
  public logo!: string | null;
  public web_url!: string | null;
  public popis!: string | null;
  public platny_od!: Date | null;
  public platny_do!: Date | null;
  public poradie!: number;
  public aktivity!: boolean;
  public readonly vytvoreny!: Date;
  public readonly aktualizovany!: Date;
}

Sponzor.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    nazov: {
      type: DataTypes.STRING(150),
      allowNull: false,
      validate: { len: { args: [2, 150], msg: 'Názov sponzora musí mať 2-150 znakov' } },
    },
    uroven: {
      type: DataTypes.ENUM('generalny', 'hlavny', 'partner', 'dodavatel'),
      allowNull: true,
    },
    uroven_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'urovne_sponzorov', key: 'id' },
    },
    logo: { type: DataTypes.STRING(255), allowNull: true },
    web_url: {
      type: DataTypes.STRING(255),
      allowNull: true,
      validate: {
        jeAdresa(hodnota: string | null) {
          if (hodnota && !/^https?:\/\/[^\s/$.?#][^\s]*\.[^\s]+$/i.test(hodnota)) {
            throw new Error('Webová adresa nie je platná (napríklad https://firma.sk)');
          }
        },
      },
    },
    popis: { type: DataTypes.TEXT, allowNull: true },
    platny_od: { type: DataTypes.DATEONLY, allowNull: true },
    platny_do: { type: DataTypes.DATEONLY, allowNull: true },
    poradie: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    aktivity: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    vytvoreny: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    aktualizovany: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    sequelize,
    modelName: 'Sponzor',
    tableName: 'sponzori',
    timestamps: true,
    createdAt: 'vytvoreny',
    updatedAt: 'aktualizovany',
    indexes: [{ fields: ['uroven', 'poradie'], name: 'sponzori_uroven_poradie' }],
    validate: {
      obdobie(this: any) {
        if (this.platny_od && this.platny_do && String(this.platny_od) > String(this.platny_do)) {
          throw new Error('Partnerstvo nemôže skončiť skôr, ako začalo');
        }
      },
    },
    hooks: {
      // Adresu bez protokolu (firma.sk) doplníme, aby odkaz na webe fungoval
      beforeValidate: (sponzor: any) => {
        const url = typeof sponzor.web_url === 'string' ? sponzor.web_url.trim() : sponzor.web_url;
        if (url && !/^https?:\/\//i.test(url)) sponzor.web_url = `https://${url}`;
        else sponzor.web_url = url || null;
      },
    },
  }
);

export default Sponzor;
