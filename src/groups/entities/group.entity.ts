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

import { User } from '../../users/entities/user.entity';
import { GroupMember } from '../../group-members/entities/group-member.entity';

@Entity('groups')
export class Group {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  @Column({ type: 'varchar', nullable: true })
  description!: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @DeleteDateColumn()
  deletedAt!: Date | null;

  // Owning side of the creator relationship — creatorId FK lives here.
  //
  // onDelete: 'RESTRICT' — deliberate: deleting a user who owns groups is
  // blocked at the DB level instead of silently orphaning or cascading
  // deletion of their groups. The user-deletion service must check
  // createdGroups.length (or catch the FK violation) and surface a clean
  // domain error instead of letting the raw constraint error bubble up.
  // Longer-term product decision (transfer ownership / block / soft-delete
  // creator) is intentionally deferred until Settl needs it.
  @ManyToOne(() => User, (user) => user.createdGroups, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn()
  @Index() // FKs aren't auto-indexed in Postgres; needed for "groups by creator" lookups
  creator!: User;

  // Inverse side only — groupId FK lives on GroupMember.
  @OneToMany(() => GroupMember, (groupMember) => groupMember.group)
  members!: GroupMember[];
}