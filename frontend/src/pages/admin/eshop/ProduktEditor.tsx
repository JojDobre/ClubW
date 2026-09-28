// Umiestnenie: frontend/src/pages/admin/eshop/ProduktEditor.tsx
// Editor produktu: názov a popis, obrázky, cena a sklad, kategória
// a vlastnosti. Vlastnosť je buď výber z hodnôt (veľkosť, farba -
// každá hodnota môže mať príplatok a vlastný sklad), alebo text od
// zákazníka (meno a číslo na dres) s príplatkom a najväčšou dĺžkou.

import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Card, Editor, Icon, Input, Select, Switch, Textarea, Skeleton, ErrorState, ConfirmDialog, useToast } from '../../../ui';
import { useNacitanie } from '../../../app/useNacitanie';
import { eshopKategorieApi, eshopProduktyApi, type EshopProdukt, type HodnotaVlastnosti, type VlastnostProduktu } from '../../../api/eshop';
import { PoleObrazka } from '../../../components/admin/PoleObrazka';
import { tr } from '../../../i18n';
import { sumaZVstupu } from './spolocne';
import './Eshop.css';

/** Formulár drží čísla ako text, aby sa dalo písať aj „49,90". */
interface HodnotaFormulara {
  id: string;
  nazov: string;
  priplatok: string;
  sklad: string;
}
interface VlastnostFormulara {
  id: string;
  nazov: string;
  typ: 'vyber' | 'text';
  povinna: boolean;
  hodnoty: HodnotaFormulara[];
  priplatok: string;
  max_dlzka: string;
}
interface Formular {
  nazov: string;
  slug: string;
  kratky_popis: string;
  popis: string;
  cena: string;
  povodna_cena: string;
  sklad: string;
  kod: string;
  kategoria_id: string;
  obrazok: string | null;
  obrazky: string[];
  vlastnosti: VlastnostFormulara[];
  odporucany: boolean;
  aktivny: boolean;
  poradie: string;
}

const noveId = () => Math.random().toString(36).slice(2, 10);
const cisloText = (n: number | null | undefined) => (n === null || n === undefined ? '' : String(n).replace('.', ','));

const PRAZDNY: Formular = {
  nazov: '',
  slug: '',
  kratky_popis: '',
  popis: '',
  cena: '',
  povodna_cena: '',
  sklad: '',
  kod: '',
  kategoria_id: '',
  obrazok: null,
  obrazky: [],
  vlastnosti: [],
  odporucany: false,
  aktivny: true,
  poradie: '0',
};

const zProduktu = (p: EshopProdukt): Formular => ({
  nazov: p.nazov,
  slug: p.slug,
  kratky_popis: p.kratky_popis ?? '',
  popis: p.popis ?? '',
  cena: cisloText(p.cena),
  povodna_cena: cisloText(p.povodna_cena),
  sklad: p.sklad === null ? '' : String(p.sklad),
  kod: p.kod ?? '',
  kategoria_id: p.kategoria_id ? String(p.kategoria_id) : '',
  obrazok: p.obrazok,
  obrazky: p.obrazky ?? [],
  vlastnosti: p.vlastnosti.map((v) => ({
    id: v.id,
    nazov: v.nazov,
    typ: v.typ,
    povinna: v.povinna,
    hodnoty: v.hodnoty.map((h) => ({ id: h.id, nazov: h.nazov, priplatok: h.priplatok ? cisloText(h.priplatok) : '', sklad: h.sklad === null ? '' : String(h.sklad) })),
    priplatok: v.priplatok ? cisloText(v.priplatok) : '',
    max_dlzka: v.max_dlzka ? String(v.max_dlzka) : '',
  })),
  odporucany: p.odporucany,
  aktivny: p.aktivny,
  poradie: String(p.poradie ?? 0),
});

/** Rýchle predvoľby vlastností pre klubový tovar. */
const PREDVOLBY: Array<{ popis: string; vytvor: () => VlastnostFormulara }> = [
  {
    popis: tr('Veľkosti S - XXL'),
    vytvor: () => ({
      id: noveId(),
      nazov: tr('Veľkosť'),
      typ: 'vyber',
      povinna: true,
      hodnoty: ['S', 'M', 'L', 'XL', 'XXL'].map((v) => ({ id: noveId(), nazov: v, priplatok: '', sklad: '' })),
      priplatok: '',
      max_dlzka: '',
    }),
  },
  {
    popis: tr('Detské veľkosti'),
    vytvor: () => ({
      id: noveId(),
      nazov: tr('Veľkosť'),
      typ: 'vyber',
      povinna: true,
      hodnoty: ['116', '128', '140', '152', '164'].map((v) => ({ id: noveId(), nazov: v, priplatok: '', sklad: '' })),
      priplatok: '',
      max_dlzka: '',
    }),
  },
  {
    popis: tr('Meno a číslo na dres'),
    vytvor: () => ({ id: noveId(), nazov: tr('Meno a číslo na dres'), typ: 'text', povinna: false, hodnoty: [], priplatok: '10', max_dlzka: '20' }),
  },
];

export const ProduktEditor: React.FC = () => {
  const { id } = useParams();
  const jeNovy = !id || id === 'novy';
  const navigate = useNavigate();
  const { uspech, chyba: hlasChybu, varovanie } = useToast();
  const [f, setF] = useState<Formular>(PRAZDNY);
  const [uklada, setUklada] = useState(false);
  const [mazanie, setMazanie] = useState(false);
  const [zmenene, setZmenene] = useState(false);

  const produkt = useNacitanie((signal) => (jeNovy ? Promise.resolve(null) : eshopProduktyApi.detail(Number(id), signal)), [id]);
  const kategorie = useNacitanie((signal) => eshopKategorieApi.vypis(signal));

  useEffect(() => {
    if (produkt.data) {
      setF(zProduktu(produkt.data));
      setZmenene(false);
    }
  }, [produkt.data]);

  const zmen = (zmeny: Partial<Formular>) => {
    setF((s) => ({ ...s, ...zmeny }));
    setZmenene(true);
  };
  const zmenVlastnost = (index: number, zmeny: Partial<VlastnostFormulara>) =>
    zmen({ vlastnosti: f.vlastnosti.map((v, i) => (i === index ? { ...v, ...zmeny } : v)) });
  const zmenHodnotu = (vi: number, hi: number, zmeny: Partial<HodnotaFormulara>) =>
    zmenVlastnost(vi, { hodnoty: f.vlastnosti[vi].hodnoty.map((h, i) => (i === hi ? { ...h, ...zmeny } : h)) });

  /** Formulár → údaje pre server; null pri chybe (hlási sa varovaním). */
  const naUlozenie = (): Partial<EshopProdukt> | null => {
    if (f.nazov.trim().length < 2) return varovanie(tr('Názov produktu musí mať aspoň 2 znaky')), null;
    const cena = sumaZVstupu(f.cena);
    if (cena === null || Number.isNaN(cena) || cena < 0) return varovanie(tr('Zadajte platnú cenu')), null;
    const povodna = sumaZVstupu(f.povodna_cena);
    if (Number.isNaN(povodna as number)) return varovanie(tr('Pôvodná cena nie je platná suma')), null;
    if (povodna !== null && povodna <= cena) return varovanie(tr('Pôvodná cena musí byť vyššia ako cena (inak ju nechajte prázdnu)')), null;
    const sklad = f.sklad.trim() === '' ? null : Number(f.sklad);
    if (sklad !== null && (!Number.isInteger(sklad) || sklad < 0)) return varovanie(tr('Sklad musí byť celé číslo, alebo prázdne pre neobmedzený počet')), null;

    const vlastnosti: VlastnostProduktu[] = [];
    for (const v of f.vlastnosti) {
      if (!v.nazov.trim()) return varovanie(tr('Každá vlastnosť musí mať názov')), null;
      const priplatok = sumaZVstupu(v.priplatok) ?? 0;
      if (Number.isNaN(priplatok)) return varovanie(tr('Príplatok pri „{nazov}" nie je platná suma', { nazov: v.nazov })), null;
      const hodnoty: HodnotaVlastnosti[] = [];
      if (v.typ === 'vyber') {
        const zadane = v.hodnoty.filter((h) => h.nazov.trim());
        if (zadane.length === 0) return varovanie(tr('Vlastnosť „{nazov}" potrebuje aspoň jednu hodnotu', { nazov: v.nazov })), null;
        for (const h of zadane) {
          const p = sumaZVstupu(h.priplatok) ?? 0;
          const s = h.sklad.trim() === '' ? null : Number(h.sklad);
          if (Number.isNaN(p)) return varovanie(tr('Príplatok pri „{nazov}" nie je platná suma', { nazov: h.nazov })), null;
          if (s !== null && (!Number.isInteger(s) || s < 0)) return varovanie(tr('Sklad pri „{nazov}" musí byť celé číslo', { nazov: h.nazov })), null;
          hodnoty.push({ id: h.id, nazov: h.nazov.trim(), priplatok: p, sklad: s });
        }
      }
      vlastnosti.push({
        id: v.id,
        nazov: v.nazov.trim(),
        typ: v.typ,
        povinna: v.typ === 'vyber' ? true : v.povinna,
        hodnoty,
        priplatok: v.typ === 'text' ? priplatok : 0,
        max_dlzka: v.typ === 'text' && v.max_dlzka.trim() ? Number(v.max_dlzka) : null,
      });
    }

    return {
      nazov: f.nazov.trim(),
      ...(f.slug.trim() ? { slug: f.slug.trim() } : {}),
      kratky_popis: f.kratky_popis.trim() || null,
      popis: f.popis.trim() && f.popis !== '<br>' ? f.popis : null,
      cena,
      povodna_cena: povodna,
      sklad,
      kod: f.kod.trim() || null,
      kategoria_id: f.kategoria_id ? Number(f.kategoria_id) : null,
      obrazok: f.obrazok || null,
      obrazky: f.obrazky.filter(Boolean),
      vlastnosti,
      odporucany: f.odporucany,
      aktivny: f.aktivny,
      poradie: Number(f.poradie) || 0,
    };
  };

  const uloz = async () => {
    const udaje = naUlozenie();
    if (!udaje) return;
    setUklada(true);
    try {
      if (jeNovy) {
        const novy = await eshopProduktyApi.vytvor(udaje);
        uspech(tr('Produkt bol vytvorený'));
        setZmenene(false);
        navigate(`/admin/eshop/produkty/${novy.id}`, { replace: true });
      } else {
        const ulozeny = await eshopProduktyApi.uprav(Number(id), udaje);
        produkt.nastavData(ulozeny);
        uspech(tr('Produkt bol uložený'));
      }
    } catch (e: any) {
      hlasChybu(e?.message || tr('Produkt sa nepodarilo uložiť'));
    } finally {
      setUklada(false);
    }
  };

  const zmaz = async () => {
    try {
      await eshopProduktyApi.zmaz(Number(id));
      uspech(tr('Produkt bol zmazaný'));
      navigate('/admin/eshop/produkty');
    } catch (e: any) {
      hlasChybu(e?.message || tr('Produkt sa nepodarilo zmazať'));
    }
  };

  if (produkt.chyba) {
    return (
      <div className="cw-screen">
        <ErrorState sprava={tr('Produkt sa nepodarilo načítať')} detail={produkt.chyba} onSkusZnova={produkt.obnov} />
      </div>
    );
  }
  if (!jeNovy && !produkt.data) {
    return (
      <div className="cw-screen">
        <Skeleton vyska="420px" />
      </div>
    );
  }

  const skladPoHodnotach = f.vlastnosti.some((v) => v.typ === 'vyber' && v.hodnoty.some((h) => h.sklad.trim() !== ''));

  return (
    <div className="cw-screen cw-es">
      <div className="cw-es__lista">
        <button
          type="button"
          className="cw-es__spat"
          onClick={() => (!zmenene || window.confirm(tr('Máte neuložené zmeny. Naozaj odísť?'))) && navigate('/admin/eshop/produkty')}
        >
          <Icon nazov="presunut" velkost={14} /> {tr('Produkty')}
        </button>
        <h1 className="cw-es__nadpis">{jeNovy ? tr('Nový produkt') : f.nazov || tr('Produkt')}</h1>
        <span className="cw-es__medzera" />
        {!jeNovy && produkt.data?.aktivny && (
          <a className="cw-es__odkaz" href={`/obchod/${produkt.data.slug}`} target="_blank" rel="noopener noreferrer">
            <Icon nazov="oko" velkost={15} /> {tr('Zobraziť na webe')}
          </a>
        )}
        <Button onClick={uloz} nacitava={uklada} ikona={<Icon nazov="ulozit" velkost={16} />}>
          {jeNovy ? tr('Vytvoriť produkt') : tr('Uložiť')}
        </Button>
      </div>

      <div className="cw-es__detail">
        <div className="cw-es__hlavne">
          <Card nadpis={tr('Produkt')}>
            <Input menovka={tr('Názov')} value={f.nazov} onChange={(e) => zmen({ nazov: e.target.value })} placeholder={tr('Napríklad: Domáci dres 2026/27')} povinne />
            <Textarea
              menovka={tr('Krátky popis')}
              value={f.kratky_popis}
              onChange={(e) => zmen({ kratky_popis: e.target.value })}
              rows={2}
              maxLength={300}
              napoveda={tr('Zobrazí sa pod cenou na stránke produktu')}
            />
            <label className="cw-es__menovka">{tr('Popis')}</label>
            <Editor hodnota={f.popis} onZmena={(html) => zmen({ popis: html })} minVyska={180} placeholder={tr('Materiál, strih, pranie…')} />
          </Card>

          <Card nadpis={tr('Obrázky')}>
            <PoleObrazka menovka={tr('Hlavný obrázok')} hodnota={f.obrazok} onZmena={(cesta) => zmen({ obrazok: cesta })} tvar="stvorec" />
            {f.obrazky.map((o, i) => (
              <div key={i} className="cw-es__dalsi-obrazok">
                <PoleObrazka
                  menovka={tr('Ďalší obrázok {cislo}', { cislo: i + 1 })}
                  hodnota={o}
                  onZmena={(cesta) => zmen({ obrazky: f.obrazky.map((x, j) => (j === i ? cesta ?? '' : x)) })}
                  tvar="stvorec"
                />
                <Button variant="ghost" velkost="sm" onClick={() => zmen({ obrazky: f.obrazky.filter((_, j) => j !== i) })} aria-label={tr('Odstrániť obrázok')}>
                  <Icon nazov="zmazat" velkost={14} />
                </Button>
              </div>
            ))}
            {f.obrazky.length < 12 && (
              <Button variant="secondary" velkost="sm" onClick={() => zmen({ obrazky: [...f.obrazky, ''] })} ikona={<Icon nazov="plus" velkost={14} />}>
                {tr('Pridať ďalší obrázok')}
              </Button>
            )}
          </Card>

          <Card
            nadpis={tr('Vlastnosti')}
            podnadpis={tr('Veľkosti, farby alebo meno na dres. Zákazník ich vyberie pred pridaním do košíka.')}
          >
            {f.vlastnosti.length === 0 && <p className="cw-es__tlmene">{tr('Produkt nemá vlastnosti - predáva sa v jednom prevedení.')}</p>}
            {f.vlastnosti.map((v, vi) => (
              <div key={v.id} className="cw-es__vlastnost">
                <div className="cw-es__vlastnost-hlava">
                  <Input menovka={tr('Názov vlastnosti')} value={v.nazov} onChange={(e) => zmenVlastnost(vi, { nazov: e.target.value })} />
                  <Select
                    menovka={tr('Typ')}
                    value={v.typ}
                    onChange={(e) =>
                      zmenVlastnost(vi, {
                        typ: e.target.value as 'vyber' | 'text',
                        hodnoty: e.target.value === 'vyber' && v.hodnoty.length === 0 ? [{ id: noveId(), nazov: '', priplatok: '', sklad: '' }] : v.hodnoty,
                      })
                    }
                    moznosti={[
                      { hodnota: 'vyber', popis: tr('Výber z hodnôt') },
                      { hodnota: 'text', popis: tr('Text od zákazníka') },
                    ]}
                  />
                  <Button
                    variant="ghost"
                    velkost="sm"
                    onClick={() => zmen({ vlastnosti: f.vlastnosti.filter((_, i) => i !== vi) })}
                    aria-label={tr('Odstrániť vlastnosť {nazov}', { nazov: v.nazov })}
                  >
                    <Icon nazov="zmazat" velkost={15} />
                  </Button>
                </div>

                {v.typ === 'vyber' ? (
                  <div className="cw-es__hodnoty">
                    <div className="cw-es__hodnota cw-es__hodnota--hlava">
                      <span>{tr('Hodnota')}</span>
                      <span>{tr('Príplatok')}</span>
                      <span>{tr('Sklad')}</span>
                      <span />
                    </div>
                    {v.hodnoty.map((h, hi) => (
                      <div key={h.id} className="cw-es__hodnota">
                        <input className="cw-input" value={h.nazov} onChange={(e) => zmenHodnotu(vi, hi, { nazov: e.target.value })} placeholder={tr('napr. XL')} aria-label={tr('Hodnota')} />
                        <input className="cw-input" value={h.priplatok} onChange={(e) => zmenHodnotu(vi, hi, { priplatok: e.target.value })} placeholder="0" inputMode="decimal" aria-label={tr('Príplatok')} />
                        <input className="cw-input" value={h.sklad} onChange={(e) => zmenHodnotu(vi, hi, { sklad: e.target.value })} placeholder="∞" inputMode="numeric" aria-label={tr('Sklad')} />
                        <Button
                          variant="ghost"
                          velkost="sm"
                          onClick={() => zmenVlastnost(vi, { hodnoty: v.hodnoty.filter((_, i) => i !== hi) })}
                          aria-label={tr('Odstrániť hodnotu {nazov}', { nazov: h.nazov })}
                        >
                          <Icon nazov="zavriet" velkost={14} />
                        </Button>
                      </div>
                    ))}
                    <Button
                      variant="secondary"
                      velkost="sm"
                      onClick={() => zmenVlastnost(vi, { hodnoty: [...v.hodnoty, { id: noveId(), nazov: '', priplatok: '', sklad: '' }] })}
                      ikona={<Icon nazov="plus" velkost={14} />}
                    >
                      {tr('Pridať hodnotu')}
                    </Button>
                    <p className="cw-es__tlmene cw-es__male">{tr('Prázdny sklad = neobmedzene. Príplatok sa pripočíta k cene produktu.')}</p>
                  </div>
                ) : (
                  <div className="cw-es__text-vlastnost">
                    <Input menovka={tr('Príplatok za vyplnenie')} value={v.priplatok} onChange={(e) => zmenVlastnost(vi, { priplatok: e.target.value })} inputMode="decimal" placeholder="0" />
                    <Input menovka={tr('Najviac znakov')} value={v.max_dlzka} onChange={(e) => zmenVlastnost(vi, { max_dlzka: e.target.value })} inputMode="numeric" placeholder="40" />
                    <Switch zapnute={v.povinna} onZmena={(h) => zmenVlastnost(vi, { povinna: h })} menovka={tr('Povinné')} popis={tr('Zákazník musí text vyplniť')} />
                  </div>
                )}
              </div>
            ))}
            <div className="cw-es__predvolby">
              <Button
                variant="secondary"
                velkost="sm"
                ikona={<Icon nazov="plus" velkost={14} />}
                onClick={() =>
                  zmen({
                    vlastnosti: [
                      ...f.vlastnosti,
                      { id: noveId(), nazov: '', typ: 'vyber', povinna: true, hodnoty: [{ id: noveId(), nazov: '', priplatok: '', sklad: '' }], priplatok: '', max_dlzka: '' },
                    ],
                  })
                }
              >
                {tr('Pridať vlastnosť')}
              </Button>
              {PREDVOLBY.map((p) => (
                <Button key={p.popis} variant="ghost" velkost="sm" onClick={() => zmen({ vlastnosti: [...f.vlastnosti, p.vytvor()] })}>
                  + {p.popis}
                </Button>
              ))}
            </div>
          </Card>
        </div>

        <div className="cw-es__bok">
          <Card nadpis={tr('Cena a sklad')}>
            <Input menovka={tr('Cena (s DPH)')} value={f.cena} onChange={(e) => zmen({ cena: e.target.value })} inputMode="decimal" placeholder="49,90" povinne />
            <Input
              menovka={tr('Pôvodná cena')}
              value={f.povodna_cena}
              onChange={(e) => zmen({ povodna_cena: e.target.value })}
              inputMode="decimal"
              napoveda={tr('Pri zľave - na webe bude prečiarknutá')}
            />
            <Input
              menovka={tr('Sklad')}
              value={f.sklad}
              onChange={(e) => zmen({ sklad: e.target.value })}
              inputMode="numeric"
              placeholder="∞"
              napoveda={skladPoHodnotach ? tr('Hodnoty vlastností majú vlastný sklad - tu môžete nechať prázdne') : tr('Prázdne = neobmedzene. Po objednávke sa počet zníži.')}
            />
            <Input menovka={tr('Kód produktu')} value={f.kod} onChange={(e) => zmen({ kod: e.target.value })} placeholder="DRES-26-D" />
          </Card>

          <Card nadpis={tr('Zaradenie')}>
            <Select
              menovka={tr('Kategória')}
              value={f.kategoria_id}
              onChange={(e) => zmen({ kategoria_id: e.target.value })}
              prazdna={tr('Bez kategórie')}
              moznosti={(kategorie.data ?? []).map((k) => ({ hodnota: String(k.id), popis: k.nazov }))}
              napoveda={tr('Kategórie spravujete v zozname produktov')}
            />
            <Input menovka={tr('Adresa na webe')} value={f.slug} onChange={(e) => zmen({ slug: e.target.value })} placeholder={tr('vytvorí sa z názvu')} napoveda="/obchod/…" />
            <Input menovka={tr('Poradie')} type="number" min={0} value={f.poradie} onChange={(e) => zmen({ poradie: e.target.value })} napoveda={tr('Nižšie číslo = skôr v zozname')} />
            <Switch zapnute={f.aktivny} onZmena={(h) => zmen({ aktivny: h })} menovka={tr('Predáva sa')} popis={tr('Vypnutý produkt sa na webe nezobrazí')} />
            <Switch zapnute={f.odporucany} onZmena={(h) => zmen({ odporucany: h })} menovka={tr('Na úvodnej stránke')} popis={tr('Zobrazí sa vo fanshope na úvode')} />
          </Card>

          {!jeNovy && (
            <Button variant="danger" onClick={() => setMazanie(true)} ikona={<Icon nazov="zmazat" velkost={15} />}>
              {tr('Zmazať produkt')}
            </Button>
          )}
        </div>
      </div>

      <ConfirmDialog
        otvorene={mazanie}
        nadpis={tr('Zmazať produkt?')}
        sprava={tr('{nazov} zmizne z obchodu. Staré objednávky si ponechajú názov a cenu.', { nazov: f.nazov })}
        potvrdit={tr('Zmazať')}
        nebezpecne
        onPotvrd={zmaz}
        onZrus={() => setMazanie(false)}
      />
    </div>
  );
};

export default ProduktEditor;
