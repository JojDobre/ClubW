// Umiestnenie: backend/src/models/ResetHeslaToken.ts
// Jednorazové tokeny na obnovu zabudnutého hesla.
//
// PREČO VZNIKOL: v projekte neexistoval žiadny spôsob, ako si obnoviť
// zabudnuté heslo. Jedinou možnosťou bolo ručne zasiahnuť do databázy,
// čo pri klube s viacerými redaktormi nie je použiteľné.
//
// BEZPEČNOSTNÉ ZÁSADY:
//   - V databáze je len odtlačok (SHA-256), nie samotný token.
//   - Platnosť je krátka (1 hodina).
//   - Token je jednorazový - po použití sa označí ako spotrebovaný.
//   - Pri vyžiadaní nového sa staré nespotrebované tokeny zrušia.
//   - Endpoint na vyžiadanie odpovedá rovnako bez ohľadu na to, či e-mail
//     existuje, aby sa nedali zisťovať registrované adresy.

import { DataTypes, Model, Optional } from 'sequelize';
import crypto from 'crypto';
import sequelize from '../config/database';

interface ResetHeslaTokenAttributes {
  id: number;
  pouzivatel_id: number;
  odtlacok: string;
  platny_do: Date;
  pouzity: boolean;
  ip_adresa: string | null;
  vytvoreny: Date;
  aktualizovany: Date;
}

interface ResetHeslaTokenCreationAttributes
  extends Optional<
    ResetHeslaTokenAttributes,
    'id' | 'pouzity' | 'ip_adresa' | 'vytvoreny' | 'aktualizovany'
  > {}

class ResetHeslaToken
  extends Model<ResetHeslaTokenAttributes, ResetHeslaTokenCreationAttributes>
  implements ResetHeslaTokenAttributes
{
  public id!: number;
  public pouzivatel_id!: number;
  public odtlacok!: string;
  public platny_do!: Date;
  public pouzity!: boolean;
  public ip_adresa!: string | null;
  public readonly vytvoreny!: Date;
  public readonly aktualizovany!: Date;

  /** Odtlačok tokenu pre uloženie do databázy. */
  public static odtlacokTokenu(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /** Vygeneruje náhodný token pre odkaz v e-maile. */
  public static vygenerujToken(): string {
    return crypto.randomBytes(32).toString('base64url');
  }

  /** Je token ešte použiteľný? */
  public jePouzitelny(): boolean {
    return !this.pouzity && new Date(this.platny_do) > new Date();
  }
}

ResetHeslaToken.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    pouzivatel_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'pouzivatelia', key: 'id' },
      onDelete: 'CASCADE',
    },
    odtlacok: {
      type: DataTypes.STRING(64),
      allowNull: false,
      unique: true,
    },
    platny_do: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    pouzity: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    ip_adresa: {
      type: DataTypes.STRING(45),
      allowNull: true,
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
    modelName: 'ResetHeslaToken',
    tableName: 'reset_hesla_tokeny',
    timestamps: true,
    createdAt: 'vytvoreny',
    updatedAt: 'aktualizovany',
    indexes: [
      { fields: ['odtlacok'], unique: true, name: 'reset_hesla_odtlacok' },
      { fields: ['pouzivatel_id'], name: 'reset_hesla_pouzivatel' },
    ],
  }
);

export default ResetHeslaToken;
