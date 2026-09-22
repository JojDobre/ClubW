// Umiestnenie: backend/src/services/youtube.ts
//
// DOŤAHOVANIE ÚDAJOV O VIDEU
//
// PREČO VZNIKOL: dĺžka a náhľad videa sa ukladali len ako to, čo poslal
// klient. Požiadavka pritom hovorí „dĺžka (voliteľné - automaticky
// z videa)".
//
// ČO SA DÁ A ČO NIE:
//   - náhľad sa dá zostaviť priamo z ID videa, bez akéhokoľvek kľúča
//   - názov vráti verejné oEmbed rozhranie YouTube, tiež bez kľúča
//   - DĹŽKA sa bez kľúča zistiť NEDÁ. YouTube ju vydáva len cez
//     Data API v3, ktoré vyžaduje YOUTUBE_API_KEY. Bez neho sa dĺžka
//     ticho preskočí a dá sa zadať ručne - radšej než aby sme
//     predstierali hodnotu, ktorú nemáme.

/** Koľko čakáme na odpoveď, aby uloženie videa nezamrzlo. */
const CAKANIE_MS = 5000;

export interface UdajeVidea {
  video_id: string | null;
  nazov: string | null;
  nahlad: string | null;
  /** Dĺžka v sekundách; null keď ju nemáme ako zistiť */
  dlzka: number | null;
}

/** Vytiahne ID videa z bežných tvarov YouTube adries. */
export const idZUrl = (url: string): string | null => {
  if (!url) return null;

  const vzory = [
    /[?&]v=([a-zA-Z0-9_-]{11})/,      // watch?v=ID
    /youtu\.be\/([a-zA-Z0-9_-]{11})/, // youtu.be/ID
    /embed\/([a-zA-Z0-9_-]{11})/,     // embed/ID
    /shorts\/([a-zA-Z0-9_-]{11})/,    // shorts/ID
  ];

  for (const vzor of vzory) {
    const zhoda = url.match(vzor);
    if (zhoda) return zhoda[1];
  }

  return null;
};

/**
 * Prevedie ISO 8601 trvanie (PT1H2M3S) na sekundy.
 *
 * Presne v tomto tvare vracia dĺžku YouTube Data API.
 */
export const trvanieNaSekundy = (trvanie: string): number | null => {
  const zhoda = trvanie.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!zhoda) return null;

  const hodiny = Number(zhoda[1] || 0);
  const minuty = Number(zhoda[2] || 0);
  const sekundy = Number(zhoda[3] || 0);

  return hodiny * 3600 + minuty * 60 + sekundy;
};

/** Načíta adresu s časovým limitom. */
const nacitaj = async (url: string): Promise<any | null> => {
  const prerusenie = new AbortController();
  const casovac = setTimeout(() => prerusenie.abort(), CAKANIE_MS);

  try {
    const odpoved = await fetch(url, { signal: prerusenie.signal });
    if (!odpoved.ok) return null;
    return await odpoved.json();
  } catch {
    // Výpadok siete nesmie zhodiť uloženie videa
    return null;
  } finally {
    clearTimeout(casovac);
  }
};

/**
 * Zistí, čo sa o videu dá zistiť.
 *
 * Nikdy nevyhodí výnimku - keď sa nepodarí nič, vráti samé null
 * a hodnoty sa jednoducho zadajú ručne.
 *
 * @param url - adresa videa
 */
export const zistiUdajeVidea = async (url: string): Promise<UdajeVidea> => {
  const videoId = idZUrl(url);

  const vysledok: UdajeVidea = {
    video_id: videoId,
    nazov: null,
    // Náhľad sa skladá priamo z ID, žiadne volanie netreba
    nahlad: videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null,
    dlzka: null,
  };

  if (!videoId) return vysledok;

  // Názov z verejného oEmbed - bez kľúča
  const oembed = await nacitaj(
    `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
  );
  if (oembed?.title) vysledok.nazov = String(oembed.title);

  // Dĺžka len s kľúčom k Data API
  const kluc = process.env.YOUTUBE_API_KEY;
  if (!kluc) return vysledok;

  const data = await nacitaj(
    `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${videoId}&key=${kluc}`
  );
  const trvanie = data?.items?.[0]?.contentDetails?.duration;
  if (trvanie) vysledok.dlzka = trvanieNaSekundy(String(trvanie));

  return vysledok;
};
