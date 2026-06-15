/**
 * Curated role-variant generator.
 *
 * Occupational taxonomies (ESCO/CBO/O*NET) model the *occupation*, not the
 * *vínculo/seniority* — so "Estagiário de…", "…Júnior/Pleno/Sênior" and the
 * English equivalents are almost absent. This generator materializes those
 * variants as real `RoleTitle` rows (source = CURATED) from a small curated
 * base catalog, so the Add Experience autocomplete offers the full gamut.
 *
 * The catalog carries BOTH PT grammatical forms of each occupation because
 * seniority binds to a specific form:
 *   - "agent" (Desenvolvedor de Software) → suffix: "… Júnior/Pleno/Sênior"
 *   - "area"  (Desenvolvimento de Software) → prefix: "Estagiário de …"
 * Mixing them produces ungrammatical titles ("Estagiário de Desenvolvedor").
 *
 * Seniority semantics on the emitted rows:
 *   - base form (no modifier)       → seniority = null  (the occupation itself)
 *   - Júnior / Pleno / Sênior / Intern / Trainee … → the matching RoleSeniority
 * INTERN is the level the employment-type invariant pins to INTERNSHIP;
 * TRAINEE is CLT and does NOT pin (handled downstream, not here).
 *
 * isPreferred: the canonical masculine/base titles are preferred (true) so
 * they outrank synonyms; feminine variants are emitted as alt (false),
 * mirroring how the ESCO import treats gender-dual labels.
 */

import type { RoleSeniority } from '@prisma/client';

export interface RoleCatalogEntry {
  /** Stable key grouping every PT/EN variant of this occupation. */
  key: string;
  /** Coarse area bucket (documentation / future faceting only). */
  area: string;
  en: {
    /** Agentive role noun, e.g. "Software Developer". */
    role: string;
  };
  pt: {
    /** Masculine/canonical agent noun, e.g. "Desenvolvedor de Software". */
    agent: string;
    /** Feminine agent noun; omit when the noun is invariable (Analista…). */
    agentF?: string;
    /** Activity/area noun for "Estagiário de …" / "Trainee de …". */
    area: string;
  };
}

export interface GeneratedRoleVariant {
  label: string;
  lang: 'EN' | 'PT';
  seniority: RoleSeniority | null;
  baseRoleKey: string;
  isPreferred: boolean;
}

/** PT suffix label per suffixed seniority level (Estágio/Trainee are prefixes). */
const PT_SUFFIX: Record<'JUNIOR' | 'MID' | 'SENIOR', string> = {
  JUNIOR: 'Júnior',
  MID: 'Pleno',
  SENIOR: 'Sênior',
};

function variantsForEntry(entry: RoleCatalogEntry): GeneratedRoleVariant[] {
  const out: GeneratedRoleVariant[] = [];
  const key = entry.key;
  const push = (
    label: string,
    lang: 'EN' | 'PT',
    seniority: RoleSeniority | null,
    isPreferred: boolean,
  ): void => {
    out.push({ label, lang, seniority, baseRoleKey: key, isPreferred });
  };

  // Feminine emitted only when it actually differs (invariable nouns dedupe).
  const { agent, agentF, area } = entry.pt;
  const fem = agentF && agentF !== agent ? agentF : null;

  // ---- PT ----
  // Base occupation (no level).
  push(agent, 'PT', null, true);
  if (fem) push(fem, 'PT', null, false);

  // Estágio — prefix, binds to the AREA form.
  push(`Estagiário de ${area}`, 'PT', 'INTERN', true);
  push(`Estagiária de ${area}`, 'PT', 'INTERN', false);

  // Júnior / Pleno / Sênior — suffix, binds to the AGENT form.
  for (const level of ['JUNIOR', 'MID', 'SENIOR'] as const) {
    push(`${agent} ${PT_SUFFIX[level]}`, 'PT', level, true);
    if (fem) push(`${fem} ${PT_SUFFIX[level]}`, 'PT', level, false);
  }

  // Trainee — prefix, AREA form (CLT, but still a curated seniority title).
  push(`Trainee de ${area}`, 'PT', 'TRAINEE', true);

  // ---- EN ----
  const role = entry.en.role;
  push(role, 'EN', null, true); // base occupation
  push(`${role} Intern`, 'EN', 'INTERN', true);
  push(`Junior ${role}`, 'EN', 'JUNIOR', true);
  push(`Entry-level ${role}`, 'EN', 'JUNIOR', false);
  push(`Mid-level ${role}`, 'EN', 'MID', true);
  push(`Senior ${role}`, 'EN', 'SENIOR', true);
  push(`${role} Trainee`, 'EN', 'TRAINEE', true);

  return out;
}

/** Flattens the whole catalog into generated variants (pre-dedup). */
export function generateCuratedRoleVariants(
  catalog: readonly RoleCatalogEntry[],
): GeneratedRoleVariant[] {
  return catalog.flatMap(variantsForEntry);
}
