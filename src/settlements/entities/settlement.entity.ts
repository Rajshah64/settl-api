import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Group } from '../../groups/entities/group.entity';
import { User } from '../../users/entities/user.entity';

/**
 * Recorded repayment: `fromUser` paid `toUser` `amountPaise` inside a group.
 * Soft-delete undoes the settlement for balance math.
 */
@Entity('settlements')
export class Settlement {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Group, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn()
  @Index()
  group!: Group;

  /** Debtor who paid (net position increases by amount). */
  @ManyToOne(() => User, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn()
  @Index()
  fromUser!: User;

  /** Creditor who received (net position decreases by amount). */
  @ManyToOne(() => User, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn()
  @Index()
  toUser!: User;

  @Column({ type: 'bigint' })
  amountPaise!: string;

  @Column({ type: 'varchar', length: 3, default: 'INR' })
  currency!: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  note!: string | null;

  /** Member who recorded this settlement. */
  @ManyToOne(() => User, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn()
  @Index()
  createdBy!: User;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @DeleteDateColumn()
  deletedAt!: Date | null;
}
