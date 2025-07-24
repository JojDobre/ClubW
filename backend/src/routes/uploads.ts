import { Router } from 'express';
import path from 'path';
import fs from 'fs';

const router = Router();

// Vytvor default avatar ak neexistuje
const ensureDefaultAvatar = () => {
  const uploadsDir = path.join(__dirname, '../../uploads');
  const defaultAvatarPath = path.join(uploadsDir, 'default-avatar.png');
  
  // Vytvor uploads priečinok ak neexistuje
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  
  // Ak default avatar neexistuje, vytvor jednoduchý placeholder
  if (!fs.existsSync(defaultAvatarPath)) {
    // Vytvor jednoduchý SVG ako placeholder
    const svgContent = `
      <svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
        <circle cx="100" cy="100" r="95" fill="#e5e7eb"/>
        <circle cx="100" cy="75" r="25" fill="#9ca3af"/>
        <circle cx="100" cy="140" r="35" fill="#9ca3af"/>
      </svg>
    `;
    
    try {
      fs.writeFileSync(defaultAvatarPath.replace('.png', '.svg'), svgContent);
      console.log('✅ Default avatar (SVG) vytvorený:', defaultAvatarPath.replace('.png', '.svg'));
    } catch (error) {
      console.log('⚠️ Nepodarilo sa vytvoriť default avatar:', error);
    }
  }
};

// Zavolaj pri spustení
ensureDefaultAvatar();

// GET /api/uploads/* - Servovanie uploadnutých súborov
router.get('/*', (req, res) => {
  try {
    let filePath = '';
    
    // Špeciálne handlovanie pre default avatar
    if (req.path === '/default-avatar.png' || req.path === '/default-avatar.svg') {
      const uploadsDir = path.join(__dirname, '../../uploads');
      
      // Skús najprv PNG, potom SVG
      const pngPath = path.join(uploadsDir, 'default-avatar.png');
      const svgPath = path.join(uploadsDir, 'default-avatar.svg');
      
      if (fs.existsSync(pngPath)) {
        filePath = pngPath;
      } else if (fs.existsSync(svgPath)) {
        filePath = svgPath;
      } else {
        // Ak ani jeden neexistuje, vráť jednoduchý SVG response
        res.setHeader('Content-Type', 'image/svg+xml');
        res.send(`
          <svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
            <circle cx="100" cy="100" r="95" fill="#f3f4f6" stroke="#d1d5db" stroke-width="2"/>
            <circle cx="100" cy="75" r="25" fill="#9ca3af"/>
            <circle cx="100" cy="140" r="35" fill="#9ca3af"/>
            <text x="100" y="180" text-anchor="middle" font-family="Arial" font-size="12" fill="#6b7280">Default</text>
          </svg>
        `);
        return;
      }
    } else {
      // Normálne súbory
      filePath = path.join(__dirname, '../../uploads', req.path);
    }
    
    // Skontroluj či súbor existuje
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'Súbor nebol nájdený'
      });
    }

    // Nastav správne headers pre obrázky
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes: { [key: string]: string } = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
      '.gif': 'image/gif'
    };

    const mimeType = mimeTypes[ext] || 'application/octet-stream';
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 rok cache
    
    // Pošli súbor
    res.sendFile(filePath);
  } catch (error) {
    console.error('Chyba pri servovaní súboru:', error);
    res.status(500).json({
      success: false,
      message: 'Chyba servera pri načítaní súboru'
    });
  }
});

export default router;
