-- GeoNames gazetteer tables backing the location picker when
-- GEO_SOURCE=postgres. Populated by `bun run geo:import`
-- (src/scripts/import-geonames.ts). `searchName` is the diacritic-stripped,
-- lower-cased name for accent-/case-insensitive prefix search.

-- CreateTable
CREATE TABLE "GeoCountry" (
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "searchName" TEXT NOT NULL,

    CONSTRAINT "GeoCountry_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "GeoAdmin1" (
    "id" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "admin1Code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "searchName" TEXT NOT NULL,

    CONSTRAINT "GeoAdmin1_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeoCity" (
    "id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "searchName" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "admin1Code" TEXT,
    "population" BIGINT NOT NULL DEFAULT 0,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,

    CONSTRAINT "GeoCity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GeoCountry_searchName_idx" ON "GeoCountry"("searchName");

-- CreateIndex
CREATE INDEX "GeoAdmin1_countryCode_idx" ON "GeoAdmin1"("countryCode");

-- CreateIndex
CREATE INDEX "GeoAdmin1_searchName_idx" ON "GeoAdmin1"("searchName");

-- CreateIndex
CREATE INDEX "GeoCity_countryCode_idx" ON "GeoCity"("countryCode");

-- CreateIndex
CREATE INDEX "GeoCity_countryCode_admin1Code_idx" ON "GeoCity"("countryCode", "admin1Code");

-- CreateIndex
CREATE INDEX "GeoCity_searchName_idx" ON "GeoCity"("searchName");

-- CreateIndex
CREATE INDEX "GeoCity_population_idx" ON "GeoCity"("population");
