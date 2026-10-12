import type { ConventionGroup, FellowshipBand, Member } from '@/types';

const ASSIGNABLE_GROUPS: ConventionGroup[] = ['Group A', 'Group B', 'Group C', 'Group D'];

export function assignConventionGroup(band: FellowshipBand, members: Pick<Member, 'fellowshipBand' | 'conventionGroup'>[]): ConventionGroup {
  if (band === 'None') return 'Group E';
  return ASSIGNABLE_GROUPS.reduce((leastPopulated, group) => {
    const groupCount = members.filter(member => member.fellowshipBand !== 'None' && member.conventionGroup === group).length;
    const currentCount = members.filter(member => member.fellowshipBand !== 'None' && member.conventionGroup === leastPopulated).length;
    return groupCount < currentCount ? group : leastPopulated;
  }, ASSIGNABLE_GROUPS[0]);
}
