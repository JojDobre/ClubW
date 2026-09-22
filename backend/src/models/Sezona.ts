// Umiestnenie: backend/src/models/Sezona.ts
// Sezóna ako samostatná entita.
//
// PREČO VZNIKLA: sezóna bola doteraz len textom v tabuľke líg ("2025/2026").
// To má tri dôsledky:
//   1. Preklep vytvorí novú "sezónu" - "2025/26" a "2025/2026" sú pre
//      databázu dve rôzne hodnoty a liga sa v archíve nespáruje.
//   2. Nedá sa nikde zaznamenať, kedy sezóna začína a končí, ani ktorá
//      je práve aktuálna. Verejný web pritom potrebuje vedieť, čo zobraziť
//      ako "aktuálne" a čo patrí do archívu.
//   3. Súpiska hráčov sezónu vôbec nepozná - po prestupe sa prepíše aj to,
//      za ktorý tím hráč hral vlani. História sa tým stratí.
//
// Tento model rieši body 1 a 2. Bod 3 rieši model SupiskaSezony.

import { DataTypes, Model, Optional, Op } from 'sequelize';
import sequelize from '../config/database';

interface SezonaAttributes {
  id: number;
  nazov: string;          // napríklad "2025/2026"
  zaciatok: Date | null;
  koniec: Date | null;
  // Aktuálna sezóna - v jednom okamihu môže byť označená len jedna
  aktualna: boolean;
  // Uzavretá sezóna sa už needituje, slúži len na čítanie v archíve
  uzavreta: boolean;
  // Archivácia - false znamená "neukazuj, ale dáta a história zostávajú".
  // Rovnaký význam má "aktivity" pri tímoch, hráčoch, realizačnom tíme a ligách.
  aktivity: boolean;
  poznamka: string | null;
  vytvorena: Date;
  aktualizovana: Date;
}

interface SezonaCreationAttributes
  extends Optional<
    SezonaAttributes,
    'id' | 'zaciatok' | 'koniec' | 'aktualna' | 'uzavreta' | 'aktivity' | 'poznamka' | 'vytvorena' | 'aktualizovana'
  > {}

class Sezona
  extends Model<SezonaAttributes, SezonaCreationAttributes>
  implements SezonaAttributes
{
  public id!: number;
  public nazov!: string;
  public zaciatok!: Date | null;
  public koniec!: Date | null;
  public aktualna!: boolean;
  public uzavreta!: boolean;
  public aktivity!: boolean;
  public poznamka!: string | null;
  public readonly vytvorena!: Date;
  public readonly aktualizovana!: Date;

  /**
   * Vráti aktuálnu sezónu. Ak žiadna nie je označená, vezme najnovšiu
   * podľa názvu, aby aplikácia nikdy nezostala bez sezóny.
   */
  public static async aktualnaSezona(): Promise<Sezona | null> {
    const oznacena = await Sezona.findOne({ where: { aktualna: true } });
    if (oznacena) return oznacena;

    return Sezona.findOne({ order: [['nazov', 'DESC']] });
  }

  /**
   * Označí sezónu ako aktuálnu a zruší príznak u ostatných.
   *
   * Vykonáva sa v transakcii - inak by pri zlyhaní mohli byť označené
   * dve sezóny naraz alebo žiadna.
   */
  public static async nastavAktualnu(sezonaId: number): Promise<void> {
    await sequelize.transaction(async (t) => {
      await Sezona.update(
        { aktualna: false },
        { where: { aktualna: true }, transaction: t }
      );
      await Sezona.update(
        { aktualna: true },
        { where: { id: sezonaId }, transaction: t }
      );
    });
  }

  /**
   * Odhadne názov nasledujúcej sezóny podľa poslednej existujúcej.
   * Slúži ako predvyplnená hodnota vo formulári.
   */
  public static async navrhniNazovNovej(): Promise<string> {
    const posledna = await Sezona.findOne({ order: [['nazov', 'DESC']] });
    const teraz = new Date();

    if (!posledna) {
      // Futbalová sezóna sa začína v lete, preto od júla berieme
      // aktuálny rok ako začiatok nového ročníka
      const rok = teraz.getMonth() >= 6 ? teraz.getFullYear() : teraz.getFullYear() - 1;
      return `${rok}/${rok + 1}`;
    }

    const zhoda = posledna.nazov.match(/^(\d{4})\/(\d{4})$/);
    if (zhoda) {
      const od = parseInt(zhoda[1], 10) + 1;
      return `${od}/${od + 1}`;
    }

    return posledna.nazov;
  }

  /** Prebieha sezóna práve teraz podľa zadaných dátumov? */
  public prebieha(): boolean {
    const teraz = new Date();
    if (this.zaciatok && teraz < new Date(this.zaciatok)) return false;
    if (this.koniec && teraz > new Date(this.koniec)) return false;
    return true;
  }
}

Sezona.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    nazov: {
      type: DataTypes.STRING(20),
      allowNull: false,
      unique: true,
      validate: {
        len: [4, 20],
        // Odporúčaný tvar je 2025/2026, ale nevynucujeme ho striktne -
        // niektoré súťaže bežia v rámci jedného kalendárneho roka
        notEmpty: true,
      },
    },
    zaciatok: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    koniec: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    aktualna: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    uzavreta: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    aktivity: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    poznamka: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    vytvorena: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    aktualizovana: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    modelName: 'Sezona',
    tableName: 'sezony',
    timestamps: true,
    createdAt: 'vytvorena',
    updatedAt: 'aktualizovana',
    validate: {
      // Koniec nesmie predchádzať začiatku
      datumySedia(this: Sezona) {
        if (this.zaciatok && this.koniec && new Date(this.koniec) < new Date(this.zaciatok)) {
          throw new Error('Koniec sezóny nemôže byť skôr ako jej začiatok');
        }
      },
    },
    indexes: [
      { fields: ['nazov'], unique: true, name: 'sezony_nazov' },
      // Čiastočný jedinečný index - aktuálna môže byť len jedna sezóna.
      // Databáza to ustráži aj vtedy, keby aplikačná logika zlyhala.
      {
        fields: ['aktualna'],
        unique: true,
        where: { aktualna: true },
        name: 'sezony_jedna_aktualna',
      },
    ],
  }
);

export default Sezona;
