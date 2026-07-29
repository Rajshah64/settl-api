import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './users/user.module';
import { ConfigModule} from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './users/entities/user.entity';
import { GroupsModule } from './groups/groups.module';
import { GroupMembersModule } from './group-members/group-members.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
  
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DATABASE_HOST,
      port: Number(process.env.DATABASE_PORT),
      username: process.env.DATABASE_USER,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME,
      entities: [User],
      synchronize: true,
    }),
  AuthModule,
  UserModule,
  GroupsModule,
  GroupMembersModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
