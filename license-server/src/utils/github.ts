// Umiestnenie: license-server/src/utils/github.ts
// Čítanie vydaní (releases) a tagov z GitHubu.
//
// Pre verejný repozitár token netreba. Pre súkromný nastavte GITHUB_TOKEN
// (fine-grained token s právom Contents: read) - bez neho by GitHub
// odpovedal, že repozitár neexistuje. Neprihlásené dotazy majú navyše
// limit 60 za hodinu, s tokenom 5000.

import { jeVerzia, normalizujVerziu } from './verzie';

export interface VerziaZGithubu {
  verzia: string;
  tag: string;
  nazov: string | null;
  poznamky: string | null;
  publikovana: string | null;
  predbezna: boolean;
  zdroj: 'release' | 'tag';
  commit_sha: string | null;
}

export const githubApi = () => (process.env.GITHUB_API_URL || 'https://api.github.com').replace(/\/+$/, '');

export const hlavickyGithubu = (): Record<string, string> => {
  const hlavicky: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'ClubW-License-Server',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (process.env.GITHUB_TOKEN) hlavicky.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  return hlavicky;
};

/** Overí tvar vlastnik/repozitar - hodnota ide do adresy dotazu. */
export const jePlatnyRepo = (repo: unknown): repo is string =>
  typeof repo === 'string' && /^[A-Za-z0-9_.-]{1,100}\/[A-Za-z0-9_.-]{1,100}$/.test(repo);

const nacitaj = async (cesta: string): Promise<any> => {
  const odpoved = await fetch(`${githubApi()}${cesta}`, { headers: hlavickyGithubu(), signal: AbortSignal.timeout(15000) });
  if (odpoved.status === 404) throw new Error('Repozitár sa na GitHube nenašiel (pri súkromnom repozitári nastavte GITHUB_TOKEN)');
  if (odpoved.status === 401) throw new Error('GitHub odmietol token (GITHUB_TOKEN je neplatný alebo vypršal)');
  if (odpoved.status === 403) throw new Error('GitHub dočasne obmedzil dotazy - skúste neskôr alebo nastavte GITHUB_TOKEN');
  if (!odpoved.ok) throw new Error(`GitHub odpovedal chybou ${odpoved.status}`);
  return odpoved.json();
};

/**
 * Verzie repozitára: vydania (s poznámkami) a k nim tagy, ktoré ešte
 * vydanie nemajú. Berú sa len tagy v tvare verzie (v1.2.0, 1.2.0).
 */
export const nacitajVerzie = async (repo: string): Promise<VerziaZGithubu[]> => {
  if (!jePlatnyRepo(repo)) throw new Error('Repozitár musí byť v tvare vlastnik/repozitar');
  const [vydania, tagy] = await Promise.all([
    nacitaj(`/repos/${repo}/releases?per_page=100`),
    nacitaj(`/repos/${repo}/tags?per_page=100`),
  ]);

  const podlaTagu = new Map<string, VerziaZGithubu>();
  for (const v of Array.isArray(vydania) ? vydania : []) {
    if (v.draft || typeof v.tag_name !== 'string' || !jeVerzia(v.tag_name)) continue;
    podlaTagu.set(v.tag_name, {
      verzia: normalizujVerziu(v.tag_name),
      tag: v.tag_name,
      nazov: v.name || null,
      poznamky: typeof v.body === 'string' ? v.body.slice(0, 20000) : null,
      publikovana: v.published_at || v.created_at || null,
      predbezna: Boolean(v.prerelease),
      zdroj: 'release',
      commit_sha: null,
    });
  }
  for (const t of Array.isArray(tagy) ? tagy : []) {
    if (typeof t.name !== 'string' || !jeVerzia(t.name)) continue;
    const existujuca = podlaTagu.get(t.name);
    if (existujuca) {
      existujuca.commit_sha = t.commit?.sha ?? null;
      continue;
    }
    podlaTagu.set(t.name, {
      verzia: normalizujVerziu(t.name),
      tag: t.name,
      nazov: null,
      poznamky: null,
      publikovana: null,
      predbezna: normalizujVerziu(t.name).includes('-'),
      zdroj: 'tag',
      commit_sha: t.commit?.sha ?? null,
    });
  }
  return [...podlaTagu.values()];
};
