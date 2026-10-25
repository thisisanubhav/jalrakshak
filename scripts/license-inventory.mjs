import { readFileSync } from 'node:fs';
import process from 'node:process';
const lock=JSON.parse(readFileSync(new URL('../package-lock.json',import.meta.url),'utf8'));
const entries=Object.entries(lock.packages).filter(([path])=>path).map(([path,pkg])=>({path,version:pkg.version,license:pkg.license??'REVIEW_REQUIRED',development:!!pkg.dev,optional:!!pkg.optional}));
process.stdout.write(JSON.stringify({description:'Lockfile metadata inventory, not legal clearance. Platform variants may not be installed or distributed. Verify actual licence files and shipping artifacts.',entries},null,2)+'\n');
