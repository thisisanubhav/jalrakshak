import { describe,expect,it } from 'vitest';
import { pickLanguage } from './UiLanguage';
describe('selected UI language',()=>{
  it('selects a single side of authored bilingual copy',()=>{
    expect(pickLanguage('Sync now / अभी सिंक करें','en')).toBe('Sync now');
    expect(pickLanguage('Sync now / अभी सिंक करें','hi')).toBe('अभी सिंक करें');
    expect(pickLanguage('EC does not certify safety. / EC सुरक्षा प्रमाणित नहीं करता।','hi')).toBe('EC सुरक्षा प्रमाणित नहीं करता।');
  });
  it('retains unit slashes and uses known translations for standalone labels',()=>{
    expect(pickLanguage('EC (µS/cm)','en')).toBe('EC (µS/cm)');
    expect(pickLanguage('Username','hi')).toBe('उपयोगकर्ता नाम');
    expect(pickLanguage('Record Measurement','hi')).toBe('माप दर्ज करें');
    expect(pickLanguage('Unrecognised server message','hi')).toBe('Unrecognised server message');
  });
});
