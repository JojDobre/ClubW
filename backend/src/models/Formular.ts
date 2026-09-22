// Umiestnenie: backend/src/models/Formular.ts
//
// FORMULÁR A JEHO POLIA
//
// Polia sú JSON, pretože každý formulár má iné. Pevná schéma by
// znamenala migráciu pri každej zmene formulára.
//
// Tvar jedného poľa:
//   { "kod": "email", "nazov": "Váš e-mail", "typ": "email",
//     "popis": "Odpíšeme vám naň", "povinne": true,
//     "moznosti": ["a", "b"] }

import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export type TypPola =
  | 'text' | 'textarea' | 'email' | 'telefon' | 'cislo'
  | 'datum' | 'vyber' | 'zaskrtavacie' | 'suhlas';

export const TYPY_POLI: TypPola[] = [
  'text', 'textarea', 'email', 'telefon', 'cislo',
  'datum', 'vyber', 'zaskrtavacie', 'suhlas',
];

export interface PoleFormulara {
  kod: string;
  nazov: string;
  typ: TypPola;
  popis?: string | null;
  povinne?: boolean;
  /** Pri type "vyber" a "zaskrtavacie" */
  moznosti?: string[];
}

interface FormularAttributes {
  id: number;
  nazov: string;
  slug: string;
  popis: string | null;
  polia: PoleFormulara[];
  /** Text, ktorý sa návštevníkovi ukáže po odoslaní */
  sprava_po_odoslani: string | null;
  email_pre_notifikacie: string | null;
  /** Vypnutý formulár sa dá zobraziť, ale neprijíma odpovede */
  aktivny: boolean;
  aktivity: boolean;
  vytvoreny: Date;
  aktualizovany: Date;
}

interface FormularCreationAttributes
  extends Optional<
    FormularAttributes,
    | 'id' | 'popis' | 'polia' | 'sprava_po_odoslani' | 'email_pre_notifikacie'
    | 'aktivny' | 'aktivity' | 'vytvoreny' | 'aktualizovany'
  > {}

class Formular
  extends Model<FormularAttributes, FormularCreationAttributes>
  implements FormularAttributes
{
  public id!: number;
  public nazov!: string;
  public slug!: string;
  public popis!: string | null;
  public polia!: PoleFormulara[];
  public sprava_po_odoslani!: string | null;
  public email_pre_notifikacie!: string | null;
  public aktivny!: boolean;
  public aktivity!: boolean;
  public readonly vytvoreny!: Date;
  public readonly aktualizovany!: Date;

  /** Tvar pre verejné zobrazenie - bez interných údajov. */
  public verejneUdaje() {
    return {
      id: this.id,
      nazov: this.nazov,
      slug: this.slug,
      popis: this.popis,
      polia: this.polia,
      sprava_po_odoslani: this.sprava_po_odoslani,
      aktivny: this.aktivny,
    };
  }

  public toSafeJSON() {
    return {
      ...this.verejneUdaje(),
      email_pre_notifikacie: this.email_pre_notifikacie,
      aktivity: this.aktivity,
      vytvoreny: this.vytvoreny,
      aktualizovany: this.aktualizovany,
    };
  }

  /** Vyrobí slug z názvu. */
  public static vyrobSlug(nazov: string): string {
    return (
      nazov
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 160) || 'formular'
    );
  }

  /**
   * Overí a očistí definíciu polí.
   *
   * @returns očistené polia a zoznam chýb
   */
  public static overPolia(vstup: unknown): { polia: PoleFormulara[]; chyby: string[] } {
    const chyby: string[] = [];

    if (!Array.isArray(vstup)) {
      return { polia: [], chyby: ['Polia musia byť pole definícií'] };
    }

    if (vstup.length > 50) {
      return { polia: [], chyby: ['Formulár môže mať najviac 50 polí'] };
    }

    const polia: PoleFormulara[] = [];
    const pouziteKody = new Set<string>();

    vstup.forEach((pole: any, index: number) => {
      const poradie = index + 1;

      const nazov = String(pole?.nazov || '').trim();
      if (nazov.length < 1) {
        chyby.push(`Pole ${poradie}: názov nesmie byť prázdny`);
        return;
      }

      const typ = pole?.typ || 'text';
      if (!TYPY_POLI.includes(typ)) {
        chyby.push(`Pole ${poradie}: neznámy typ „${typ}" (povolené: ${TYPY_POLI.join(', ')})`);
        return;
      }

      // Kód slúži ako kľúč v uložených odpovediach. Keď ho klient
      // nepošle, odvodíme ho z názvu, aby odpovede boli čitateľné.
      let kod = String(pole?.kod || Formular.vyrobSlug(nazov)).replace(/[^a-z0-9_-]/gi, '');
      if (!kod) kod = `pole_${poradie}`;

      if (pouziteKody.has(kod)) {
        chyby.push(`Pole ${poradie}: kód „${kod}" je použitý viackrát`);
        return;
      }
      pouziteKody.add(kod);

      const vyzadujeMoznosti = typ === 'vyber' || typ === 'zaskrtavacie';
      const moznosti = Array.isArray(pole?.moznosti)
        ? pole.moznosti.map((m: any) => String(m).trim()).filter(Boolean)
        : [];

      if (vyzadujeMoznosti && moznosti.length === 0) {
        chyby.push(`Pole ${poradie}: typ „${typ}" musí mať aspoň jednu možnosť`);
        return;
      }

      polia.push({
        kod,
        nazov,
        typ,
        popis: pole?.popis ? String(pole.popis).trim() : null,
        povinne: pole?.povinne === true,
        ...(vyzadujeMoznosti ? { moznosti } : {}),
      });
    });

    return { polia, chyby };
  }
}

Formular.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    nazov: {
      type: DataTypes.STRING(150),
      allowNull: false,
      validate: { len: { args: [2, 150], msg: 'Názov formulára musí mať 2-150 znakov' } },
    },
    slug: { type: DataTypes.STRING(170), allowNull: false, unique: true },
    popis: { type: DataTypes.TEXT, allowNull: true },
    polia: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
    sprava_po_odoslani: { type: DataTypes.TEXT, allowNull: true },
    email_pre_notifikacie: { type: DataTypes.STRING(255), allowNull: true },
    aktivny: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    aktivity: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    vytvoreny: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    aktualizovany: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    sequelize,
    modelName: 'Formular',
    tableName: 'formulare',
    timestamps: true,
    createdAt: 'vytvoreny',
    updatedAt: 'aktualizovany',
  }
);

export default Formular;
