import {
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

import { User } from 'src/users/entities/user.entity';
import { Group } from 'src/groups/entities/group.entity';

@Entity('group_members')
@Unique(['group', 'user'])
export class GroupMember {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Group, (group) => group.members, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn()
  group!: Group;

  @ManyToOne(() => User, (user) => user.groupMemberships, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn()
  @Index()
  user!: User;

  @CreateDateColumn()
  joinedAt!: Date;
}