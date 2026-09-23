// Umiestnenie: frontend/src/components/KomentarePodClankom.tsx
// Komentáre pod článkom na verejnom webe.
//
// PREČO VZNIKOL: komentáre sa dali len moderovať v administrácii, ale na
// webe sa nikde nezobrazovali a nedali sa ani pridať. Požiadavka navyše
// hovorí, že autor si svoj komentár vie na webe klubu upraviť.
//
// Čo vie:
//   - zobrazí schválené komentáre aj s odpoveďami
//   - formulár na nový komentár a odpoveď (ak ich článok a nastavenia dovolia)
//   - prihlásený autor vidí aj svoje čakajúce komentáre a môže ich upraviť

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { apiUrl } from '../config/api';

interface VerejnyKomentar {
  id: number;
  rodic_id: number | null;
  autor_meno: string;
  obsah: string;
  vytvoreny: string;
  upraveny: boolean;
  moj: boolean;
  caka_na_schvalenie: boolean;
}

interface Nastavenia {
  povolene: boolean;
  vyzadovat_email: boolean;
  povolit_odpovede: boolean;
  moderovat: boolean;
}

interface Props {
  clanokId: number;
}

const MAX_DLZKA = 3000;

/** Hlavičky s prihlasovacím tokenom, ak existuje. */
const hlavicky = (json = false): Record<string, string> => {
  const h: Record<string, string> = {};
  if (json) h['Content-Type'] = 'application/json';
  const token = localStorage.getItem('clubw_token');
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
};

/** Meno prihláseného používateľa, ak ho máme uložené. */
const menoPrihlaseneho = (): string => {
  try {
    const ulozeny = localStorage.getItem('clubw_user');
    return ulozeny ? JSON.parse(ulozeny)?.meno ?? '' : '';
  } catch {
    return '';
  }
};

/** Hláška z chybovej odpovede servera, aj s chybami polí. */
const hlaskaZChyby = (telo: any, predvolena: string): string => {
  const chyby = Array.isArray(telo?.errors)
    ? telo.errors.map((e: any) => (typeof e === 'string' ? e : e?.msg)).filter(Boolean)
    : [];
  return [telo?.message || predvolena, ...chyby].join(' ');
};

const formatujDatum = (iso: string): string =>
  new Date(iso).toLocaleString('sk-SK', {
    day: 'numeric', month: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

const styl = {
  sekcia: { maxWidth: 760, margin: '48px auto 0', padding: '0 20px' } as React.CSSProperties,
  nadpis: { fontSize: 22, fontWeight: 700, margin: '0 0 20px', color: '#1e293b' } as React.CSSProperties,
  karta: {
    background: 'white', border: '1px solid #e2e8f0', borderRadius: 10,
    padding: '14px 16px', marginBottom: 12,
  } as React.CSSProperties,
  hlava: { display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 6, flexWrap: 'wrap' } as React.CSSProperties,
  meno: { fontWeight: 600, color: '#1e293b' } as React.CSSProperties,
  cas: { fontSize: 13, color: '#64748b' } as React.CSSProperties,
  text: { margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.55, color: '#334155' } as React.CSSProperties,
  odpovede: { marginLeft: 28, marginTop: 10, borderLeft: '3px solid #e2e8f0', paddingLeft: 14 } as React.CSSProperties,
  odkaz: {
    background: 'none', border: 'none', padding: 0, color: '#2563eb', cursor: 'pointer',
    fontSize: 13, fontWeight: 500, marginRight: 14,
  } as React.CSSProperties,
  stitok: {
    display: 'inline-block', fontSize: 12, padding: '2px 8px', borderRadius: 999,
    background: '#fef3c7', color: '#92400e', marginLeft: 8,
  } as React.CSSProperties,
  pole: {
    width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 8,
    fontSize: 15, fontFamily: 'inherit', boxSizing: 'border-box',
  } as React.CSSProperties,
  tlacidlo: {
    background: '#1e3a8a', color: 'white', border: 'none', borderRadius: 8,
    padding: '10px 18px', fontSize: 15, fontWeight: 600, cursor: 'pointer',
  } as React.CSSProperties,
  sprava: (ok: boolean) => ({
    padding: '10px 14px', borderRadius: 8, marginBottom: 14, fontSize: 14,
    background: ok ? '#dcfce7' : '#fee2e2', color: ok ? '#166534' : '#991b1b',
  }) as React.CSSProperties,
};

export const KomentarePodClankom: React.FC<Props> = ({ clanokId }) => {
  const [komentare, setKomentare] = useState<VerejnyKomentar[]>([]);
  const [nastavenia, setNastavenia] = useState<Nastavenia | null>(null);
  const [nacitava, setNacitava] = useState(true);

  // Formulár nového komentára
  const [meno, setMeno] = useState(menoPrihlaseneho());
  const [email, setEmail] = useState('');
  const [text, setText] = useState('');
  const [odpovedNa, setOdpovedNa] = useState<VerejnyKomentar | null>(null);
  const [odosiela, setOdosiela] = useState(false);
  const [sprava, setSprava] = useState<{ ok: boolean; text: string } | null>(null);

  // Úprava vlastného komentára
  const [upravovany, setUpravovany] = useState<number | null>(null);
  const [upravovanyText, setUpravovanyText] = useState('');

  const nacitaj = useCallback(async () => {
    try {
      const odpoved = await fetch(apiUrl(`/comments/clanok/${clanokId}`), { headers: hlavicky() });
      if (!odpoved.ok) return;
      const telo = await odpoved.json();
      setKomentare(Array.isArray(telo.data) ? telo.data : []);
      setNastavenia(telo.nastavenia ?? null);
    } catch {
      // Bez komentárov sa článok zobrazí aj tak
    } finally {
      setNacitava(false);
    }
  }, [clanokId]);

  useEffect(() => {
    void nacitaj();
  }, [nacitaj]);

  /** Komentáre usporiadané do stromu: hlavné a pod nimi odpovede. */
  const { hlavne, odpovedePre } = useMemo(() => {
    const podla = new Map<number, VerejnyKomentar[]>();
    const idcka = new Set(komentare.map((k) => k.id));
    const koren: VerejnyKomentar[] = [];
    for (const k of komentare) {
      // Odpoveď na komentár, ktorý nevidíme (napr. zamietnutý), ukážeme ako hlavný
      if (k.rodic_id && idcka.has(k.rodic_id)) {
        podla.set(k.rodic_id, [...(podla.get(k.rodic_id) ?? []), k]);
      } else {
        koren.push(k);
      }
    }
    return { hlavne: koren, odpovedePre: (id: number) => podla.get(id) ?? [] };
  }, [komentare]);

  const odosli = async (e: React.FormEvent) => {
    e.preventDefault();
    setSprava(null);

    if (meno.trim().length < 2) {
      setSprava({ ok: false, text: 'Zadajte meno (aspoň 2 znaky).' });
      return;
    }
    if (nastavenia?.vyzadovat_email && !email.trim()) {
      setSprava({ ok: false, text: 'Zadajte e-mailovú adresu.' });
      return;
    }
    if (text.trim().length < 2) {
      setSprava({ ok: false, text: 'Napíšte text komentára.' });
      return;
    }

    setOdosiela(true);
    try {
      const odpoved = await fetch(apiUrl('/comments'), {
        method: 'POST',
        headers: hlavicky(true),
        body: JSON.stringify({
          clanok_id: clanokId,
          autor_meno: meno.trim(),
          autor_email: email.trim() || null,
          obsah: text.trim(),
          rodic_id: odpovedNa?.id ?? null,
        }),
      });
      const telo = await odpoved.json().catch(() => null);

      if (!odpoved.ok || !telo?.success) {
        setSprava({ ok: false, text: hlaskaZChyby(telo, 'Komentár sa nepodarilo odoslať.') });
        return;
      }

      setSprava({ ok: true, text: telo.message || 'Ďakujeme za komentár.' });
      setText('');
      setOdpovedNa(null);
      void nacitaj();
    } catch {
      setSprava({ ok: false, text: 'Server neodpovedá. Skúste to znova.' });
    } finally {
      setOdosiela(false);
    }
  };

  const ulozUpravu = async (id: number) => {
    if (upravovanyText.trim().length < 2) return;
    try {
      const odpoved = await fetch(apiUrl(`/comments/${id}/moj`), {
        method: 'PUT',
        headers: hlavicky(true),
        body: JSON.stringify({ obsah: upravovanyText.trim() }),
      });
      const telo = await odpoved.json().catch(() => null);
      if (!odpoved.ok || !telo?.success) {
        setSprava({ ok: false, text: hlaskaZChyby(telo, 'Komentár sa nepodarilo upraviť.') });
        return;
      }
      setSprava({ ok: true, text: telo.message || 'Komentár bol upravený.' });
      setUpravovany(null);
      void nacitaj();
    } catch {
      setSprava({ ok: false, text: 'Server neodpovedá. Skúste to znova.' });
    }
  };

  // Keď sú komentáre vypnuté a žiadne nie sú, sekcia sa vôbec neukáže
  if (nacitava) return null;
  if (!nastavenia?.povolene && komentare.length === 0) return null;

  const vykresliKomentar = (k: VerejnyKomentar, jeOdpoved = false): React.ReactNode => (
    <div key={k.id} style={jeOdpoved ? { marginTop: 10 } : styl.karta}>
      <div style={styl.hlava}>
        <div>
          <span style={styl.meno}>{k.autor_meno}</span>
          {k.caka_na_schvalenie && <span style={styl.stitok}>čaká na schválenie</span>}
        </div>
        <span style={styl.cas}>
          {formatujDatum(k.vytvoreny)}
          {k.upraveny ? ' · upravené' : ''}
        </span>
      </div>

      {upravovany === k.id ? (
        <div>
          <textarea
            style={{ ...styl.pole, minHeight: 90 }}
            value={upravovanyText}
            maxLength={MAX_DLZKA}
            onChange={(e) => setUpravovanyText(e.target.value)}
            aria-label="Upraviť text komentára"
          />
          <div style={{ marginTop: 8 }}>
            <button type="button" style={styl.odkaz} onClick={() => void ulozUpravu(k.id)}>
              Uložiť
            </button>
            <button type="button" style={styl.odkaz} onClick={() => setUpravovany(null)}>
              Zrušiť
            </button>
          </div>
        </div>
      ) : (
        <p style={styl.text}>{k.obsah}</p>
      )}

      {upravovany !== k.id && (
        <div style={{ marginTop: 8 }}>
          {nastavenia?.povolene && nastavenia.povolit_odpovede && !k.caka_na_schvalenie && !jeOdpoved && (
            <button
              type="button"
              style={styl.odkaz}
              onClick={() => {
                setOdpovedNa(k);
                document.getElementById('komentar-formular')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              Odpovedať
            </button>
          )}
          {k.moj && (
            <button
              type="button"
              style={styl.odkaz}
              onClick={() => {
                setUpravovany(k.id);
                setUpravovanyText(k.obsah);
              }}
            >
              Upraviť
            </button>
          )}
        </div>
      )}

      {!jeOdpoved && odpovedePre(k.id).length > 0 && (
        <div style={styl.odpovede}>{odpovedePre(k.id).map((o) => vykresliKomentar(o, true))}</div>
      )}
    </div>
  );

  return (
    <section style={styl.sekcia} aria-labelledby="komentare-nadpis">
      <h2 id="komentare-nadpis" style={styl.nadpis}>
        Komentáre {komentare.length > 0 ? `(${komentare.length})` : ''}
      </h2>

      {sprava && <div style={styl.sprava(sprava.ok)} role="status">{sprava.text}</div>}

      {komentare.length === 0 ? (
        <p style={{ color: '#64748b', marginTop: 0 }}>Zatiaľ žiadne komentáre. Buďte prvý.</p>
      ) : (
        hlavne.map((k) => vykresliKomentar(k))
      )}

      {nastavenia?.povolene ? (
        <form id="komentar-formular" onSubmit={odosli} style={{ ...styl.karta, marginTop: 24 }}>
          <h3 style={{ margin: '0 0 14px', fontSize: 17 }}>
            {odpovedNa ? `Odpoveď pre ${odpovedNa.autor_meno}` : 'Pridať komentár'}
            {odpovedNa && (
              <button
                type="button"
                style={{ ...styl.odkaz, marginLeft: 10 }}
                onClick={() => setOdpovedNa(null)}
              >
                zrušiť odpoveď
              </button>
            )}
          </h3>

          <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
            <input
              style={styl.pole}
              value={meno}
              onChange={(e) => setMeno(e.target.value)}
              placeholder="Meno *"
              maxLength={100}
              aria-label="Meno"
              required
            />
            <input
              style={styl.pole}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={nastavenia.vyzadovat_email ? 'E-mail *' : 'E-mail (nezobrazí sa)'}
              maxLength={150}
              aria-label="E-mail"
              required={nastavenia.vyzadovat_email}
            />
          </div>

          <textarea
            style={{ ...styl.pole, minHeight: 110, marginTop: 12 }}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Váš komentár *"
            maxLength={MAX_DLZKA}
            aria-label="Text komentára"
            required
          />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, gap: 12, flexWrap: 'wrap' }}>
            <span style={styl.cas}>
              {nastavenia.moderovat ? 'Komentár sa zobrazí po schválení.' : ''}
            </span>
            <button type="submit" style={{ ...styl.tlacidlo, opacity: odosiela ? 0.7 : 1 }} disabled={odosiela}>
              {odosiela ? 'Odosielam…' : 'Odoslať'}
            </button>
          </div>
        </form>
      ) : (
        <p style={{ color: '#64748b' }}>Pridávanie komentárov je pri tomto článku uzavreté.</p>
      )}
    </section>
  );
};

export default KomentarePodClankom;
