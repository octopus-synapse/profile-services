export type SharePayload = {
  id: string;
  slug: string;
  resumeId: string;
  isActive: boolean;
  hasPassword: boolean;
  expiresAt: string | null;
  createdAt: string;
  publicUrl: string;
};

interface ShareRow {
  id: string;
  slug: string;
  resumeId: string;
  isActive: boolean;
  password: string | null;
  expiresAt: Date | null;
  createdAt: Date;
}

export function toSharePayload(share: ShareRow): SharePayload {
  return {
    id: share.id,
    slug: share.slug,
    resumeId: share.resumeId,
    isActive: share.isActive,
    hasPassword: !!share.password,
    expiresAt: share.expiresAt?.toISOString() ?? null,
    createdAt: share.createdAt.toISOString(),
    publicUrl: `/api/v1/public/resumes/${share.slug}`,
  };
}

export function toSharePayloadList(shares: ShareRow[]): SharePayload[] {
  const out: SharePayload[] = [];
  for (const s of shares) out.push(toSharePayload(s));
  return out;
}

export type AliasPayload = {
  id: string;
  slug: string;
  shareId: string;
};

interface AliasRow {
  id: string;
  slug: string;
  shareId: string;
}

export function toAliasPayload(alias: AliasRow): AliasPayload {
  return { id: alias.id, slug: alias.slug, shareId: alias.shareId };
}

export function toAliasPayloadList(aliases: AliasRow[]): AliasPayload[] {
  const out: AliasPayload[] = [];
  for (const a of aliases) out.push(toAliasPayload(a));
  return out;
}
