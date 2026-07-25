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

  // 6-digit numeric join code, globally unique. Rotating it invalidates old
  // links. Short code is guessable, so it carries an expiry (below).
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 6 })
  inviteCode!: string;

  // Validity window for the invite code. Null = never expires.
  @Column({ type: 'timestamptz', nullable: true })
  inviteCodeExpiresAt!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Soft-delete = archive. restore() brings the group back.
  @DeleteDateColumn()
  deletedAt!: Date | null;

  // Owning side of the creator relationship — creatorId FK lives here.
  //
  // onDelete: 'RESTRICT' — deliberate: deleting a user who owns groups is
  // blocked at the DB level instead of silently orphaning or cascading
  // deletion of their groups. Keep in sync with GroupMember role OWNER
  // whenever ownership transfers.
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
