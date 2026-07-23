import {
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

import { User } from '../../users/entities/user.entity';
import { Group } from '../../groups/entities/group.entity';

// Join table promoted to a full entity (instead of @ManyToMany) because it
// carries its own data beyond the two FKs — joinedAt now, role later.
@Entity('group_members')
@Unique(['group', 'user']) // one membership row per (user, group) pair — DB-enforced
export class GroupMember {
  @PrimaryGeneratedColumn()
  id!: number;

  // onDelete: 'CASCADE' — if the group is deleted, its membership rows are
  // meaningless and should disappear with it. Safe, unambiguous default.
  @ManyToOne(() => Group, (group) => group.members, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn()
  @Index() // supports "all members of a group" lookups independently of the composite unique
  group!: Group;

  // onDelete: 'CASCADE' — if a user is deleted, their memberships in other
  // people's groups should disappear too. (Distinct from RESTRICT on
  // Group.creator, which concerns groups THEY own, not groups they've joined.)
  @ManyToOne(() => User, (user) => user.groupMemberships, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn()
  @Index() // supports "all groups a user belongs to" lookups
  user!: User;

  @CreateDateColumn()
  joinedAt!: Date;

  // FUTURE: role: GroupRole (enum OWNER | ADMIN | MEMBER), default MEMBER.
  // Deferred until role-based permissions are actually implemented.
}
