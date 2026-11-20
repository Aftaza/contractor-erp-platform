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
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { AuthenticatedUser } from '../common/guards/jwt-auth.guard';
import { WarningsErrorDto } from '../common/warnings';
import { CreatePurchaseNoteDto } from './dto/create-purchase-note.dto';
import {
  PurchaseNoteListResponseDto,
  PurchaseNoteResponseDto,
} from './dto/purchase-note-response.dto';
import { UpdatePurchaseNoteDto } from './dto/update-purchase-note.dto';
import { PurchaseService } from './purchase.service';

interface RequestWithUser {
  user?: AuthenticatedUser;
}

/** Nota pembelian (SRS FR-FIN-3, matriks §3.2). RolesGuard menjamin `req.user` ada. */
@Controller()
export class PurchaseController {
  constructor(private readonly purchaseService: PurchaseService) {}

  @Roles('pimpinan', 'admin')
  @ApiOkResponse({ type: PurchaseNoteListResponseDto })
  @Get('projects/:id/purchases')
  findAll(
    @Param('id', ParseUUIDPipe) projectId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.purchaseService.findAll(projectId, query);
  }

  @Roles('pimpinan', 'admin')
  @ApiCreatedResponse({ type: PurchaseNoteResponseDto })
  @ApiUnprocessableEntityResponse({ type: WarningsErrorDto })
  @Post('projects/:id/purchases')
  create(
    @Param('id', ParseUUIDPipe) projectId: string,
    @Body() dto: CreatePurchaseNoteDto,
    @Req() req: RequestWithUser,
  ) {
    const userId = (req.user as AuthenticatedUser).id;
    return this.purchaseService.create(projectId, dto, userId);
  }

  @Roles('pimpinan', 'admin')
  @ApiOkResponse({ type: PurchaseNoteResponseDto })
  @Get('purchases/:id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.purchaseService.findOne(id);
  }

  @Roles('pimpinan', 'admin')
  @ApiOkResponse({ type: PurchaseNoteResponseDto })
  @ApiUnprocessableEntityResponse({ type: WarningsErrorDto })
  @Patch('purchases/:id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePurchaseNoteDto,
    @Req() req: RequestWithUser,
  ) {
    const userId = (req.user as AuthenticatedUser).id;
    return this.purchaseService.update(id, dto, userId);
  }

  @Roles('pimpinan')
  @ApiNoContentResponse()
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete('purchases/:id')
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: RequestWithUser,
  ) {
    const userId = (req.user as AuthenticatedUser).id;
    await this.purchaseService.remove(id, userId);
  }
}
