import { PartialType } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';
import {
  DateInRange,
  LongText,
  Rupiah,
} from '../../common/validation/validation.decorators';

export class CreateTerminPaymentDto {
  @DateInRange()
  paymentDate!: string;

  /** Rupiah DPP, > 0. */
  @Rupiah()
  amount!: number;

  @IsOptional()
  @IsUUID()
  receiptDocumentId?: string;

  @IsOptional()
  @LongText()
  notes?: string;
}

export class UpdateTerminPaymentDto extends PartialType(
  CreateTerminPaymentDto,
) {}

export class TerminPaymentResponseDto {
  id: string;
  terminId: string;
  paymentDate: Date;
  amount: number;
  receiptDocumentId: string | null;
  notes: string | null;
  recordedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}
