// acme-backend/src/rab-import/rab-import.util.ts
//
// Parser murni template kanonik `docs/reference/template-rab-acme.xlsx` — WP-15
// (fase-1-vertikal-rab.md §4 WP-15). Kolom `Level` EKSPLISIT (angka
// kedalaman), bukan indentasi/bold — docs/reference/rab-format-analysis.md
// §4 membuktikan file gaya lama tak bisa direkonstruksi otomatis dari cue
// formatting. Parser di sini karena itu TAK MENEBAK struktur: tiap baris
// wajib menyatakan level-nya sendiri, dan induk dicari lewat baris terakhir
// yang levelnya persis satu tingkat di atasnya (stack), sama seperti outline
// numbering standar.
//
// Semua error di sini BadRequestException dengan pesan "Baris N: ..." (N =
// nomor baris SPREADSHEET SUNGGUHAN, header=1, data mulai baris 2) — DoD #3
// WP-15 mensyaratkan pesan reject menyebut nomor baris.
import { BadRequestException } from '@nestjs/common';
import { NodeType } from '@prisma/client';
import * as XLSX from 'xlsx';

const EXPECTED_HEADER = [
  'Level',
  'Tipe',
  'Nama Pekerjaan',
  'Volume',
  'Satuan',
  'Harga Material',
  'Harga Upah',
  'Total',
];

const NODE_TYPES = new Set<string>(Object.values(NodeType));

/** Satu baris yang sudah tervalidasi & siap ditulis lewat `RabService.create`. */
export interface ParsedRabRow {
  rowNumber: number;
  nodeType: NodeType;
  name: string;
  sortOrder: number;
  /** Index ke `ParsedRabRow[]` induknya, atau `null` untuk root. */
  parentIndex: number | null;
  volume?: number;
  unit?: string;
  materialPrice?: number;
  laborPrice?: number;
}

/** Bentuk nilai cell yang dikembalikan SheetJS `sheet_to_json({header:1})` — tak pernah objek biasa. */
type CellValue = string | number | boolean | Date | undefined;

function cellToString(v: CellValue): string | undefined {
  if (v === undefined || v === '') return undefined;
  return String(v).trim();
}

/** Angka dari cell, atau `undefined` kalau cell kosong. Menolak string non-numerik (mis. "abc" di kolom Volume) — dilaporkan sebagai error tipe data, bukan diam-diam jadi NaN. */
function cellToNumber(
  v: CellValue,
  rowNumber: number,
  column: string,
): number | undefined {
  if (v === undefined || v === '') return undefined;
  const n = typeof v === 'number' ? v : Number(v);
  if (typeof v !== 'number' || Number.isNaN(n)) {
    throw new BadRequestException(
      `Baris ${rowNumber}: kolom ${column} harus berupa angka, ditemukan "${String(v)}"`,
    );
  }
  return n;
}

/**
 * Parse buffer xlsx → daftar baris tervalidasi. Melempar `BadRequestException`
 * pada kesalahan PERTAMA yang ditemukan (fail-fast) — cukup untuk DoD "pesan
 * menyebut nomor baris", dan menghindari mengumpulkan N error dari file yang
 * strukturnya sudah rusak sejak awal (mis. kolom salah).
 */
export function parseRabImportSheet(buffer: Buffer): ParsedRabRow[] {
  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(buffer, { type: 'buffer' });
  } catch {
    throw new BadRequestException(
      'File tidak dapat dibaca sebagai xlsx — pastikan format .xlsx valid (bukan .xls/.csv/hasil edit rusak)',
    );
  }
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new BadRequestException('File xlsx tidak punya sheet sama sekali');
  }
  const sheet = workbook.Sheets[sheetName];
  const raw: CellValue[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    blankrows: false,
  });

  if (raw.length === 0) {
    throw new BadRequestException('Baris 1: sheet kosong, tak ada header');
  }
  const header = raw[0].map((h) => cellToString(h) ?? '');
  const headerOk =
    header.length >= EXPECTED_HEADER.length &&
    EXPECTED_HEADER.every((col, i) => header[i] === col);
  if (!headerOk) {
    throw new BadRequestException(
      `Baris 1: struktur kolom tidak sesuai template kanonik — urutan wajib: ${EXPECTED_HEADER.join(', ')} (unduh docs/reference/template-rab-acme.xlsx)`,
    );
  }

  const dataRows = raw.slice(1);
  if (dataRows.length === 0) {
    throw new BadRequestException('Baris 2: tak ada data RAB di sheet ini');
  }

  const parsed: ParsedRabRow[] = [];
  const stack: { level: number; index: number }[] = [];
  const siblingCounters = new Map<number | null, number>();

  dataRows.forEach((cells, i) => {
    const rowNumber = i + 2; // header = baris 1
    const [
      levelCell,
      tipeCell,
      namaCell,
      volCell,
      satCell,
      matCell,
      upahCell,
      totalCell,
    ] = cells;

    const level = cellToNumber(levelCell, rowNumber, 'Level');
    if (level === undefined || !Number.isInteger(level) || level < 1) {
      throw new BadRequestException(
        `Baris ${rowNumber}: kolom Level wajib diisi angka bulat ≥ 1`,
      );
    }

    const tipeRaw = cellToString(tipeCell);
    if (!tipeRaw || !NODE_TYPES.has(tipeRaw)) {
      throw new BadRequestException(
        `Baris ${rowNumber}: kolom Tipe harus salah satu dari ${[...NODE_TYPES].join('/')}, ditemukan "${tipeRaw ?? ''}"`,
      );
    }
    const nodeType = tipeRaw as NodeType;

    const name = cellToString(namaCell);
    if (!name) {
      throw new BadRequestException(
        `Baris ${rowNumber}: kolom Nama Pekerjaan wajib diisi`,
      );
    }

    const volume = cellToNumber(volCell, rowNumber, 'Volume');
    const unit = cellToString(satCell);
    const materialPrice = cellToNumber(matCell, rowNumber, 'Harga Material');
    const laborPrice = cellToNumber(upahCell, rowNumber, 'Harga Upah');
    const total = cellToNumber(totalCell, rowNumber, 'Total');

    if (nodeType === NodeType.item) {
      if (volume === undefined || volume <= 0) {
        throw new BadRequestException(
          `Baris ${rowNumber}: node item wajib punya Volume > 0`,
        );
      }
      if (!unit) {
        throw new BadRequestException(
          `Baris ${rowNumber}: node item wajib punya Satuan`,
        );
      }
      if (materialPrice === undefined && laborPrice === undefined) {
        throw new BadRequestException(
          `Baris ${rowNumber}: node item wajib punya minimal salah satu dari Harga Material/Harga Upah`,
        );
      }
      if (total !== undefined) {
        const expected = (materialPrice ?? 0) + (laborPrice ?? 0);
        const expectedTotal = expected * volume;
        if (Math.abs(expectedTotal - total) > 0.5) {
          throw new BadRequestException(
            `Baris ${rowNumber}: Total (${total}) tak cocok dengan (Harga Material+Harga Upah)×Volume = ${expectedTotal}`,
          );
        }
      }
    } else {
      if (
        volume !== undefined ||
        unit !== undefined ||
        materialPrice !== undefined ||
        laborPrice !== undefined ||
        total !== undefined
      ) {
        throw new BadRequestException(
          `Baris ${rowNumber}: node tipe ${nodeType} (bukan item) tak boleh mengisi Volume/Satuan/Harga Material/Harga Upah/Total`,
        );
      }
    }

    // Tutup stack sampai level teratas < level baris ini.
    while (stack.length > 0 && stack[stack.length - 1].level >= level) {
      stack.pop();
    }

    let parentIndex: number | null;
    if (level === 1) {
      if (nodeType !== NodeType.section) {
        throw new BadRequestException(
          `Baris ${rowNumber}: node Level 1 (root) harus bertipe section`,
        );
      }
      parentIndex = null;
    } else {
      const top = stack[stack.length - 1];
      if (!top || top.level !== level - 1) {
        throw new BadRequestException(
          `Baris ${rowNumber}: baris yatim — tak ditemukan induk Level ${level - 1} sebelum baris ini (Level melompat)`,
        );
      }
      if (parsed[top.index].nodeType === NodeType.item) {
        throw new BadRequestException(
          `Baris ${rowNumber}: induknya (baris ${parsed[top.index].rowNumber}) bertipe item — item tak boleh punya anak`,
        );
      }
      parentIndex = top.index;
    }

    const sortOrder = siblingCounters.get(parentIndex) ?? 0;
    siblingCounters.set(parentIndex, sortOrder + 1);

    parsed.push({
      rowNumber,
      nodeType,
      name,
      sortOrder,
      parentIndex,
      volume,
      unit,
      materialPrice,
      laborPrice,
    });
    stack.push({ level, index: parsed.length - 1 });
  });

  return parsed;
}
