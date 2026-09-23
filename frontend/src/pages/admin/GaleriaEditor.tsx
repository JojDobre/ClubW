// Umiestnenie: frontend/src/pages/admin/GaleriaEditor.tsx
// Úprava fotogalérie - údaje, priradenie a správa fotiek.
//
// PREČO VZNIKOL: administrácia galérií vedela len názov a popis, fotky
// sa nedali nahrať vôbec („Nahrávanie fotiek pribudne v ďalšej fáze").
// Backend pritom nahrávanie, popisy fotiek, titulnú fotku aj pridávanie
// z knižnice dávno vedel.
//
// Rozloženie:
//   - Lišta: Späť · Zobraziť na webe · Zmazať · Uložiť
//   - Vľavo: názov, popis, fotky (nahrať, z knižnice, popis, titulná, zmazať)
//   - Vpravo: viditeľnosť, priradenie k zápasu/tímu/článku, titulný obrázok

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Button, Icon, Input, Textarea, Switch, Skeleton, ErrorState, ConfirmDialog, Badge, useToast,
} from '../../ui';
import { useNacitanie } from '../../app/useNacitanie';
import { galerieApi } from '../../api/obsah';
import { zapasyApi, timyApi } from '../../api/sport';
import { clankyApi } from '../../api/clanky';
import { souborUrl } from '../../config/api';
import { formatujDatumCas } from '../../utils/datum';
import VyberZKniznice from '../../components/admin/VyberZKniznice';
import type { Galeria, GaleriaObrazok, MediaSubor } from '../../api/typy';
import './GaleriaEditor.css';

type TypPriradenia = '' | 'zapas' | 'tim' | 'clanok';

interface Formular {
  nazov: string;
  popis: string;
  zobrazit_na_webe: boolean;
  typ: TypPriradenia;
  objekt_id: number | null;
}

const PRAZDNY: Formular = { nazov: '', popis: '', zobrazit_na_webe: true, typ: '', objekt_id: null };

const zGalerie = (g: Galeria): Formular => ({
  nazov: g.nazov ?? '',
  popis: g.popis ?? '',
  zobrazit_na_webe: g.zobrazit_na_webe !== false,
  typ: g.zapas_id ? 'zapas' : g.tim_id ? 'tim' : g.clanok_id ? 'clanok' : '',
  objekt_id: g.zapas_id ?? g.tim_id ?? g.clanok_id ?? null,
});

export const GaleriaEditor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { uspech, chyba: hlasChybu, varovanie } = useToast();

  const jeNova = id === 'nova' || id === undefined;
  const idCislo = jeNova ? null : Number(id);

  const [formular, setFormular] = useState<Formular>(PRAZDNY);
  const [povodny, setPovodny] = useState(JSON.stringify(PRAZDNY));
  const [uklada, setUklada] = useState(false);
  const [zmazatOtvorene, setZmazatOtvorene] = useState(false);
  const [maze, setMaze] = useState(false);

  const [obrazky, setObrazky] = useState<GaleriaObrazok[]>([]);
  const [titulna, setTitulna] = useState<string | null>(null);
  const [nahrava, setNahrava] = useState<{ hotovo: number; spolu: number } | null>(null);
  const [kniznicaOtvorena, setKniznicaOtvorena] = useState(false);
  const [naZmazanieFotku, setNaZmazanieFotku] = useState<GaleriaObrazok | null>(null);
  const [tahanie, setTahanie] = useState(false);
  const vyberSuborov = useRef<HTMLInputElement>(null);

  const galeria = useNacitanie(
    (signal) => (idCislo !== null ? galerieApi.detail(idCislo, signal) : Promise.resolve(null)),
    [idCislo]
  );

  // Zoznamy na priradenie
  const zapasy = useNacitanie((signal) => zapasyApi.vypis(signal));
  const timy = useNacitanie((signal) => timyApi.vypis(signal));
  const clanky = useNacitanie((signal) => clankyApi.vypis({ limit: 500 }, signal));

  const nacitajObrazky = useCallback(async () => {
    if (idCislo === null) return;
    try {
      setObrazky(await galerieApi.obrazky(idCislo));
    } catch (e: any) {
      hlasChybu(e?.message || 'Fotky sa nepodarilo načítať');
    }
  }, [idCislo, hlasChybu]);

  useEffect(() => {
    if (!galeria.data) return;
    const f = zGalerie(galeria.data);
    setFormular(f);
    setPovodny(JSON.stringify(f));
    setTitulna(galeria.data.nahladovy_obrazok ?? null);
  }, [galeria.data]);

  useEffect(() => {
    void nacitajObrazky();
  }, [nacitajObrazky]);

  const zmenene = JSON.stringify(formular) !== povodny;
  const zmen = <K extends keyof Formular>(pole: K, hodnota: Formular[K]) =>
    setFormular((f) => ({ ...f, [pole]: hodnota }));

  /** Možnosti druhého výberu podľa typu priradenia. */
  const moznostiPriradenia = useMemo(() => {
    if (formular.typ === 'zapas') {
      return (zapasy.data ?? [])
        .slice()
        .sort((a, b) => new Date(b.datum_cas).getTime() - new Date(a.datum_cas).getTime())
        .map((z) => ({ id: z.id, popis: `${formatujDatumCas(z.datum_cas)} · ${z.nazov}` }));
    }
    if (formular.typ === 'tim') return (timy.data ?? []).map((t) => ({ id: t.id, popis: t.nazov }));
    if (formular.typ === 'clanok') {
      return (clanky.data?.polozky ?? []).map((c) => ({ id: c.id, popis: c.nazov }));
    }
    return [];
  }, [formular.typ, zapasy.data, timy.data, clanky.data]);

  // ===== Uloženie galérie =====

  const uloz = async () => {
    if (formular.nazov.trim().length < 3) {
      varovanie('Názov galérie musí mať aspoň 3 znaky');
      return;
    }
    if (formular.typ && !formular.objekt_id) {
      varovanie('Vyberte, ku ktorému záznamu galériu priradiť, alebo priradenie zrušte');
      return;
    }

    // Priradenie je vždy len jedno - ostatné posielame ako null, aby sa zrušili
    const udaje: Partial<Galeria> = {
      nazov: formular.nazov.trim(),
      popis: formular.popis.trim() || null,
      zobrazit_na_webe: formular.zobrazit_na_webe,
      zapas_id: formular.typ === 'zapas' ? formular.objekt_id : null,
      tim_id: formular.typ === 'tim' ? formular.objekt_id : null,
      clanok_id: formular.typ === 'clanok' ? formular.objekt_id : null,
    };

    setUklada(true);
    try {
      if (jeNova) {
        const nova = await galerieApi.vytvor(udaje);
        uspech('Galéria bola vytvorená — teraz do nej nahrajte fotky');
        setPovodny(JSON.stringify(formular));
        navigate(`/admin/galerie/${nova.id}`, { replace: true });
      } else {
        await galerieApi.uprav(idCislo!, udaje);
        uspech('Zmeny boli uložené');
        setPovodny(JSON.stringify(formular));
      }
    } catch (e: any) {
      hlasChybu(e?.message || 'Galériu sa nepodarilo uložiť');
    } finally {
      setUklada(false);
    }
  };

  const zmaz = async () => {
    if (idCislo === null) return;
    setMaze(true);
    try {
      await galerieApi.zmaz(idCislo);
      uspech('Galéria bola zmazaná');
      navigate('/admin/galerie');
    } catch (e: any) {
      hlasChybu(e?.message || 'Galériu sa nepodarilo zmazať');
      setMaze(false);
    }
  };

  // ===== Fotky =====

  /** Nahrá súbory po menších dávkach, aby bolo vidieť priebeh. */
  const nahraj = async (subory: File[]) => {
    if (idCislo === null) return;
    const obrazkove = subory.filter((s) => s.type.startsWith('image/'));
    if (obrazkove.length === 0) {
      varovanie('Vyberte obrázky (JPG, PNG, WEBP…)');
      return;
    }
    if (obrazkove.length < subory.length) {
      varovanie('Niektoré súbory nie sú obrázky, preskočili sme ich');
    }

    const DAVKA = 5;
    let hotovo = 0;
    let chyb = 0;
    setNahrava({ hotovo: 0, spolu: obrazkove.length });
    try {
      for (let i = 0; i < obrazkove.length; i += DAVKA) {
        const davka = obrazkove.slice(i, i + DAVKA);
        try {
          const vysledok: any = await galerieApi.nahraj(idCislo, davka);
          chyb += Array.isArray(vysledok?.errors) ? vysledok.errors.length : 0;
        } catch (e: any) {
          chyb += davka.length;
          hlasChybu(e?.message || 'Časť fotiek sa nepodarilo nahrať');
        }
        hotovo += davka.length;
        setNahrava({ hotovo, spolu: obrazkove.length });
      }
      const uspesnych = obrazkove.length - chyb;
      if (uspesnych > 0) uspech(`Nahraných fotiek: ${uspesnych}`);
      if (chyb > 0) varovanie(`${chyb} fotiek sa nepodarilo nahrať`);
    } finally {
      setNahrava(null);
      if (vyberSuborov.current) vyberSuborov.current.value = '';
      await nacitajObrazky();
      galeria.obnov();
    }
  };

  const pridajZKniznice = async (subory: MediaSubor[]) => {
    if (idCislo === null) return;
    try {
      await galerieApi.pridajZKniznice(idCislo, subory.map((s) => s.id));
      uspech(subory.length === 1 ? 'Fotka bola pridaná' : `Pridaných fotiek: ${subory.length}`);
      setKniznicaOtvorena(false);
      await nacitajObrazky();
      galeria.obnov();
    } catch (e: any) {
      hlasChybu(e?.message || 'Fotky sa nepodarilo pridať');
    }
  };

  const ulozPopis = async (o: GaleriaObrazok, popis: string) => {
    const novy = popis.trim() || null;
    if (novy === (o.popis ?? null)) return;
    try {
      await galerieApi.upravObrazok(o.galeria_id, o.id, { popis: novy });
      setObrazky((zoznam) => zoznam.map((x) => (x.id === o.id ? { ...x, popis: novy } : x)));
    } catch (e: any) {
      hlasChybu(e?.message || 'Popis sa nepodarilo uložiť');
    }
  };

  const nastavTitulnu = async (o: GaleriaObrazok) => {
    try {
      await galerieApi.nastavTitulny(o.galeria_id, o.id);
      setObrazky((zoznam) => zoznam.map((x) => ({ ...x, je_nahladovy: x.id === o.id })));
      setTitulna(o.nahladovy_stredny || o.cesta_suboru);
      uspech('Titulná fotka bola nastavená');
    } catch (e: any) {
      hlasChybu(e?.message || 'Titulnú fotku sa nepodarilo nastaviť');
    }
  };

  const zmazFotku = async () => {
    if (!naZmazanieFotku) return;
    try {
      await galerieApi.zmazObrazok(naZmazanieFotku.galeria_id, naZmazanieFotku.id);
      uspech('Fotka bola odstránená z galérie');
      setNaZmazanieFotku(null);
      await nacitajObrazky();
      galeria.obnov();
    } catch (e: any) {
      hlasChybu(e?.message || 'Fotku sa nepodarilo odstrániť');
    }
  };

  // ===== Vykreslenie =====

  if (!jeNova && galeria.chyba) {
    return (
      <div className="cw-screen">
        <ErrorState sprava="Galériu sa nepodarilo načítať" detail={galeria.chyba} onSkusZnova={galeria.obnov} />
      </div>
    );
  }

  if (!jeNova && galeria.nacitava && !galeria.data) {
    return (
      <div className="cw-screen">
        <Skeleton vyska="60px" />
        <div style={{ height: 16 }} />
        <Skeleton vyska="320px" />
      </div>
    );
  }

  return (
    <div className="cw-screen cw-ged">
      {/* Lišta */}
      <div className="cw-ged__lista">
        <Button variant="secondary" velkost="sm" onClick={() => navigate('/admin/galerie')}>
          ← Späť
        </Button>

        <div className="cw-ged__stav">
          {zmenene ? 'Neuložené zmeny' : jeNova ? 'Nová galéria' : 'Uložené'}
        </div>

        {!jeNova && formular.zobrazit_na_webe && (
          <Button
            variant="ghost"
            velkost="sm"
            ikona={<Icon nazov="oko" velkost={15} />}
            onClick={() => window.open(`/galleries/${idCislo}`, '_blank', 'noopener')}
          >
            Zobraziť na webe
          </Button>
        )}

        {!jeNova && (
          <Button
            variant="ghost"
            velkost="sm"
            onClick={() => setZmazatOtvorene(true)}
            aria-label="Zmazať galériu"
          >
            <Icon nazov="zmazat" velkost={15} />
          </Button>
        )}

        <Button onClick={uloz} nacitava={uklada}>
          {jeNova ? 'Vytvoriť galériu' : 'Uložiť'}
        </Button>
      </div>

      <div className="cw-ged__rozlozenie">
        {/* Ľavý stĺpec */}
        <div className="cw-ged__hlavny">
          <div className="cw-ged__panel">
            <Input
              menovka="Názov galérie"
              value={formular.nazov}
              onChange={(e) => zmen('nazov', e.target.value)}
              placeholder="Napríklad: Derby s Račou"
              povinne
            />
            <Textarea
              menovka="Popis"
              value={formular.popis}
              onChange={(e) => zmen('popis', e.target.value)}
              placeholder="Krátky popis galérie…"
              rows={3}
            />
          </div>

          <div className="cw-ged__panel">
            <div className="cw-ged__panel-hlava">
              <h2 className="cw-ged__nadpis">
                Fotky {obrazky.length > 0 && <span className="cw-ged__pocet">{obrazky.length}</span>}
              </h2>

              {!jeNova && (
                <div className="cw-ged__akcie-fotiek">
                  <Button
                    variant="secondary"
                    velkost="sm"
                    onClick={() => setKniznicaOtvorena(true)}
                    disabled={Boolean(nahrava)}
                  >
                    Z knižnice
                  </Button>
                  <Button
                    velkost="sm"
                    ikona={<Icon nazov="plus" velkost={14} />}
                    onClick={() => vyberSuborov.current?.click()}
                    disabled={Boolean(nahrava)}
                  >
                    Nahrať fotky
                  </Button>
                </div>
              )}
            </div>

            <input
              ref={vyberSuborov}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(e) => void nahraj(Array.from(e.target.files ?? []))}
            />

            {jeNova ? (
              <p className="cw-ged__napoveda">
                Najprv galériu vytvorte — potom do nej nahráte fotky alebo ich vyberiete z knižnice.
              </p>
            ) : (
              <>
                {nahrava && (
                  <div className="cw-ged__priebeh" role="status">
                    Nahrávam {nahrava.hotovo} / {nahrava.spolu}…
                    <div className="cw-ged__priebeh-pas">
                      <span style={{ width: `${(nahrava.hotovo / nahrava.spolu) * 100}%` }} />
                    </div>
                  </div>
                )}

                {/* Ťahanie súborov priamo do galérie */}
                <div
                  className={`cw-ged__zona${tahanie ? ' is-aktivna' : ''}`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setTahanie(true);
                  }}
                  onDragLeave={() => setTahanie(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setTahanie(false);
                    void nahraj(Array.from(e.dataTransfer.files));
                  }}
                >
                  {obrazky.length === 0 ? (
                    <div className="cw-ged__prazdne">
                      <Icon nazov="galerie" velkost={34} />
                      <p>Pretiahnite sem fotky alebo použite tlačidlo „Nahrať fotky".</p>
                      <p className="cw-ged__napoveda">
                        Uložia sa do /uploads/galerie/&lt;rok&gt;/&lt;galéria&gt;/ a objavia sa aj v Media knižnici.
                      </p>
                    </div>
                  ) : (
                    <div className="cw-ged__mriezka">
                      {obrazky.map((o) => (
                        <div key={o.id} className={`cw-ged__fotka${o.je_nahladovy ? ' is-titulna' : ''}`}>
                          <div className="cw-ged__fotka-obraz">
                            <img
                              src={souborUrl(o.nahladovy_stredny || o.cesta_suboru)}
                              alt={o.popis || ''}
                              loading="lazy"
                            />
                            {o.je_nahladovy && <span className="cw-ged__titulna-stitok">Titulná</span>}
                            <div className="cw-ged__fotka-akcie">
                              {!o.je_nahladovy && (
                                <button
                                  type="button"
                                  onClick={() => void nastavTitulnu(o)}
                                  title="Nastaviť ako titulnú"
                                  aria-label="Nastaviť ako titulnú fotku"
                                >
                                  ★
                                </button>
                              )}
                              <button
                                type="button"
                                className="is-danger"
                                onClick={() => setNaZmazanieFotku(o)}
                                title="Odstrániť z galérie"
                                aria-label="Odstrániť fotku z galérie"
                              >
                                <Icon nazov="zmazat" velkost={14} />
                              </button>
                            </div>
                          </div>
                          <input
                            className="cw-ged__popis-fotky"
                            defaultValue={o.popis ?? ''}
                            placeholder="Popis fotky…"
                            maxLength={500}
                            aria-label="Popis fotky"
                            onBlur={(e) => void ulozPopis(o, e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Pravý stĺpec */}
        <aside className="cw-ged__bok">
          <div className="cw-ged__panel">
            <Switch
              zapnute={formular.zobrazit_na_webe}
              onZmena={(v) => zmen('zobrazit_na_webe', v)}
              menovka="Zobraziť na webe"
              popis={
                formular.zobrazit_na_webe
                  ? 'Galériu vidia návštevníci webu'
                  : 'Skrytá — v administrácii zostáva, na webe nie je'
              }
            />
          </div>

          <div className="cw-ged__panel">
            <label className="cw-field__label" htmlFor="ged-typ">
              Priradiť k
            </label>
            <select
              id="ged-typ"
              className="cw-select"
              value={formular.typ}
              onChange={(e) =>
                setFormular((f) => ({ ...f, typ: e.target.value as TypPriradenia, objekt_id: null }))
              }
            >
              <option value="">Bez priradenia (voľná galéria)</option>
              <option value="zapas">Zápasu</option>
              <option value="tim">Tímu</option>
              <option value="clanok">Článku</option>
            </select>

            {formular.typ && (
              <select
                id="ged-objekt"
                className="cw-select"
                style={{ marginTop: 10 }}
                value={formular.objekt_id ?? ''}
                onChange={(e) => zmen('objekt_id', e.target.value ? Number(e.target.value) : null)}
                aria-label="Vyberte záznam"
              >
                <option value="">
                  {formular.typ === 'zapas' ? 'Vyberte zápas' : formular.typ === 'tim' ? 'Vyberte tím' : 'Vyberte článok'}
                </option>
                {moznostiPriradenia.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.popis}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="cw-ged__panel">
            <span className="cw-field__label">Titulný obrázok</span>
            <div className="cw-ged__titulna">
              {titulna ? (
                <img src={souborUrl(titulna)} alt="Titulný obrázok galérie" />
              ) : (
                <div className="cw-ged__titulna-prazdna">
                  <Icon nazov="galerie" velkost={24} />
                </div>
              )}
            </div>
            <p className="cw-ged__napoveda">
              Prvá nahratá fotka sa stane titulnou automaticky. Inú zvolíte hviezdičkou ★ na fotke.
            </p>
            {!jeNova && galeria.data && (
              <p className="cw-ged__napoveda">
                Vytvorená {formatujDatumCas(galeria.data.vytvoreny)}
                {!formular.zobrazit_na_webe && (
                  <>
                    {' · '}
                    <Badge>Skrytá</Badge>
                  </>
                )}
              </p>
            )}
          </div>
        </aside>
      </div>

      <VyberZKniznice
        otvorene={kniznicaOtvorena}
        onZavri={() => setKniznicaOtvorena(false)}
        onVyber={pridajZKniznice}
        viac
        nadpis="Pridať fotky z knižnice"
      />

      <ConfirmDialog
        otvorene={zmazatOtvorene}
        nadpis="Zmazať galériu?"
        sprava={`Galéria „${formular.nazov}" bude zmazaná aj so všetkými fotkami. Súbory v Media knižnici zostanú.`}
        potvrdit="Zmazať"
        nebezpecne
        nacitava={maze}
        onPotvrd={zmaz}
        onZrus={() => setZmazatOtvorene(false)}
      />

      <ConfirmDialog
        otvorene={naZmazanieFotku !== null}
        nadpis="Odstrániť fotku?"
        sprava="Fotka sa odstráni z tejto galérie. Súbor v Media knižnici zostane."
        potvrdit="Odstrániť"
        nebezpecne
        onPotvrd={zmazFotku}
        onZrus={() => setNaZmazanieFotku(null)}
      />
    </div>
  );
};

export default GaleriaEditor;
