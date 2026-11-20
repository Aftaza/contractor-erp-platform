// acme-backend/src/clients/dto/query-clients.dto.ts
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

/** Query `GET /clients` — bentuk list master §3.2 (`page`, `perPage`). */
export class QueryClientsDto extends PaginationQueryDto {}
