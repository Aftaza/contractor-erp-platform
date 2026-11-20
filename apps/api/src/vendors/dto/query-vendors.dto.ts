// acme-backend/src/vendors/dto/query-vendors.dto.ts
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

/** Query `GET /vendors` — bentuk list master §3.2 (`page`, `perPage`). */
export class QueryVendorsDto extends PaginationQueryDto {}
