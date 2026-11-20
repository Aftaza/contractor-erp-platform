// acme-backend/src/reports/dto/query-reports.dto.ts
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

/** Query `GET /reports/{projects,progress}` — bentuk list master §3.2 (`page`, `perPage`). */
export class QueryReportsDto extends PaginationQueryDto {}
