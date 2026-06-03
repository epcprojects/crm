import {
  Body,
  Controller,
  Get,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { UsersService } from './users.service';
import { InviteUserDto } from './dto/invite-user.dto';
import { ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { GetUser } from '../../../common/decorators/get-user.decorator';
import { SystemRoles } from '@harperhelp/types';

@Controller('users')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @ApiOperation({
    summary: 'Get current logged in user',
  })
  @Get('myself')
  getMyUser(@GetUser() user) {
    return this.usersService.getMyself(user);
  }

  @Roles(SystemRoles.SUPER_ADMIN, SystemRoles.ADMIN)
  @Post('invite/project')
  @ApiOperation({
    summary: 'Invite user to project',
  })
  async inviteToProject(
    @Body() dto: InviteUserDto,
    @GetUser() currentUser,
  ) {
    return this.usersService.inviteToProject(dto, currentUser);
  }

}
