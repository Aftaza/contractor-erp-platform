// acme-backend/src/projects/dto/query-projects.dto.ts
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

/** Query `GET /projects` — bentuk list master §3.2 (`page`, `perPage`). */
export class QueryProjectsDto extends PaginationQueryDto {}
