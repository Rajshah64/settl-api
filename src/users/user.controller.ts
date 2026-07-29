import {
  Controller,
  Get,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  UseGuards,
  Req,
  HttpCode,
  Query,
} from '@nestjs/common';
import { UserService } from './user.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { SearchUsersDto } from './dto/search-users.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import type { AuthenticatedRequest } from '../common/types/authenticated-request';

@Controller('user')
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('me')
  getMe(@Req() req: AuthenticatedRequest) {
    return this.userService.findOne(req.user.id);
  }

  @Patch('me')
  updateMe(
    @Req() req: AuthenticatedRequest,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    return this.userService.updateProfile(req.user.id, updateProfileDto);
  }

  @Delete('me')
  @HttpCode(204)
  async deleteMe(@Req() req: AuthenticatedRequest): Promise<void> {
    await this.userService.softDeleteAccount(req.user.id);
  }

  // Static paths before :id — otherwise Nest captures "search" / "email" as ids.
  @Get('search')
  search(@Query() query: SearchUsersDto) {
    return this.userService.search(query.q, query.page ?? 1, query.limit ?? 20);
  }

  @Get('email/:email')
  findByEmail(@Param('email') email: string) {
    return this.userService.findByEmail(email);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.userService.findOne(id);
  }
}
