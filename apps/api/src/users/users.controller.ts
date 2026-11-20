// acme-backend/src/users/users.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
} from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { CreateUserDto } from './dto/create-user.dto';
import { QueryUsersDto } from './dto/query-users.dto';
import { SetUserPasswordDto } from './dto/set-user-password.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserListResponseDto, UserResponseDto } from './dto/user-response.dto';
import { UsersService } from './users.service';

/**
 * `users` — WP-10 (fase-2 §4). Otorisasi murni `@Roles('pimpinan')` (master
 * §4.8: "users — CRUD, set password: pimpinan ✅, admin ❌, staff_gudang ❌")
 * — TAK ADA `if (role === ...)` di sini. Baris matriks:
 * `test/authz/rows/users.rows.ts`.
 */
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Roles('pimpinan')
  @ApiOkResponse({ type: UserListResponseDto })
  @Get()
  findAll(@Query() query: QueryUsersDto) {
    return this.usersService.findAll(query);
  }

  @Roles('pimpinan')
  @ApiOkResponse({ type: UserResponseDto })
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.findOne(id);
  }

  @Roles('pimpinan')
  @ApiCreatedResponse({ type: UserResponseDto })
  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Roles('pimpinan')
  @ApiOkResponse({ type: UserResponseDto })
  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }

  @Roles('pimpinan')
  @ApiOkResponse({ type: UserResponseDto })
  @Patch(':id/password')
  setPassword(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetUserPasswordDto,
  ) {
    return this.usersService.setPassword(id, dto);
  }

  @Roles('pimpinan')
  @ApiOkResponse({ type: UserResponseDto })
  @Patch(':id/unlock')
  unlock(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.unlock(id);
  }

  @Roles('pimpinan')
  @ApiNoContentResponse()
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.usersService.remove(id);
  }
}
