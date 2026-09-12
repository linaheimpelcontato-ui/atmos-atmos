import { describe, expect, it } from 'vitest';
import { guideDate, guideTripCounts, parseGuideAmount, type GuideTrip } from './guidePortal';
describe('guide personal amount', () => {
  it.each([['123.45',123.45],['123,45',123.45],['1.234,56',1234.56],['123',123],[' 0,01 ',0.01]])('parses %s', (text, amount) => expect(parseGuideAmount(text)).toBe(amount));
  it.each(['','0','-10','1.234','123.456','1,234.56','NaN','Infinity','1e3','R$ 20','1.2.3','1000000000','0.001'])('rejects invalid/ambiguous %s', text => expect(()=>parseGuideAmount(text)).toThrow());
});
it('keeps calendar dates independent of timezone and missing dates explicit', () => {
  expect(guideDate('2026-09-11')).toBe('11/09/2026');
  expect(guideDate(null)).toBe('Data a definir');
});
it('includes ongoing trips and does not invent dates from created_at', () => {
  const trips = [{start_date:'2026-09-10',end_date:'2026-09-12'}, {start_date:'2026-09-01',end_date:null}, {start_date:null,end_date:null}] as GuideTrip[];
  expect(guideTripCounts(trips,'2026-09-11')).toEqual({past:1,upcoming:1,undated:1});
});
