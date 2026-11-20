// acme-backend/src/projects/projects.controller.ts
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
import { CreateProjectDto } from './dto/create-project.dto';
import {
  ProjectListResponseDto,
  ProjectResponseDto,
} from './dto/project-response.dto';
import { QueryProjectsDto } from './dto/query-projects.dto';
import { UpdateProjectPublicationDto } from './dto/update-project-publication.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectsService } from './projects.service';

interface RequestWithUser {
  user?: AuthenticatedUser;
}

/**
 * `projects` — WP-13. Otorisasi murni lewat `@Roles()` (dicek `RolesGuard`,
 * global lewat `PolicyModule`) — TAK ADA `if (role === ...)` di sini (master
 * §5.2, fase-1 §4 WP-13). Baris matriks: `test/authz/rows/projects.rows.ts`.
 *
 * `@ApiOkResponse({ type: … })` WAJIB di tiap handler (U1, fase-1 §5b):
 * `lib/types/api.ts` di web di-generate dari openapi.json, dan tanpa deklarasi
 * tipe, schema response kosong — itu yang memaksa WP-34 menulis tipe tangan.
 * Dijaga `scripts/check-openapi-contract.ts`, bukan disiplin ingatan.
 */
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Roles('pimpinan', 'admin', 'staff_gudang')
  @ApiOkResponse({ type: ProjectListResponseDto })
  @Get()
  findAll(@Query() query: QueryProjectsDto) {
    return this.projectsService.findAll(query);
  }

  @Roles('pimpinan', 'admin', 'staff_gudang')
  @ApiOkResponse({ type: ProjectResponseDto })
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.projectsService.findOne(id);
  }

  @Roles('pimpinan', 'admin')
  @ApiCreatedResponse({ type: ProjectResponseDto })
  @Post()
  create(@Body() dto: CreateProjectDto, @Req() req: RequestWithUser) {
    // RolesGuard sudah menjamin req.user ada (bukan anonim) di titik ini.
    const userId = (req.user as AuthenticatedUser).id;
    return this.projectsService.create(dto, userId);
  }

  @Roles('pimpinan', 'admin')
  @ApiOkResponse({ type: ProjectResponseDto })
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProjectDto,
  ) {
    return this.projectsService.update(id, dto);
  }

  @Roles('pimpinan')
  @ApiNoContentResponse()
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: RequestWithUser,
  ) {
    await this.projectsService.remove(id, (req.user as AuthenticatedUser).id);
  }

  @Roles('pimpinan')
  @ApiOkResponse({ type: ProjectResponseDto })
  @Patch(':id/publication')
  updatePublication(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProjectPublicationDto,
  ) {
    return this.projectsService.updatePublication(id, dto);
  }
}
