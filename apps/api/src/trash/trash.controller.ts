import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiNoContentResponse, ApiOkResponse } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { QueryTrashDto } from './dto/query-trash.dto';
import { TrashListResponseDto } from './dto/trash-item-response.dto';
import { TrashService } from './trash.service';

/**
 * Tempat Sampah + pulihkan per resource (SRS §3.2 "Hapus aman", FR-DEL-6/8):
 * pimpinan saja. Route `POST /<resource>/:id/restore` dikumpulkan di sini
 * (bukan di controller modulnya) karena logikanya satu (`soft-delete.ts`).
 * Baris matriks: `test/authz/rows/trash.rows.ts`.
 */
@Roles('pimpinan')
@Controller()
export class TrashController {
  constructor(private readonly trash: TrashService) {}

  @ApiOkResponse({ type: TrashListResponseDto })
  @Get('trash')
  findAll(@Query() query: QueryTrashDto) {
    return this.trash.findAll(query);
  }

  @ApiNoContentResponse()
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('projects/:id/restore')
  restoreProject(@Param('id', ParseUUIDPipe) id: string) {
    return this.trash.restore('project', id);
  }

  @ApiNoContentResponse()
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('rab/nodes/:id/restore')
  restoreRabNode(@Param('id', ParseUUIDPipe) id: string) {
    return this.trash.restore('rab_node', id);
  }

  @ApiNoContentResponse()
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('termins/:id/restore')
  restoreTermin(@Param('id', ParseUUIDPipe) id: string) {
    return this.trash.restore('termin', id);
  }

  @ApiNoContentResponse()
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('expenses/:id/restore')
  restoreExpense(@Param('id', ParseUUIDPipe) id: string) {
    return this.trash.restore('expense', id);
  }

  @ApiNoContentResponse()
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('purchases/:id/restore')
  restorePurchaseNote(@Param('id', ParseUUIDPipe) id: string) {
    return this.trash.restore('purchase_note', id);
  }

  @ApiNoContentResponse()
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('clients/:id/restore')
  restoreClient(@Param('id', ParseUUIDPipe) id: string) {
    return this.trash.restore('client', id);
  }

  @ApiNoContentResponse()
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('vendors/:id/restore')
  restoreVendor(@Param('id', ParseUUIDPipe) id: string) {
    return this.trash.restore('vendor', id);
  }

  @ApiNoContentResponse()
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('tools/:id/restore')
  restoreTool(@Param('id', ParseUUIDPipe) id: string) {
    return this.trash.restore('tool', id);
  }
}
