// backend/scripts/generate-catalog-migration.ts
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { loadCatalog } from '../src/catalog/catalog.js';
import { buildCatalogMigrationSql, CATALOG_MIGRATION_PATH } from '../src/catalog/buildCatalogSql.js';

writeFileSync(CATALOG_MIGRATION_PATH, buildCatalogMigrationSql(loadCatalog()), 'utf8');
console.log(`Wrote ${fileURLToPath(CATALOG_MIGRATION_PATH)}`);
