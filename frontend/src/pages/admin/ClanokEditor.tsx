// Umiestnenie: frontend/src/pages/admin/ClanokEditor.tsx
// Vytvorenie a úprava článku.
//
// Rozloženie podľa návrhu:
//   - Lišta: Späť · stav uloženia · Náhľad · Uložiť koncept · Publikovať
//   - Vľavo: názov ako veľký vstup bez rámu, editovateľná adresa,
//            editor s panelom formátovania
//   - Vpravo (330 px): kategória a štítky, hlavný obrázok, SEO náhľad

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Editor, Input, Textarea, Switch, Icon, Skeleton, ErrorState,
  ConfirmDialog, useToast,
} from '../../ui';
import { useNacitanie } from '../../app/useNacitanie';
import { clankyApi, kategorieApi } from '../../api/clanky';
import { ApiChyba } from '../../app/apiKlient';
import { naVstupDatumCas, zoVstupuDatumCas } from '../../utils/datum';
import { timyApi } from '../../api/sport';
import type { Clanok, Kategoria, StavClanku, ClanokNaUlozenie } from '../../api/typy';
import { tr, lokalita } from '../../i18n';
import './ClanokEditor.css';

const PRAZDNY: ClanokNaUlozenie & { slug?: string } = {
  nazov: '',
  obsah: '',
  excerpt: '',
  obrazok: '',
  kategoria_id: null,
  tim_id: null,
  status: 'draft',
  publikovany_datum: null,
  featured: false,
  // Komentáre sú pri novom článku zámerne vypnuté - zapnú sa vedome
  komentare_povolene: false,
  meta_title: '',
  meta_description: '',
  tags: [],
};

/** Prevedie názov na adresu (bez diakritiky, malými písmenami). */
const naAdresu = (text: string): string =>
  text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

export const ClanokEditor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { uspech, chyba: hlasChybu, varovanie } = useToast();

  const jeNovy = id === 'novy' || id === undefined;
  const idCislo = jeNovy ? null : Number(id);

  const [formular, setFormular] = useState<ClanokNaUlozenie & { slug?: string }>(PRAZDNY);
  const [novyStitok, setNovyStitok] = useState('');
  const [chybyPoli, setChybyPoli] = useState<string[]>([]);
  const [uklada, setUklada] = useState(false);
  const [zmazatOtvorene, setZmazatOtvorene] = useState(false);
  const [maze, setMaze] = useState(false);
  const [nahrava, setNahrava] = useState(false);
  const vyberSuboru = useRef<HTMLInputElement>(null);
  const [zmenene, setZmenene] = useState(false);
  const [poslednéUloženie, setPoslednéUloženie] = useState<Date | null>(null);

  // Adresu prestaneme odvodzovať z názvu, keď ju používateľ upraví ručne
  const adresaUpravena = useRef(false);
  const povodnyStav = useRef('');

  const kategorie = useNacitanie((signal) => kategorieApi.vypis(signal));
  const timy = useNacitanie((signal) => timyApi.vypis(signal));

  const clanok = useNacitanie(
    (signal) => (idCislo !== null ? clankyApi.detail(idCislo, signal) : Promise.resolve(null)),
    [idCislo]
  );

  const zoznamKategorii: Kategoria[] = useMemo(() => {
    const d = kategorie.data;
    if (!d) return [];
    return Array.isArray(d) ? d : (d as any).categories ?? [];
  }, [kategorie.data]);

  // Naplnenie po načítaní
  useEffect(() => {
    if (!clanok.data) return;

    const c = clanok.data;
    const naplnene = {
      nazov: c.nazov ?? '',
      slug: c.slug ?? '',
      obsah: c.obsah ?? '',
      excerpt: c.excerpt ?? '',
      obrazok: c.obrazok ?? '',
      kategoria_id: c.kategoria_id ?? c.kategoria?.id ?? null,
      tim_id: c.tim_id ?? null,
      status: c.status ?? 'draft',
      publikovany_datum: c.publikovany_datum ?? null,
      featured: Boolean(c.featured),
      komentare_povolene: Boolean(c.komentare_povolene),
      meta_title: c.meta_title ?? '',
      meta_description: c.meta_description ?? '',
      tags: Array.isArray(c.tags) ? c.tags : [],
    };

    setFormular(naplnene);
    povodnyStav.current = JSON.stringify(naplnene);
    adresaUpravena.current = true; // existujúci článok už adresu má
    setZmenene(false);
  }, [clanok.data]);

  useEffect(() => {
    if (jeNovy) povodnyStav.current = JSON.stringify(PRAZDNY);
  }, [jeNovy]);

  const zmen = <K extends keyof (ClanokNaUlozenie & { slug?: string })>(
    pole: K,
    hodnota: (ClanokNaUlozenie & { slug?: string })[K]
  ) => {
    setFormular((d) => {
      const novy = { ...d, [pole]: hodnota };
      setZmenene(JSON.stringify(novy) !== povodnyStav.current);
      return novy;
    });
  };

  /** Zmena názvu — adresu dopĺňame, kým ju používateľ neupravil ručne. */
  const zmenNazov = (nazov: string) => {
    setFormular((d) => {
      const novy = {
        ...d,
        nazov,
        slug: adresaUpravena.current ? d.slug : naAdresu(nazov),
      };
      setZmenene(JSON.stringify(novy) !== povodnyStav.current);
      return novy;
    });
  };

  const pridajStitok = () => {
    const s = novyStitok.trim().toLowerCase();
    if (!s) return;
    if ((formular.tags ?? []).includes(s)) {
      varovanie(tr('Tento štítok už článok má'));
      return;
    }
    zmen('tags', [...(formular.tags ?? []), s]);
    setNovyStitok('');
  };

  // Upozornenie pri zatvorení karty s neuloženými zmenami
  useEffect(() => {
    if (!zmenene) return;
    const naOdchod = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', naOdchod);
    return () => window.removeEventListener('beforeunload', naOdchod);
  }, [zmenene]);

  /**
   * Nahrá vybraný súbor a zapíše jeho cestu do poľa obrázka.
   *
   * Súbor ide cez Media knižnicu, takže skončí v /uploads/media/<rok>/<mesiac>/
   * a dá sa neskôr použiť aj pri inom článku.
   */
  const nahrajObrazok = async (subor?: File | null) => {
    if (!subor) return;

    setNahrava(true);
    try {
      const { cesta } = await clankyApi.nahrajObrazok(subor);
      if (!cesta) throw new Error(tr('Server nevrátil cestu k súboru'));
      zmen('obrazok', cesta);
      uspech(tr('Obrázok bol nahratý'));
    } catch (e) {
      hlasChybu(e instanceof Error ? e.message : tr('Obrázok sa nepodarilo nahrať'));
    } finally {
      setNahrava(false);
      // Aby sa dal ten istý súbor vybrať znova
      if (vyberSuboru.current) vyberSuboru.current.value = '';
    }
  };

  const uloz = async (novyStav?: StavClanku) => {
    setChybyPoli([]);

    if (!formular.nazov.trim()) {
      varovanie(tr('Zadajte názov článku'));
      return;
    }
    // Editor vracia HTML — pri kontrole dĺžky značky odstránime
    if (formular.obsah.replace(/<[^>]*>/g, '').trim().length < 10) {
      varovanie(tr('Obsah článku musí mať aspoň 10 znakov'));
      return;
    }
    if (!formular.kategoria_id) {
      varovanie(tr('Vyberte kategóriu'));
      return;
    }

    const stav = novyStav ?? formular.status;
    const naUlozenie: any = {
      ...formular,
      status: stav,
      slug: formular.slug || naAdresu(formular.nazov),
      publikovany_datum:
        stav === 'published' && !formular.publikovany_datum
          ? new Date().toISOString()
          : formular.publikovany_datum,
      excerpt: formular.excerpt?.trim() || null,
      obrazok: formular.obrazok?.trim() || null,
      meta_title: formular.meta_title?.trim() || null,
      meta_description: formular.meta_description?.trim() || null,
    };

    setUklada(true);
    try {
      if (jeNovy) {
        const novy = await clankyApi.vytvor(naUlozenie);
        uspech(tr('Článok bol vytvorený'));
        povodnyStav.current = JSON.stringify(naUlozenie);
        setZmenene(false);
        setPoslednéUloženie(new Date());
        navigate(`/admin/clanky/${novy.id}`, { replace: true });
      } else {
        await clankyApi.uprav(idCislo!, naUlozenie);
        uspech(
          stav === 'published' ? tr('Článok bol publikovaný')
            : stav === 'draft' ? tr('Uložené ako koncept')
              : tr('Zmeny boli uložené')
        );
        setFormular(naUlozenie);
        povodnyStav.current = JSON.stringify(naUlozenie);
        setZmenene(false);
        setPoslednéUloženie(new Date());
      }
    } catch (e: unknown) {
      if (e instanceof ApiChyba) {
        hlasChybu(e.message);
        if (e.chybyPoli) setChybyPoli(e.chybyPoli);
      } else {
        hlasChybu(tr('Článok sa nepodarilo uložiť'));
      }
    } finally {
      setUklada(false);
    }
  };

  const zmaz = async () => {
    setMaze(true);
    try {
      await clankyApi.zmaz(idCislo!);
      uspech(tr('Článok bol vymazaný'));
      navigate('/admin/clanky', { replace: true });
    } catch (e: any) {
      hlasChybu(e?.message || tr('Článok sa nepodarilo vymazať'));
      setMaze(false);
    }
  };

  const odid = () => {
    if (zmenene && !window.confirm(tr('Máte neuložené zmeny. Naozaj chcete odísť?'))) return;
    navigate('/admin/clanky');
  };

  if (clanok.chyba) {
    return <ErrorState sprava={tr('Článok sa nepodarilo načítať')} detail={clanok.chyba} onSkusZnova={clanok.obnov} />;
  }

  if (!jeNovy && clanok.nacitava) {
    return (
      <div className="cw-ced__panel">
        <Skeleton riadkov={8} vyska="18px" />
      </div>
    );
  }

  // Text stavu uloženia v lište
  const stavText = zmenene
    ? tr('Neuložené zmeny')
    : poslednéUloženie
      ? tr('Uložené {hodnota}', { hodnota: poslednéUloženie.toLocaleTimeString(lokalita(), { hour: '2-digit', minute: '2-digit' }) })
      : jeNovy
        ? tr('Nový článok')
        : tr('Bez zmien');

  return (
    <div className="cw-ced">
      {/* ===== Lišta akcií ===== */}
      <div className="cw-ced__bar">
        <button className="cw-ced__spat" onClick={odid}>
          <Icon nazov="sipkaVlavo" velkost={15} />
          {tr('Späť')}
        </button>

        <div className="cw-ced__medzera" />

        <div className={`cw-ced__stav ${zmenene ? 'is-zmenene' : ''}`}>
          <Icon nazov={zmenene ? 'hodiny' : 'ulozit'} velkost={14} />
          {stavText}
        </div>

        {!jeNovy && formular.slug && (
          <button
            className="cw-ced__btn"
            // Verejná adresa článku je /clanek/<slug> (nie /clanky/). Parameter
            // ?nahlad=<id> povie stránke, aby článok načítala cez
            // administrátorský endpoint - inak by koncept skončil na
            // „Článok nebol nájdený", lebo verejný výpis vracia len publikované.
            onClick={() =>
              window.open(`/clanek/${formular.slug}?nahlad=${idCislo}`, '_blank', 'noopener')
            }
          >
            <Icon nazov="oko" velkost={15} />
            {tr('Náhľad')}
          </button>
        )}

        {!jeNovy && (
          <button
            className="cw-ced__btn cw-ced__btn--nebezpecne"
            onClick={() => setZmazatOtvorene(true)}
          >
            <Icon nazov="zmazat" velkost={15} />
          </button>
        )}

        <button className="cw-ced__btn" onClick={() => uloz('draft')} disabled={uklada}>
          {tr('Uložiť koncept')}
        </button>

        <button
          className="cw-ced__btn cw-ced__btn--hlavne"
          onClick={() => uloz('published')}
          disabled={uklada}
        >
          {formular.status === 'published' ? tr('Uložiť zmeny') : tr('Publikovať')}
        </button>
      </div>

      {chybyPoli.length > 0 && (
        <div className="cw-ced__chyby" role="alert">
          <strong>{tr('Server odmietol uloženie:')}</strong>
          <ul>
            {chybyPoli.map((ch, i) => (
              <li key={i}>{ch}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="cw-ced__grid">
        {/* ===== Hlavný stĺpec ===== */}
        <div className="cw-ced__hlavne">
          {/* Názov a adresa */}
          <div className="cw-ced__panel">
            <input
              className="cw-ced__nazov"
              value={formular.nazov}
              onChange={(e) => zmenNazov(e.target.value)}
              placeholder={tr('Názov článku…')}
              aria-label={tr('Názov článku')}
            />

            <div className="cw-ced__url">
              <span>{tr('URL:')}</span>
              <span className="cw-ced__url-zaklad">{tr('/clanek/')}</span>
              <input
                className="cw-ced__url-vstup"
                value={formular.slug ?? ''}
                onChange={(e) => {
                  adresaUpravena.current = true;
                  zmen('slug', naAdresu(e.target.value));
                }}
                placeholder="adresa-clanku"
                aria-label={tr('Adresa článku')}
              />
            </div>
          </div>

          {/* Editor obsahu */}
          <Editor
            hodnota={formular.obsah}
            onZmena={(html) => zmen('obsah', html)}
            placeholder={tr('Text článku…')}
          />

          {/* Krátky úvod */}
          <div className="cw-ced__panel">
            <label className="cw-ced__label" htmlFor="ced-excerpt">
              {tr('Krátky úvod')}
            </label>
            <Textarea
              id="ced-excerpt"
              value={formular.excerpt ?? ''}
              onChange={(e) => zmen('excerpt', e.target.value)}
              placeholder={tr('Jedna až dve vety do výpisu článkov…')}
              rows={3}
              maxLength={500}
              napoveda={tr('{pocet} / 500 znakov', { pocet: (formular.excerpt ?? '').length })}
            />
          </div>
        </div>

        {/* ===== Bočný panel ===== */}
        <div className="cw-ced__bok">
          {/* Kategória a štítky */}
          <div className="cw-ced__panel cw-ced__panel--tesny">
            <label className="cw-ced__label" htmlFor="ced-kat">
              {tr('Kategória')}
            </label>
            <select
              id="ced-kat"
              className="cw-select"
              value={formular.kategoria_id ?? ''}
              onChange={(e) => zmen('kategoria_id', e.target.value ? Number(e.target.value) : null)}
              style={{ marginBottom: 13 }}
            >
              <option value="">{tr('Vyberte kategóriu')}</option>
              {zoznamKategorii.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.nazov}
                </option>
              ))}
            </select>

            <label className="cw-ced__label" htmlFor="ced-tim">
              {tr('Tím')}
            </label>
            <select
              id="ced-tim"
              className="cw-select"
              value={formular.tim_id ?? ''}
              onChange={(e) => zmen('tim_id', e.target.value ? Number(e.target.value) : null)}
              style={{ marginBottom: 13 }}
            >
              <option value="">{tr('Bez tímu')}</option>
              {(timy.data ?? []).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nazov}
                </option>
              ))}
            </select>

            <label className="cw-ced__label">{tr('Štítky')}</label>
            <div className="cw-ced__stitky">
              {(formular.tags ?? []).map((t) => (
                <span key={t} className="cw-ced__stitok">
                  {t}
                  <button
                    onClick={() => zmen('tags', (formular.tags ?? []).filter((x) => x !== t))}
                    aria-label={tr('Odobrať štítok {t}', { t })}
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>

            <Input
              value={novyStitok}
              onChange={(e) => setNovyStitok(e.target.value)}
              // Enter pridá štítok bez potreby tlačidla
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  pridajStitok();
                }
              }}
              placeholder={tr('Pridať štítok a stlačiť Enter')}
              aria-label={tr('Nový štítok')}
            />
          </div>

          {/* Hlavný obrázok */}
          <div className="cw-ced__panel cw-ced__panel--tesny">
            <label className="cw-ced__label">{tr('Hlavný obrázok')}</label>

            <div className="cw-ced__obrazok">
              {formular.obrazok ? (
                <img
                  src={formular.obrazok}
                  alt={tr('Náhľad hlavného obrázka')}
                  onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
                />
              ) : (
                <div className="cw-ced__obrazok-prazdny">
                  <Icon nazov="galerie" velkost={24} />
                  <span>{tr('Zatiaľ bez obrázka')}</span>
                </div>
              )}
            </div>

            <input
              ref={vyberSuboru}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => void nahrajObrazok(e.target.files?.[0])}
            />

            <div className="cw-ced__obrazok-akcie">
              <button
                type="button"
                className="cw-ced__btn"
                onClick={() => vyberSuboru.current?.click()}
                disabled={nahrava}
              >
                <Icon nazov="galerie" velkost={14} />
                {nahrava ? tr('Nahrávam…') : formular.obrazok ? tr('Zmeniť obrázok') : tr('Nahrať obrázok')}
              </button>

              {formular.obrazok && (
                <button
                  type="button"
                  className="cw-ced__btn cw-ced__btn--nebezpecne"
                  onClick={() => zmen('obrazok', '')}
                  disabled={nahrava}
                  aria-label={tr('Odobrať obrázok')}
                >
                  <Icon nazov="zmazat" velkost={14} />
                </button>
              )}
            </div>

            <Input
              value={formular.obrazok ?? ''}
              onChange={(e) => zmen('obrazok', e.target.value)}
              placeholder="/uploads/media/…"
              aria-label={tr('Adresa hlavného obrázka')}
              napoveda={tr('Nahraj súbor alebo vlož adresu už nahratého obrázka')}
            />
          </div>

          {/* Publikovanie */}
          <div className="cw-ced__panel cw-ced__panel--tesny">
            <label className="cw-ced__label">{tr('Publikovanie')}</label>

            <Input
              menovka={tr('Dátum a čas')}
              type="datetime-local"
              value={naVstupDatumCas(formular.publikovany_datum)}
              onChange={(e) =>
                zmen(
                  'publikovany_datum',
                  e.target.value ? zoVstupuDatumCas(e.target.value) : null
                )
              }
              napoveda={tr('Prázdne = pri publikovaní sa doplní aktuálny čas')}
            />

            <Switch
              zapnute={Boolean(formular.featured)}
              onZmena={(v) => zmen('featured', v)}
              menovka={tr('Odporúčaný článok')}
              popis={tr('Zobrazí sa zvýraznený na hlavnej stránke')}
            />

            <Switch
              zapnute={Boolean(formular.komentare_povolene)}
              onZmena={(v) => zmen('komentare_povolene', v)}
              menovka={tr('Povoliť komentáre')}
              popis={
                formular.komentare_povolene
                  ? tr('Návštevníci môžu pridávať komentáre pod článok')
                  : tr('Komentáre sú vypnuté — pod článkom sa nezobrazia')
              }
            />
          </div>

          {/* SEO náhľad */}
          <div className="cw-ced__panel cw-ced__panel--tesny">
            <label className="cw-ced__label">{tr('SEO náhľad')}</label>

            {/* Ukážka, ako článok uvidí návštevník vo výsledkoch vyhľadávania */}
            <div className="cw-ced__seo">
              <div className="cw-ced__seo-url">
                {tr('vasklub.sk › clanky ›')} {formular.slug || 'adresa-clanku'}
              </div>
              <div className="cw-ced__seo-nazov">
                {formular.meta_title || formular.nazov || tr('Názov článku')}
              </div>
              <div className="cw-ced__seo-popis">
                {formular.meta_description ||
                  formular.excerpt ||
                  tr('Popis sa zobrazí pod názvom vo výsledkoch vyhľadávania.')}
              </div>
            </div>

            <Input
              menovka={tr('Vlastný titulok')}
              value={formular.meta_title ?? ''}
              onChange={(e) => zmen('meta_title', e.target.value)}
              placeholder={formular.nazov || tr('Použije sa názov článku')}
              maxLength={70}
              napoveda={tr('{pocet} / 70 znakov', { pocet: (formular.meta_title ?? '').length })}
            />

            <Textarea
              menovka={tr('Vlastný popis')}
              value={formular.meta_description ?? ''}
              onChange={(e) => zmen('meta_description', e.target.value)}
              placeholder={formular.excerpt || tr('Použije sa krátky úvod')}
              rows={3}
              maxLength={160}
              napoveda={tr('{pocet} / 160 znakov', { pocet: (formular.meta_description ?? '').length })}
            />
          </div>
        </div>
      </div>

      <ConfirmDialog
        otvorene={zmazatOtvorene}
        nadpis={tr('Vymazať článok?')}
        sprava={tr('Článok „{nazov}" bude odstránený. Túto akciu nemožno vrátiť späť.', { nazov: formular.nazov })}
        potvrdit={tr('Vymazať')}
        nebezpecne
        nacitava={maze}
        onPotvrd={zmaz}
        onZrus={() => setZmazatOtvorene(false)}
      />
    </div>
  );
};

export default ClanokEditor;
