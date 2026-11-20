// acme-backend/src/expenses/expenses.module.ts
import { Module } from '@nestjs/common';
import { ExpensesController } from './expenses.controller';
import { ExpensesService } from './expenses.service';

/**
 * Diisi WP-17. Modul ini SUDAH terdaftar di app.module.ts (dibekukan
 * WP-00) — file ini TAK PERNAH menyentuhnya (master §3.4). `PrismaService`
 * tak perlu diimpor eksplisit: `PrismaModule` sudah `@Global()`.
 */
@Module({
  controllers: [ExpensesController],
  providers: [ExpensesService],
})
export class ExpensesModule {}
