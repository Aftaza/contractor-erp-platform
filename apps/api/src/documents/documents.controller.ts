import {
  Body,
  CallHandler,
  Controller,
  Delete,
  ExecutionContext,
  Get,
  HttpCode,
  HttpStatus,
  Injectable,
  NestInterceptor,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  Res,
  StreamableFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiConsumes,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiProduces,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { rmSync } from 'node:fs';
import { diskStorage } from 'multer';
import { Observable, finalize } from 'rxjs';
import { Roles } from '../common/decorators/roles.decorator';
import { AuthenticatedUser } from '../common/guards/jwt-auth.guard';
import {
  MAX_DOCUMENT_FILE_BYTES,
  MAX_FILES_PER_REQUEST,
} from './document-file.util';
import { DocumentsService, privateTempDir } from './documents.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import {
  DocumentListResponseDto,
  DocumentResponseDto,
} from './dto/document-response.dto';
import { QueryDocumentsDto } from './dto/query-documents.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';

interface RequestWithUser {
  user?: AuthenticatedUser;
}

/** SEC-12: multer menulis stream ke disk (bukan memori); nama sementara acak, bukan nama klien. */
const filesUpload = FilesInterceptor('files', MAX_FILES_PER_REQUEST, {
  storage: diskStorage({
    destination: (_req, _file, cb) => cb(null, privateTempDir()),
    filename: (_req, _file, cb) => cb(null, randomUUID()),
  }),
  limits: {
    fileSize: MAX_DOCUMENT_FILE_BYTES,
    files: MAX_FILES_PER_REQUEST,
    fields: 10,
    fieldSize: 16 * 1024,
  },
});

/**
 * Hapus berkas sementara multer setelah handler selesai — sukses (sudah
 * dipindah, `force` mengabaikan) maupun gagal (validasi DTO/magic byte).
 * Harus di DALAM `filesUpload` agar `req.files` sudah terisi.
 */
@Injectable()
class RemoveTempFilesInterceptor implements NestInterceptor {
  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = ctx.switchToHttp().getRequest<Request>();
    return next.handle().pipe(
      finalize(() => {
        const files = (req.files ?? []) as Express.Multer.File[];
        for (const f of files) rmSync(f.path, { force: true });
      }),
    );
  }
}

/**
 * Dokumen privat — SRS §3.9, matriks §3.2: pimpinan & admin; hapus/pulihkan
 * pimpinan; staff_gudang 403 di semua endpoint. Baris matriks:
 * `test/authz/rows/documents.rows.ts`.
 */
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Roles('pimpinan', 'admin')
  @ApiOkResponse({ type: DocumentListResponseDto })
  @Get()
  findAll(@Query() query: QueryDocumentsDto) {
    return this.documentsService.findAll(query);
  }

  @Roles('pimpinan', 'admin')
  @ApiOkResponse({ type: DocumentResponseDto })
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.documentsService.findOne(id);
  }

  @Roles('pimpinan', 'admin')
  @ApiConsumes('multipart/form-data')
  @ApiCreatedResponse({ type: DocumentResponseDto })
  @UseInterceptors(filesUpload, RemoveTempFilesInterceptor)
  @Post()
  create(
    @Body() dto: CreateDocumentDto,
    @UploadedFiles() files: Express.Multer.File[] | undefined,
    @Req() req: RequestWithUser,
  ) {
    return this.documentsService.create(
      dto,
      files,
      (req.user as AuthenticatedUser).id,
    );
  }

  @Roles('pimpinan', 'admin')
  @ApiOkResponse({ type: DocumentResponseDto })
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDocumentDto,
  ) {
    return this.documentsService.update(id, dto);
  }

  @Roles('pimpinan', 'admin')
  @ApiConsumes('multipart/form-data')
  @ApiCreatedResponse({ type: DocumentResponseDto })
  @UseInterceptors(filesUpload, RemoveTempFilesInterceptor)
  @Post(':id/files')
  addFiles(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFiles() files: Express.Multer.File[] | undefined,
  ) {
    return this.documentsService.addFiles(id, files);
  }

  @Roles('pimpinan', 'admin')
  @ApiProduces('application/octet-stream')
  @ApiOkResponse({ schema: { type: 'string', format: 'binary' } })
  @Get(':id/files/:fileId')
  async download(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('fileId', ParseUUIDPipe) fileId: string,
    @Req() req: RequestWithUser,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const { file, name, mime } = await this.documentsService.download(
      id,
      fileId,
      (req.user as AuthenticatedUser).id,
    );
    // res.attachment → Content-Disposition aman (filename* RFC 5987); Content-Type ditimpa mime hasil sniff.
    res.attachment(name);
    res.set({
      'Content-Type': mime,
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'private, no-store',
    });
    return file;
  }

  @Roles('pimpinan')
  @ApiNoContentResponse()
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: RequestWithUser,
  ) {
    await this.documentsService.remove(id, (req.user as AuthenticatedUser).id);
  }

  @Roles('pimpinan')
  @ApiOkResponse({ type: DocumentResponseDto })
  @HttpCode(HttpStatus.OK)
  @Post(':id/restore')
  restore(@Param('id', ParseUUIDPipe) id: string) {
    return this.documentsService.restore(id);
  }
}
