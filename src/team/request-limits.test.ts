import { expect, it } from 'vitest';
import { RequestLimits } from './request-limits';
it('limits one account without exhausting another and resets after the window',()=>{
  const limiter=new RequestLimits();limiter.check('a',2,0);limiter.check('a',2,1);
  expect(()=>limiter.check('a',2,2)).toThrow('Too many');expect(()=>limiter.check('b',2,2)).not.toThrow();
  expect(()=>limiter.check('a',2,60_001)).not.toThrow();
});
it('caps attacker-controlled cardinality and reclaims expired buckets',()=>{
  const limiter=new RequestLimits();for(let i=0;i<4096;i++)limiter.check(String(i),1,0);
  expect(()=>limiter.check('overflow',1,0)).toThrow('Server busy');expect(()=>limiter.check('new',1,60_001)).not.toThrow();
});
