// Umiestnenie: backend/src/models/FanusikToken.ts
// Jednorazové odkazy na nastavenie hesla fanúšika: pozvánka od klubu
// (7 dní) a obnova zabudnutého hesla (2 hodiny). V databáze je len
// odtlačok tokenu, samotný token je iba v odkaze v e-maile.

import { DataTypes, Model, Optional } from 'sequelize';
import crypto from 'crypto';
import sequelize from '../config/database';

export type UcelTokenu = 'pozvanka' | 'obnova';

interface FanusikTokenAttributes {
  id: number;
  fanusik_id: number;
  odtlacok: string;
  ucel: UcelTokenu;
  platny_do: Date;
  pouzity: boolean;
  vytvoreny: Date;
  aktualizovany: Date;
}

class FanusikToken
  extends Model<FanusikTokenAttributes, Optional<FanusikTokenAttributes, 'id' | 'pouzity' | 'vytvoreny' | 'aktualizovany'>>
  implements FanusikTokenAttributes
{
  public id!: number;
  public fanusik_id!: number;
  public odtlacok!: string;
  public ucel!: UcelTokenu;
  public platny_do!: Date;
  public pouzity!: boolean;
  public readonly vytvoreny!: Date;
  public readonly aktualizovany!: Date;

  public static odtlacokTokenu(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Vystaví nový token a staré nepoužité tokeny fanúšika zruší.
   * @returns samotný token do odkazu
   */
  public static async vystav(fanusikId: number, ucel: UcelTokenu): Promise<string> {
    await FanusikToken.update({ pouzity: true }, { where: { fanusik_id: fanusikId, pouzity: false } });
    const token = crypto.randomBytes(32).toString('base64url');
    const platnost = ucel === 'pozvanka' ? 7 * 24 * 3600 * 1000 : 2 * 3600 * 1000;
    await FanusikToken.create({
      fanusik_id: fanusikId,
      odtlacok: FanusikToken.odtlacokTokenu(token),
      ucel,
      platny_do: new Date(Date.now() + platnost),
    });
    return token;
  }

  public jePouzitelny(): boolean {
    return !this.pouzity && new Date(this.platny_do) > new Date();
  }
}

FanusikToken.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    fanusik_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'fanusikovia', key: 'id' }, onDelete: 'CASCADE' },
    odtlacok: { type: DataTypes.STRING(64), allowNull: false, unique: true },
    ucel: { type: DataTypes.STRING(20), allowNull: false },
    platny_do: { type: DataTypes.DATE, allowNull: false },
    pouzity: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    vytvoreny: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    aktualizovany: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    sequelize,
    modelName: 'FanusikToken',
    tableName: 'fanusikovia_tokeny',
    timestamps: true,
    createdAt: 'vytvoreny',
    updatedAt: 'aktualizovany',
  }
);

export default FanusikToken;
