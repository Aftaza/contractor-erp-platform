// acme-backend/src/project-tools/dto/query-project-tools.dto.ts
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

/** Query `GET /projects/:id/project-tools` — bentuk list master §3.2. */
export class QueryProjectToolsDto extends PaginationQueryDto {}
