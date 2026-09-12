import { expect, it } from 'vitest';
import { requireSavedCostChecks } from './costCheckSave';
it.each([null,false,undefined,{},'true'])('does not report success for %j', data => expect(()=>requireSavedCostChecks({data,error:null})).toThrow());
it('preserves server rejection even with true data',()=>expect(()=>requireSavedCostChecks({data:true,error:{message:'Identidade mudou'}})).toThrow('Identidade mudou'));
it('accepts only explicit persisted success',()=>expect(()=>requireSavedCostChecks({data:true,error:null})).not.toThrow());
