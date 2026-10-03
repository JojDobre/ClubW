// Umiestnenie: sablony/tribuna/src/stranky/Videa.tsx
// Videá (podľa návrhu Videá z Claude Design): kategórie ako pilulky,
// veľké video cez celú šírku, mriežka troch videí a „Načítať ďalšie".
// Kliknutie otvorí okno s prehrávačom YouTube (bez cookies) alebo Vimeo -
// dovtedy sa z cudzích serverov načítajú len náhľady.
// ?zapas=<id> ukáže len videá z jedného zápasu.

import React, { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Chyba, Filtre, HlavickaStranky, KartaVidea, NacitatDalsie, Nacitava, Obrazok, Prazdne, Sekcia, kategoriaVidea, nahladVidea, useOknoVidea } from '../casti';
import { Ikona, dlzkaVidea, useApi, useTitulok, useUpravy, type Video } from '../spolocne';

const NA_STRANU = 6;

const HlavneVideo: React.FC<{ video: Video; onPrehrat: (v: Video) => void }> = ({ video: v, onPrehrat }) => {
  const dlzka = dlzkaVidea(v.dlzka);
  return (
    <button type="button" className="tb-hlavne-video" onClick={() => onPrehrat(v)} aria-label={`Prehrať video ${v.nazov}`}>
      <Obrazok src={nahladVidea(v)} className="tb-hlavne-video__obrazok" />
      <span className="tb-hlavne-video__prechod" aria-hidden="true" />
      <span className="tb-hlavne-video__play" aria-hidden="true">
        <Ikona nazov="play" velkost={26} />
      </span>
      <span className="tb-hlavne-video__spodok">
        <h2>{v.nazov}</h2>
        {dlzka && <span className="tb-hlavne-video__dlzka">{dlzka}</span>}
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
  const [pocet, setPocet] = useState({ filter: '', n: NA_STRANU });
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
  const zobrazit = pocet.filter === kategoria ? pocet.n : NA_STRANU;
  const [hlavne, ...ostatne] = vybrane;

  const zvolKategoriu = (k: string) => {
    const nove = new URLSearchParams(parametre);
    if (k) nove.set('kategoria', k);
    else nove.delete('kategoria');
    setParametre(nove, { replace: true });
  };

  return (
    <div className="tb-stranka tb-videa-stranka">
      <HlavickaStranky stitok={u.text('stranka_videa_stitok', 'Obsah')} nadpis={u.text('stranka_videa_nadpis', 'Videá')}>
        {zapas && (
          <Link to="/videa" className="tb-hlava__odkaz">
            Videá zo zápasu · zobraziť všetky
          </Link>
        )}
      </HlavickaStranky>

      {kategorie.length > 0 && (
        <Sekcia className="tb-sekcia--filtre">
          <Filtre popis="Kategórie videí" aktivna={kategoria} onZmena={zvolKategoriu} moznosti={[{ kluc: '', nazov: 'Všetko' }, ...kategorie]} />
        </Sekcia>
      )}

      {videa.nacitava ? (
        <Nacitava text="Načítavam videá…" />
      ) : videa.chyba ? (
        <Sekcia className="tb-sekcia--hore">
          <Chyba text={videa.chyba} />
        </Sekcia>
      ) : !hlavne ? (
        <Sekcia className={kategorie.length ? '' : 'tb-sekcia--hore'}>
          <Prazdne nadpis="Zatiaľ tu nie sú žiadne videá" />
        </Sekcia>
      ) : (
        <>
          <Sekcia className={`tb-sekcia--hlavny-clanok${kategorie.length ? '' : ' tb-sekcia--hore'}`}>
            <HlavneVideo video={hlavne} onPrehrat={otvor} />
          </Sekcia>
          {ostatne.length > 0 && (
            <Sekcia className="tb-sekcia--mriezka">
              <div className="tb-mriezka-3 tb-mriezka-3--karty">
                {ostatne.slice(0, zobrazit).map((v) => (
                  <KartaVidea key={v.id} video={v} onPrehrat={otvor} />
                ))}
              </div>
            </Sekcia>
          )}
          <Sekcia className="tb-sekcia--dalsie">
            {ostatne.length > zobrazit && <NacitatDalsie nacitava={false} onClick={() => setPocet({ filter: kategoria, n: zobrazit + NA_STRANU })} />}
          </Sekcia>
        </>
      )}
      {okno}
    </div>
  );
};

export default Videa;
