// acme-backend/src/termins/termins.controller.ts
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
import { CreateTerminDto } from './dto/create-termin.dto';
import { QueryTerminsDto } from './dto/query-termins.dto';
import {
  TerminListResponseDto,
  TerminResponseDto,
} from './dto/termin-response.dto';
import { UpdateTerminDto } from './dto/update-termin.dto';
import { TerminsService } from './termins.service';

interface RequestWithUser {
  user?: AuthenticatedUser;
}

/**
 * `termins` — WP-17 (fase-2-keuangan-operasional.md §4, jalur kritis).
 * Route per-item ITEM-SCOPED (`/termins/:id`, bukan `/projects/:id/termins/:id`)
 * — penyeragaman `fase-1-vertikal-rab.md` §2.5. `@Controller()` TANPA prefix
 * supaya tiap handler mendeklarasikan path absolutnya sendiri (pola sama
 * `rab.controller.ts`). Otorisasi SATU LAPIS: `@Roles('pimpinan','admin')`
 * cukup — spesifikasi paket ini tak menyebut aturan bergantung state. TAK
 * ADA `if (role === ...)` di sini.
 */
@Controller()
export class TerminsController {
  constructor(private readonly terminsService: TerminsService) {}

  @Roles('pimpinan', 'admin')
  @ApiOkResponse({ type: TerminListResponseDto })
  @Get('projects/:id/termins')
  findAll(
    @Param('id', ParseUUIDPipe) projectId: string,
    @Query() query: QueryTerminsDto,
  ) {
    return this.terminsService.findAll(projectId, query);
  }

  @Roles('pimpinan', 'admin')
  @ApiCreatedResponse({ type: TerminResponseDto })
  @Post('projects/:id/termins')
  create(
    @Param('id', ParseUUIDPipe) projectId: string,
    @Body() dto: CreateTerminDto,
    @Req() req: RequestWithUser,
  ) {
    // RolesGuard sudah menjamin req.user ada (bukan anonim) di titik ini.
    const userId = (req.user as AuthenticatedUser).id;
    return this.terminsService.create(projectId, dto, userId);
  }

  @Roles('pimpinan', 'admin')
  @ApiOkResponse({ type: TerminResponseDto })
  @Patch('termins/:id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateTerminDto) {
    return this.terminsService.update(id, dto);
  }

  @Roles('pimpinan')
  @ApiNoContentResponse()
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete('termins/:id')
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: RequestWithUser,
  ) {
    await this.terminsService.remove(id, (req.user as AuthenticatedUser).id);
  }
}
