import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildVarietyOfficialSpecs } from '../packages/shared/dist/index.js';

const here = dirname(fileURLToPath(import.meta.url));
const specs = buildVarietyOfficialSpecs().map((spec) => ({ id: spec.id, name: spec.name }));
writeFileSync(join(here, 'variety-recipes.json'), `${JSON.stringify(specs)}\n`);
console.log(specs.length);
