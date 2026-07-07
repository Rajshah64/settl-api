import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { Group } from '../../groups/entities/group.entity';
import { GroupMember } from '../../group-members/entities/group-member.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  firstName!: string;

  @Column()
  lastName!: string;

  // NOTE: uniqueness is DB-enforced only while deleted_at IS NULL is not filtered.
  // A soft-deleted user's email still occupies this unique constraint, blocking
  // re-signup with the same email. Deferred fix: replace with a Postgres partial
  // unique index (CREATE UNIQUE INDEX ... WHERE deleted_at IS NULL) via migration
  // once account deletion actually ships. Do not substitute a service-layer
  // check — it has a race condition; this is a DB-level invariant.
  @Column({ unique: true })
  email!: string;

  // select: false — excluded from default SELECTs so a hash never accidentally
  // leaks into an API response/log. Use .addSelect('user.password') explicitly
  // wherever it's actually needed (auth service only).
  @Column({ select: false })
  password!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Soft delete: sets this instead of removing the row. Normal queries
  // auto-exclude soft-deleted rows; pass { withDeleted: true } to include them.
  @DeleteDateColumn()
  deletedAt!: Date | null;

  // Inverse side only — no FK column here. The creatorId FK physically
  // lives on Group (the @ManyToOne side owns the column).
  @OneToMany(() => Group, (group) => group.creator)
  createdGroups!: Group[];

  // Inverse side only — the userId FK physically lives on GroupMember.
  @OneToMany(() => GroupMember, (groupMember) => groupMember.user)
  groupMemberships!: GroupMember[];
}