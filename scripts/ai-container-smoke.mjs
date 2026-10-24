import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import process from 'node:process';
import console from 'node:console';

// Destructive recovery tests are restricted to an isolated, fictional CI stack.
assert.equal(process.env.COMPOSE_PROJECT_NAME,'jalrakshak-https-ci');
assert.equal(process.env.JALRAKSHAK_PUBLIC_ORIGIN,'https://localhost:3443');
assert.equal(process.env.COMPOSE_FILE,'compose.yaml:compose.ai.yaml');
const origin=process.env.JALRAKSHAK_PUBLIC_ORIGIN;
const docker=(...args)=>execFileSync('docker',args,{encoding:'utf8',stdio:['ignore','pipe','pipe']});
const compose=(...args)=>docker('compose',...args);
const password='synthetic-container-test-password';
async function api(path,data,session){
  return fetch(origin+'/api/'+path,{method:data?'POST':'GET',headers:{Origin:origin,'Content-Type':'application/json',...(session?{Cookie:session.cookie,'X-Jalrakshak-Account':session.user.id}:{})},body:data?JSON.stringify(data):undefined,signal:AbortSignal.timeout(150000)});
}
async function ok(response){assert.ok(response.ok,`Unexpected status ${response.status}: ${await response.clone().text()}`);return response.json();}
async function login(username){const r=await api('team/login',{username,password});const {user}=await ok(r);return {user,cookie:r.headers.get('set-cookie').split(';')[0]};}
const supervisor=await login('ci-supervisor'),worker=await login('ci-worker');
await ok(await api('team/users',{username:'ci-worker-two',name:'Second worker',role:'worker',password},supervisor));
const second=await login('ci-worker-two');
assert.equal((await ok(await api('team/records',undefined,second))).data.sources.length,0);
assert.equal((await api('ai/history',{sourceId:'https-ci-source',language:'en'},worker)).status,403);
const started=Date.now();
const concurrent=await Promise.all([worker,second,supervisor].map(session=>api('ai/note',{text:'The platform is cracked. Inspect drainage.',language:'en'},session)));
assert.ok(concurrent.some(r=>r.status===200));
for(const response of concurrent){assert.ok([200,429].includes(response.status));if(response.ok){const {text}=await ok(response);assert.ok(text.includes('platform')||text.includes('drainage'));}}
console.log(`Three-account AI requests completed in ${Date.now()-started} ms (success or bounded busy response).`);
const history=await ok(await api('ai/history',{sourceId:'https-ci-source',language:'en'},supervisor));assert.ok(history.text.includes('HTTPS-1'));
const monthly=await ok(await api('ai/monthly',{month:new Date().toISOString().slice(0,7),language:'hi'},supervisor));assert.ok(monthly.text.includes('माह'));
// Valid silence reaches the real speech container; no invented transcript is accepted.
const wav=Buffer.alloc(32044);wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(16000,24);wav.writeUInt32LE(32000,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(32000,40);
const silence=await api('ai/transcribe',{audio:wav.toString('base64'),language:'en'},worker);assert.equal(silence.status,502);assert.equal((await silence.json()).error,'AI_INVALID_OUTPUT');
for(const name of ['ollama','whisper']){
  const id=compose('ps','-q',name).trim();const inspected=JSON.parse(docker('inspect',id))[0];
  assert.equal(inspected.HostConfig.RestartPolicy.Name,'unless-stopped');
  assert.equal(Object.keys(inspected.HostConfig.PortBindings??{}).length,0);
  const networks=Object.keys(inspected.NetworkSettings.Networks);assert.equal(networks.length,1);
  assert.equal(JSON.parse(docker('network','inspect',networks[0]))[0].Internal,true);
}
compose('stop','ollama','whisper');
try{
  assert.equal((await api('ai/note',{text:'Platform cracked.',language:'en'},worker)).status,503);
  assert.equal((await api('ai/transcribe',{audio:wav.toString('base64'),language:'en'},worker)).status,503);
  const snapshot=await ok(await api('team/records',undefined,worker));snapshot.data.sources[0].location='Manual update during AI outage';snapshot.data.sources[0].updatedAt=new Date().toISOString();
  await ok(await api('team/sync',snapshot,worker));
}finally{compose('up','-d','--wait','--wait-timeout','180','ollama','whisper');}
compose('restart','ollama','whisper');compose('up','-d','--wait','--wait-timeout','180','ollama','whisper');
await ok(await api('ai/note',{text:'Platform cracked.',language:'en'},worker));
assert.equal((await ok(await api('team/records',undefined,worker))).data.sources[0].location,'Manual update during AI outage');
// Export a verified backup outside the records volume, restore to a separate volume,
// invalidate old sessions and actually start the app against the restored database.
const temp=mkdtempSync(join(tmpdir(),'jalrakshak-recovery-'));
const restoreVolume='jalrakshak-https-ci-restore',restoreContainer='jalrakshak-https-ci-restore';
try{
  compose('exec','-T','app','node','scripts/backup-team.mjs');
  const file=compose('exec','-T','app','node','-e',"console.log(JSON.parse(require('fs').readFileSync('/app/private-data/backups/status.json')).file)").trim();
  assert.match(file,/^[a-zA-Z0-9_.-]+$/);
  const backup=join(temp,'backup.sqlite');compose('cp',`app:/app/private-data/backups/${file}`,backup);
  docker('volume','create',restoreVolume);
  compose('run','--rm','--no-deps','-v',`${restoreVolume}:/app/private-data`,'-v',`${backup}:/tmp/backup.sqlite:ro`,'app','node','--input-type=module','-e',"import {copyFileSync} from 'node:fs';import {DatabaseSync} from 'node:sqlite';copyFileSync('/tmp/backup.sqlite','/app/private-data/team.sqlite');const db=new DatabaseSync('/app/private-data/team.sqlite');db.exec('DELETE FROM sessions');if(db.prepare('PRAGMA integrity_check').get().integrity_check!=='ok')process.exit(1);db.close();");
  compose('run','-d','--no-deps','--name',restoreContainer,'-v',`${restoreVolume}:/app/private-data`,'-e','JALRAKSHAK_PUBLIC_ORIGIN=','app');
  const verification=docker('exec',restoreContainer,'node','--input-type=module','-e',`
    const origin='http://127.0.0.1:3000';
    let ready=false;for(let n=0;n<30;n++){try{if((await fetch(origin+'/api/team/session')).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,1000));}if(!ready)throw Error('Restored app not ready');
    const headers={Origin:origin,'Content-Type':'application/json'};
    const login=await fetch(origin+'/api/team/login',{method:'POST',headers,body:JSON.stringify({username:'ci-worker',password:'synthetic-container-test-password'})});if(!login.ok)throw Error('Restored login failed');
    const records=await fetch(origin+'/api/team/records',{headers:{Cookie:login.headers.get('set-cookie').split(';')[0]}});const data=await records.json();if(data.data.sources[0]?.location!=='Manual update during AI outage')throw Error('Restored evidence mismatch');console.log('Restored application login and assigned records verified.');
  `);console.log(verification.trim());
}finally{
  try{docker('rm','-f',restoreContainer);}catch{/* May not have started. */}
  try{docker('volume','rm',restoreVolume);}catch{/* Keep failed cleanup visible in Docker inventory. */}
  rmSync(temp,{recursive:true,force:true});
}
console.log('Private AI networking, multi-worker requests, outages, model persistence, restart and full backup restore passed.');
