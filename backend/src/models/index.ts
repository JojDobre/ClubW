// backend/src/models/index.ts
// Definícia vzťahov medzi modelmi

import User from './user';
import Category from './Category';
import Article from './Article';

// Definícia vzťahov medzi modelmi

// User -> Articles (1:N) - používateľ môže mať viacero článkov
User.hasMany(Article, {
  foreignKey: 'autor_id',
  as: 'clanky',
  onDelete: 'RESTRICT', // Nemožno vymazať používateľa s článkami
});

Article.belongsTo(User, {
  foreignKey: 'autor_id',
  as: 'autor',
});

// Category -> Articles (1:N) - kategória môže mať viacero článkov
Category.hasMany(Article, {
  foreignKey: 'kategoria_id',
  as: 'clanky',
  onDelete: 'RESTRICT', // Nemožno vymazať kategóriu s článkami
});

Article.belongsTo(Category, {
  foreignKey: 'kategoria_id',
  as: 'kategoria',
});

// Export všetkých modelov
export {
  User,
  Category,
  Article,
};

// Export default pre jednoduchší import
export default {
  User,
  Category,
  Article,
};