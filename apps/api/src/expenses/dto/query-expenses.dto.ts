// acme-backend/src/expenses/dto/query-expenses.dto.ts
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

/** Query `GET /projects/:id/expenses` — bentuk list master §3.2 (`page`, `perPage`). */
export class QueryExpensesDto extends PaginationQueryDto {}
