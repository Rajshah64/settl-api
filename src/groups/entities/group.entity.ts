import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { User } from 'src/users/entities/user.entity';
import { GroupMember } from 'src/group-members/entities/group-member.entity';

@Entity('groups')
export class Group {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  @Column({ nullable: true })
  description!: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @DeleteDateColumn()
  deletedAt!: Date | null;

  @ManyToOne(() => User, (user) => user.createdGroups, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn()
  @Index()
  creator!: User;

  @OneToMany(() => GroupMember, (groupMember) => groupMember.group)
  members!: GroupMember[];
}