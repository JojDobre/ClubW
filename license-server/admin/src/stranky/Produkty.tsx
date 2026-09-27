// Umiestnenie: license-server/admin/src/stranky/Produkty.tsx
// Zoznam produktov a vytvorenie nového.

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, type Produkt } from '../api';
import { ChybaStav, HlavickaStranky, Ikona, Nacitava, Okno, Oblast, Pole, Stitok, Tlacidlo, useNacitaj, useOznamenia } from '../komponenty';

const Produkty: React.FC = () => {
  const produkty = useNacitaj((s) => api.get<Produkt[]>('/produkty', s).then((r) => r.data), []);
  const [novy, setNovy] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="stranka">
      <HlavickaStranky
        nadpis="Produkty a verzie"
        popis="Produkty, ich plány a verzie z GitHubu. Tu určíte, ktorá verzia je aktuálna."
        akcie={
          <Tlacidlo variant="primarne" ikona="plus" onClick={() => setNovy(true)}>
            Nový produkt
          </Tlacidlo>
        }
      />
      {produkty.chyba ? (
        <ChybaStav text={produkty.chyba} onZnova={produkty.obnov} />
      ) : !produkty.data ? (
        <Nacitava />
      ) : (
        <div className="mriezka-kariet">
          {produkty.data.map((p) => {
            const aktivne = p.licencie?.aktivna ?? 0;
            return (
              <Link key={p.id} to={`/produkty/${p.id}`} className="produkt-karta">
                <div className="produkt-karta__hlava">
                  <span className="produkt-karta__znak" aria-hidden="true">
                    <Ikona nazov="produkty" />
                  </span>
                  <span>
                    <strong>{p.nazov}</strong>
                    <small className="mono">{p.kod}</small>
                  </span>
                  {!p.aktivny && <Stitok>neaktívny</Stitok>}
                </div>
                <dl className="udaje udaje--kompaktne">
                  <div>
                    <dt>Aktuálna verzia</dt>
                    <dd className="mono">{p.aktualna_verzia?.verzia ?? '—'}</dd>
                  </div>
                  <div>
                    <dt>Licencie</dt>
                    <dd>
                      {aktivne} aktívnych{p.licencie?.pozastavena ? `, ${p.licencie.pozastavena} pozastavených` : ''}
                    </dd>
                  </div>
                  <div>
                    <dt>GitHub</dt>
                    <dd className="mono">{p.github_repo ?? 'nenastavený'}</dd>
                  </div>
                  <div>
                    <dt>Plány</dt>
                    <dd>{p.plany.map((x) => x.nazov).join(', ') || '—'}</dd>
                  </div>
                </dl>
              </Link>
            );
          })}
        </div>
      )}
      {novy && (
        <NovyProdukt
          onZavriet={() => setNovy(false)}
          onVytvoreny={(p) => {
            setNovy(false);
            navigate(`/produkty/${p.id}`);
          }}
        />
      )}
    </div>
  );
};

const NovyProdukt: React.FC<{ onZavriet: () => void; onVytvoreny: (p: Produkt) => void }> = ({ onZavriet, onVytvoreny }) => {
  const { uspech, chyba } = useOznamenia();
  const [h, setH] = useState({ kod: '', nazov: '', popis: '', github_repo: '' });
  const [uklada, setUklada] = useState(false);
  const uloz = async (e: React.FormEvent) => {
    e.preventDefault();
    setUklada(true);
    try {
      const r = await api.post<Produkt>('/produkty', h);
      uspech(r.message ?? 'Vytvorené');
      onVytvoreny(r.data);
    } catch (e: any) {
      chyba(e.message);
    } finally {
      setUklada(false);
    }
  };
  return (
    <Okno
      nadpis="Nový produkt"
      onZavriet={onZavriet}
      paticka={
        <>
          <Tlacidlo onClick={onZavriet}>Zrušiť</Tlacidlo>
          <Tlacidlo variant="primarne" type="submit" form="novy-produkt" nacitava={uklada}>
            Vytvoriť
          </Tlacidlo>
        </>
      }
    >
      <form id="novy-produkt" className="formular" onSubmit={uloz} noValidate>
        <div className="formular__riadok">
          <Pole menovka="Názov" value={h.nazov} onChange={(e) => setH({ ...h, nazov: e.target.value })} placeholder="ClubW Mobil" required />
          <Pole
            menovka="Kód"
            value={h.kod}
            onChange={(e) => setH({ ...h, kod: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
            placeholder="clubw-mobil"
            napoveda="Malé písmená, číslice a pomlčka. Neskôr sa nedá zmeniť."
            required
          />
        </div>
        <Pole
          menovka="Repozitár na GitHube"
          value={h.github_repo}
          onChange={(e) => setH({ ...h, github_repo: e.target.value })}
          placeholder="vlastnik/repozitar"
          napoveda="Z neho sa načítajú verzie (vydania a tagy)."
        />
        <Oblast menovka="Popis" value={h.popis} onChange={(e) => setH({ ...h, popis: e.target.value })} />
        <p className="tlmene">Produkt dostane plán Štandard na 12 mesiacov. Plány upravíte v detaile produktu.</p>
      </form>
    </Okno>
  );
};

export default Produkty;
