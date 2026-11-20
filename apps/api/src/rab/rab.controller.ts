// acme-backend/src/rab/rab.controller.ts
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
  Req,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { AppRole, Roles } from '../common/decorators/roles.decorator';
import { AuthenticatedUser } from '../common/guards/jwt-auth.guard';
import { WarningsErrorDto } from '../common/warnings';
import { ProjectResponseDto } from '../projects/dto/project-response.dto';
import { CreateRabNodeDto } from './dto/create-rab-node.dto';
import {
  RabNodeResponseDto,
  RabNodeTreeResponseDto,
} from './dto/rab-node-response.dto';
import { RabSummaryResponseDto } from './dto/rab-summary-response.dto';
import { UpdateRabNodeProgressDto } from './dto/update-rab-node-progress.dto';
import { UpdateRabNodeDto } from './dto/update-rab-node.dto';
import { RabService } from './rab.service';

interface RequestWithUser {
  user?: AuthenticatedUser;
}

/**
 * `rab` — WP-14 (fase-1-vertikal-rab.md §4, simpul tersibuk jalur kritis
 * master §11.4). Route CAMPURAN disengaja (fase-1 §2.5): koleksi
 * node-scoped per-proyek (`/projects/:id/rab/...`), operasi per-node global
 * (`/rab/nodes/:id[...]`) — `rab_status` diambil lewat `project_id` node
 * di service, tak butuh param proyek di path itu. `@Controller()` TANPA
 * prefix supaya tiap handler bisa mendeklarasikan path absolutnya sendiri.
 *
 * Otorisasi DUA LAPIS, JANGAN DICAMPUR (fase-0 pelajaran #5, README "Yang
 * PENTING dipahami"): `@Roles()` di sini murni gerbang kasar RolesGuard —
 * baris matriks `test/authz/rows/rab.rows.ts` MENGGAMBARKAN dekorator ini
 * apa adanya (`allow('pimpinan','admin')` untuk mutasi node, WALAUPUN admin
 * bisa saja ditolak belakangan). Penolakan admin saat `rab_status='approved'`
 * datang dari `PolicyService.canMutateRabNode`, dipanggil `RabService` —
 * TAK ADA `if (role === ...)` di controller ini.
 */
@Controller()
export class RabController {
  constructor(private readonly rabService: RabService) {}

  @Roles('pimpinan', 'admin')
  @ApiOkResponse({ type: RabNodeTreeResponseDto, isArray: true })
  @Get('projects/:id/rab/nodes')
  getTree(@Param('id', ParseUUIDPipe) projectId: string) {
    return this.rabService.getTree(projectId);
  }

  @Roles('pimpinan', 'admin')
  @ApiCreatedResponse({ type: RabNodeResponseDto })
  @Post('projects/:id/rab/nodes')
  create(
    @Param('id', ParseUUIDPipe) projectId: string,
    @Body() dto: CreateRabNodeDto,
    @Req() req: RequestWithUser,
  ) {
    // RolesGuard sudah menjamin req.user ada (bukan anonim) di titik ini.
    const role = (req.user as AuthenticatedUser).role as AppRole;
    return this.rabService.create(projectId, dto, role);
  }

  @Roles('pimpinan', 'admin')
  @ApiOkResponse({ type: RabNodeResponseDto })
  @ApiUnprocessableEntityResponse({ type: WarningsErrorDto })
  @Patch('rab/nodes/:id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRabNodeDto,
    @Req() req: RequestWithUser,
  ) {
    const role = (req.user as AuthenticatedUser).role as AppRole;
    return this.rabService.update(id, dto, role);
  }

  @Roles('pimpinan', 'admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete('rab/nodes/:id')
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: RequestWithUser,
  ) {
    const user = req.user as AuthenticatedUser;
    await this.rabService.remove(id, user.role as AppRole, user.id);
  }

  @Roles('pimpinan', 'admin')
  @ApiOkResponse({ type: RabNodeResponseDto })
  @Patch('rab/nodes/:id/progress')
  updateProgress(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRabNodeProgressDto,
  ) {
    return this.rabService.updateProgress(id, dto);
  }

  @Roles('pimpinan')
  @ApiOkResponse({ type: ProjectResponseDto })
  @Post('projects/:id/rab/approve')
  approve(
    @Param('id', ParseUUIDPipe) projectId: string,
    @Req() req: RequestWithUser,
  ) {
    const user = req.user as AuthenticatedUser;
    return this.rabService.approve(projectId, user.id);
  }

  @Roles('pimpinan', 'admin')
  @ApiOkResponse({ type: RabSummaryResponseDto })
  @Get('projects/:id/rab/summary')
  summary(@Param('id', ParseUUIDPipe) projectId: string) {
    return this.rabService.summary(projectId);
  }
}
