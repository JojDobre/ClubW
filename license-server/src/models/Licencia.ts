// Umiestnenie: license-server/src/models/Licencia.ts
// Model licencie - jeden záznam zodpovedá jednému predanému klubu.

import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

// Podporované licenčné plány (podľa zadania: Pro na rok, Enterprise na 2 roky)
export type LicencnyPlan = 'pro' | 'enterprise';

// Stav licencie. 'pozastavena' použijeme napríklad pri nezaplatenej faktúre -
// licencia sa dá znovu zapnúť bez toho, aby sa vytvárala nová.
export type StavLicencie = 'aktivna' | 'pozastavena' | 'zrusena';

interface LicenciaAttributes {
  id: number;
  kluc: string;
  nazov_klienta: string;
  email_klienta: string;
  // Doména, na ktorej smie licencia bežať. Bez nej by sa jeden kľúč
  // dal použiť na ľubovoľnom počte webov.
  domena: string | null;
  plan: LicencnyPlan;
  funkcie: string[];
  platna_od: Date;
  platna_do: Date;
  stav: StavLicencie;
  poznamka: string | null;
  posledna_kontrola: Date | null;
  pocet_kontrol: number;
  vytvoreny: Date;
  aktualizovany: Date;
}

interface LicenciaCreationAttributes
  extends Optional<
    LicenciaAttributes,
    'id' | 'domena' | 'funkcie' | 'stav' | 'poznamka' | 'posledna_kontrola'
    | 'pocet_kontrol' | 'vytvoreny' | 'aktualizovany' | 'platna_od'
  > {}

class Licencia
  extends Model<LicenciaAttributes, LicenciaCreationAttributes>
  implements LicenciaAttributes
{
  public id!: number;
  public kluc!: string;
  public nazov_klienta!: string;
  public email_klienta!: string;
  public domena!: string | null;
  public plan!: LicencnyPlan;
  public funkcie!: string[];
  public platna_od!: Date;
  public platna_do!: Date;
  public stav!: StavLicencie;
  public poznamka!: string | null;
  public posledna_kontrola!: Date | null;
  public pocet_kontrol!: number;
  public vytvoreny!: Date;
  public aktualizovany!: Date;

  /**
   * Je licencia práve platná?
   * Platí, ak je aktívna a dnešný dátum spadá do jej obdobia.
   */
  public jePlatna(): boolean {
    if (this.stav !== 'aktivna') return false;

    const teraz = new Date();
    return teraz >= new Date(this.platna_od) && teraz <= new Date(this.platna_do);
  }

  /**
   * Počet dní do vypršania. Záporná hodnota znamená, že už vypršala.
   */
  public dniDoVyprsania(): number {
    const rozdiel = new Date(this.platna_do).getTime() - Date.now();
    return Math.ceil(rozdiel / (24 * 60 * 60 * 1000));
  }

  /**
   * Overí, či licencia patrí k zadanej doméne.
   * Licencia bez vyplnenej domény sa považuje za neviazanú (napr. demo).
   *
   * @param domena - doména, z ktorej prišla požiadavka
   */
  public sediDomena(domena: string | null | undefined): boolean {
    if (!this.domena) return true; // neviazaná licencia
    if (!domena) return false;

    // Porovnávame bez ohľadu na veľkosť písmen a bez predpony www.
    const normalizuj = (d: string) => d.toLowerCase().trim().replace(/^www\./, '');
    return normalizuj(this.domena) === normalizuj(domena);
  }
}

Licencia.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    kluc: {
      type: DataTypes.STRING(64),
      allowNull: false,
      unique: true,
      comment: 'Licenčný kľúč, ktorý klient zadá do svojho webu',
    },
    nazov_klienta: {
      type: DataTypes.STRING(200),
      allowNull: false,
      validate: { notEmpty: true },
    },
    email_klienta: {
      type: DataTypes.STRING(200),
      allowNull: false,
      validate: { isEmail: true },
    },
    domena: {
      type: DataTypes.STRING(200),
      allowNull: true,
      comment: 'Doména, na ktorej smie licencia bežať (prázdne = neviazaná)',
    },
    plan: {
      type: DataTypes.ENUM('pro', 'enterprise'),
      allowNull: false,
      defaultValue: 'pro',
    },
    funkcie: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
      comment: 'Zoznam povolených funkcií, napr. ["cms","tímy","ligy"]',
    },
    platna_od: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    platna_do: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    stav: {
      type: DataTypes.ENUM('aktivna', 'pozastavena', 'zrusena'),
      allowNull: false,
      defaultValue: 'aktivna',
    },
    poznamka: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    posledna_kontrola: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Kedy sa klientsky web naposledy ozval',
    },
    pocet_kontrol: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
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
    modelName: 'Licencia',
    tableName: 'licencie',
    timestamps: true,
    createdAt: 'vytvoreny',
    updatedAt: 'aktualizovany',
    indexes: [
      { fields: ['kluc'], unique: true, name: 'licencie_kluc_unique' },
      { fields: ['stav'], name: 'licencie_stav' },
      { fields: ['platna_do'], name: 'licencie_platna_do' },
      { fields: ['email_klienta'], name: 'licencie_email' },
    ],
  }
);

export default Licencia;
