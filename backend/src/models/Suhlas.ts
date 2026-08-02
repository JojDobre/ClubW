// Umiestnenie: backend/src/models/Suhlas.ts
// Súhlasy so spracovaním osobných údajov.
//
// PREČO VZNIKOL: systém eviduje mená, dátumy narodenia a fotky detí
// (kategórie U9 až U19). Podľa GDPR ide o osobné údaje maloletých,
// ktorých zverejnenie vyžaduje súhlas zákonného zástupcu. Doteraz sa
// takýto súhlas nikde neevidoval, hoci fotky hráčov sa zobrazujú
// na verejnom webe.
//
// AKO TO FUNGUJE: súhlas je viazaný na hráča a druh spracovania.
// Bez platného súhlasu sa údaj na verejný web nedostane - filtrovanie
// rieši metóda Player.verejneUdaje() spolu s týmto modelom.
//
// Súhlas sa dá kedykoľvek odvolať (datum_odvolania). Záznam sa nemaže,
// aby klub vedel preukázať, kedy a kým bol súhlas udelený a odvolaný.

import { DataTypes, Model, Optional, Op } from 'sequelize';
import sequelize from '../config/database';

// Druhy spracovania, na ktoré sa súhlas vyžaduje
export type DruhSuhlasu =
  | 'zverejnenie_fotky'      // fotka hráča na verejnom webe
  | 'zverejnenie_mena'       // meno a priezvisko na verejnom webe
  | 'spracovanie_udajov'     // vedenie evidencie v klube (základný súhlas)
  | 'kontaktne_udaje'        // telefón a e-mail zákonného zástupcu
  | 'marketing';             // oznamy a newsletter

export const DRUHY_SUHLASU: DruhSuhlasu[] = [
  'zverejnenie_fotky',
  'zverejnenie_mena',
  'spracovanie_udajov',
  'kontaktne_udaje',
  'marketing',
];

interface SuhlasAttributes {
  id: number;
  hrac_id: number;
  druh: DruhSuhlasu;
  udeleny: boolean;
  // Kto súhlas udelil - pri maloletom zákonný zástupca
  udelil_meno: string | null;
  udelil_vztah: string | null;   // napríklad "matka", "otec", "hráč"
  udelil_email: string | null;
  datum_udelenia: Date | null;
  datum_odvolania: Date | null;
  // Súhlas môže byť časovo obmedzený (napríklad na jednu sezónu)
  platny_do: Date | null;
  // Podklad, na základe ktorého bol súhlas zaznamenaný
  zdroj: string | null;          // "papierový formulár", "e-mail", "prihláška"
  poznamka: string | null;
  vytvoreny: Date;
  aktualizovany: Date;
}

interface SuhlasCreationAttributes
  extends Optional<
    SuhlasAttributes,
    | 'id' | 'udeleny' | 'udelil_meno' | 'udelil_vztah' | 'udelil_email'
    | 'datum_udelenia' | 'datum_odvolania' | 'platny_do' | 'zdroj'
    | 'poznamka' | 'vytvoreny' | 'aktualizovany'
  > {}

class Suhlas
  extends Model<SuhlasAttributes, SuhlasCreationAttributes>
  implements SuhlasAttributes
{
  public id!: number;
  public hrac_id!: number;
  public druh!: DruhSuhlasu;
  public udeleny!: boolean;
  public udelil_meno!: string | null;
  public udelil_vztah!: string | null;
  public udelil_email!: string | null;
  public datum_udelenia!: Date | null;
  public datum_odvolania!: Date | null;
  public platny_do!: Date | null;
  public zdroj!: string | null;
  public poznamka!: string | null;
  public readonly vytvoreny!: Date;
  public readonly aktualizovany!: Date;

  /** Je súhlas práve teraz platný? */
  public jePlatny(): boolean {
    if (!this.udeleny) return false;
    if (this.datum_odvolania) return false;
    if (this.platny_do && new Date(this.platny_do) < new Date()) return false;
    return true;
  }

  /**
   * Vráti množinu druhov, na ktoré má hráč platný súhlas.
   * Používa sa pri filtrovaní údajov pre verejný web.
   */
  public static async platneDruhy(hracId: number): Promise<Set<DruhSuhlasu>> {
    const suhlasy = await Suhlas.findAll({
      where: {
        hrac_id: hracId,
        udeleny: true,
        datum_odvolania: null as any,
        [Op.or]: [
          { platny_do: null as any },
          { platny_do: { [Op.gte]: new Date() } },
        ],
      },
    });
    return new Set(suhlasy.map((s) => s.druh));
  }

  /**
   * To isté pre viacero hráčov naraz.
   *
   * Existuje preto, že výpis súpisky by inak volal databázu pre každého
   * hráča zvlášť (problém N+1). Pri súpiske s 25 hráčmi je to 25 dotazov
   * namiesto jedného.
   */
  public static async platneDruhyPreViacerych(
    hraciIds: number[]
  ): Promise<Map<number, Set<DruhSuhlasu>>> {
    const vysledok = new Map<number, Set<DruhSuhlasu>>();
    if (hraciIds.length === 0) return vysledok;

    const suhlasy = await Suhlas.findAll({
      where: {
        hrac_id: { [Op.in]: hraciIds },
        udeleny: true,
        datum_odvolania: null as any,
        [Op.or]: [
          { platny_do: null as any },
          { platny_do: { [Op.gte]: new Date() } },
        ],
      },
    });

    for (const s of suhlasy) {
      if (!vysledok.has(s.hrac_id)) vysledok.set(s.hrac_id, new Set());
      vysledok.get(s.hrac_id)!.add(s.druh);
    }

    return vysledok;
  }
}

Suhlas.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    hrac_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'hraci', key: 'id' },
      onDelete: 'CASCADE',
    },
    druh: {
      type: DataTypes.ENUM(...DRUHY_SUHLASU),
      allowNull: false,
    },
    udeleny: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    udelil_meno: { type: DataTypes.STRING(150), allowNull: true },
    udelil_vztah: { type: DataTypes.STRING(50), allowNull: true },
    udelil_email: {
      type: DataTypes.STRING(150),
      allowNull: true,
      validate: { isEmail: true },
    },
    datum_udelenia: { type: DataTypes.DATE, allowNull: true },
    datum_odvolania: { type: DataTypes.DATE, allowNull: true },
    platny_do: { type: DataTypes.DATEONLY, allowNull: true },
    zdroj: { type: DataTypes.STRING(100), allowNull: true },
    poznamka: { type: DataTypes.TEXT, allowNull: true },
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
    modelName: 'Suhlas',
    tableName: 'suhlasy',
    timestamps: true,
    createdAt: 'vytvoreny',
    updatedAt: 'aktualizovany',
    indexes: [
      // Jeden hráč má na každý druh spracovania jeden záznam
      { fields: ['hrac_id', 'druh'], unique: true, name: 'suhlasy_hrac_druh' },
      { fields: ['hrac_id'], name: 'suhlasy_hrac' },
    ],
  }
);

export default Suhlas;
