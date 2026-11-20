import { Module } from '@nestjs/common';
import { PurchaseController } from './purchase.controller';
import { PurchaseService } from './purchase.service';

/** Nota pembelian (FR-FIN-3). `PrismaModule` @Global — tak perlu diimpor. */
@Module({
  controllers: [PurchaseController],
  providers: [PurchaseService],
})
export class PurchaseModule {}
