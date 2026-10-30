import {expect,it} from 'vitest';
import {possibleDuplicateSources} from './duplicate-sources';
import type {FieldSource} from './model';
const source:FieldSource={id:'a',scope:'MANUAL_FIELD',code:'A',name:'School Pump',village:'Village',district:'Khunti',state:'Jharkhand',category:'HANDPUMP',operator:'OP',location:'',createdAt:'2026-01-01T00:00:00.000Z',updatedAt:'2026-01-01T00:00:00.000Z'};
it('warns about normalized same-area names without treating different districts or training as duplicates',()=>{
 const candidate={...source,id:'b',name:' school-pump '};expect(possibleDuplicateSources(candidate,[source])).toHaveLength(1);
 expect(possibleDuplicateSources({...candidate,district:'Ranchi'},[source])).toHaveLength(0);
 expect(possibleDuplicateSources(candidate,[{...source,scope:'SYNTHETIC_DEMO'}])).toHaveLength(0);
 expect(possibleDuplicateSources(source,[source])).toHaveLength(0);
});
it('warns only within 30 metres when both GPS pairs exist',()=>{
 const located={...source,latitude:23,longitude:85};const candidate={...source,id:'b',name:'Different',latitude:23.0001,longitude:85};
 expect(possibleDuplicateSources(candidate,[located])).toHaveLength(1);
 expect(possibleDuplicateSources({...candidate,latitude:23.01},[located])).toHaveLength(0);
 expect(possibleDuplicateSources({...candidate,latitude:undefined},[located])).toHaveLength(0);
});
