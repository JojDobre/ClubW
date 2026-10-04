// Umiestnenie: sablony/arena/src/stranky/Videa.tsx
// Videá ako klubová televízia: kategórie ako pilulky, vľavo veľké vybrané
// video s popisom, vpravo číslovaný playlist s náhľadmi (výber zmení
// hlavné video).
// Kliknutie otvorí okno s prehrávačom YouTube (bez cookies) alebo Vimeo -
// dovtedy sa z cudzích serverov načítajú len náhľady.
// ?zapas=<id> ukáže len videá z jedného zápasu.

import React, { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Chyba, Filtre, HlavickaStranky, Nacitava, Obrazok, Prazdne, Sekcia, kategoriaVidea, nahladVidea, useOknoVidea } from '../casti';
import { Ikona, datum, dlzkaVidea, sklon, useApi, useTitulok, useUpravy, type Video } from '../spolocne';

const HlavneVideo: React.FC<{ video: Video; onPrehrat: (v: Video) => void }> = ({ video: v, onPrehrat }) => {
  const dlzka = dlzkaVidea(v.dlzka);
  return (
    <button type="button" className="ar-hlavne-video" onClick={() => onPrehrat(v)} aria-label={`Prehrať video ${v.nazov}`}>
      <Obrazok src={nahladVidea(v)} className="ar-hlavne-video__obrazok" />
      <span className="ar-hlavne-video__prechod" aria-hidden="true" />
      <span className="ar-hlavne-video__play" aria-hidden="true">
        <Ikona nazov="play" velkost={26} />
      </span>
      <span className="ar-hlavne-video__spodok">
        <h2>{v.nazov}</h2>
        {dlzka && <span className="ar-hlavne-video__dlzka">{dlzka}</span>}
      </span>
    </button>
  );
};

const Videa: React.FC = () => {
  const u = useUpravy();
  const [parametre, setParametre] = useSearchParams();
  const zapas = parametre.get('zapas');
  const kategoria = parametre.get('kategoria') ?? '';
  const videa = useApi<Video[]>(`/videos?limit=500${zapas ? `&zapas_id=${encodeURIComponent(zapas)}` : ''}`);
  const [aktivne, setAktivne] = useState<number | null>(null);
  const { otvor, okno } = useOknoVidea();
  useTitulok('Videá');

  // Kategórie podľa videí (v administrácii sa píšu voľne)
  const kategorie = useMemo(() => {
    const mapa = new Map<string, string>();
    for (const v of videa.data ?? []) {
      const k = kategoriaVidea(v);
      if (k && !mapa.has(k.toLowerCase())) mapa.set(k.toLowerCase(), k);
    }
    return [...mapa.entries()].map(([kluc, nazov]) => ({ kluc, nazov }));
  }, [videa.data]);

  const vybrane = (videa.data ?? []).filter((v) => !kategoria || kategoriaVidea(v).toLowerCase() === kategoria);
  const hlavne = vybrane.find((v) => v.id === aktivne) ?? vybrane[0];

  const zvolKategoriu = (k: string) => {
    const nove = new URLSearchParams(parametre);
    if (k) nove.set('kategoria', k);
    else nove.delete('kategoria');
    setParametre(nove, { replace: true });
  };

  return (
    <div className="ar-stranka ar-videa-stranka">
      <HlavickaStranky stitok={u.text('stranka_videa_stitok', 'Obsah')} nadpis={u.text('stranka_videa_nadpis', 'Videá')}>
        {zapas && (
          <Link to="/videa" className="ar-hlava__odkaz">
            Videá zo zápasu · zobraziť všetky
          </Link>
        )}
      </HlavickaStranky>

      {kategorie.length > 0 && (
        <Sekcia className="ar-sekcia--filtre">
          <Filtre popis="Kategórie videí" aktivna={kategoria} onZmena={zvolKategoriu} moznosti={[{ kluc: '', nazov: 'Všetko' }, ...kategorie]} />
        </Sekcia>
      )}

      {videa.nacitava ? (
        <Nacitava text="Načítavam videá…" />
      ) : videa.chyba ? (
        <Sekcia className="ar-sekcia--hore">
          <Chyba text={videa.chyba} />
        </Sekcia>
      ) : !hlavne ? (
        <Sekcia className={kategorie.length ? '' : 'ar-sekcia--hore'}>
          <Prazdne nadpis="Zatiaľ tu nie sú žiadne videá" />
        </Sekcia>
      ) : (
        <div className={`ar-kontajner ar-tv${kategorie.length ? '' : ' ar-tv--hore'}`}>
          <div className="ar-tv__hlavne">
            <HlavneVideo video={hlavne} onPrehrat={otvor} />
            <div className="ar-tv__info">
              <span className="ar-tv__meta">
                {kategoriaVidea(hlavne) && <b>{kategoriaVidea(hlavne)}</b>}
                {hlavne.vytvorene && datum(hlavne.vytvorene)}
              </span>
              <h2>{hlavne.nazov}</h2>
              {hlavne.popis && <p>{hlavne.popis}</p>}
            </div>
          </div>
          {vybrane.length > 1 && (
            <div className="ar-tv__playlist">
              <div className="ar-tv__hlava">
                <strong>Playlist</strong>
                <small>
                  {vybrane.length} {sklon(vybrane.length, 'video', 'videá', 'videí')}
                </small>
              </div>
              <ol>
                {vybrane.map((v, i) => (
                  <li key={v.id}>
                    <button type="button" className={`ar-tv__polozka${v.id === hlavne.id ? ' is-aktivna' : ''}`} onClick={() => setAktivne(v.id)} aria-pressed={v.id === hlavne.id}>
                      <span className="ar-tv__poradie">{String(i + 1).padStart(2, '0')}</span>
                      <span className="ar-tv__nahlad">
                        <Obrazok src={nahladVidea(v)} className="ar-tv__obrazok" />
                        {dlzkaVidea(v.dlzka) && <small>{dlzkaVidea(v.dlzka)}</small>}
                      </span>
                      <span className="ar-tv__nazov">
                        <strong>{v.nazov}</strong>
                        <small>{kategoriaVidea(v) || (v.vytvorene ? datum(v.vytvorene) : '')}</small>
                      </span>
                    </button>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}
      {okno}
    </div>
  );
};

export default Videa;
