import { Test, TestingModule } from '@nestjs/testing';
import { ExpensesController } from './expenses.controller';
import { ExpensesService } from './expenses.service';

describe('ExpensesController', () => {
  let controller: ExpensesController;

  const expensesServiceMock = {
    create: jest.fn(),
    list: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ExpensesController],
      providers: [{ provide: ExpensesService, useValue: expensesServiceMock }],
    }).compile();

    controller = module.get(ExpensesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
