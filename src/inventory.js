export const names={flour:'밀가루',honey:'꿀',berry:'베리',loaf:'밀빵',honeybread:'꿀빵',berrybread:'베리빵'};
export function has(s,cost){return Object.entries(cost).every(([k,v])=>(s.items[k]||0)>=v)}
export function spend(s,cost){if(!has(s,cost))return false;for(const [k,v] of Object.entries(cost))s.items[k]-=v;return true}
