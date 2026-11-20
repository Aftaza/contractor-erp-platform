// acme-backend/src/expenses/dto/update-expense.dto.ts
import { PartialType } from '@nestjs/swagger';
import { CreateExpenseDto } from './create-expense.dto';

/** Semua field `CreateExpenseDto`, opsional — pola sama `UpdateProjectDto`. */
export class UpdateExpenseDto extends PartialType(CreateExpenseDto) {}
