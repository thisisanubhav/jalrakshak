import { stateByName, districtByName } from './locations';
import { categories, validateSource, type FieldSource, type Scope } from './model';

export const sourceCsvTemplate='code,name,state,village,district,category,latitude,longitude,operator,location\nHP-001,School handpump,Jharkhand,Rampur,Khunti,HANDPUMP,23.61,85.52,OP-01,Near school\n';
export const importLimit=500;
export type ImportIssue='csvSyntax'|'csvHeaders'|'csvLimit'|'csvRequired'|'csvCategory'|'csvCoordinates'|'csvDuplicate'|'invalidLocation';
export type ImportRow={line:number;source?:FieldSource;issues:ImportIssue[];code:string;name:string};
export type ImportPreview={rows:ImportRow[];issues:ImportIssue[]};
const columns=['state','code','name','village','district','category','latitude','longitude','operator','location'];
const required=['code','name','village','district','category','operator'];
export function normalizedSourceCode(code:string){return code.trim().toLocaleLowerCase('en');}

// Strict quoted CSV, including escaped quotes and line breaks inside a cell.
function parseCsv(text:string):string[][]{
  const rows:string[][]=[];let row:string[]=[],cell='',quoted=false,closed=false;
  for(let i=0;i<text.length;i++){
    const char=text[i];
    if(quoted){if(char==='"'){if(text[i+1]==='"'){cell+='"';i++;}else{quoted=false;closed=true;}}else cell+=char;continue;}
    if(char==='"'){if(cell||closed)throw new Error('csv');quoted=true;continue;}
    if(char===','||char==='\n'||char==='\r'){
      row.push(cell);cell='';closed=false;
      if(char!==','){if(char==='\r'&&text[i+1]==='\n')i++;if(row.some(value=>value.trim()))rows.push(row);row=[];}
      continue;
    }
    if(closed)throw new Error('csv');cell+=char;
  }
  if(quoted)throw new Error('csv');row.push(cell);if(row.some(value=>value.trim()))rows.push(row);
  return rows;
}
export function previewSourceImport(text:string,existing:FieldSource[],scope:Scope='MANUAL_FIELD'):ImportPreview{
  if(text.length>1_000_000)return {rows:[],issues:['csvLimit']};
  let cells:string[][];try{cells=parseCsv(text.replace(/^\uFEFF/,''));}catch{return {rows:[],issues:['csvSyntax']};}
  const header=cells.shift()?.map(value=>value.trim().toLowerCase())??[];
  if(required.some(key=>!header.includes(key))||header.some(key=>!columns.includes(key))||new Set(header).size!==header.length)return {rows:[],issues:['csvHeaders']};
  if(!cells.length||cells.length>importLimit)return {rows:[],issues:['csvLimit']};
  const codes=new Set(existing.filter(s=>s.scope===scope).map(s=>normalizedSourceCode(s.code)));
  const counts=new Map<string,number>();for(const row of cells){const code=normalizedSourceCode(row[header.indexOf('code')]??'');counts.set(code,(counts.get(code)??0)+1);}
  const now=new Date().toISOString();
  const rows=cells.map((row,index):ImportRow=>{
    const values=Object.fromEntries(header.map((name,i)=>[name,(row[i]??'').trim()]));const issues:ImportIssue[]=[];
    if(row.length!==header.length)issues.push('csvSyntax');
    if(required.some(key=>!values[key]||values[key].length>200)||(values.location?.length??0)>2000)issues.push('csvRequired');
    const category=values.category.toUpperCase();if(!categories.includes(category as FieldSource['category']))issues.push('csvCategory');
    const coordinate=(key:string)=>values[key]?Number(values[key]):undefined;
    const latitude=coordinate('latitude'),longitude=coordinate('longitude');
    if((latitude===undefined)!==(longitude===undefined)||[latitude,longitude].some(v=>v!==undefined&&!Number.isFinite(v))||(latitude!==undefined&&Math.abs(latitude)>90)||(longitude!==undefined&&Math.abs(longitude)>180))issues.push('csvCoordinates');
    const code=normalizedSourceCode(values.code);if(codes.has(code)||(counts.get(code)??0)>1)issues.push('csvDuplicate');
    const state=values.state?stateByName(values.state)?.name:undefined;
    const district=state?districtByName(state,values.district):values.district;
    if(values.state&&(!state||!district))issues.push('invalidLocation');
    const source:FieldSource={id:crypto.randomUUID(),scope,code:values.code,name:values.name,village:values.village,district:district??values.district,...(state?{state}:{}),category:category as FieldSource['category'],operator:values.operator,location:values.location??'',...(latitude===undefined?{}:{latitude,longitude}),createdAt:now,updatedAt:now};
    if(!issues.length){try{validateSource(source);}catch{issues.push('csvRequired');}}
    return {line:index+2,code:values.code,name:values.name,issues,...(!issues.length?{source}:{})};
  });
  return {rows,issues:[]};
}
