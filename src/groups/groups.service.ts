import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { Group } from './entities/group.entity';
import { User } from '../users/entities/user.entity';
import { GroupMember } from '../group-members/entities/group-member.entity';

@Injectable()
export class GroupsService {
  constructor(
    @InjectRepository(Group)
    private readonly groupRepository: Repository<Group>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(GroupMember)
    private readonly groupMemberRepository: Repository<GroupMember>,
  ) {}

  async create(createGroupDto: CreateGroupDto, userId: number) {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException(`User with id ${userId} not found`);
    }

    const group = this.groupRepository.create({
      name: createGroupDto.name,
      description: createGroupDto.description ?? null,
      creator: user,
    });

    const savedGroup = await this.groupRepository.save(group);

    const membership = this.groupMemberRepository.create({
      group: savedGroup,
      user,
    });

    await this.groupMemberRepository.save(membership);

    return savedGroup;
  }

  findAll() {
    return `This action returns all groups`;
  }

  findOne(id: number) {
    return `This action returns a #${id} group`;
  }

  update(id: number, updateGroupDto: UpdateGroupDto): string {
    void updateGroupDto;
    return `This action updates a #${id} group`;
  }

  remove(id: number) {
    return `This action removes a #${id} group`;
  }
}
