import { Pool } from 'pg';
import { readFile, readdir } from 'node:fs/promises';
if(!process.env.DATABASE_URL)throw new Error('Set DATABASE_URL privately before migrating.');
const url=new URL(process.env.DATABASE_URL);
const local=['localhost','127.0.0.1','[::1]'].includes(url.hostname);
for(const key of ['sslmode','sslcert','sslkey','sslrootcert'])url.searchParams.delete(key);
const pool=new Pool({connectionString:url.toString(),ssl:local?false:{rejectUnauthorized:true},max:1,connectionTimeoutMillis:10000});
try {
  for(const file of (await readdir(new URL('../deploy/postgres/',import.meta.url))).filter(name=>name.endsWith('.sql')).sort()){
    await pool.query(await readFile(new URL(`../deploy/postgres/${file}`,import.meta.url),'utf8'));
    console.log(`Applied ${file}`);
  }
} finally {await pool.end();}
