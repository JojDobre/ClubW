// Umiestnenie: frontend/src/pages/admin/Stadiony.tsx
// Štadióny klubu - názov, adresa, fotka, kapacita.
//
// Štadión sa priraďuje tímom; pri domácom zápase sa z neho automaticky
// doplní miesto konania.

import React, { useState } from 'react';
import {
  PageHeader, Button, Icon, Modal, Input, Textarea,
  Skeleton, EmptyState, ErrorState, ConfirmDialog, useToast,
} from '../../ui';
import { useNacitanie } from '../../app/useNacitanie';
import { stadionyApi, timyApi } from '../../api/sport';
import { PoleObrazka } from '../../components/admin/PoleObrazka';
import { souborUrl } from '../../config/api';
import type { Stadion } from '../../api/typy';
import './Stadiony.css';

const PRAZDNY: Partial<Stadion> = { nazov: '', adresa: '', fotka: null, kapacita: null, poznamka: '' };

export const Stadiony: React.FC = () => {
  const { uspech, chyba: hlasChybu, varovanie } = useToast();

  const [upravovany, setUpravovany] = useState<Partial<Stadion> | null>(null);
  const [kapacitaVstup, setKapacitaVstup] = useState('');
  const [naZmazanie, setNaZmazanie] = useState<Stadion | null>(null);
  const [uklada, setUklada] = useState(false);
  const [maze, setMaze] = useState(false);

  const stadiony = useNacitanie((signal) => stadionyApi.vypis(signal));
  const timy = useNacitanie((signal) => timyApi.vypis(signal));

  const zoznam = stadiony.data ?? [];
  const timyNaStadione = (id: number) => (timy.data ?? []).filter((t) => t.stadion_id === id);

  const jeNovy = upravovany !== null && !upravovany.id;

  const otvor = (s: Partial<Stadion>) => {
    setUpravovany({ ...s });
    setKapacitaVstup(s.kapacita != null ? String(s.kapacita) : '');
  };

  const uloz = async () => {
    if (!upravovany) return;

    const nazov = upravovany.nazov?.trim() ?? '';
    if (nazov.length < 2) {
      varovanie('Názov štadióna musí mať aspoň 2 znaky');
      return;
    }
    const kapacita = kapacitaVstup.trim() === '' ? null : Number(kapacitaVstup.replace(/\s/g, ''));
    if (kapacita !== null && (!Number.isInteger(kapacita) || kapacita < 0)) {
      varovanie('Kapacita musí byť celé číslo');
      return;
    }

    setUklada(true);
    try {
      const naUlozenie: Partial<Stadion> = {
        nazov,
        adresa: upravovany.adresa?.trim() || null,
        fotka: upravovany.fotka || null,
        kapacita,
        poznamka: upravovany.poznamka?.trim() || null,
      };
      if (jeNovy) {
        await stadionyApi.vytvor(naUlozenie);
        uspech('Štadión bol pridaný');
      } else {
        await stadionyApi.uprav(upravovany.id!, naUlozenie);
        uspech('Zmeny boli uložené');
      }
      setUpravovany(null);
      stadiony.obnov();
    } catch (e: any) {
      hlasChybu(e?.message || 'Štadión sa nepodarilo uložiť');
    } finally {
      setUklada(false);
    }
  };

  const zmaz = async () => {
    if (!naZmazanie) return;
    setMaze(true);
    try {
      await stadionyApi.zmaz(naZmazanie.id);
      uspech('Štadión bol presunutý do archívu');
      setNaZmazanie(null);
      stadiony.obnov();
    } catch (e: any) {
      hlasChybu(e?.message || 'Štadión sa nepodarilo archivovať');
    } finally {
      setMaze(false);
    }
  };

  return (
    <div className="cw-screen">
      <PageHeader
        nadpis="Štadióny"
        podnadpis="Ihriská, na ktorých hrávajú tímy klubu."
        akcie={
          <Button ikona={<Icon nazov="plus" velkost={17} />} onClick={() => otvor(PRAZDNY)}>
            Nový štadión
          </Button>
        }
      />

      {stadiony.chyba ? (
        <ErrorState sprava="Štadióny sa nepodarilo načítať" detail={stadiony.chyba} onSkusZnova={stadiony.obnov} />
      ) : stadiony.nacitava ? (
        <div className="cw-stad__mriezka">
          {[0, 1, 2].map((i) => (
            <div key={i} className="cw-stad__karta">
              <Skeleton vyska="140px" />
            </div>
          ))}
        </div>
      ) : zoznam.length === 0 ? (
        <div className="cw-stad__prazdne">
          <EmptyState
            ikona={<Icon nazov="stadion" velkost={40} />}
            nadpis="Zatiaľ žiadne štadióny"
            popis="Pridajte štadión a priraďte ho tímom - domáce zápasy potom dostanú miesto automaticky."
            akcia={<Button onClick={() => otvor(PRAZDNY)}>Pridať štadión</Button>}
          />
        </div>
      ) : (
        <div className="cw-stad__mriezka">
          {zoznam.map((s) => {
            const timyTu = timyNaStadione(s.id);
            return (
              <article key={s.id} className="cw-stad__karta">
                <div className="cw-stad__foto">
                  {s.fotka ? (
                    <img src={souborUrl(s.fotka)} alt="" />
                  ) : (
                    <Icon nazov="stadion" velkost={34} />
                  )}
                </div>
                <div className="cw-stad__telo">
                  <h3 className="cw-stad__nazov">{s.nazov}</h3>
                  {s.adresa && <div className="cw-stad__adresa">{s.adresa}</div>}
                  <div className="cw-stad__udaje">
                    {s.kapacita != null && <span>Kapacita {s.kapacita.toLocaleString('sk-SK')}</span>}
                    <span>
                      {timyTu.length === 0
                        ? 'Žiadny tím'
                        : timyTu.map((t) => t.nazov).join(', ')}
                    </span>
                  </div>
                  <div className="cw-stad__tlacidla">
                    <Button variant="secondary" velkost="sm" onClick={() => otvor(s)}>
                      Upraviť
                    </Button>
                    <Button
                      variant="ghost"
                      velkost="sm"
                      onClick={() => setNaZmazanie(s)}
                      aria-label={`Archivovať ${s.nazov}`}
                      title="Presunúť do archívu"
                    >
                      <Icon nazov="archiv" velkost={15} />
                    </Button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <Modal
        otvorene={upravovany !== null}
        onZavri={() => setUpravovany(null)}
        nadpis={jeNovy ? 'Nový štadión' : upravovany?.nazov || 'Štadión'}
        pata={
          <>
            <Button variant="secondary" onClick={() => setUpravovany(null)} disabled={uklada}>
              Zrušiť
            </Button>
            <Button onClick={uloz} nacitava={uklada}>
              {jeNovy ? 'Pridať štadión' : 'Uložiť zmeny'}
            </Button>
          </>
        }
      >
        {upravovany && (
          <>
            <Input
              menovka="Názov štadióna"
              value={upravovany.nazov ?? ''}
              onChange={(e) => setUpravovany((d) => ({ ...d!, nazov: e.target.value }))}
              placeholder="Napríklad: Štadión pod Horou"
              povinne
            />
            <Input
              menovka="Adresa"
              value={upravovany.adresa ?? ''}
              onChange={(e) => setUpravovany((d) => ({ ...d!, adresa: e.target.value }))}
              placeholder="Ulica 12, 831 01 Bratislava"
            />
            <PoleObrazka
              menovka="Fotka štadióna"
              tvar="siroky"
              hodnota={upravovany.fotka}
              onZmena={(cesta) => setUpravovany((d) => ({ ...d!, fotka: cesta }))}
            />
            <Input
              menovka="Kapacita (divákov)"
              inputMode="numeric"
              value={kapacitaVstup}
              onChange={(e) => setKapacitaVstup(e.target.value)}
              placeholder="1500"
            />
            <Textarea
              menovka="Poznámka"
              value={upravovany.poznamka ?? ''}
              onChange={(e) => setUpravovany((d) => ({ ...d!, poznamka: e.target.value }))}
              rows={2}
              placeholder="Parkovanie, vstup pre hostí…"
            />
          </>
        )}
      </Modal>

      <ConfirmDialog
        otvorene={naZmazanie !== null}
        nadpis="Archivovať štadión?"
        sprava={
          naZmazanie && timyNaStadione(naZmazanie.id).length > 0
            ? `Na štadióne ${naZmazanie.nazov} hrajú tímy (${timyNaStadione(naZmazanie.id).map((t) => t.nazov).join(', ')}). Najprv im nastavte iný štadión.`
            : `Štadión ${naZmazanie?.nazov} sa presunie do archívu, odkiaľ sa dá obnoviť.`
        }
        potvrdit="Archivovať"
        nebezpecne
        nacitava={maze}
        onPotvrd={zmaz}
        onZrus={() => setNaZmazanie(null)}
      />
    </div>
  );
};

export default Stadiony;
