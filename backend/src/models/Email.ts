// Umiestnenie: backend/src/models/Email.ts
// E-mailový systém: nastavenia SMTP, upravené texty šablón, fronta
// odoslaných e-mailov a hromadné e-maily (kampane).
//
// Predvolené texty šablón sú v kóde (services/email/sablony.ts), tabuľka
// email_sablony drží len to, čo klub v administrácii zmenil.

import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

const casy = { timestamps: true, createdAt: 'vytvoreny', updatedAt: 'aktualizovany' } as const;

// ===== Nastavenia (jeden riadok) =====

export type ZabezpecenieSmtp = 'auto' | 'ssl' | 'starttls' | 'ziadne';

interface EmailNastaveniaAttributes {
  id: number;
  smtp_host: string | null;
  smtp_port: number | null;
  smtp_zabezpecenie: ZabezpecenieSmtp;
  smtp_pouzivatel: string | null;
  /** Zašifrované heslo (utils/sifrovanie) */
  smtp_heslo: string | null;
  odosielatel_meno: string | null;
  odosielatel_email: string | null;
  odpovedat_na: string | null;
  pata: string | null;
  limit_za_minutu: number;
  vytvoreny: Date;
  aktualizovany: Date;
}

export class EmailNastavenia
  extends Model<EmailNastaveniaAttributes, Optional<EmailNastaveniaAttributes, 'id' | 'vytvoreny' | 'aktualizovany' | 'smtp_zabezpecenie' | 'limit_za_minutu'>>
  implements EmailNastaveniaAttributes
{
  public id!: number;
  public smtp_host!: string | null;
  public smtp_port!: number | null;
  public smtp_zabezpecenie!: ZabezpecenieSmtp;
  public smtp_pouzivatel!: string | null;
  public smtp_heslo!: string | null;
  public odosielatel_meno!: string | null;
  public odosielatel_email!: string | null;
  public odpovedat_na!: string | null;
  public pata!: string | null;
  public limit_za_minutu!: number;
  public readonly vytvoreny!: Date;
  public readonly aktualizovany!: Date;

  /** Jediný riadok nastavení (vytvorí ho, ak chýba). */
  public static async nacitaj(): Promise<EmailNastavenia> {
    const [riadok] = await EmailNastavenia.findOrCreate({ where: {}, defaults: {} as never });
    return riadok;
  }

  /** Heslo sa do prehliadača nikdy neposiela - len informácia, že je uložené. */
  public toJSON() {
    const { smtp_heslo, ...hodnoty } = super.toJSON() as EmailNastaveniaAttributes;
    return { ...hodnoty, ma_heslo: Boolean(smtp_heslo) };
  }
}

EmailNastavenia.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    smtp_host: { type: DataTypes.STRING(255), allowNull: true },
    smtp_port: { type: DataTypes.INTEGER, allowNull: true, validate: { min: 1, max: 65535 } },
    smtp_zabezpecenie: {
      type: DataTypes.STRING(10),
      allowNull: false,
      defaultValue: 'auto',
      validate: { isIn: { args: [['auto', 'ssl', 'starttls', 'ziadne']], msg: 'Neplatné zabezpečenie spojenia' } },
    },
    smtp_pouzivatel: { type: DataTypes.STRING(255), allowNull: true },
    smtp_heslo: { type: DataTypes.TEXT, allowNull: true },
    odosielatel_meno: { type: DataTypes.STRING(150), allowNull: true },
    odosielatel_email: { type: DataTypes.STRING(255), allowNull: true, validate: { isEmail: { msg: 'E-mail odosielateľa nie je platný' } } },
    odpovedat_na: { type: DataTypes.STRING(255), allowNull: true, validate: { isEmail: { msg: 'E-mail pre odpovede nie je platný' } } },
    pata: { type: DataTypes.TEXT, allowNull: true },
    limit_za_minutu: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 30, validate: { min: 1, max: 1000 } },
    vytvoreny: DataTypes.DATE,
    aktualizovany: DataTypes.DATE,
  },
  { sequelize, tableName: 'email_nastavenia', ...casy }
);

// ===== Upravené texty šablón =====

interface EmailSablonaAttributes {
  id: number;
  kluc: string;
  predmet: string;
  obsah: string;
  aktivna: boolean;
  vytvoreny: Date;
  aktualizovany: Date;
}

export class EmailSablona
  extends Model<EmailSablonaAttributes, Optional<EmailSablonaAttributes, 'id' | 'aktivna' | 'vytvoreny' | 'aktualizovany'>>
  implements EmailSablonaAttributes
{
  public id!: number;
  public kluc!: string;
  public predmet!: string;
  public obsah!: string;
  public aktivna!: boolean;
  public readonly vytvoreny!: Date;
  public readonly aktualizovany!: Date;
}

EmailSablona.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    kluc: { type: DataTypes.STRING(60), allowNull: false, unique: true },
    predmet: { type: DataTypes.STRING(255), allowNull: false, validate: { notEmpty: { msg: 'Predmet e-mailu nesmie byť prázdny' } } },
    obsah: { type: DataTypes.TEXT, allowNull: false, validate: { notEmpty: { msg: 'Text e-mailu nesmie byť prázdny' } } },
    aktivna: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    vytvoreny: DataTypes.DATE,
    aktualizovany: DataTypes.DATE,
  },
  { sequelize, tableName: 'email_sablony', ...casy }
);

// ===== Hromadné e-maily =====

export type StavKampane = 'koncept' | 'odosiela' | 'odoslana';

export interface AdresatiKampane {
  /** Typy členstva; prázdne = všetci */
  typy?: string[];
  /** Len s platným (nevypršaným) členstvom */
  len_platne?: boolean;
}

interface EmailKampanAttributes {
  id: number;
  nazov: string;
  predmet: string;
  obsah: string;
  adresati: AdresatiKampane;
  stav: StavKampane;
  pocet_adresatov: number;
  vytvoril_id: number | null;
  odoslana: Date | null;
  vytvoreny: Date;
  aktualizovany: Date;
}

export class EmailKampan
  extends Model<
    EmailKampanAttributes,
    Optional<EmailKampanAttributes, 'id' | 'adresati' | 'stav' | 'pocet_adresatov' | 'vytvoril_id' | 'odoslana' | 'vytvoreny' | 'aktualizovany'>
  >
  implements EmailKampanAttributes
{
  public id!: number;
  public nazov!: string;
  public predmet!: string;
  public obsah!: string;
  public adresati!: AdresatiKampane;
  public stav!: StavKampane;
  public pocet_adresatov!: number;
  public vytvoril_id!: number | null;
  public odoslana!: Date | null;
  public readonly vytvoreny!: Date;
  public readonly aktualizovany!: Date;
}

EmailKampan.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    nazov: { type: DataTypes.STRING(150), allowNull: false, validate: { notEmpty: { msg: 'Zadajte názov hromadného e-mailu' } } },
    predmet: { type: DataTypes.STRING(255), allowNull: false, validate: { notEmpty: { msg: 'Predmet e-mailu nesmie byť prázdny' } } },
    obsah: { type: DataTypes.TEXT, allowNull: false, validate: { notEmpty: { msg: 'Text e-mailu nesmie byť prázdny' } } },
    adresati: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
    stav: { type: DataTypes.STRING(15), allowNull: false, defaultValue: 'koncept' },
    pocet_adresatov: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    vytvoril_id: { type: DataTypes.INTEGER, allowNull: true },
    odoslana: { type: DataTypes.DATE, allowNull: true },
    vytvoreny: DataTypes.DATE,
    aktualizovany: DataTypes.DATE,
  },
  { sequelize, tableName: 'email_kampane', ...casy }
);

// ===== Fronta a záznam odoslaných e-mailov =====

export type StavEmailu = 'caka' | 'odosiela' | 'odoslany' | 'chyba' | 'konzola';

interface EmailFrontaAttributes {
  id: number;
  prijemca: string;
  predmet: string;
  text: string;
  html: string | null;
  sablona: string | null;
  kampan_id: number | null;
  hlavicky: Record<string, string> | null;
  stav: StavEmailu;
  pokusy: number;
  posledna_chyba: string | null;
  odoslat_po: Date;
  odoslany: Date | null;
  vytvoreny: Date;
  aktualizovany: Date;
}

export class EmailFronta
  extends Model<
    EmailFrontaAttributes,
    Optional<
      EmailFrontaAttributes,
      'id' | 'html' | 'sablona' | 'kampan_id' | 'hlavicky' | 'stav' | 'pokusy' | 'posledna_chyba' | 'odoslat_po' | 'odoslany' | 'vytvoreny' | 'aktualizovany'
    >
  >
  implements EmailFrontaAttributes
{
  public id!: number;
  public prijemca!: string;
  public predmet!: string;
  public text!: string;
  public html!: string | null;
  public sablona!: string | null;
  public kampan_id!: number | null;
  public hlavicky!: Record<string, string> | null;
  public stav!: StavEmailu;
  public pokusy!: number;
  public posledna_chyba!: string | null;
  public odoslat_po!: Date;
  public odoslany!: Date | null;
  public readonly vytvoreny!: Date;
  public readonly aktualizovany!: Date;
}

EmailFronta.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    prijemca: { type: DataTypes.STRING(255), allowNull: false },
    predmet: { type: DataTypes.STRING(255), allowNull: false },
    text: { type: DataTypes.TEXT, allowNull: false },
    html: { type: DataTypes.TEXT, allowNull: true },
    sablona: { type: DataTypes.STRING(60), allowNull: true },
    kampan_id: { type: DataTypes.INTEGER, allowNull: true },
    hlavicky: { type: DataTypes.JSONB, allowNull: true },
    stav: { type: DataTypes.STRING(15), allowNull: false, defaultValue: 'caka' },
    pokusy: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    posledna_chyba: { type: DataTypes.TEXT, allowNull: true },
    odoslat_po: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    odoslany: { type: DataTypes.DATE, allowNull: true },
    vytvoreny: DataTypes.DATE,
    aktualizovany: DataTypes.DATE,
  },
  { sequelize, tableName: 'email_fronta', ...casy }
);
