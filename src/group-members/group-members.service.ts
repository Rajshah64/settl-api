import { Injectable } from '@nestjs/common';
import { CreateGroupMemberDto } from './dto/create-group-member.dto';
import { UpdateGroupMemberDto } from './dto/update-group-member.dto';

@Injectable()
export class GroupMembersService {
  create(createGroupMemberDto: CreateGroupMemberDto): string {
    void createGroupMemberDto;
    return 'This action adds a new groupMember';
  }

  findAll() {
    return `This action returns all groupMembers`;
  }

  findOne(id: number) {
    return `This action returns a #${id} groupMember`;
  }

  update(id: number, updateGroupMemberDto: UpdateGroupMemberDto): string {
    void updateGroupMemberDto;
    return `This action updates a #${id} groupMember`;
  }

  remove(id: number) {
    return `This action removes a #${id} groupMember`;
  }
}
