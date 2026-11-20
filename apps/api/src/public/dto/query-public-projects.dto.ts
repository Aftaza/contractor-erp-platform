// acme-backend/src/public/dto/query-public-projects.dto.ts
//
// Query `GET /public/projects` — pola sama `projects/dto/query-projects.dto.ts`.
// `perPage` default 50 (public.service.ts), maks 100 dari DTO bersama (SEC-3).
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class QueryPublicProjectsDto extends PaginationQueryDto {}
