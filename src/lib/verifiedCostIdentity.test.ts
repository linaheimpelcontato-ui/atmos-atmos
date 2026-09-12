import { describe, expect, it } from 'vitest';
import { assertVerifiedCostIdentity, verifiedCheckForCell, type CostIdentity, costSnapshot, checklistSavedValues } from './verifiedCostIdentity';
const a: CostIdentity = {id:'A',day_number:1,item_index:0,category:'Serviços',catalog_item_id:'catalog-A',variation_id:null,supplier_id:null};
const b: CostIdentity = {...a,id:'B',item_index:1,catalog_item_id:'catalog-B'};
const checks = [{day_number:1,item_index:0,actual_cost:100,is_verified:true,item_id:a.id,identity_snapshot:costSnapshot(a)}];
describe('verified cost belongs to identity, not slot',()=>{
  it.each([{id:'new'}, {day_number:2}, {item_index:2}, {catalog_item_id:'replacement'}, {variation_id:'variant'}, {category:'Other'}, {supplier_id:'supplier'}, {vehicle_type:'4x4'}])('rejects identity edit %j',patch=>{
    const edited={...a,...patch};
    expect(verifiedCheckForCell(edited,[a,b],[edited,b],checks)).toBeUndefined();
    expect(()=>assertVerifiedCostIdentity([a,b],[edited,b],checks)).toThrow();
  });
  it('B never inherits A verified 100 after reorder (falls back to its recorded 20)',()=>{
    const movedB={...b,item_index:0,cost:20}; const movedA={...a,item_index:1,cost:40};
    const check=verifiedCheckForCell(movedB,[a,b],[movedB,movedA],checks);
    expect(check?.actual_cost ?? movedB.cost).toBe(20);
    expect(()=>assertVerifiedCostIdentity([a,b],[movedB,movedA],checks)).toThrow(/Desmarque/);
  });
  it('protects verified zero and allows ordinary quantity/text edits',()=>{
    const zero=[{...checks[0],actual_cost:0}];
    const edited={...a,qty:25,item_name:'New label',description:'Text'};
    expect(verifiedCheckForCell(edited,[a],[edited],zero)?.actual_cost).toBe(0);
    expect(()=>assertVerifiedCostIdentity([a],[edited],zero)).not.toThrow();
    expect(()=>assertVerifiedCostIdentity([a],[],zero)).toThrow();
  });
  it('rejects ambiguity in original or final slots, including unverified duplicate slots',()=>{
    expect(verifiedCheckForCell(a,[a,{...a,id:'other'}],[a],checks)).toBeUndefined();
    expect(()=>assertVerifiedCostIdentity([a],[a,{...a,id:'other'}],[])).toThrow();
  });
  it('does not treat accommodation negative slots as day items',()=>{
    expect(()=>assertVerifiedCostIdentity([],[],[{...checks[0],day_number:-1}])).not.toThrow();
  });
  it('allows same indices on different days and unverified structural edits',()=>{
    expect(()=>assertVerifiedCostIdentity([a,b],[{...a,day_number:2},b],[])).not.toThrow();
  });
});

it('legacy and replaced unverified checks never seed actual cost or notes',()=>{
  expect(checklistSavedValues(a,[{day_number:1,item_index:0,is_verified:false,actual_cost:500,notes:'Old note'}])).toBeUndefined();
  expect(checklistSavedValues({...a,id:'replacement'},[{...checks[0],is_verified:false,notes:'Old note'}])).toBeUndefined();
});
it('keeps quantity in expected write snapshot without changing unit/total pricing identity',()=>{
  expect(costSnapshot({...a,qty:20}).quantity).toBe(20);
  expect(costSnapshot({...a,qty:21})).not.toEqual(costSnapshot({...a,qty:20}));
  expect(checklistSavedValues({...a},checks)?.actual_cost).toBe(100);
});
