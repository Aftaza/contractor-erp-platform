// Peringatan non-blokir pola A (SRS FR-NTF-7): request tanpa
// `acknowledgeWarnings: true` tidak disimpan dan dibalas 422 `Warnings`;
// klien mengirim ulang dengan `acknowledgeWarnings: true` untuk tetap menyimpan.
import { UnprocessableEntityException } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';

export class ApiWarningDto {
  code: string;
  message: string;
  /** ID data yang memicu peringatan (mis. item RAB). */
  ref?: string;
}

/** Body 422 pola A — bentuk error §3.1 + `warnings[]`. */
export class WarningsErrorDto {
  statusCode: number;
  @ApiProperty({ example: 'Warnings' })
  error: string;
  message: string;
  requestId: string;
  warnings: ApiWarningDto[];
}

export class WarningsException extends UnprocessableEntityException {
  constructor(readonly warnings: ApiWarningDto[]) {
    super('Periksa peringatan sebelum menyimpan');
  }
}

/**
 * Lempar 422 bila ada peringatan yang belum dikonfirmasi.
 * shortcut: kode peringatan yang dikonfirmasi belum ditulis ke audit_logs (FR-NTF-7), upgrade saat mekanisme audit konteks-request ada.
 */
export function assertAcknowledged(
  warnings: ApiWarningDto[],
  acknowledged: boolean | undefined,
): void {
  if (warnings.length > 0 && acknowledged !== true) {
    throw new WarningsException(warnings);
  }
}
