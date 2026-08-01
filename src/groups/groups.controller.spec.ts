import { Test, TestingModule } from '@nestjs/testing';
import { GroupsController } from './groups.controller';
import { GroupsService } from './groups.service';

describe('GroupsController', () => {
  let controller: GroupsController;

  const groupsServiceMock = {
    create: jest.fn(),
    findMyGroups: jest.fn(),
    findMyArchivedGroups: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
    restore: jest.fn(),
    transferOwnership: jest.fn(),
    joinByCode: jest.fn(),
    leave: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GroupsController],
      providers: [{ provide: GroupsService, useValue: groupsServiceMock }],
    }).compile();

    controller = module.get<GroupsController>(GroupsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
