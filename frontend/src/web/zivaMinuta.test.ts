// Umiestnenie: frontend/src/web/zivaMinuta.test.ts
import { describe, it, expect } from 'vitest';
import { vlozenieStreamu, zivaMinuta, zivaMinutaCislo } from './zivaMinuta';

const pred = (minut: number, teraz: number) => new Date(teraz - minut * 60_000).toISOString();

describe('zivaMinuta', () => {
  const teraz = Date.UTC(2026, 9, 9, 15, 0);
  it('počíta minútu od začiatku fázy', () => {
    expect(zivaMinuta({ live_faza: 'prvy_polcas', live_faza_od: pred(22.5, teraz) }, teraz)).toBe("23'");
    expect(zivaMinuta({ live_faza: 'druhy_polcas', live_faza_od: pred(10, teraz) }, teraz)).toBe("56'");
  });
  it('nadstavený čas a kratší polčas', () => {
    expect(zivaMinuta({ live_faza: 'prvy_polcas', live_faza_od: pred(46, teraz) }, teraz)).toBe("45+2'");
    expect(zivaMinuta({ live_faza: 'prvy_polcas', live_faza_od: pred(36, teraz), dlzka_polcasu: 35 }, teraz)).toBe("35+2'");
    expect(zivaMinutaCislo({ live_faza: 'prvy_polcas', live_faza_od: pred(46, teraz) }, teraz)).toBe(47);
  });
  it('počas prestávky a bez fázy nič', () => {
    expect(zivaMinuta({ live_faza: 'polcas', live_faza_od: pred(5, teraz) }, teraz)).toBeNull();
    expect(zivaMinuta({}, teraz)).toBeNull();
  });
});

describe('vlozenieStreamu', () => {
  it('YouTube a Facebook vloží, ostatné nie', () => {
    expect(vlozenieStreamu('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0');
    expect(vlozenieStreamu('https://youtu.be/dQw4w9WgXcQ')).toContain('/embed/dQw4w9WgXcQ');
    expect(vlozenieStreamu('https://www.youtube.com/live/dQw4w9WgXcQ')).toContain('/embed/dQw4w9WgXcQ');
    expect(vlozenieStreamu('https://www.facebook.com/klub/videos/123')).toContain('facebook.com/plugins/video.php');
    expect(vlozenieStreamu('https://www.twitch.tv/klub')).toBeNull();
    expect(vlozenieStreamu(null)).toBeNull();
  });
});
