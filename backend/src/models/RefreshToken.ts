// Umiestnenie: backend/src/models/RefreshToken.ts
// Obnovovacie (refresh) tokeny uložené v databáze.
//
// PREČO VZNIKOL: pôvodný endpoint /api/auth/refresh vyžadoval PLATNÝ
// prihlasovací token, takže obnoviť sa dal len token, ktorý ešte nevypršal.
// Po 24 hodinách bol používateľ odhlásený bez ohľadu na to, či pracoval.
// Zároveň neexistoval spôsob, ako platný token zrušiť - odobratie práv
// alebo deaktivácia účtu sa prejavili až po jeho vypršaní.
//
// AKO TO FUNGUJE:
//   - Krátky prístupový token (24h) sa nikam neukladá, overuje sa podpisom.
//   - Dlhý obnovovací token (30 dní) je uložený tu a dá sa kedykoľvek zrušiť.
//   - Pri každom obnovení sa starý token zruší a vydá sa nový (rotácia).
//     Ak by niekto odcudzený token použil druhýkrát, zásah sa odhalí
//     a zrušia sa všetky tokeny daného používateľa.
//
// BEZPEČNOSŤ: v databáze je uložený len odtlačok (SHA-256) tokenu, nie
// samotná hodnota. Únik obsahu tabuľky tak neumožní prihlásiť sa.

import { DataTypes, Model, Optional } from 'sequelize';
import crypto from 'crypto';
import sequelize from '../config/database';

interface RefreshTokenAttributes {
  id: number;
  pouzivatel_id: number;
  odtlacok: string;
  platny_do: Date;
  zruseny: boolean;
  dovod_zrusenia: string | null;
  // Údaje o zariadení pomáhajú používateľovi rozpoznať vlastné relácie
  ip_adresa: string | null;
  prehliadac: string | null;
  vytvoreny: Date;
  aktualizovany: Date;
}

interface RefreshTokenCreationAttributes
  extends Optional<
    RefreshTokenAttributes,
    'id' | 'zruseny' | 'dovod_zrusenia' | 'ip_adresa' | 'prehliadac' | 'vytvoreny' | 'aktualizovany'
  > {}

class RefreshToken
  extends Model<RefreshTokenAttributes, RefreshTokenCreationAttributes>
  implements RefreshTokenAttributes
{
  public id!: number;
  public pouzivatel_id!: number;
  public odtlacok!: string;
  public platny_do!: Date;
  public zruseny!: boolean;
  public dovod_zrusenia!: string | null;
  public ip_adresa!: string | null;
  public prehliadac!: string | null;
  public readonly vytvoreny!: Date;
  public readonly aktualizovany!: Date;

  /**
   * Vytvorí odtlačok tokenu pre uloženie do databázy.
   * Samotný token sa nikdy neukladá.
   */
  public static odtlacokTokenu(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Vygeneruje náhodný obnovovací token.
   * 48 bajtov náhody je dosť na to, aby sa nedal uhádnuť.
   */
  public static vygenerujToken(): string {
    return crypto.randomBytes(48).toString('base64url');
  }

  /** Je token ešte použiteľný? */
  public jePouzitelny(): boolean {
    return !this.zruseny && new Date(this.platny_do) > new Date();
  }
}

RefreshToken.init(
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
      // SHA-256 v šestnástkovej sústave má vždy 64 znakov
      type: DataTypes.STRING(64),
      allowNull: false,
      unique: true,
    },
    platny_do: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    zruseny: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    dovod_zrusenia: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    ip_adresa: {
      type: DataTypes.STRING(45), // stačí aj na IPv6
      allowNull: true,
    },
    prehliadac: {
      type: DataTypes.STRING(255),
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
    modelName: 'RefreshToken',
    tableName: 'obnovovacie_tokeny',
    timestamps: true,
    createdAt: 'vytvoreny',
    updatedAt: 'aktualizovany',
    indexes: [
      { fields: ['odtlacok'], unique: true, name: 'obnovovacie_tokeny_odtlacok' },
      { fields: ['pouzivatel_id'], name: 'obnovovacie_tokeny_pouzivatel' },
      // Index na hľadanie tokenov na vymazanie (upratovanie starých záznamov)
      { fields: ['platny_do'], name: 'obnovovacie_tokeny_platnost' },
    ],
  }
);

export default RefreshToken;
