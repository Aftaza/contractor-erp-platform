// acme-backend/src/expenses/expenses.controller.ts
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
import { CreateExpenseDto } from './dto/create-expense.dto';
import {
  ExpenseListResponseDto,
  ExpenseResponseDto,
} from './dto/expense-response.dto';
import { FinanceSummaryResponseDto } from './dto/finance-summary-response.dto';
import { QueryExpensesDto } from './dto/query-expenses.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { ExpensesService } from './expenses.service';

interface RequestWithUser {
  user?: AuthenticatedUser;
}

/**
 * `expenses` + `GET /projects/:id/finance/summary` — WP-17
 * (fase-2-keuangan-operasional.md §4, jalur kritis). Route per-item
 * item-scoped (`/expenses/:id`) — pola sama `termins.controller.ts`.
 * `finance/summary` duduk di sini (bukan modul terpisah) karena
 * `realisasiBiaya` butuh `Σ expenses.amount` — modul ini yang paling dekat
 * dengan data itu; `purchasedAmount` = Σ baris nota pembelian aktif dibaca
 * langsung lewat Prisma (FR-FIN-3). Otorisasi
 * SATU LAPIS: `@Roles('pimpinan','admin')`. TAK ADA `if (role === ...)`.
 */
@Controller()
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Roles('pimpinan', 'admin')
  @ApiOkResponse({ type: ExpenseListResponseDto })
  @Get('projects/:id/expenses')
  findAll(
    @Param('id', ParseUUIDPipe) projectId: string,
    @Query() query: QueryExpensesDto,
  ) {
    return this.expensesService.findAll(projectId, query);
  }

  @Roles('pimpinan', 'admin')
  @ApiCreatedResponse({ type: ExpenseResponseDto })
  @Post('projects/:id/expenses')
  create(
    @Param('id', ParseUUIDPipe) projectId: string,
    @Body() dto: CreateExpenseDto,
    @Req() req: RequestWithUser,
  ) {
    // RolesGuard sudah menjamin req.user ada (bukan anonim) di titik ini.
    const userId = (req.user as AuthenticatedUser).id;
    return this.expensesService.create(projectId, dto, userId);
  }

  @Roles('pimpinan', 'admin')
  @ApiOkResponse({ type: ExpenseResponseDto })
  @Patch('expenses/:id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateExpenseDto,
  ) {
    return this.expensesService.update(id, dto);
  }

  @Roles('pimpinan')
  @ApiNoContentResponse()
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete('expenses/:id')
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: RequestWithUser,
  ) {
    await this.expensesService.remove(id, (req.user as AuthenticatedUser).id);
  }

  @Roles('pimpinan', 'admin')
  @ApiOkResponse({ type: FinanceSummaryResponseDto })
  @Get('projects/:id/finance/summary')
  financeSummary(@Param('id', ParseUUIDPipe) projectId: string) {
    return this.expensesService.financeSummary(projectId);
  }
}
