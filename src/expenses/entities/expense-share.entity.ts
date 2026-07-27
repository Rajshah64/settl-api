import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Expense } from './expense.entity';
import { User } from '../../users/entities/user.entity';

@Entity('expense_shares')
@Unique(['expense', 'user'])
export class ExpenseShare {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Expense, (expense) => expense.shares, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn()
  @Index()
  expense!: Expense;

  @ManyToOne(() => User, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn()
  @Index()
  user!: User;

  /**
   * This participant's share in paise. Sum of shares for an expense
   * must equal expense.amountPaise.
   */
  @Column({ type: 'bigint' })
  amountPaise!: string;
}
