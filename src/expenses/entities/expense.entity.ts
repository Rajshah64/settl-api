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
import { Group } from '../../groups/entities/group.entity';
import { User } from '../../users/entities/user.entity';
import { ExpenseShare } from './expense-share.entity';

@Entity('expenses')
export class Expense {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 200 })
  description!: string;

  /**
   * Total amount in minor currency units (paise for INR).
   * Never use floats for money — store integers only.
   */
  @Column({ type: 'bigint' })
  amountPaise!: string;

  @Column({ type: 'varchar', length: 3, default: 'INR' })
  currency!: string;

  @Column({ type: 'timestamptz' })
  spentAt!: Date;

  @ManyToOne(() => Group, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn()
  @Index()
  group!: Group;

  @ManyToOne(() => User, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn()
  @Index()
  paidBy!: User;

  @OneToMany(() => ExpenseShare, (share) => share.expense)
  shares!: ExpenseShare[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @DeleteDateColumn()
  deletedAt!: Date | null;
}
