import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { TRASH_TYPES } from '../soft-delete';
import type { TrashType } from '../soft-delete';

export class QueryTrashDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: TRASH_TYPES, enumName: 'TrashType' })
  @IsOptional()
  @IsIn(TRASH_TYPES, {
    message: `type harus salah satu dari: ${TRASH_TYPES.join(', ')}`,
  })
  type?: TrashType;
}
