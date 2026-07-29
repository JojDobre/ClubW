// Umiestnenie: backend/scripts/over-podpis-licencie.ts
// Overí, že podpis odpovede licenčného servera prejde kontrolou na strane klienta.
// Spustenie: npx tsx scripts/over-podpis-licencie.ts CLUBW-XXXX-...

import crypto from 'crypto';
import dotenv from 'dotenv';
dotenv.config();

// Rovnaká funkcia ako v middleware/licencia.ts
const stabilnyJson = (h: unknown): string => {
  if (h === null || typeof h !== 'object') return JSON.stringify(h);
  if (Array.isArray(h)) return `[${h.map(stabilnyJson).join(',')}]`;
  const z = h as Record<string, unknown>;
  return `{${Object.keys(z).sort().map(k => `${JSON.stringify(k)}:${stabilnyJson(z[k])}`).join(',')}}`;
};

(async () => {
  const odp = await fetch('http://localhost:3001/api/license/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ licenseKey: process.argv[2] }),
  });
  const telo: any = await odp.json();

  const verejny = (process.env.LICENSE_PUBLIC_KEY || '').replace(/\\n/g, '\n');
  if (!verejny) { console.log('  ❌ Chýba LICENSE_PUBLIC_KEY'); process.exit(1); }

  const ok = crypto.verify(
    null,
    Buffer.from(stabilnyJson(telo.data), 'utf8'),
    crypto.createPublicKey(verejny),
    Buffer.from(telo.podpis, 'base64')
  );
  console.log(ok ? '  ✅ Podpis PLATNÝ (overené klientskym kódom)' : '  ❌ Podpis neplatný');

  // Pokus o podvrhnutie: neplatnú licenciu prepíšeme na platnú
  const podvrh = { ...telo.data, platna: true, plan: 'enterprise' };
  const ok2 = crypto.verify(
    null,
    Buffer.from(stabilnyJson(podvrh), 'utf8'),
    crypto.createPublicKey(verejny),
    Buffer.from(telo.podpis, 'base64')
  );
  console.log(!ok2 ? '  ✅ Podvrhnuté údaje NEPREJDÚ' : '  ❌ CHYBA: podvrh prešiel');

  process.exit(ok && !ok2 ? 0 : 1);
})();
