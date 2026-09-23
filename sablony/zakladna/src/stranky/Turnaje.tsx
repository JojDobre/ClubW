// Umiestnenie: sablony/zakladna/src/stranky/Turnaje.tsx
// Verejné turnaje: zoznam (/turnaje) a detail (/turnaje/:id) so skupinami
// (tabuľka + výsledky) a pavúkom.

import React, { useEffect, useState } from 'react';
import { apiUrl, souborUrl } from '@clubw/jadro';
import './Turnaje.css';

interface Tim { nazov: string; tim_id: number | null; logo: string | null }
interface ZapasPavuka {
  kod: string; domaci: Tim | null; hostia: Tim | null;
  skore_domaci: number | null; skore_hostia: number | null; vitaz: 'domaci' | 'hostia' | null;
}
interface Riadok {
  poradie: number; tim: Tim; zapasy: number; vyhry: number; remizy: number; prehry: number;
  goly_za: number; goly_proti: number; body: number; postupuje: boolean;
}
interface Skupina {
  nazov: string; timy: Tim[]; tabulka: Riadok[];
  zapasy: Array<{ kod: string; kolo: number; domaci: number; hostia: number; skore_domaci: number | null; skore_hostia: number | null }>;
}
interface Turnaj {
  id: number; nazov: string; popis: string | null; logo: string | null; typ: string; status: string;
  datum_start: string | null; datum_koniec: string | null; vitaz_nazov: string | null;
  skupiny?: { postupuju: number; skupiny: Skupina[] };
  pavuk?: { kola: Array<{ nazov: string; poradie: number; zapasy: ZapasPavuka[] }>; o_tretie?: ZapasPavuka | null };
}

const datum = (d: string | null) => (d ? new Date(`${d}T12:00:00`).toLocaleDateString('sk-SK') : '');

const TimVZapase: React.FC<{ tim: Tim | null; vitaz: boolean; skore: number | null }> = ({ tim, vitaz, skore }) => (
  <div className={`tp__tim ${vitaz ? 'is-vitaz' : ''}`}>
    <span className="tp__tim-meno">
      {tim?.logo && <img src={souborUrl(tim.logo)} alt="" />}
      {tim?.nazov ?? <em>—</em>}
    </span>
    <span className="tp__skore">{skore ?? ''}</span>
  </div>
);

const Pavuk: React.FC<{ pavuk: NonNullable<Turnaj['pavuk']> }> = ({ pavuk }) => (
  <div className="tp__pavuk">
    {pavuk.kola.map((kolo) => (
      <div key={kolo.poradie} className="tp__kolo">
        <h4>{kolo.nazov}</h4>
        {kolo.zapasy.map((z) => (
          <div key={z.kod} className="tp__zapas">
            <TimVZapase tim={z.domaci} vitaz={z.vitaz === 'domaci'} skore={z.skore_domaci} />
            <TimVZapase tim={z.hostia} vitaz={z.vitaz === 'hostia'} skore={z.skore_hostia} />
          </div>
        ))}
      </div>
    ))}
    {pavuk.o_tretie && (
      <div className="tp__kolo">
        <h4>O 3. miesto</h4>
        <div className="tp__zapas">
          <TimVZapase tim={pavuk.o_tretie.domaci} vitaz={pavuk.o_tretie.vitaz === 'domaci'} skore={pavuk.o_tretie.skore_domaci} />
          <TimVZapase tim={pavuk.o_tretie.hostia} vitaz={pavuk.o_tretie.vitaz === 'hostia'} skore={pavuk.o_tretie.skore_hostia} />
        </div>
      </div>
    )}
  </div>
);

const Turnaje: React.FC = () => {
  const id = Number(window.location.pathname.split('/')[2]);
  const [zoznam, setZoznam] = useState<Turnaj[] | null>(null);
  const [turnaj, setTurnaj] = useState<Turnaj | null>(null);
  const [chyba, setChyba] = useState<string | null>(null);

  useEffect(() => {
    const cesta = id ? `/tournaments/${id}` : '/tournaments';
    fetch(apiUrl(cesta))
      .then((r) => r.json())
      .then((json) => {
        if (!json.success) throw new Error(json.message || 'Turnaj sa nepodarilo načítať');
        if (id) setTurnaj(json.data);
        else setZoznam(json.data ?? []);
      })
      .catch((e) => setChyba(e.message));
  }, [id]);

  if (chyba) return <div className="tp"><p className="tp__stav">{chyba}</p></div>;

  if (!id) {
    return (
      <div className="tp">
        <h1>Turnaje</h1>
        {!zoznam ? (
          <p className="tp__stav">Načítavam…</p>
        ) : zoznam.length === 0 ? (
          <p className="tp__stav">Zatiaľ žiadne turnaje.</p>
        ) : (
          <div className="tp__zoznam">
            {zoznam.map((t) => (
              <a key={t.id} href={`/turnaje/${t.id}`} className="tp__karta">
                {t.logo && <img src={souborUrl(t.logo)} alt="" />}
                <div>
                  <strong>{t.nazov}</strong>
                  <span>{[datum(t.datum_start), t.vitaz_nazov ? `🏆 ${t.vitaz_nazov}` : ''].filter(Boolean).join(' · ')}</span>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (!turnaj) return <div className="tp"><p className="tp__stav">Načítavam turnaj…</p></div>;

  const skupiny = turnaj.skupiny?.skupiny ?? [];
  const pavuk = turnaj.pavuk;

  return (
    <div className="tp">
      <a href="/turnaje" className="tp__spat">← Všetky turnaje</a>
      <header className="tp__hlavicka">
        {turnaj.logo && <img src={souborUrl(turnaj.logo)} alt="" />}
        <div>
          <h1>{turnaj.nazov}</h1>
          <p>
            {[datum(turnaj.datum_start), turnaj.datum_koniec && turnaj.datum_koniec !== turnaj.datum_start ? datum(turnaj.datum_koniec) : '']
              .filter(Boolean)
              .join(' – ')}
          </p>
        </div>
        {turnaj.vitaz_nazov && <div className="tp__vitaz">🏆 Víťaz: <strong>{turnaj.vitaz_nazov}</strong></div>}
      </header>
      {turnaj.popis && <p className="tp__popis">{turnaj.popis}</p>}

      {skupiny.length > 0 && (
        <section>
          <h2>Skupiny</h2>
          <div className="tp__skupiny">
            {skupiny.map((s) => (
              <div key={s.nazov} className="tp__skupina">
                <h3>Skupina {s.nazov}</h3>
                <table>
                  <thead>
                    <tr><th>#</th><th>Tím</th><th>Z</th><th>V</th><th>R</th><th>P</th><th>Skóre</th><th>B</th></tr>
                  </thead>
                  <tbody>
                    {s.tabulka.map((r) => (
                      <tr key={r.tim.tim_id ?? r.tim.nazov} className={r.postupuje ? 'is-postup' : ''}>
                        <td>{r.poradie}</td>
                        <td className="tp__tabulka-tim">
                          {r.tim.logo && <img src={souborUrl(r.tim.logo)} alt="" />}
                          {r.tim.nazov}
                        </td>
                        <td>{r.zapasy}</td><td>{r.vyhry}</td><td>{r.remizy}</td><td>{r.prehry}</td>
                        <td>{r.goly_za}:{r.goly_proti}</td><td><strong>{r.body}</strong></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <ul className="tp__vysledky">
                  {s.zapasy.map((z) => (
                    <li key={z.kod}>
                      <span>{s.timy[z.domaci]?.nazov}</span>
                      <strong>{z.skore_domaci !== null ? `${z.skore_domaci} : ${z.skore_hostia}` : '– : –'}</strong>
                      <span>{s.timy[z.hostia]?.nazov}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}

      {pavuk && pavuk.kola.length > 0 && (
        <section>
          <h2>Vyraďovacia časť</h2>
          <Pavuk pavuk={pavuk} />
        </section>
      )}
    </div>
  );
};

export default Turnaje;
