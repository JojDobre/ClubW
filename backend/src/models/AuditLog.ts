// Umiestnenie: backend/src/models/AuditLog.ts
// Záznam o prístupe k osobným údajom a o ich zmenách.
//
// PREČO VZNIKOL: GDPR vyžaduje, aby prevádzkovateľ vedel preukázať,
// kto a kedy pristupoval k osobným údajom a ako s nimi naložil.
// Pri klube s viacerými redaktormi a trénermi je to zároveň praktické -
// bez záznamu sa nedá zistiť, kto zmazal hráča alebo prepísal výsledok.
//
// ČO SA ZAZNAMENÁVA: zápisové operácie nad osobnými údajmi a export
// alebo anonymizácia. Bežné čítanie verejného webu sa nezaznamenáva -
// zahltilo by tabuľku a nemá vypovedaciu hodnotu.

import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export type TypAkcie =
  | 'vytvorenie'
  | 'uprava'
  | 'zmazanie'
  | 'anonymizacia'
  | 'export_udajov'
  | 'zmena_suhlasu'
  | 'prihlasenie'
  | 'zmena_hesla';

interface AuditLogAttributes {
  id: number;
  // Kto operáciu vykonal. Null pri automatických úlohách (retencia).
  pouzivatel_id: number | null;
  pouzivatel_email: string | null;
  akcia: TypAkcie;
  entita: string;              // napríklad "Player", "Suhlas"
  entita_id: number | null;
  // Stručný popis zmeny. Zámerne neukladáme celý obsah záznamu -
  // audit by sa tak sám stal ďalšou kópiou osobných údajov.
  popis: string | null;
  ip_adresa: string | null;
  vytvoreny: Date;
}

interface AuditLogCreationAttributes
  extends Optional<
    AuditLogAttributes,
    'id' | 'pouzivatel_id' | 'pouzivatel_email' | 'entita_id' | 'popis' | 'ip_adresa' | 'vytvoreny'
  > {}

class AuditLog
  extends Model<AuditLogAttributes, AuditLogCreationAttributes>
  implements AuditLogAttributes
{
  public id!: number;
  public pouzivatel_id!: number | null;
  public pouzivatel_email!: string | null;
  public akcia!: TypAkcie;
  public entita!: string;
  public entita_id!: number | null;
  public popis!: string | null;
  public ip_adresa!: string | null;
  public readonly vytvoreny!: Date;

  /**
   * Zapíše záznam do auditu.
   *
   * Chyba pri zápise sa iba zaloguje - audit nesmie zhodiť samotnú
   * operáciu, ktorú zaznamenáva.
   */
  public static async zaznamenaj(udaje: {
    req?: any;
    akcia: TypAkcie;
    entita: string;
    entita_id?: number | null;
    popis?: string | null;
  }): Promise<void> {
    try {
      await AuditLog.create({
        pouzivatel_id: udaje.req?.userId ?? null,
        pouzivatel_email: udaje.req?.user?.email ?? null,
        akcia: udaje.akcia,
        entita: udaje.entita,
        entita_id: udaje.entita_id ?? null,
        popis: udaje.popis ?? null,
        ip_adresa: udaje.req?.ip ?? null,
      });
    } catch (error) {
      console.error('Nepodarilo sa zapísať záznam do auditu:', error);
    }
  }
}

AuditLog.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    pouzivatel_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'pouzivatelia', key: 'id' },
      // Po zmazaní používateľa záznam zostáva - inak by sa dala
      // história zahladiť zmazaním vlastného účtu
      onDelete: 'SET NULL',
    },
    pouzivatel_email: { type: DataTypes.STRING(150), allowNull: true },
    akcia: {
      type: DataTypes.ENUM(
        'vytvorenie', 'uprava', 'zmazanie', 'anonymizacia',
        'export_udajov', 'zmena_suhlasu', 'prihlasenie', 'zmena_hesla'
      ),
      allowNull: false,
    },
    entita: { type: DataTypes.STRING(50), allowNull: false },
    entita_id: { type: DataTypes.INTEGER, allowNull: true },
    popis: { type: DataTypes.STRING(500), allowNull: true },
    ip_adresa: { type: DataTypes.STRING(45), allowNull: true },
    vytvoreny: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    modelName: 'AuditLog',
    tableName: 'audit_log',
    timestamps: true,
    createdAt: 'vytvoreny',
    updatedAt: false,
    indexes: [
      { fields: ['entita', 'entita_id'], name: 'audit_entita' },
      { fields: ['pouzivatel_id'], name: 'audit_pouzivatel' },
      { fields: ['vytvoreny'], name: 'audit_datum' },
    ],
  }
);

export default AuditLog;
