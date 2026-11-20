// acme-backend/src/uploads/uploads.controller.ts
import {
  Controller,
  Get,
  Param,
  Post,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiConsumes,
  ApiCreatedResponse,
  ApiOkResponse,
} from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { UploadedFileDto } from './dto/uploaded-file.dto';
import { UploadResultDto } from './dto/upload-result.dto';
import { UploadsService } from './uploads.service';

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB — §2.7, pola rab-import.controller.ts:39.

/**
 * `uploads` — WP-21 (fase-3-pelaporan-publikasi.md §2.7, §4 WP-21). Batas
 * kepercayaan: `GET /uploads/:filename` publik (foto portfolio dikonsumsi
 * situs anonim); `POST /uploads` pimpinan-only. Baris matriks:
 * `test/authz/rows/uploads.rows.ts`.
 */
@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Roles('pimpinan')
  @ApiConsumes('multipart/form-data')
  @ApiCreatedResponse({ type: UploadResultDto })
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_FILE_SIZE_BYTES } }),
  )
  @Post()
  upload(@UploadedFile() file: Express.Multer.File | undefined) {
    return this.uploadsService.save(file);
  }

  @Public()
  @ApiOkResponse({ type: UploadedFileDto })
  @Get(':filename')
  read(@Param('filename') filename: string): StreamableFile {
    return this.uploadsService.read(filename);
  }
}
