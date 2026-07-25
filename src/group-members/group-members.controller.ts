import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  ParseIntPipe,
  UseGuards,
  Req,
  HttpCode,
} from '@nestjs/common';
import { GroupMembersService } from './group-members.service';
import { AddGroupMemberDto } from './dto/add-group-member.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import type { AuthenticatedRequest } from '../common/types/authenticated-request';

@Controller('groups/:groupId/members')
@UseGuards(JwtAuthGuard)
export class GroupMembersController {
  constructor(private readonly groupMembersService: GroupMembersService) {}

  @Get()
  list(
    @Param('groupId', ParseIntPipe) groupId: number,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.groupMembersService.listByGroup(groupId, req.user.id);
  }

  @Post()
  add(
    @Param('groupId', ParseIntPipe) groupId: number,
    @Body() dto: AddGroupMemberDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.groupMembersService.addMember(groupId, dto.userId, req.user.id);
  }

  @Delete(':userId')
  @HttpCode(204)
  async remove(
    @Param('groupId', ParseIntPipe) groupId: number,
    @Param('userId', ParseIntPipe) userId: number,
    @Req() req: AuthenticatedRequest,
  ): Promise<void> {
    await this.groupMembersService.removeMember(groupId, userId, req.user.id);
  }
}
