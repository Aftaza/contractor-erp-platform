// acme-backend/src/rab-import/rab-import.controller.ts
import {
  Controller,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiCreatedResponse } from '@nestjs/swagger';
import { AppRole, Roles } from '../common/decorators/roles.decorator';
import { AuthenticatedUser } from '../common/guards/jwt-auth.guard';
import { RabImportResultDto } from './dto/rab-import-result.dto';
import { RabImportService } from './rab-import.service';

interface RequestWithUser {
  user?: AuthenticatedUser;
}

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB — trust boundary (fase-1 §4 WP-15).

/**
 * `rab-import` — WP-15 (fase-1-vertikal-rab.md §4). Otorisasi murni
 * `@Roles()` (RolesGuard) — endpoint ini tak punya aturan bergantung state
 * di luar `rab_status='draft'` yang sudah ditolak eksplisit di service
 * (bukan lewat `PolicyService`, karena ini bukan salah satu dari dua aturan
 * yang didaftarkan di sana — lihat `policy.service.ts`).
 */
@Controller('projects')
export class RabImportController {
  constructor(private readonly rabImportService: RabImportService) {}

  @Roles('pimpinan', 'admin')
  @ApiConsumes('multipart/form-data')
  @ApiCreatedResponse({ type: RabImportResultDto })
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_FILE_SIZE_BYTES } }),
  )
  @Post(':id/rab/import')
  import(
    @Param('id', ParseUUIDPipe) projectId: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Req() req: RequestWithUser,
  ) {
    const role = (req.user as AuthenticatedUser).role as AppRole;
    return this.rabImportService.import(projectId, file, role);
  }
}
