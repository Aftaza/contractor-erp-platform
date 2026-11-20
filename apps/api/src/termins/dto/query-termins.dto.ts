// acme-backend/src/termins/dto/query-termins.dto.ts
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

/** Query `GET /projects/:id/termins` — bentuk list master §3.2 (`page`, `perPage`). */
export class QueryTerminsDto extends PaginationQueryDto {}
