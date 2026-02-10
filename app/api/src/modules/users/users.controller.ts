import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AdminUpdateUserDto } from './dto/admin-update-user.dto';
import { ResourceOwner, Roles } from 'src/modules/iam/authorization/decorators';
import { UserRole } from '../../common/enums';

@Controller('users')
@ApiTags('Users')
@ApiBearerAuth('bearer')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Roles(UserRole.ADMIN)
  @Post()
  @ApiOperation({ summary: 'Create a new user (admin only)' })
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Roles(UserRole.ADMIN)
  @Get()
  @ApiOperation({ summary: 'List all users (admin only)' })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search by email, first name, or last name',
  })
  @ApiQuery({
    name: 'first',
    required: false,
    type: Number,
    description: 'Number of items to fetch (max 100)',
  })
  @ApiQuery({
    name: 'after',
    required: false,
    type: String,
    description: 'Cursor for pagination',
  })
  findAll(
    @Query('search') search?: string,
    @Query('first') first?: string,
    @Query('after') after?: string,
  ) {
    return this.usersService.findAll({
      search,
      first: first ? parseInt(first, 10) : undefined,
      after,
    });
  }

  @Roles(UserRole.ADMIN, UserRole.USER)
  @ResourceOwner()
  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID (admin or resource owner)' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.findOne(id);
  }

  @Roles(UserRole.ADMIN, UserRole.USER)
  @ResourceOwner()
  @Patch(':id')
  @ApiOperation({ summary: 'Update user profile (non-sensitive fields)' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.update(id, updateUserDto);
  }

  @Roles(UserRole.ADMIN)
  @Patch(':id/admin')
  @ApiOperation({ summary: 'Admin update user (role, status) - admin only' })
  adminUpdate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdminUpdateUserDto,
  ) {
    return this.usersService.adminUpdate(id, dto);
  }

  @Roles(UserRole.ADMIN)
  @Post(':id/unlock')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Unlock user account - admin only' })
  unlockUser(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.unlockUser(id);
  }

  @Roles(UserRole.ADMIN)
  @Post(':id/reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Trigger password reset email - admin only' })
  resetPassword(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.triggerPasswordReset(id);
  }

  @Roles(UserRole.ADMIN)
  @Delete(':id')
  @ApiOperation({ summary: 'Delete user (admin only)' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.remove(id);
  }
}
