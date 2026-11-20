// acme-backend/src/vendors/vendors.controller.ts
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
import { CreateVendorDto } from './dto/create-vendor.dto';
import { QueryVendorsDto } from './dto/query-vendors.dto';
import { UpdateVendorDto } from './dto/update-vendor.dto';
import {
  VendorListResponseDto,
  VendorResponseDto,
} from './dto/vendor-response.dto';
import { VendorsService } from './vendors.service';

interface RequestWithUser {
  user?: AuthenticatedUser;
}

/**
 * `vendors` — WP-12. Otorisasi murni `@Roles('pimpinan','admin')` (master
 * §4.8: "clients, vendors — CRUD: pimpinan ✅ admin ✅ staff_gudang ❌") —
 * TAK ADA `if (role === ...)` di sini. Baris matriks:
 * `test/authz/rows/vendors.rows.ts`.
 */
@Controller('vendors')
export class VendorsController {
  constructor(private readonly vendorsService: VendorsService) {}

  @Roles('pimpinan', 'admin')
  @ApiOkResponse({ type: VendorListResponseDto })
  @Get()
  findAll(@Query() query: QueryVendorsDto) {
    return this.vendorsService.findAll(query);
  }

  @Roles('pimpinan', 'admin')
  @ApiOkResponse({ type: VendorResponseDto })
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.vendorsService.findOne(id);
  }

  @Roles('pimpinan', 'admin')
  @ApiCreatedResponse({ type: VendorResponseDto })
  @Post()
  create(@Body() dto: CreateVendorDto, @Req() req: RequestWithUser) {
    // RolesGuard sudah menjamin req.user ada (bukan anonim) di titik ini.
    const userId = (req.user as AuthenticatedUser).id;
    return this.vendorsService.create(dto, userId);
  }

  @Roles('pimpinan', 'admin')
  @ApiOkResponse({ type: VendorResponseDto })
  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateVendorDto) {
    return this.vendorsService.update(id, dto);
  }

  @Roles('pimpinan')
  @ApiNoContentResponse()
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: RequestWithUser,
  ) {
    await this.vendorsService.remove(id, (req.user as AuthenticatedUser).id);
  }
}
