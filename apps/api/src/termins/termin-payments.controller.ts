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
  ApiNoContentResponse,
  ApiOkResponse,
} from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { AuthenticatedUser } from '../common/guards/jwt-auth.guard';
import {
  CreateTerminPaymentDto,
  TerminPaymentResponseDto,
  UpdateTerminPaymentDto,
} from './dto/termin-payment.dto';
import { TerminResponseDto } from './dto/termin-response.dto';
import { TerminPaymentsService } from './termin-payments.service';

interface RequestWithUser {
  user?: AuthenticatedUser;
}

/** Pembayaran termin — SRS §3.2: catat/ubah/daftar P+A, hapus (soft) hanya pimpinan. */
@Controller()
export class TerminPaymentsController {
  constructor(private readonly payments: TerminPaymentsService) {}

  @Roles('pimpinan', 'admin')
  @ApiOkResponse({ type: [TerminPaymentResponseDto] })
  @Get('termins/:id/payments')
  findAll(@Param('id', ParseUUIDPipe) terminId: string) {
    return this.payments.findAll(terminId);
  }

  /** Respons = termin terbaru (status turunan, total dibayar, sisa). */
  @Roles('pimpinan', 'admin')
  @ApiCreatedResponse({ type: TerminResponseDto })
  @Post('termins/:id/payments')
  create(
    @Param('id', ParseUUIDPipe) terminId: string,
    @Body() dto: CreateTerminPaymentDto,
    @Req() req: RequestWithUser,
  ) {
    return this.payments.create(
      terminId,
      dto,
      (req.user as AuthenticatedUser).id,
    );
  }

  @Roles('pimpinan', 'admin')
  @ApiOkResponse({ type: TerminResponseDto })
  @Patch('termin-payments/:id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTerminPaymentDto,
  ) {
    return this.payments.update(id, dto);
  }

  @Roles('pimpinan')
  @ApiNoContentResponse()
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete('termin-payments/:id')
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: RequestWithUser,
  ) {
    await this.payments.remove(id, (req.user as AuthenticatedUser).id);
  }

  /** Pulihkan dari Tempat Sampah (FR-DEL-6); 422 bila jadi kelebihan bayar. */
  @Roles('pimpinan')
  @ApiNoContentResponse()
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('termin-payments/:id/restore')
  async restore(@Param('id', ParseUUIDPipe) id: string) {
    await this.payments.restore(id);
  }
}
