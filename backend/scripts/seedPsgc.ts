import 'dotenv/config';
import { neon } from '@neondatabase/serverless';
import path from 'path';

// Source: @jobuntux/psgc npm package, 2025-2Q snapshot — structured from the PSA's
// Philippine Standard Geographic Code. Vendored here rather than fetched at seed time
// since psa.gov.ph blocks scripted access and the npm package has no stable data CDN.
const DATA_DIR = path.join(__dirname, '../db/seed-data/psgc');

interface RegionRow {
  psgcCode: string;
  regCode: string;
  regionName: string;
}

interface ProvinceRow {
  psgcCode: string;
  regCode: string;
  provCode: string;
  provName: string;
  cityClass: string | null;
}

interface MuncityRow {
  psgcCode: string;
  regCode: string;
  provCode: string;
  munCityCode: string;
  munCityName: string;
}

interface CityMunicipalityRow {
  psgc_code: string;
  city_municipality: string;
  province: string;
  region: string;
  is_city: boolean;
}

function buildRows(): CityMunicipalityRow[] {
  const regions: RegionRow[] = require(path.join(DATA_DIR, 'regions.json'));
  const provinces: ProvinceRow[] = require(path.join(DATA_DIR, 'provinces.json'));
  const muncities: MuncityRow[] = require(path.join(DATA_DIR, 'muncities.json'));

  const regionByCode = new Map(regions.map((r) => [r.regCode, r.regionName.trim()]));
  const provinceByKey = new Map(provinces.map((p) => [`${p.regCode}:${p.provCode}`, p]));

  const hucProvinces = provinces.filter((p) => p.cityClass === 'HUC' || p.cityClass === 'ICC');
  const hucProvCodes = new Set(hucProvinces.map((p) => p.provCode));

  const rows: CityMunicipalityRow[] = [];
  const seenCodes = new Set<string>();

  function addRow(psgcCode: string, name: string, province: string, region: string, isCity: boolean) {
    if (seenCodes.has(psgcCode)) throw new Error(`Duplicate psgc_code ${psgcCode} (${name})`);
    seenCodes.add(psgcCode);
    rows.push({ psgc_code: psgcCode, city_municipality: name, province, region, is_city: isCity });
  }

  // Independent cities (HUC/ICC) — PSGC models these as their own province-level unit,
  // so they self-reference as their own "province" rather than borrowing a neighbor's.
  for (const p of hucProvinces) {
    const name = p.provName.trim();
    const region = regionByCode.get(p.regCode);
    if (!region) throw new Error(`No region for ${p.regCode}`);
    addRow(p.psgcCode, name, name, region, true);
  }

  // Regular cities/municipalities — exclude the bogus self-referential HUC duplicate rows,
  // Manila's administrative-district sub-rows, and BARMM's Special Geographic Area
  // barangays (all artifacts of the source dataset, not real cities/municipalities).
  for (const m of muncities) {
    if (hucProvCodes.has(m.provCode)) continue;
    if (m.regCode === '19' && m.provCode === '999') continue;

    const name = m.munCityName.trim();
    const region = regionByCode.get(m.regCode);
    if (!region) throw new Error(`No region for muncity ${name} (${m.regCode})`);

    let province: string;
    const provRec = provinceByKey.get(`${m.regCode}:${m.provCode}`);
    if (provRec) {
      province = provRec.provName.trim();
    } else if (m.regCode === '13') {
      // Pateros: NCR's one regular municipality, not part of any HUC pseudo-province.
      province = 'Metro Manila';
    } else {
      // e.g. City of Isabela (Basilan) — statistically grouped under Region IX with no
      // province record of its own. Self-reference, same treatment as HUC/ICC cities.
      province = name;
    }

    addRow(m.psgcCode, name, province, region, /city/i.test(name));
  }

  rows.sort((a, b) => a.city_municipality.localeCompare(b.city_municipality));
  return rows;
}

async function seedPsgc() {
  const sql = neon(process.env.DATABASE_URL!);
  const rows = buildRows();

  const existing = await sql`SELECT COUNT(*)::int AS count FROM cities_municipalities`;
  if (existing[0].count > 0) {
    console.log(`cities_municipalities already has ${existing[0].count} rows, skipping.`);
    return;
  }

  const BATCH_SIZE = 200;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    await sql`
      INSERT INTO cities_municipalities (psgc_code, city_municipality, province, region, is_city)
      SELECT * FROM UNNEST(
        ${batch.map((r) => r.psgc_code)}::varchar[],
        ${batch.map((r) => r.city_municipality)}::varchar[],
        ${batch.map((r) => r.province)}::varchar[],
        ${batch.map((r) => r.region)}::varchar[],
        ${batch.map((r) => r.is_city)}::boolean[]
      )
    `;
  }

  console.log(`Seeded ${rows.length} rows into cities_municipalities.`);
}

seedPsgc().catch((err) => {
  console.error(err);
  process.exit(1);
});
