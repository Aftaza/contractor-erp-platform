// acme-backend/src/project-tools/project-tools.controller.ts
import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse } from '@nestjs/swagger';
import { AppRole, Roles } from '../common/decorators/roles.decorator';
import { AuthenticatedUser } from '../common/guards/jwt-auth.guard';
import { ApproveProjectToolDto } from './dto/approve-project-tool.dto';
import { CreateProjectToolDto } from './dto/create-project-tool.dto';
import {
  ProjectToolListResponseDto,
  ProjectToolResponseDto,
} from './dto/project-tool-response.dto';
import { QueryProjectToolsDto } from './dto/query-project-tools.dto';
import { UpdateProjectToolDto } from './dto/update-project-tool.dto';
import { ProjectToolsService } from './project-tools.service';

interface RequestWithUser {
  user?: AuthenticatedUser;
}

/**
 * `project-tools` — WP-18 (fase-2-keuangan-operasional.md §4). Route
 * CAMPURAN disengaja, sama pola `RabController` (fase-1 §2.5): koleksi
 * node-scoped per-proyek (`/projects/:id/project-tools`), operasi per-baris
 * global (`/project-tools/:id[...]`). `@Controller()` TANPA prefix.
 *
 * Otorisasi DUA LAPIS, JANGAN DICAMPUR: `@Roles()` di sini murni gerbang
 * `RolesGuard` — baris matriks `test/authz/rows/project-tools.rows.ts`
 * MENGGAMBARKAN dekorator ini apa adanya. Penolakan staff_gudang atas baris
 * milik orang lain / non-`pending` datang dari
 * `PolicyService.canMutateProjectTool`, dipanggil `ProjectToolsService` —
 * TAK ADA `if (role === ...)` di controller ini.
 */
@Controller()
export class ProjectToolsController {
  constructor(private readonly projectToolsService: ProjectToolsService) {}

  @Roles('pimpinan', 'admin', 'staff_gudang')
  @ApiOkResponse({ type: ProjectToolListResponseDto })
  @Get('projects/:id/project-tools')
  findAllByProject(
    @Param('id', ParseUUIDPipe) projectId: string,
    @Query() query: QueryProjectToolsDto,
  ) {
    return this.projectToolsService.findAllByProject(projectId, query);
  }

  @Roles('pimpinan', 'staff_gudang')
  @ApiCreatedResponse({ type: ProjectToolResponseDto })
  @Post('projects/:id/project-tools')
  create(
    @Param('id', ParseUUIDPipe) projectId: string,
    @Body() dto: CreateProjectToolDto,
    @Req() req: RequestWithUser,
  ) {
    // RolesGuard sudah menjamin req.user ada (bukan anonim) di titik ini.
    const user = req.user as AuthenticatedUser;
    return this.projectToolsService.create(
      projectId,
      dto,
      user.id,
      user.role as AppRole,
    );
  }

  @Roles('pimpinan', 'staff_gudang')
  @ApiOkResponse({ type: ProjectToolResponseDto })
  @Patch('project-tools/:id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProjectToolDto,
    @Req() req: RequestWithUser,
  ) {
    const user = req.user as AuthenticatedUser;
    return this.projectToolsService.update(
      id,
      dto,
      user.id,
      user.role as AppRole,
    );
  }

  @Roles('pimpinan')
  @ApiOkResponse({ type: ProjectToolResponseDto })
  @Patch('project-tools/:id/approve')
  approve(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ApproveProjectToolDto,
    @Req() req: RequestWithUser,
  ) {
    const user = req.user as AuthenticatedUser;
    return this.projectToolsService.approve(id, dto, user.id);
  }
}
