// acme-backend/src/tools/dto/query-tools.dto.ts
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

/** Query `GET /tools` — bentuk list master §3.2 (`page`, `perPage`). */
export class QueryToolsDto extends PaginationQueryDto {}
