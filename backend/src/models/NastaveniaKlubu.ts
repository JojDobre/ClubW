// Umiestnenie: backend/src/models/NastaveniaKlubu.ts
// Nastavenia klubu - identita, farby a kontaktné údaje.
//
// PREČO VZNIKOL: návrh verejného webu je postavený na white-label princípe -
// zmena troch CSS premenných (--club-primary, --club-secondary, --club-accent)
// prefarbí celý web. Tieto hodnoty však boli natvrdo v štýloch, takže každý
// nový klub by znamenal zásah do kódu. Pri licenčnom modeli, kde má systém
// obsluhovať viacero klubov, to nie je použiteľné.
//
// TVAR TABUĽKY: jeden riadok na inštaláciu (singleton). Alternatívou by bola
// tabuľka kľúč-hodnota, tá je však bez typovej kontroly a validácie -
// preklep v názve kľúča by sa prejavil až na produkcii.

import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

// Kontrola šesťmiestneho zápisu farby (#1B5E20)
const VZOR_FARBY = /^#[0-9A-Fa-f]{6}$/;

interface NastaveniaKlubuAttributes {
  id: number;

  // ===== Identita klubu =====
  nazov: string;
  skratka: string | null;        // do znaku loga, napr. "SD"
  slogan: string | null;         // napr. "Srdcom pre futbal"
  rok_zalozenia: number | null;
  logo: string | null;
  favicon: string | null;

  // ===== Farby (white-label tokeny) =====
  farba_primarna: string;
  farba_sekundarna: string;
  farba_akcent: string;
  // Farba textu na primárnom a akcentovom pozadí. Nedá sa spoľahlivo
  // odvodiť automaticky - pri stredne svetlých odtieňoch je voľba vecou
  // vkusu, preto ju necháme na správcu.
  farba_primarna_kontrast: string;
  farba_akcent_kontrast: string;

  // ===== Kontakt =====
  email: string | null;
  telefon: string | null;
  adresa: string | null;
  ico: string | null;
  dic: string | null;
  /** Oficiálny názov organizácie (napr. občianske združenie) */
  pravny_nazov: string | null;
  ic_dph: string | null;
  /** Účet na príspevky a platby členského */
  iban: string | null;

  // ===== Sociálne siete =====
  facebook_url: string | null;
  instagram_url: string | null;
  youtube_url: string | null;
  x_url: string | null;
  tiktok_url: string | null;

  // ===== Web =====
  meta_popis: string | null;
  google_analytics_id: string | null;

  // Sady nastavení sú JSON, nie desiatky stĺpcov - menia sa často
  // a nová položka v nich nevyžaduje migráciu.
  /** Dodatkové farby podľa šablóny, napríklad {"uspech":"#2E7D32"} */
  dodatkove_farby: Record<string, string>;
  /** Globálne nastavenia komentárov */
  nastavenia_komentarov: Record<string, unknown>;
  /** GDPR - cookie lišta, text súhlasu, retencia */
  nastavenia_gdpr: Record<string, unknown>;
  /** SEO nad rámec meta_popis */
  nastavenia_seo: Record<string, unknown>;

  // ===== Šablóna verejného webu =====
  /** Priečinok (slug) aktívnej šablóny */
  aktivna_sablona: string;
  /** Hodnoty nastavení šablón: {"stadion": {"akcent": "#f59e0b"}} */
  nastavenia_sablon: Record<string, Record<string, unknown>>;
  /** Predvolený jazyk administrácie (sk/cs/en) */
  jazyk_administracie: string;

  vytvoreny: Date;
  aktualizovany: Date;
}

interface NastaveniaKlubuCreationAttributes
  extends Optional<
    NastaveniaKlubuAttributes,
    | 'id' | 'skratka' | 'slogan' | 'rok_zalozenia' | 'logo' | 'favicon'
    | 'farba_primarna' | 'farba_sekundarna' | 'farba_akcent'
    | 'farba_primarna_kontrast' | 'farba_akcent_kontrast'
    | 'email' | 'telefon' | 'adresa' | 'ico' | 'dic' | 'pravny_nazov' | 'ic_dph' | 'iban'
    | 'facebook_url' | 'instagram_url' | 'youtube_url' | 'x_url' | 'tiktok_url'
    | 'meta_popis' | 'google_analytics_id'
    | 'dodatkove_farby' | 'nastavenia_komentarov'
    | 'nastavenia_gdpr' | 'nastavenia_seo' | 'aktivna_sablona' | 'nastavenia_sablon' | 'jazyk_administracie'
    | 'vytvoreny' | 'aktualizovany'
  > {}

class NastaveniaKlubu
  extends Model<NastaveniaKlubuAttributes, NastaveniaKlubuCreationAttributes>
  implements NastaveniaKlubuAttributes
{
  public id!: number;
  public nazov!: string;
  public skratka!: string | null;
  public slogan!: string | null;
  public rok_zalozenia!: number | null;
  public logo!: string | null;
  public favicon!: string | null;
  public farba_primarna!: string;
  public farba_sekundarna!: string;
  public farba_akcent!: string;
  public farba_primarna_kontrast!: string;
  public farba_akcent_kontrast!: string;
  public email!: string | null;
  public telefon!: string | null;
  public adresa!: string | null;
  public ico!: string | null;
  public dic!: string | null;
  public pravny_nazov!: string | null;
  public ic_dph!: string | null;
  public iban!: string | null;
  public facebook_url!: string | null;
  public instagram_url!: string | null;
  public youtube_url!: string | null;
  public x_url!: string | null;
  public tiktok_url!: string | null;
  public meta_popis!: string | null;
  public google_analytics_id!: string | null;
  public dodatkove_farby!: Record<string, string>;
  public nastavenia_komentarov!: Record<string, unknown>;
  public nastavenia_gdpr!: Record<string, unknown>;
  public nastavenia_seo!: Record<string, unknown>;
  public aktivna_sablona!: string;
  public nastavenia_sablon!: Record<string, Record<string, unknown>>;
  public jazyk_administracie!: string;
  public readonly vytvoreny!: Date;
  public readonly aktualizovany!: Date;

  /**
   * Načíta nastavenia. Ak ešte neexistujú, vytvorí riadok s predvolenými
   * hodnotami, aby web nikdy nezostal bez farieb a názvu.
   */
  public static async nacitaj(): Promise<NastaveniaKlubu> {
    const existujuce = await NastaveniaKlubu.findOne({ order: [['id', 'ASC']] });
    if (existujuce) return existujuce;

    return NastaveniaKlubu.create({ nazov: 'Futbalový klub' });
  }

  /**
   * Údaje pre verejný web.
   *
   * Aktívnu šablónu a jej nastavenia web číta zvlášť cez
   * /api/sablony/aktivna (s adresami jej súborov).
   */
  public verejneUdaje() {
    return {
      nazov: this.nazov,
      skratka: this.skratka,
      slogan: this.slogan,
      rok_zalozenia: this.rok_zalozenia,
      logo: this.logo,
      favicon: this.favicon,
      farby: {
        primarna: this.farba_primarna,
        sekundarna: this.farba_sekundarna,
        akcent: this.farba_akcent,
        primarna_kontrast: this.farba_primarna_kontrast,
        akcent_kontrast: this.farba_akcent_kontrast,
        // Dodatkové farby podľa šablóny sa pridávajú k základným
        ...(this.dodatkove_farby || {}),
      },
      kontakt: {
        email: this.email,
        telefon: this.telefon,
        adresa: this.adresa,
      },
      socialne_siete: {
        facebook: this.facebook_url,
        instagram: this.instagram_url,
        youtube: this.youtube_url,
        x: this.x_url,
        tiktok: this.tiktok_url,
      },
      // Údaje organizácie do päty webu (IČO, účet na príspevky)
      udaje: {
        pravny_nazov: this.pravny_nazov,
        ico: this.ico,
        dic: this.dic,
        ic_dph: this.ic_dph,
        iban: this.iban,
      },
      meta_popis: this.meta_popis,
      // Meranie návštevnosti - web ho načíta až po súhlase s cookies
      google_analytics_id: this.google_analytics_id,
      // Web podľa nich rozhodne, či ukázať cookie lištu a či sú
      // komentáre vôbec zapnuté
      komentare: this.nastavenia_komentarov,
      gdpr: this.nastavenia_gdpr,
      seo: this.nastavenia_seo,
      // Jazyk prihlasovacej obrazovky administrácie (pred prihlásením)
      jazyk_administracie: this.jazyk_administracie,
    };
  }
}

// Spoločná definícia farebného stĺpca - všetky sa správajú rovnako
const stlpecFarby = (predvolena: string) => ({
  type: DataTypes.STRING(7),
  allowNull: false,
  defaultValue: predvolena,
  validate: {
    jePlatnaFarba(hodnota: string) {
      if (!VZOR_FARBY.test(hodnota)) {
        throw new Error(`Farba musí byť v tvare #RRGGBB (zadané: ${hodnota})`);
      }
    },
  },
});

NastaveniaKlubu.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    nazov: {
      type: DataTypes.STRING(150),
      allowNull: false,
      validate: { len: [2, 150] },
    },
    skratka: {
      // Znak loga - dve až štyri písmená
      type: DataTypes.STRING(4),
      allowNull: true,
    },
    slogan: {
      type: DataTypes.STRING(150),
      allowNull: true,
    },
    rok_zalozenia: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        // Prvé futbalové kluby vznikali v 19. storočí
        min: 1850,
        max: new Date().getFullYear(),
      },
    },
    logo: { type: DataTypes.STRING(255), allowNull: true },
    favicon: { type: DataTypes.STRING(255), allowNull: true },

    // Predvolené farby zodpovedajú návrhu (tmavozelená, biela, jantárová)
    farba_primarna: stlpecFarby('#1B5E20'),
    farba_sekundarna: stlpecFarby('#FFFFFF'),
    farba_akcent: stlpecFarby('#FFC107'),
    farba_primarna_kontrast: stlpecFarby('#FFFFFF'),
    farba_akcent_kontrast: stlpecFarby('#1B2410'),

    email: {
      type: DataTypes.STRING(150),
      allowNull: true,
      validate: { isEmail: true },
    },
    telefon: { type: DataTypes.STRING(40), allowNull: true },
    adresa: { type: DataTypes.STRING(255), allowNull: true },
    ico: { type: DataTypes.STRING(20), allowNull: true },
    dic: { type: DataTypes.STRING(20), allowNull: true },
    pravny_nazov: { type: DataTypes.STRING(200), allowNull: true },
    ic_dph: { type: DataTypes.STRING(20), allowNull: true },
    iban: {
      type: DataTypes.STRING(34),
      allowNull: true,
      validate: {
        jeIban(hodnota: string | null) {
          if (hodnota && !/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(hodnota)) {
            throw new Error('IBAN nie je platný (napríklad SK31 1200 0000 1987 4263 7541)');
          }
        },
      },
    },

    facebook_url: {
      type: DataTypes.STRING(255),
      allowNull: true,
      validate: { isUrl: { msg: 'Adresa Facebook nie je platná (začína https://)' } },
    },
    instagram_url: {
      type: DataTypes.STRING(255),
      allowNull: true,
      validate: { isUrl: { msg: 'Adresa Instagram nie je platná (začína https://)' } },
    },
    youtube_url: {
      type: DataTypes.STRING(255),
      allowNull: true,
      validate: { isUrl: { msg: 'Adresa YouTube nie je platná (začína https://)' } },
    },
    x_url: {
      type: DataTypes.STRING(255),
      allowNull: true,
      validate: { isUrl: { msg: 'Adresa X nie je platná (začína https://)' } },
    },
    tiktok_url: {
      type: DataTypes.STRING(255),
      allowNull: true,
      validate: { isUrl: { msg: 'Adresa TikTok nie je platná (začína https://)' } },
    },

    meta_popis: {
      type: DataTypes.STRING(300),
      allowNull: true,
    },
    google_analytics_id: {
      type: DataTypes.STRING(40),
      allowNull: true,
    },

    dodatkove_farby: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
    },
    nastavenia_komentarov: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {
        povolene: true,
        moderovat: true,
        vyzadovat_email: false,
        povolit_odpovede: true,
      },
    },
    nastavenia_gdpr: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {
        cookie_lista: true,
        text_suhlasu: null,
        kontakt_zodpovednej_osoby: null,
        retencia_mesiacov: 36,
      },
    },
    nastavenia_seo: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {
        meta_title_sablona: null,
        kluc_slova: null,
        og_obrazok: null,
        indexovat: true,
        google_search_console: null,
      },
    },

    aktivna_sablona: {
      type: DataTypes.STRING(60),
      allowNull: false,
      defaultValue: 'zakladna',
    },
    nastavenia_sablon: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
    },
    jazyk_administracie: {
      type: DataTypes.STRING(5),
      allowNull: false,
      defaultValue: 'sk',
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
    modelName: 'NastaveniaKlubu',
    tableName: 'nastavenia_klubu',
    timestamps: true,
    createdAt: 'vytvoreny',
    updatedAt: 'aktualizovany',
  }
);

export default NastaveniaKlubu;
