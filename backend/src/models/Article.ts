// backend/src/models/Article.ts
// Model pre články - OPRAVENÝ

import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

// Interface pre Article atribúty
export interface ArticleAttributes {
  id: number;
  nazov: string;
  slug: string;
  obsah: string;
  excerpt?: string | null; // Krátky popis pre náhľady
  obrazok?: string | null; // URL hlavného obrázka
  autor_id: number; // Foreign key na používateľa
  kategoria_id: number; // Foreign key na kategóriu
  tim_id?: number | null; // Voliteľná väzba na tím, ktorého sa článok týka
  status: 'draft' | 'published' | 'scheduled' | 'archived';
  publikovany_datum?: Date | null; // Kedy má byť/bol publikovaný
  views: number; // Počet zobrazení
  meta_title?: string | null; // SEO title
  meta_description?: string | null; // SEO popis
  tags?: string | null; // JSON pole tagov
  featured: boolean; // Či je článok vybraný/priliehavý
  komentare_povolene: boolean; // Či sú povolené komentáre
  vytvoreny: Date;
  aktualizovany: Date;
}

// Interface pre vytvorenie článku (bez auto-generovaných polí)
export interface ArticleCreationAttributes extends Optional<ArticleAttributes, 'id' | 'slug' | 'views' | 'vytvoreny' | 'aktualizovany'> {}

// Sequelize Model class
export class Article extends Model<ArticleAttributes, ArticleCreationAttributes> implements ArticleAttributes {
  public id!: number;
  public nazov!: string;
  public slug!: string;
  public obsah!: string;
  public excerpt!: string | null;
  public obrazok!: string | null;
  public autor_id!: number;
  public kategoria_id!: number;
  public tim_id!: number | null;
  public status!: 'draft' | 'published' | 'scheduled' | 'archived';
  public publikovany_datum!: Date | null;
  public views!: number;
  public meta_title!: string | null;
  public meta_description!: string | null;
  public tags!: string | null;
  public featured!: boolean;
  public komentare_povolene!: boolean;
  public readonly vytvoreny!: Date;
  public readonly aktualizovany!: Date;

  // Statická metóda pre generovanie slug
  public static generateSlug(nazov: string): string {
    return nazov
      .toLowerCase()
      .normalize('NFD') // Rozdelí diakritiku
      .replace(/[\u0300-\u036f]/g, '') // Odstráni diakritiku
      .replace(/[^a-z0-9\s-]/g, '') // Odstráni špeciálne znaky
      .trim()
      .replace(/\s+/g, '-') // Nahradí medzery pomlčkami
      .replace(/-+/g, '-') // Odstráni viacnásobné pomlčky
      .replace(/^-+|-+$/g, ''); // Odstráni pomlčky na začiatku a konci
  }

  // Automatické generovanie excerpt z obsahu
  public static generateExcerpt(obsah: string, maxLength: number = 160): string {
    // Odstránenie HTML tagov
    const textOnly = obsah.replace(/<[^>]*>/g, '');
    
    if (textOnly.length <= maxLength) {
      return textOnly;
    }
    
    // Skrátenie na najbližšie slovo
    const truncated = textOnly.substring(0, maxLength);
    const lastSpaceIndex = truncated.lastIndexOf(' ');
    
    return lastSpaceIndex > 0 
      ? truncated.substring(0, lastSpaceIndex) + '...'
      : truncated + '...';
  }

  /**
   * Doplní SEO polia z obsahu článku, ak sú prázdne.
   *
   * Požiadavka znie „SEO ideálne automaticky z článku s možnosťou
   * upraviť". Platí tu preto rovnaké pravidlo ako pri krátkom popise:
   * stroj dopĺňa len to, čo je prázdne, a ručne zadanú hodnotu nikdy
   * neprepíše. Kto chce znovu automatické, pole vymaže a uloží.
   *
   * Dĺžky sú zvolené podľa toho, koľko Google reálne zobrazí a koľko
   * pripúšťa databáza: meta_title 70 znakov, meta_description 160.
   */
  public doplnSeoAkChyba(): void {
    if (!this.meta_title && this.nazov) {
      this.meta_title = this.nazov.length <= 70
        ? this.nazov
        : this.nazov.substring(0, 67).trimEnd() + '...';
    }

    if (!this.meta_description) {
      // Prednosť má krátky popis - je to už raz zhustený text článku.
      const zdroj = this.excerpt || this.obsah;
      if (zdroj) {
        this.meta_description = Article.generateExcerpt(zdroj, 160);
      }
    }
  }

  // Parsovanie tagov z JSON stringu
  public getTagsArray(): string[] {
    if (!this.tags) return [];
    try {
      return JSON.parse(this.tags);
    } catch {
      return [];
    }
  }

  // Nastavenie tagov ako JSON string
  public setTagsArray(tags: string[]): void {
    this.tags = JSON.stringify(tags);
  }

  // Metóda pre zväčšenie počtu zobrazení
  public async incrementViews(): Promise<void> {
    await this.increment('views');
  }

  // Kontrola či je článok publikovaný
  public isPublished(): boolean {
    return this.status === 'published' && 
           (!this.publikovany_datum || this.publikovany_datum <= new Date());
  }

  // Metóda pre získanie bezpečných údajov pre verejné API
  public toPublicJSON() {
    return {
      id: this.id,
      nazov: this.nazov,
      slug: this.slug,
      excerpt: this.excerpt,
      obrazok: this.obrazok,
      publikovany_datum: this.publikovany_datum,
      views: this.views,
      tags: this.getTagsArray(),
      featured: this.featured,
      tim_id: this.tim_id,
      vytvoreny: this.vytvoreny,
    };
  }

  // Metóda pre získanie kompletných údajov (admin)
  public toAdminJSON() {
    return {
      id: this.id,
      nazov: this.nazov,
      slug: this.slug,
      obsah: this.obsah,
      excerpt: this.excerpt,
      obrazok: this.obrazok,
      autor_id: this.autor_id,
      kategoria_id: this.kategoria_id,
      tim_id: this.tim_id,
      status: this.status,
      publikovany_datum: this.publikovany_datum,
      views: this.views,
      meta_title: this.meta_title,
      meta_description: this.meta_description,
      tags: this.getTagsArray(),
      featured: this.featured,
      komentare_povolene: this.komentare_povolene,
      vytvoreny: this.vytvoreny,
      aktualizovany: this.aktualizovany,
    };
  }
}

// Definícia modelu v databáze
Article.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    nazov: {
      type: DataTypes.STRING(200),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [5, 200],
      },
    },
    slug: {
      type: DataTypes.STRING(220),
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true,
        is: /^[a-z0-9-]+$/i,
      },
    },
    obsah: {
      type: DataTypes.TEXT('long'), // Pre dlhé články
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [10, 50000], // Min 10 znakov, max 50k
      },
    },
    excerpt: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    obrazok: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    autor_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'pouzivatelia',
        key: 'id',
      },
    },
    kategoria_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'rubriky',
        key: 'id',
      },
    },
    tim_id: {
      // Voliteľné - väčšina článkov sa netýka konkrétneho tímu.
      // Pri zmazaní tímu sa len vynuluje, článok zostáva.
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'timy',
        key: 'id',
      },
    },
    status: {
      type: DataTypes.ENUM('draft', 'published', 'scheduled', 'archived'),
      allowNull: false,
      defaultValue: 'draft',
    },
    publikovany_datum: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    views: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },
    meta_title: {
      type: DataTypes.STRING(70), // SEO optimálne
      allowNull: true,
    },
    meta_description: {
      type: DataTypes.STRING(160), // SEO optimálne
      allowNull: true,
    },
    tags: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    featured: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    komentare_povolene: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      // Vypnuté, kým ich niekto pri článku vedome nezapne
      defaultValue: false,
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
    tableName: 'clanky',
    timestamps: true,
    createdAt: 'vytvoreny',
    updatedAt: 'aktualizovany',
    hooks: {
      // Automatické generovanie slug pred vytvorením
      beforeCreate: (article: Article) => {
        console.log('beforeCreate hook spustený pre článok:', article.nazov);
        
        // Vygeneruj slug ak nie je nastavený
        if (!article.slug && article.nazov) {
          article.slug = Article.generateSlug(article.nazov);
          console.log('Vygenerovaný slug:', article.slug);
        }
        
        // Automatické generovanie excerpt ak nie je zadané
        if (!article.excerpt && article.obsah) {
          article.excerpt = Article.generateExcerpt(article.obsah);
          console.log('Vygenerovaný excerpt:', article.excerpt);
        }
        
        // SEO polia sa dopĺňajú až po excerpte - meta_description
        // z neho vychádza
        article.doplnSeoAkChyba();

        // Nastavenie publikačného dátumu pre publikované články
        if (article.status === 'published' && !article.publikovany_datum) {
          article.publikovany_datum = new Date();
          console.log('Nastavený publikačný dátum:', article.publikovany_datum);
        }
      },
      beforeUpdate: (article: Article) => {
        console.log('beforeUpdate hook spustený pre článok:', article.nazov);
        
        if (article.changed('nazov') && !article.changed('slug')) {
          article.slug = Article.generateSlug(article.nazov);
          console.log('Aktualizovaný slug:', article.slug);
        }
        
        // Excerpt dopĺňame automaticky LEN vtedy, keď žiadny nie je.
        //
        // Pôvodne sa prepisoval pri každej zmene obsahu, takže ručne
        // napísaný krátky popis zmizol, len čo autor siahol na text
        // článku - a nedalo sa to nijako obísť. Raz zadaný popis je
        // rozhodnutie človeka a stroj ho neprepisuje.
        //
        // Podmienka sa pýta na výslednú hodnotu, nie na to, čo sa menilo.
        // Vďaka tomu funguje aj opačný smer: kto chce znovu automatický
        // popis, vymaže pole a uloží - prázdny excerpt sa doplní z obsahu.
        if (!article.excerpt && article.obsah) {
          article.excerpt = Article.generateExcerpt(article.obsah);
          console.log('Doplnený excerpt (bol prázdny):', article.excerpt);
        }

        // Prázdne SEO polia doplníme z článku, vyplnených sa nedotkneme
        article.doplnSeoAkChyba();
        
        // Nastavenie publikačného dátumu pri prvom publikovaní
        if (article.changed('status') && article.status === 'published' && !article.publikovany_datum) {
          article.publikovany_datum = new Date();
          console.log('Nastavený publikačný dátum pri zmene statusu:', article.publikovany_datum);
        }
      },
      beforeValidate: (article: Article) => {
        console.log('beforeValidate hook spustený pre článok:', article.nazov);
        
        // KĽÚČOVÁ OPRAVA: Generuj slug aj v beforeValidate hooku
        if (!article.slug && article.nazov) {
          article.slug = Article.generateSlug(article.nazov);
          console.log('Slug vygenerovaný v beforeValidate:', article.slug);
        }
      },
    },
    indexes: [
      {
        unique: true,
        fields: ['slug'],
      },
      {
        fields: ['status'],
      },
      {
        fields: ['autor_id'],
      },
      {
        fields: ['kategoria_id'],
      },
      {
        fields: ['publikovany_datum'],
      },
      {
        fields: ['featured'],
      },
      {
        fields: ['views'],
      },
    ],
  }
);

export default Article;