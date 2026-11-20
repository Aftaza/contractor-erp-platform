// acme-backend/src/rab/dto/update-rab-node-progress.dto.ts
import { Percent } from '../../common/validation/validation.decorators';

/**
 * `PATCH /rab/nodes/:id/progress` — hanya node leaf (master §4.3, fase-1
 * §4 WP-14 aturan #3). Sumbu terpisah dari `RabService.update()`: endpoint
 * ini TAK melalui `PolicyService.canMutateRabNode` — baris matriks §4.8
 * "rab_nodes — progress_percent" mengizinkan pimpinan & admin TANPA
 * pengecualian `rab_status`, beda dari baris create/update/delete.
 */
export class UpdateRabNodeProgressDto {
  @Percent()
  progressPercent!: number;
}
