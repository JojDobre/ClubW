// Umiestnenie: license-server/src/utils/podpis.ts
// Kryptografické podpisovanie odpovedí licenčného servera.
//
// PREČO JE TO NUTNÉ: klientsky web má adresu licenčného servera v premennej
// LICENSE_SERVER_URL. Bez podpisu by stačilo túto premennú prepísať na
// vlastný server, ktorý vždy odpovie "licencia je platná" - presne to robila
// pôvodná atrapa. Podpis to znemožňuje: klient overuje odpoveď verejným
// kľúčom, ktorý má zabudovaný, a podvrhnutá odpoveď kontrolou neprejde.
//
// Používame Ed25519 - moderný podpisový algoritmus zabudovaný priamo
// v Node.js, bez potreby ďalších knižníc.

import crypto from 'crypto';

/**
 * Vygeneruje nový pár kľúčov. Spúšťa sa jednorazovo pri nasadení servera.
 * Súkromný kľúč ostáva na licenčnom serveri, verejný sa vloží do klientov.
 */
export const vygenerujParKlucov = (): { verejny: string; sukromny: string } => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');

  return {
    verejny: publicKey.export({ type: 'spki', format: 'pem' }).toString(),
    sukromny: privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(),
  };
};

/**
 * Podpíše údaje súkromným kľúčom.
 *
 * @param udaje - objekt, ktorý sa posiela klientovi
 * @param sukromnyKlucPem - súkromný kľúč vo formáte PEM
 * @returns podpis zakódovaný v base64
 */
export const podpis = (udaje: unknown, sukromnyKlucPem: string): string => {
  // Podpisujeme ustálený textový zápis, aby klient dostal presne to isté
  const sprava = Buffer.from(stabilnyJson(udaje), 'utf8');
  const klucObjekt = crypto.createPrivateKey(sukromnyKlucPem);

  // Ed25519 nepoužíva samostatnú hašovaciu funkciu, preto je prvý parameter null
  return crypto.sign(null, sprava, klucObjekt).toString('base64');
};

/**
 * Overí podpis verejným kľúčom.
 *
 * @param udaje - prijaté údaje
 * @param podpisBase64 - podpis z odpovede servera
 * @param verejnyKlucPem - verejný kľúč vo formáte PEM
 * @returns true, ak podpis sedí
 */
export const overPodpis = (
  udaje: unknown,
  podpisBase64: string,
  verejnyKlucPem: string
): boolean => {
  try {
    const sprava = Buffer.from(stabilnyJson(udaje), 'utf8');
    const klucObjekt = crypto.createPublicKey(verejnyKlucPem);

    return crypto.verify(null, sprava, klucObjekt, Buffer.from(podpisBase64, 'base64'));
  } catch {
    // Poškodený kľúč alebo podpis - berieme ako neplatný
    return false;
  }
};

/**
 * Prevedie objekt na JSON s abecedne zoradenými kľúčmi.
 *
 * PREČO: JSON.stringify zachováva poradie, v akom boli vlastnosti pridané.
 * Ak by server a klient zostavili objekt v inom poradí, výsledný text by sa
 * líšil a podpis by neplatil, hoci údaje sú rovnaké.
 */
export const stabilnyJson = (hodnota: unknown): string => {
  if (hodnota === null || typeof hodnota !== 'object') {
    return JSON.stringify(hodnota);
  }

  if (Array.isArray(hodnota)) {
    return `[${hodnota.map(stabilnyJson).join(',')}]`;
  }

  const zaznam = hodnota as Record<string, unknown>;
  const dvojice = Object.keys(zaznam)
    .sort()
    .map((kluc) => `${JSON.stringify(kluc)}:${stabilnyJson(zaznam[kluc])}`);

  return `{${dvojice.join(',')}}`;
};

/**
 * Vygeneruje nový licenčný kľúč v tvare CLUBW-XXXX-XXXX-XXXX-XXXX.
 *
 * Používame kryptograficky bezpečný generátor - kľúč sa nesmie dať uhádnuť.
 * Zo znakovej sady sú vynechané znaky, ktoré sa ľahko zamieňajú (0/O, 1/I).
 */
export const vygenerujLicencnyKluc = (): string => {
  const ZNAKY = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const skupina = () => {
    const bajty = crypto.randomBytes(4);
    return Array.from(bajty)
      .map((b) => ZNAKY[b % ZNAKY.length])
      .join('');
  };

  return `CLUBW-${skupina()}-${skupina()}-${skupina()}-${skupina()}`;
};
