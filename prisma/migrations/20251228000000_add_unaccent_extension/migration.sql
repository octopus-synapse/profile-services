-- Add unaccent extension for accent-insensitive search
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Create immutable unaccent function for use in indexes
CREATE OR REPLACE FUNCTION immutable_unaccent(text)
RETURNS text AS $$
SELECT unaccent('unaccent', $1);
$$ LANGUAGE sql IMMUTABLE;

-- Create indexes for faster unaccented search on MecInstitution
CREATE INDEX IF NOT EXISTS "MecInstitution_nome_unaccent_idx" 
ON "MecInstitution" (immutable_unaccent(lower(nome)));

-- Create indexes for faster unaccented search on MecCourse  
CREATE INDEX IF NOT EXISTS "MecCourse_nome_unaccent_idx" 
ON "MecCourse" (immutable_unaccent(lower(nome)));
