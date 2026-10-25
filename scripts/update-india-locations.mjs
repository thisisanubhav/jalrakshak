// Run deliberately when refreshing the bundled offline directory; review its diff.
import { writeFile } from 'node:fs/promises';
import console from 'node:console';
import { URL } from 'node:url';
const response=await globalThis.fetch('https://www.india.gov.in/directory/web-directory/api',{
  method:'POST',headers:{'Content-Type':'application/json'},signal:globalThis.AbortSignal.timeout(30000),
  body:JSON.stringify({dataval:{clientvalue:'client',mustvalue:[{fieldName:'category',fieldValue:'sg'},{fieldName:'organization_type',fieldValue:'E042'}],pageno:1,pageSize:1000,shouldvalue:[],querytype:'WebdirectoryCategorydetalsList'}}),
});
if(!response.ok)throw new Error(`Directory request failed: ${response.status}`);
const result=(await response.json()).resultdata?.data?.getIgodWebDirectoryByFilters;
if(!result||!Array.isArray(result.results)||result.results.length!==result.total||result.total<700||result.total>1000)throw new Error('Unexpected or incomplete directory response');
const groups=new Map();
for(const row of result.results){
  if(typeof row.title!=='string'||!row.title.trim()||typeof row.stateName!=='string'||!row.stateName.trim()||!/^[A-Z]{2}$/.test(row.state_id))throw new Error('Invalid directory row');
  if(!groups.has(row.stateName))groups.set(row.stateName,{code:row.state_id,name:row.stateName,districts:[]});
  const state=groups.get(row.stateName);
  if(state.code!==row.state_id||state.districts.includes(row.title))throw new Error('Ambiguous directory row');
  state.districts.push(row.title);
}
if(groups.size!==36)throw new Error('State count changed; review before updating');
for(const state of groups.values())state.districts.sort();
const directory={source:'https://www.india.gov.in/directory/web-directory/districts',retrievedAt:new Date().toISOString().slice(0,10),description:'National Portal of India / IGOD public district website directory snapshot. Not a live administrative boundary register.',states:[...groups.values()].sort((a,b)=>a.name.localeCompare(b.name,'en'))};
await writeFile(new URL('../src/field/india-locations.json',import.meta.url),JSON.stringify(directory,null,2)+'\n');
console.log(`Retrieved ${result.total} districts across ${groups.size} states/UTs. Review names, date, and compatibility before committing.`);
