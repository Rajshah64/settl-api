import { Module } from '@nestjs/common';
import { GroupsService } from './groups.service';
import { GroupsController } from './groups.controller';
import { Group } from './entities/group.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { GroupMember } from '../group-members/entities/group-member.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Group, User, GroupMember])],
  controllers: [GroupsController],
  providers: [GroupsService],
})
export class GroupsModule {}
