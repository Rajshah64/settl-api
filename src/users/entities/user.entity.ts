import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { Group } from 'src/groups/entities/group.entity';
import { GroupMember } from 'src/group-members/entities/group-member.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  firstName!: string;

  @Column()
  lastName!: string;

  @Column({ unique: true })
  email!: string;

  @Column({ select: false })
  password!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @DeleteDateColumn()
  deletedAt!: Date | null;

  @OneToMany(() => Group, (group) => group.creator)
  createdGroups!: Group[];

  @OneToMany(() => GroupMember, (groupMember) => groupMember.user)
  groupMemberships!: GroupMember[];
}