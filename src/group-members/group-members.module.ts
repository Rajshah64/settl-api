import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GroupMembersService } from './group-members.service';
import { GroupMembersController } from './group-members.controller';
import { GroupMember } from './entities/group-member.entity';
import { User } from '../users/entities/user.entity';
import { Group } from '../groups/entities/group.entity';

@Module({
  imports: [TypeOrmModule.forFeature([GroupMember, User, Group])],
  controllers: [GroupMembersController],
  providers: [GroupMembersService],
  exports: [GroupMembersService],
})
export class GroupMembersModule {}
