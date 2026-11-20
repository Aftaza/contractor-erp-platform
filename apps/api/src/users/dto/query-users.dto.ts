// acme-backend/src/users/dto/query-users.dto.ts
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

/** Query `GET /users` — bentuk list master §3.2 (`page`, `perPage`). */
export class QueryUsersDto extends PaginationQueryDto {}
