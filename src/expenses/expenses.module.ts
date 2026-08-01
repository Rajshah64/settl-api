import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExpensesService } from './expenses.service';
import { ExpensesController } from './expenses.controller';
import { BalancesController } from './balances.controller';
import { Expense } from './entities/expense.entity';
import { ExpenseShare } from './entities/expense-share.entity';
import { Group } from '../groups/entities/group.entity';
import { User } from '../users/entities/user.entity';
import { GroupMembersModule } from '../group-members/group-members.module';
import { SettlementsModule } from '../settlements/settlements.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Expense, ExpenseShare, Group, User]),
    GroupMembersModule,
    SettlementsModule,
  ],
  controllers: [ExpensesController, BalancesController],
  providers: [ExpensesService],
  exports: [ExpensesService],
})
export class ExpensesModule {}
