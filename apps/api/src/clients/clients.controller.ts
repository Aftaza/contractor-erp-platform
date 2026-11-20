// acme-backend/src/clients/clients.controller.ts
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
  Req,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
} from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { AuthenticatedUser } from '../common/guards/jwt-auth.guard';
import { ClientsService } from './clients.service';
import {
  ClientListResponseDto,
  ClientResponseDto,
} from './dto/client-response.dto';
import { CreateClientDto } from './dto/create-client.dto';
import { QueryClientsDto } from './dto/query-clients.dto';
import { UpdateClientDto } from './dto/update-client.dto';

interface RequestWithUser {
  user?: AuthenticatedUser;
}

/**
 * `clients` — WP-11. Otorisasi murni `@Roles('pimpinan','admin')` (master
 * §4.8: "clients, vendors — CRUD: pimpinan ✅ admin ✅ staff_gudang ❌") —
 * TAK ADA `if (role === ...)` di sini. Baris matriks:
 * `test/authz/rows/clients.rows.ts`.
 */
@Controller('clients')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Roles('pimpinan', 'admin')
  @ApiOkResponse({ type: ClientListResponseDto })
  @Get()
  findAll(@Query() query: QueryClientsDto) {
    return this.clientsService.findAll(query);
  }

  @Roles('pimpinan', 'admin')
  @ApiOkResponse({ type: ClientResponseDto })
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.clientsService.findOne(id);
  }

  @Roles('pimpinan', 'admin')
  @ApiCreatedResponse({ type: ClientResponseDto })
  @Post()
  create(@Body() dto: CreateClientDto, @Req() req: RequestWithUser) {
    // RolesGuard sudah menjamin req.user ada (bukan anonim) di titik ini.
    const userId = (req.user as AuthenticatedUser).id;
    return this.clientsService.create(dto, userId);
  }

  @Roles('pimpinan', 'admin')
  @ApiOkResponse({ type: ClientResponseDto })
  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateClientDto) {
    return this.clientsService.update(id, dto);
  }

  @Roles('pimpinan')
  @ApiNoContentResponse()
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: RequestWithUser,
  ) {
    await this.clientsService.remove(id, (req.user as AuthenticatedUser).id);
  }
}
