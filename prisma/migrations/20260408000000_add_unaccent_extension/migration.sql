-- CreateExtension
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Create immutable wrapper for unaccent (required for index usage)
CREATE OR REPLACE FUNCTION immutable_unaccent(text)
RETURNS text AS $$
  SELECT public.unaccent('public.unaccent', $1)
$$ LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT;
