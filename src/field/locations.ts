import directory from './india-locations.json' with { type: 'json' };

export const locationDirectory = directory;
export const states = directory.states;
export function stateByName(name: string) {
  return states.find(s => s.name.toLocaleLowerCase('en') === name.trim().toLocaleLowerCase('en'));
}
export function districtByName(state: string, district: string) {
  return stateByName(state)?.districts.find(d => d.toLocaleLowerCase('en') === district.trim().toLocaleLowerCase('en'));
}
export function validSourceLocation(state: unknown, district: string) {
  // Records created before state selection retain their original district text.
  return state === undefined || state === '' || typeof state === 'string' && Boolean(districtByName(state, district));
}
