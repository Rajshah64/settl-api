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
} from '@nestjs/common';
import { UserService } from './user.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
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

  // Static path segments must be declared before :id or Nest treats
  // "email" as an id and ParseIntPipe rejects the request.
  @Get('email/:email')
  findByEmail(@Param('email') email: string) {
    return this.userService.findByEmail(email);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.userService.findOne(id);
  }
}
