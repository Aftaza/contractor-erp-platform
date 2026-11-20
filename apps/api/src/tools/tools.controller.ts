// acme-backend/src/tools/tools.controller.ts
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
import { CreateToolDto } from './dto/create-tool.dto';
import { QueryToolsDto } from './dto/query-tools.dto';
import { ToolListResponseDto, ToolResponseDto } from './dto/tool-response.dto';
import { UpdateToolStatusDto } from './dto/update-tool-status.dto';
import { UpdateToolDto } from './dto/update-tool.dto';
import { ToolsService } from './tools.service';

interface RequestWithUser {
  user?: AuthenticatedUser;
}

/**
 * `tools` — WP-18 (fase-2-keuangan-operasional.md §4). Matriks master §4.8:
 * "tools — CRUD + update status" = pimpinan ✅ admin ❌ staff_gudang ✅ —
 * satu-satunya baris di seluruh matriks di mana admin punya hak LEBIH
 * SEDIKIT dari staff_gudang. `@Roles()` di sini murni gerbang `RolesGuard`;
 * tak ada `if (role === ...)` — Baris matriks: `test/authz/rows/tools.rows.ts`.
 */
@Controller('tools')
export class ToolsController {
  constructor(private readonly toolsService: ToolsService) {}

  @Roles('pimpinan', 'admin', 'staff_gudang')
  @ApiOkResponse({ type: ToolListResponseDto })
  @Get()
  findAll(@Query() query: QueryToolsDto) {
    return this.toolsService.findAll(query);
  }

  @Roles('pimpinan', 'admin', 'staff_gudang')
  @ApiOkResponse({ type: ToolResponseDto })
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.toolsService.findOne(id);
  }

  @Roles('pimpinan', 'staff_gudang')
  @ApiCreatedResponse({ type: ToolResponseDto })
  @Post()
  create(@Body() dto: CreateToolDto, @Req() req: RequestWithUser) {
    // RolesGuard sudah menjamin req.user ada (bukan anonim) di titik ini.
    const userId = (req.user as AuthenticatedUser).id;
    return this.toolsService.create(dto, userId);
  }

  @Roles('pimpinan', 'staff_gudang')
  @ApiOkResponse({ type: ToolResponseDto })
  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateToolDto) {
    return this.toolsService.update(id, dto);
  }

  @Roles('pimpinan')
  @ApiNoContentResponse()
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: RequestWithUser,
  ) {
    await this.toolsService.remove(id, (req.user as AuthenticatedUser).id);
  }

  @Roles('pimpinan', 'staff_gudang')
  @ApiOkResponse({ type: ToolResponseDto })
  @Patch(':id/status')
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateToolStatusDto,
  ) {
    return this.toolsService.updateStatus(id, dto);
  }
}
