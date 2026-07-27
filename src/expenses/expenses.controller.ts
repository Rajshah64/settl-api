import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ExpensesService } from './expenses.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { ListExpensesQueryDto } from './dto/list-expenses-query.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import type { AuthenticatedRequest } from '../common/types/authenticated-request';

@Controller('groups/:groupId/expenses')
@UseGuards(JwtAuthGuard)
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Post()
  @HttpCode(201)
  create(
    @Param('groupId', ParseIntPipe) groupId: number,
    @Body() dto: CreateExpenseDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.expensesService.create(groupId, req.user.id, dto);
  }

  @Get()
  list(
    @Param('groupId', ParseIntPipe) groupId: number,
    @Query() query: ListExpensesQueryDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.expensesService.list(
      groupId,
      req.user.id,
      query.page ?? 1,
      query.limit ?? 20,
    );
  }

  @Get(':expenseId')
  findOne(
    @Param('groupId', ParseIntPipe) groupId: number,
    @Param('expenseId', ParseIntPipe) expenseId: number,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.expensesService.findOne(groupId, expenseId, req.user.id);
  }

  @Patch(':expenseId')
  update(
    @Param('groupId', ParseIntPipe) groupId: number,
    @Param('expenseId', ParseIntPipe) expenseId: number,
    @Body() dto: UpdateExpenseDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.expensesService.update(groupId, expenseId, req.user.id, dto);
  }

  @Delete(':expenseId')
  @HttpCode(204)
  async remove(
    @Param('groupId', ParseIntPipe) groupId: number,
    @Param('expenseId', ParseIntPipe) expenseId: number,
    @Req() req: AuthenticatedRequest,
  ): Promise<void> {
    await this.expensesService.softDelete(groupId, expenseId, req.user.id);
  }
}
