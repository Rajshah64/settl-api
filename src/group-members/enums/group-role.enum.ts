export enum GroupRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
}

/** Higher number = more privilege. Used for min-role checks. */
export const GROUP_ROLE_RANK: Record<GroupRole, number> = {
  [GroupRole.MEMBER]: 1,
  [GroupRole.ADMIN]: 2,
  [GroupRole.OWNER]: 3,
};

export function hasMinRole(actual: GroupRole, minimum: GroupRole): boolean {
  return GROUP_ROLE_RANK[actual] >= GROUP_ROLE_RANK[minimum];
}
