import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ExpensesService } from './expenses.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import type { AuthenticatedRequest } from '../common/types/authenticated-request';

@Controller('groups/:groupId/balances')
@UseGuards(JwtAuthGuard)
export class BalancesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Get()
  getBalances(
    @Param('groupId', ParseIntPipe) groupId: number,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.expensesService.getBalances(groupId, req.user.id);
  }
}
