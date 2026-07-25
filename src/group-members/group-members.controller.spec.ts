import { Test, TestingModule } from '@nestjs/testing';
import { GroupMembersController } from './group-members.controller';
import { GroupMembersService } from './group-members.service';

describe('GroupMembersController', () => {
  let controller: GroupMembersController;

  const groupMembersServiceMock = {
    listByGroup: jest.fn(),
    addMember: jest.fn(),
    removeMember: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GroupMembersController],
      providers: [
        { provide: GroupMembersService, useValue: groupMembersServiceMock },
      ],
    }).compile();

    controller = module.get<GroupMembersController>(GroupMembersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
