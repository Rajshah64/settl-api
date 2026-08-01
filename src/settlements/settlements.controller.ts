import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { SettlementsService } from './settlements.service';
import { CreateSettlementDto } from './dto/create-settlement.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import type { AuthenticatedRequest } from '../common/types/authenticated-request';

@Controller('groups/:groupId/settlements')
@UseGuards(JwtAuthGuard)
export class SettlementsController {
  constructor(private readonly settlementsService: SettlementsService) {}

  @Get()
  list(
    @Param('groupId', ParseIntPipe) groupId: number,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.settlementsService.list(groupId, req.user.id);
  }

  @Post()
  @HttpCode(201)
  create(
    @Param('groupId', ParseIntPipe) groupId: number,
    @Body() dto: CreateSettlementDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.settlementsService.create(groupId, req.user.id, dto);
  }

  @Delete(':settlementId')
  @HttpCode(204)
  async remove(
    @Param('groupId', ParseIntPipe) groupId: number,
    @Param('settlementId', ParseIntPipe) settlementId: number,
    @Req() req: AuthenticatedRequest,
  ): Promise<void> {
    await this.settlementsService.softDelete(
      groupId,
      settlementId,
      req.user.id,
    );
  }
}
