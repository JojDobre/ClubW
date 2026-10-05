// Umiestnenie: backend/src/models/VyhodaFanusika.ts
// Výhody členov klubu (zľavy u partnerov, prednostný predaj, akcie...).
// Klub ich zadáva v administrácii, prihlásený fanúšik ich vidí na stránke
// Môj klub - len tie pre svoj typ členstva a len pri platnom členstve.

import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import type { TypClenstva } from './Fanusik';

export const TYPY_CLENSTVA: TypClenstva[] = ['fanusik', 'clen', 'vip', 'cestny'];

interface VyhodaFanusikaAttributes {
  id: number;
  nazov: string;
  popis: string | null;
  obrazok: string | null;
  /** Pre ktoré typy členstva; prázdne pole = pre všetkých */
  typy_clenstva: TypClenstva[];
  sponzor_id: number | null;
  kod: string | null;
  odkaz: string | null;
  platne_od: string | null;
  platne_do: string | null;
  poradie: number;
  aktivity: boolean;
  vytvoreny: Date;
  aktualizovany: Date;
}

class VyhodaFanusika
  extends Model<
    VyhodaFanusikaAttributes,
    Optional<
      VyhodaFanusikaAttributes,
      'id' | 'popis' | 'obrazok' | 'typy_clenstva' | 'sponzor_id' | 'kod' | 'odkaz' | 'platne_od' | 'platne_do' | 'poradie' | 'aktivity' | 'vytvoreny' | 'aktualizovany'
    >
  >
  implements VyhodaFanusikaAttributes
{
  public id!: number;
  public nazov!: string;
  public popis!: string | null;
  public obrazok!: string | null;
  public typy_clenstva!: TypClenstva[];
  public sponzor_id!: number | null;
  public kod!: string | null;
  public odkaz!: string | null;
  public platne_od!: string | null;
  public platne_do!: string | null;
  public poradie!: number;
  public aktivity!: boolean;
  public readonly vytvoreny!: Date;
  public readonly aktualizovany!: Date;

  /** Patrí výhoda danému typu členstva dnes? */
  public platiPre(typ: TypClenstva, dnes = new Date().toISOString().slice(0, 10)): boolean {
    if (!this.aktivity) return false;
    if (this.platne_od && String(this.platne_od) > dnes) return false;
    if (this.platne_do && String(this.platne_do) < dnes) return false;
    return !this.typy_clenstva?.length || this.typy_clenstva.includes(typ);
  }
}

VyhodaFanusika.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    nazov: { type: DataTypes.STRING(150), allowNull: false, validate: { notEmpty: { msg: 'Výhoda musí mať názov' } } },
    popis: { type: DataTypes.TEXT, allowNull: true },
    obrazok: { type: DataTypes.STRING(500), allowNull: true },
    typy_clenstva: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
      validate: {
        typy(hodnota: unknown) {
          if (!Array.isArray(hodnota) || hodnota.some((t) => !TYPY_CLENSTVA.includes(t as TypClenstva))) {
            throw new Error('Neplatný typ členstva pri výhode');
          }
        },
      },
    },
    sponzor_id: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'sponzori', key: 'id' }, onDelete: 'SET NULL' },
    kod: { type: DataTypes.STRING(60), allowNull: true },
    odkaz: { type: DataTypes.STRING(500), allowNull: true },
    platne_od: { type: DataTypes.DATEONLY, allowNull: true },
    platne_do: { type: DataTypes.DATEONLY, allowNull: true },
    poradie: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    aktivity: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    vytvoreny: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    aktualizovany: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    sequelize,
    modelName: 'VyhodaFanusika',
    tableName: 'vyhody_fanusikov',
    timestamps: true,
    createdAt: 'vytvoreny',
    updatedAt: 'aktualizovany',
  }
);

export default VyhodaFanusika;
