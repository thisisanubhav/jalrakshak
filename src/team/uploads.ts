import { randomUUID, createHash } from 'node:crypto';
import type { Pool, PoolClient } from 'pg';
import { TeamError } from './server';
import type { TeamUser } from './shared';
const hash = (token:string) => createHash('sha256').update(token).digest('hex');
const MAX_BYTES = 50 * 1024 * 1024;
/** Session-bound staging only. Records change solely through the normal sync validator. */
export class SyncUploads {
  constructor(private pool:Pool) {}
  private async locked<T>(fn:(client:PoolClient)=>Promise<T>) {
    const client=await this.pool.connect();
    try { await client.query('BEGIN'); await client.query('SELECT pg_advisory_xact_lock(67420127)'); const value=await fn(client);await client.query('COMMIT');return value; }
    catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
  }
  async start(user:TeamUser,token:string,parts:unknown) {
    if(!Number.isInteger(parts)||Number(parts)<1||Number(parts)>256)throw new TeamError(400,'Invalid sync upload.');
    return this.locked(async client=>{
      await client.query('DELETE FROM sync_uploads WHERE expires<$1 OR user_id=$2',[Date.now(),user.id]);
      const id=randomUUID();
      await client.query('INSERT INTO sync_uploads(id,user_id,session_hash,parts,expires) VALUES($1,$2,$3,$4,$5)',[id,user.id,hash(token),parts,Date.now()+20*60_000]);
      return {id};
    });
  }
  private async upload(client:PoolClient,user:TeamUser,token:string,id:unknown) {
    if(typeof id!=='string'||id.length>100)throw new TeamError(400,'Invalid sync upload.');
    const row=(await client.query('SELECT * FROM sync_uploads WHERE id=$1 AND user_id=$2 AND session_hash=$3 AND expires>$4 FOR UPDATE',[id,user.id,hash(token),Date.now()])).rows[0];
    if(!row)throw new TeamError(409,'Sync upload expired or changed. Retry sync; local work is preserved.');
    return row;
  }
  async part(user:TeamUser,token:string,id:unknown,index:unknown,body:unknown) {
    if(!Number.isInteger(index)||typeof body!=='string'||Buffer.byteLength(body)>1_000_000)throw new TeamError(400,'Invalid sync chunk.');
    await this.locked(async client=>{
      const upload=await this.upload(client,user,token,id);
      if(Number(index)<0||Number(index)>=upload.parts)throw new TeamError(400,'Invalid sync chunk number.');
      const old=(await client.query('SELECT body FROM sync_parts WHERE upload_id=$1 AND part=$2',[id,index])).rows[0];
      if(old){if(old.body!==body)throw new TeamError(409,'Sync chunk changed. Retry sync.');return;}
      const bytes=Buffer.byteLength(body);
      if(upload.bytes+bytes>MAX_BYTES)throw new TeamError(413,'Sync exceeds 50 MB. Keep a device backup and contact your supervisor.');
      await client.query('INSERT INTO sync_parts(upload_id,part,body) VALUES($1,$2,$3)',[id,index,body]);
      await client.query('UPDATE sync_uploads SET bytes=bytes+$1 WHERE id=$2',[bytes,id]);
    });
  }
  async read(user:TeamUser,token:string,id:unknown) {
    return this.locked(async client=>{
      const upload=await this.upload(client,user,token,id);
      const rows=(await client.query('SELECT body FROM sync_parts WHERE upload_id=$1 ORDER BY part',[id])).rows;
      if(rows.length!==upload.parts)throw new TeamError(409,'Sync upload is incomplete. Retry sync.');
      try{return JSON.parse(rows.map(r=>r.body).join(''));}catch{throw new TeamError(400,'Invalid sync data.');}
    });
  }
  async remove(user:TeamUser,token:string,id:unknown) {
    await this.pool.query('DELETE FROM sync_uploads WHERE id=$1 AND user_id=$2 AND session_hash=$3',[id,user.id,hash(token)]);
  }
}
