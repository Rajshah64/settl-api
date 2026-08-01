import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Req,
  UseGuards,
  ParseIntPipe,
  HttpCode,
} from '@nestjs/common';
import { GroupsService } from './groups.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { TransferOwnershipDto } from './dto/transfer-ownership.dto';
import { JoinGroupDto } from './dto/join-group.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import type { AuthenticatedRequest } from '../common/types/authenticated-request';

@Controller('groups')
@UseGuards(JwtAuthGuard)
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Post()
  @HttpCode(201)
  create(
    @Body() createGroupDto: CreateGroupDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.groupsService.create(createGroupDto, req.user.id);
  }

  @Get()
  findMine(@Req() req: AuthenticatedRequest) {
    return this.groupsService.findMyGroups(req.user.id);
  }

  // Static path before :id
  @Get('archived')
  findArchived(@Req() req: AuthenticatedRequest) {
    return this.groupsService.findMyArchivedGroups(req.user.id);
  }

  // Static path before :id
  @Post('join')
  join(@Body() dto: JoinGroupDto, @Req() req: AuthenticatedRequest) {
    return this.groupsService.joinByCode(dto.code, req.user.id);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.groupsService.findOne(id, req.user.id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateGroupDto: UpdateGroupDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.groupsService.update(id, req.user.id, updateGroupDto);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ): Promise<void> {
    await this.groupsService.softDelete(id, req.user.id);
  }

  @Post(':id/restore')
  restore(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.groupsService.restore(id, req.user.id);
  }

  @Post(':id/invite-code')
  regenerateInviteCode(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.groupsService.regenerateInviteCode(id, req.user.id);
  }

  @Post(':id/transfer')
  transfer(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: TransferOwnershipDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.groupsService.transferOwnership(
      id,
      req.user.id,
      dto.newOwnerUserId,
    );
  }

  @Post(':id/leave')
  @HttpCode(204)
  async leave(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ): Promise<void> {
    await this.groupsService.leave(id, req.user.id);
  }
}
