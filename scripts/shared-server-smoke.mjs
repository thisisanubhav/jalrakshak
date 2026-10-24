import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { setTimeout } from 'node:timers/promises';
import process from 'node:process';
import console from 'node:console';

// This creates synthetic accounts and restarts only the isolated CI stack.
assert.equal(process.env.COMPOSE_PROJECT_NAME,'jalrakshak-https-ci');
assert.equal(process.env.JALRAKSHAK_PUBLIC_ORIGIN,'https://localhost:3443');
const origin=process.env.JALRAKSHAK_PUBLIC_ORIGIN;
const compose=(...args)=>execFileSync('docker',['compose',...args],{encoding:'utf8'});
async function api(path,{data,cookie,requestOrigin=origin}={}){
  return fetch(origin+'/api/team/'+path,{method:data?'POST':'GET',headers:{Origin:requestOrigin,...(data?{'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{})},body:data?JSON.stringify(data):undefined});
}
async function success(response){assert.ok(response.ok,'API response must succeed: '+response.status);return response.json();}
const password='synthetic-container-test-password';
const state=await success(await api('session'));assert.equal(state.setupRequired,true);
const key=compose('exec','-T','app','cat','/app/private-data/setup-key.txt').trim();
const setup=await api('setup',{data:{key,username:'ci-supervisor',name:'CI supervisor',password}});
await success(setup);
const setCookie=setup.headers.get('set-cookie');
assert.ok(setCookie?.includes('Secure'),'Hosted session must be Secure');
assert.ok(setCookie?.includes('HttpOnly'),'Hosted session must be HttpOnly');
assert.ok(/SameSite=strict/i.test(setCookie),'Hosted session must be same-site');
const supervisorCookie=setCookie.split(';')[0];
assert.equal((await api('login',{data:{username:'ci-supervisor',password},requestOrigin:'https://foreign.example'})).status,403);
const worker=await success(await api('users',{cookie:supervisorCookie,data:{username:'ci-worker',name:'CI worker',role:'worker',password}}));
const snapshot=await success(await api('records',{cookie:supervisorCookie}));
const at=new Date().toISOString();
const source={id:'https-ci-source',code:'HTTPS-1',name:'Container test pump',scope:'MANUAL_FIELD',village:'Test village',district:'Test district',location:'',category:'HANDPUMP',operator:'CI',createdAt:at,updatedAt:at};
await success(await api('sync',{cookie:supervisorCookie,data:{revision:snapshot.revision,data:{sources:[source],measurements:[],investigations:[]}}}));
await success(await api('assign',{cookie:supervisorCookie,data:{sourceId:source.id,userId:worker.user.id}}));
async function workerLogin(){const response=await api('login',{data:{username:'ci-worker',password}});await success(response);return response.headers.get('set-cookie').split(';')[0];}
let workerCookie=await workerLogin();
assert.equal((await success(await api('records',{cookie:workerCookie}))).data.sources[0].id,source.id);
assert.equal((await api('users',{cookie:workerCookie})).status,403);
compose('restart','app');
let ready=false;
for(let attempt=0;attempt<30;attempt++){
  try{if((await api('session',{cookie:workerCookie})).ok){ready=true;break;}}catch{/* Startup is bounded below. */}
  await setTimeout(1000);
}
assert.ok(ready,'App must recover after restart');
workerCookie=await workerLogin();
assert.equal((await success(await api('records',{cookie:workerCookie}))).data.sources[0].id,source.id);
compose('exec','-T','app','node','scripts/backup-team.mjs');
const verification=compose('exec','-T','app','node','--input-type=module','-e',`
  import {readFileSync,copyFileSync} from 'node:fs';
  import {DatabaseSync} from 'node:sqlite';
  const status=JSON.parse(readFileSync('/app/private-data/backups/status.json','utf8'));
  copyFileSync('/app/private-data/backups/'+status.file,'/tmp/restored.sqlite');
  const db=new DatabaseSync('/tmp/restored.sqlite',{readOnly:true});
  const result={integrity:db.prepare('PRAGMA integrity_check').get().integrity_check,
    users:db.prepare('SELECT COUNT(*) AS n FROM users').get().n,
    records:db.prepare('SELECT COUNT(*) AS n FROM records').get().n,
    assignments:db.prepare('SELECT COUNT(*) AS n FROM assignments').get().n};
  db.close();console.log(JSON.stringify(result));
`);
const backup=JSON.parse(verification);assert.equal(backup.integrity,'ok');assert.equal(backup.users,2);assert.ok(backup.records>0);assert.equal(backup.assignments,1);
const logout=await api('logout',{cookie:workerCookie,data:{}});await success(logout);
assert.ok(logout.headers.get('set-cookie')?.includes('Secure'));
assert.equal((await api('records',{cookie:workerCookie})).status,401);
console.log('HTTPS login, secure cookies, foreign-origin rejection, worker isolation, restart persistence, backup restore and logout passed.');
