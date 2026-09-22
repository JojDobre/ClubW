// backend/src/models/Page.ts
// Model pre správu statických stránok (Fáza 5) - ROZŠÍRENÝ

import { DataTypes, Model, Optional, Op } from 'sequelize';
import sequelize from '../config/database';

// Interface pre atribúty stránky
interface PageAttributes {
  id: number;
  nazov: string;           // Názov stránky
  obsah: string;           // HTML obsah stránky
  slug: string;            // URL slug (napr. "historia", "o-klube")
  v_menu: boolean;         // Či sa má zobrazovať v menu
  poradie_menu: number;    // Poradie v menu (nižšie číslo = vyššie)
  meta_title?: string;     // SEO title
  meta_description?: string; // SEO popis
  publikovany: boolean;    // Či je stránka zverejnená
  vytvoreny: Date;
  aktualizovany: Date;
}

// Interface pre voliteľné atribúty pri vytváraní
interface PageCreationAttributes extends Optional<PageAttributes, 'id' | 'slug' | 'v_menu' | 'poradie_menu' | 'meta_title' | 'meta_description' | 'publikovany' | 'vytvoreny' | 'aktualizovany'> {}

// Definícia modelu
class Page extends Model<PageAttributes, PageCreationAttributes> implements PageAttributes {
  public id!: number;
  public nazov!: string;
  public obsah!: string;
  public slug!: string;
  public v_menu!: boolean;
  public poradie_menu!: number;
  public meta_title?: string;
  public meta_description?: string;
  public publikovany!: boolean;
  public readonly vytvoreny!: Date;
  public readonly aktualizovany!: Date;

  // === HELPER METÓDY ===

  /**
   * Generuje URL slug z názvu stránky
   */
  public static generateSlug(nazov: string): string {
    return nazov
      .toLowerCase()
      .normalize('NFD') // Rozloží diakritiku
      .replace(/[\u0300-\u036f]/g, '') // Odstráni diakritiku
      .replace(/[^a-z0-9\s-]/g, '') // Ponechá len písmená, číslice, medzery a pomlčky
      .trim()
      .replace(/\s+/g, '-') // Nahradí medzery pomlčkami
      .replace(/-+/g, '-') // Nahradí viacero pomlčiek jednou
      .replace(/^-|-$/g, ''); // Odstráni pomlčky na začiatku a konci
  }

  /**
   * Zhustí HTML obsah stránky na čistý text danej dĺžky.
   */
  public static generateExcerpt(obsah: string, maxLength: number = 160): string {
    const textOnly = obsah.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

    if (textOnly.length <= maxLength) {
      return textOnly;
    }

    const truncated = textOnly.substring(0, maxLength);
    const lastSpaceIndex = truncated.lastIndexOf(' ');

    return lastSpaceIndex > 0
      ? truncated.substring(0, lastSpaceIndex) + '...'
      : truncated + '...';
  }

  /**
   * Doplní SEO polia z názvu a obsahu stránky, ak sú prázdne.
   * Ručne vyplnené meta polia sa nikdy neprepisujú.
   */
  public doplnSeoAkChyba(): void {
    if (!this.meta_title && this.nazov) {
      this.meta_title = this.nazov.length <= 70
        ? this.nazov
        : this.nazov.substring(0, 67).trimEnd() + '...';
    }

    if (!this.meta_description && this.obsah) {
      this.meta_description = Page.generateExcerpt(this.obsah, 160);
    }
  }

  /**
   * ✅ NOVÉ: Vytvorí unikátny slug pridaním číselného suffixu ak je potrebné
   * Príklad: "historia" → "historia-1" → "historia-2" atď.
   */
  public static async generateUniqueSlug(baseSlug: string, excludeId?: number): Promise<string> {
    // Najprv skús originálny slug
    const isOriginalUnique = await this.validateUniqueSlug(baseSlug, excludeId);
    if (isOriginalUnique) {
      return baseSlug;
    }

    // Ak nie je unikátny, hľadaj s číslami
    let counter = 1;
    let uniqueSlug = `${baseSlug}-${counter}`;
    
    // Pokračuj kým nenájdeš unikátny
    while (!(await this.validateUniqueSlug(uniqueSlug, excludeId))) {
      counter++;
      uniqueSlug = `${baseSlug}-${counter}`;
      
      // Bezpečnostná poistka - max 1000 pokusov
      if (counter > 1000) {
        // Ak sa nedá nájsť ani po 1000 pokusoch, pridaj timestamp
        const timestamp = Date.now().toString().slice(-6);
        uniqueSlug = `${baseSlug}-${timestamp}`;
        break;
      }
    }

    return uniqueSlug;
  }

  /**
   * ✅ ROZŠÍRENÉ: Generuje unikátny slug z názvu stránky
   * Ak slug už existuje, automaticky pridá číslo na koniec
   */
  public static async generateUniqueSlugFromTitle(nazov: string, excludeId?: number): Promise<string> {
    const baseSlug = this.generateSlug(nazov);
    return await this.generateUniqueSlug(baseSlug, excludeId);
  }

  /**
   * Validuje slug - musí byť jedinečný
   */
  public static async validateUniqueSlug(slug: string, excludeId?: number): Promise<boolean> {
    const whereClause: any = { slug };
    if (excludeId) {
      whereClause.id = { [Op.ne]: excludeId };
    }

    const existing = await Page.findOne({ where: whereClause });
    return !existing;
  }

  /**
   * Získa nasledujúce poradie v menu
   */
  public static async getNextMenuOrder(): Promise<number> {
    const lastPage = await Page.findOne({
      where: { v_menu: true },
      order: [['poradie_menu', 'DESC']],
    });

    return lastPage ? lastPage.poradie_menu + 10 : 10;
  }

  // === INSTANCE METÓDY ===

  /**
   * Získa plnú URL stránky
   */
  public getUrl(): string {
    return `/${this.slug}`;
  }

  /**
   * Skráti obsah pre excerpt
   */
  public getExcerpt(length: number = 150): string {
    // Odstráni HTML tagy
    const plainText = this.obsah.replace(/<[^>]*>/g, '');
    
    if (plainText.length <= length) {
      return plainText;
    }

    return plainText.substring(0, length).trim() + '...';
  }

  /**
   * Spočíta slová v obsahu
   */
  public getWordCount(): number {
    const plainText = this.obsah.replace(/<[^>]*>/g, '');
    return plainText.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  /**
   * Či je stránka publikovaná
   */
  public isPublished(): boolean {
    return this.publikovany;
  }

  /**
   * Či je stránka v menu
   */
  public isInMenu(): boolean {
    return this.v_menu;
  }

  /**
   * Konvertuje na JSON s dodatočnými informáciami
   */
  public toJSON(): any {
    const values = super.toJSON();
    return {
      ...values,
      url: this.getUrl(),
      excerpt: this.getExcerpt(),
      word_count: this.getWordCount(),
      is_published: this.isPublished(),
      is_in_menu: this.isInMenu(),
      vytvoreny: this.vytvoreny,
      aktualizovany: this.aktualizovany,
    };
  }
}

// Definícia modelu v databáze
Page.init(
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
        len: [2, 200],
      },
    },
    obsah: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [10, 100000], // Min 10 znakov, max 100k znakov
      },
    },
    slug: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true,
        len: [2, 100],
        // Slug môže obsahovať len písmená, číslice a pomlčky
        is: /^[a-z0-9-]+$/,
      },
    },
    v_menu: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    poradie_menu: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 10,
      validate: {
        min: 1,
        max: 9999,
      },
    },
    meta_title: {
      type: DataTypes.STRING(100),
      allowNull: true,
      validate: {
        len: [0, 100],
      },
    },
    meta_description: {
      type: DataTypes.STRING(300),
      allowNull: true,
      validate: {
        len: [0, 300],
      },
    },
    publikovany: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
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
    tableName: 'pages',
    timestamps: true,
    createdAt: 'vytvoreny',
    updatedAt: 'aktualizovany',
    indexes: [
      {
        unique: true,
        fields: ['slug'],
      },
      {
        fields: ['publikovany'],
      },
      {
        fields: ['v_menu'],
      },
      {
        // Composite index pre menu stránky
        fields: ['v_menu', 'publikovany', 'poradie_menu'],
      },
    ],
    hooks: {
      // ✅ AKTUALIZOVANÉ: Použitie novej metódy pre unikátny slug
      beforeValidate: async (page: Page) => {
        if (!page.slug && page.nazov) {
          page.slug = await Page.generateUniqueSlugFromTitle(page.nazov);
        }

        // SEO sa dopĺňa automaticky z obsahu, ručne zadané hodnoty ostávajú.
        page.doplnSeoAkChyba();
      },
      
      // Automatické nastavenie poradia v menu
      beforeCreate: async (page: Page) => {
        // Automatické nastavenie poradia v menu
        if (page.v_menu && !page.poradie_menu) {
          page.poradie_menu = await Page.getNextMenuOrder();
        }
      },
      
      beforeUpdate: async (page: Page) => {
        if (page.changed('slug')) {
          const isUnique = await Page.validateUniqueSlug(page.slug, page.id);
          if (!isUnique) {
            throw new Error(`Slug "${page.slug}" už existuje`);
          }
        }
      },
    },
  }
);

export default Page;