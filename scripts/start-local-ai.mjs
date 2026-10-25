import { spawn } from 'node:child_process';
import console from 'node:console';
import { existsSync, readdirSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { resolve, join } from 'node:path';

if (existsSync('.env.local')) process.loadEnvFile('.env.local');
const cache = join(homedir(), '.cache/huggingface/hub/models--Systran--faster-whisper-base/snapshots');
const model = process.env.JALRAKSHAK_WHISPER_MODEL || (existsSync(cache) ? join(cache, readdirSync(cache).sort().at(-1) ?? '') : '');
if (!model || !existsSync(join(model, 'model.bin'))) {
  console.error('Set JALRAKSHAK_WHISPER_MODEL to a downloaded multilingual faster-whisper model directory. See docs/field/local-ai.md.');
  process.exit(1);
}
const models = resolve('private-data/ai-models/ollama'); mkdirSync(models, { recursive: true, mode: 0o700 });
const children=[]; let stopping=false;
function stop(code=0) { if(stopping)return;stopping=true;children.forEach(child=>child.kill('SIGTERM'));process.exitCode=code; }
function start(command,args,env){
  const child=spawn(command,args,{stdio:'inherit',env:{...process.env,...env}});children.push(child);
  child.on('error',()=>{console.error(`Cannot start ${command}. Install its local runtime first; see docs/field/local-ai.md.`);stop(1);});
  child.on('exit',code=>{if(!stopping){console.error(`${command} stopped (${code}). Stopping companion service.`);stop(1);}});
}
start('ollama',['serve'],{OLLAMA_NO_CLOUD:'1',OLLAMA_HOST:'127.0.0.1:11434',OLLAMA_MODELS:models,OLLAMA_DEBUG_LOG_REQUESTS:'false'});
start('uv',['run','--python','3.12','--with','faster-whisper==1.2.1','scripts/local-speech.py'],{HF_HUB_OFFLINE:'1',JALRAKSHAK_WHISPER_MODEL:model});
process.on('SIGINT',()=>stop());process.on('SIGTERM',()=>stop());
console.log('Starting local AI on loopback ports 11434 and 8178. No cloud inference. Ctrl+C stops both services.');
