// Umiestnenie: backend/src/routes/menu.ts
// Routes pre menu a presmerovania.
//
// Menu je verejné - potrebuje ho vykresliť web. Správa aj presmerovania
// patria pod oprávnenie na nastavenia.

import { Router } from 'express';
import {
  getMenu,
  getMenuAdmin,
  createMenuPolozka,
  updateMenuPolozka,
  reorderMenu,
  deleteMenuPolozka,
  getPresmerovania,
  createPresmerovanie,
  updatePresmerovanie,
  deletePresmerovanie,
} from '../controllers/menuController';
import { authenticateToken, requirePermission } from '../middleware/auth';
import { zrusKopiuPresmerovani, najdiPresmerovanie } from '../middleware/presmerovania';

const router = Router();

/**
 * Po každej zmene presmerovaní zahodíme kópiu v pamäti, aby sa zmena
 * prejavila hneď a nie až o minútu.
 */
const obnovKopiu = (_req: any, _res: any, next: any) => {
  zrusKopiuPresmerovani();
  next();
};

// ===== MENU =====

/** @route GET /api/menu - vnorené menu pre verejný web */
router.get('/menu', getMenu);

/** @route GET /api/admin/menu - vrátane skrytých položiek */
router.get('/admin/menu', authenticateToken, requirePermission('nastavenia', 'citat'), getMenuAdmin);

/** @route POST /api/admin/menu */
router.post('/admin/menu', authenticateToken, requirePermission('nastavenia', 'pisat'), createMenuPolozka);

/** @route PATCH /api/admin/menu/reorder - poradie a vnorenie naraz */
router.patch('/admin/menu/reorder', authenticateToken, requirePermission('nastavenia', 'pisat'), reorderMenu);

/** @route PUT /api/admin/menu/:id */
router.put('/admin/menu/:id', authenticateToken, requirePermission('nastavenia', 'pisat'), updateMenuPolozka);

/** @route DELETE /api/admin/menu/:id - vnorené položky idú s ňou */
router.delete('/admin/menu/:id', authenticateToken, requirePermission('nastavenia', 'mazat'), deleteMenuPolozka);

// ===== PRESMEROVANIA =====

/**
 * @route GET /api/redirects/resolve?cesta=/stara-adresa
 * Verejné - web sa pýta pri nenájdenej stránke, kam presmerovať.
 */
router.get('/redirects/resolve', async (req, res) => {
  try {
    const cesta = String(req.query.cesta || '').split('?')[0];
    if (!cesta.startsWith('/') || cesta.length > 500) {
      res.status(400).json({ success: false, message: 'Neplatná cesta' });
      return;
    }
    const ciel = await najdiPresmerovanie(cesta);
    if (!ciel) {
      res.status(404).json({ success: false, message: 'Presmerovanie neexistuje' });
      return;
    }
    res.json({ success: true, data: ciel });
  } catch (chyba) {
    console.error('Chyba pri hľadaní presmerovania:', chyba);
    res.status(500).json({ success: false, message: 'Chyba servera' });
  }
});

/** @route GET /api/admin/redirects */
router.get('/admin/redirects', authenticateToken, requirePermission('nastavenia', 'citat'), getPresmerovania);

/** @route POST /api/admin/redirects */
router.post('/admin/redirects', authenticateToken, requirePermission('nastavenia', 'pisat'), obnovKopiu, createPresmerovanie);

/** @route PUT /api/admin/redirects/:id */
router.put('/admin/redirects/:id', authenticateToken, requirePermission('nastavenia', 'pisat'), obnovKopiu, updatePresmerovanie);

/** @route DELETE /api/admin/redirects/:id */
router.delete('/admin/redirects/:id', authenticateToken, requirePermission('nastavenia', 'mazat'), obnovKopiu, deletePresmerovanie);

export default router;
