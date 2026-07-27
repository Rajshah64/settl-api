import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './users/user.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { User } from './users/entities/user.entity';
import { GroupsModule } from './groups/groups.module';
import { GroupMembersModule } from './group-members/group-members.module';
import { GroupMember } from './group-members/entities/group-member.entity';
import { Group } from './groups/entities/group.entity';
import { ExpensesModule } from './expenses/expenses.module';
import { Expense } from './expenses/entities/expense.entity';
import { ExpenseShare } from './expenses/entities/expense-share.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    // In-memory store for now. Swap storage to Redis (ioredis) when we
    // need shared limits across multiple API instances.
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          name: 'default',
          ttl: Number(config.get('THROTTLE_TTL_MS') ?? 60_000),
          limit: Number(config.get('THROTTLE_LIMIT') ?? 100),
        },
      ],
    }),

    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DATABASE_HOST,
      port: Number(process.env.DATABASE_PORT),
      username: process.env.DATABASE_USER,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME,
      entities: [User, Group, GroupMember, Expense, ExpenseShare],
      synchronize: true,
    }),
    AuthModule,
    UserModule,
    GroupsModule,
    GroupMembersModule,
    ExpensesModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
