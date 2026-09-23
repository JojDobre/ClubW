// Umiestnenie: backend/tests/unit/youtube.test.ts
// Testy zisťovania údajov o videu (názov, náhľad, dĺžka).
// Sieť sa nevolá - fetch je podvrhnutý.

import { describe, it, expect, vi, afterEach } from 'vitest';
import { idZUrl, trvanieNaSekundy, vimeoIdZUrl, zistiUdajeVidea } from '../../src/services/youtube';

/** Podvrhne fetch: podľa časti adresy vráti JSON alebo text. */
const podvrhniFetch = (odpovede: Record<string, { json?: any; text?: string; ok?: boolean }>) => {
  const fetchMock = vi.fn(async (url: string) => {
    const kluc = Object.keys(odpovede).find((k) => String(url).includes(k));
    const odpoved = kluc ? odpovede[kluc] : { ok: false };
    return {
      ok: odpoved.ok ?? true,
      json: async () => odpoved.json,
      text: async () => odpoved.text ?? '',
    } as any;
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
};

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.YOUTUBE_API_KEY;
});

describe('rozpoznanie adresy', () => {
  it('vytiahne ID z bežných tvarov YouTube', () => {
    expect(idZUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10')).toBe('dQw4w9WgXcQ');
    expect(idZUrl('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(idZUrl('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(idZUrl('https://example.com/video')).toBeNull();
  });

  it('vytiahne ID z Vimeo', () => {
    expect(vimeoIdZUrl('https://vimeo.com/76979871')).toBe('76979871');
    expect(vimeoIdZUrl('https://youtube.com/watch?v=x')).toBeNull();
  });

  it('prevedie ISO trvanie na sekundy', () => {
    expect(trvanieNaSekundy('PT1H2M3S')).toBe(3723);
    expect(trvanieNaSekundy('PT4M35S')).toBe(275);
    expect(trvanieNaSekundy('nezmysel')).toBeNull();
  });
});

describe('zistiUdajeVidea', () => {
  it('bez kľúča zistí názov z oEmbed a dĺžku zo stránky videa', async () => {
    podvrhniFetch({
      'youtube.com/oembed': { json: { title: 'Zostrih derby' } },
      'youtube.com/watch': { text: '..."lengthSeconds":"275",...' },
    });

    const udaje = await zistiUdajeVidea('https://youtu.be/dQw4w9WgXcQ');
    expect(udaje).toEqual({
      video_id: 'dQw4w9WgXcQ',
      nazov: 'Zostrih derby',
      nahlad: 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
      dlzka: 275,
    });
  });

  it('s kľúčom použije Data API a stránku nesťahuje', async () => {
    process.env.YOUTUBE_API_KEY = 'kluc';
    const fetchMock = podvrhniFetch({
      'youtube.com/oembed': { json: { title: 'Rozhovor' } },
      'googleapis.com': { json: { items: [{ contentDetails: { duration: 'PT1M5S' } }] } },
    });

    const udaje = await zistiUdajeVidea('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    expect(udaje.dlzka).toBe(65);
    expect(fetchMock.mock.calls.some(([u]) => String(u).includes('/watch?v=') && !String(u).includes('oembed'))).toBe(false);
  });

  it('Vimeo - názov, náhľad aj dĺžka z oEmbed', async () => {
    podvrhniFetch({
      'vimeo.com/api/oembed': { json: { title: 'Tréning', thumbnail_url: 'https://i.vimeocdn.com/x.jpg', duration: 62 } },
    });

    const udaje = await zistiUdajeVidea('https://vimeo.com/76979871');
    expect(udaje).toEqual({
      video_id: '76979871',
      nazov: 'Tréning',
      nahlad: 'https://i.vimeocdn.com/x.jpg',
      dlzka: 62,
    });
  });

  it('pri výpadku siete nevyhodí chybu, len vráti prázdne hodnoty', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline'); }));

    const udaje = await zistiUdajeVidea('https://youtu.be/dQw4w9WgXcQ');
    expect(udaje.nazov).toBeNull();
    expect(udaje.dlzka).toBeNull();
    expect(udaje.nahlad).toContain('dQw4w9WgXcQ');
  });
});
