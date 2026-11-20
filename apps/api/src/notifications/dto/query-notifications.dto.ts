// acme-backend/src/notifications/dto/query-notifications.dto.ts
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

/** Query `GET /notifications` — bentuk list master §3.2 (`page`, `perPage`). */
export class QueryNotificationsDto extends PaginationQueryDto {}
