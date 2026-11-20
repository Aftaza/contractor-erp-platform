// acme-backend/src/public/public.service.ts
//
// `public` — WP-21 (fase-3-pelaporan-publikasi.md §2.6, §4 WP-21). Batas
// kepercayaan: response ini menghadap internet tanpa auth. `select:`
// EKSPLISIT di bawah — bukan ambil semua kolom lalu buang field — supaya
// `contractValue`/`clientId`/`rabStatus` tak pernah lewat lapisan Prisma sama
// sekali, bukan sekadar tak muncul di DTO.
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  PublicProjectDto,
  PublicProjectsResponseDto,
} from './dto/public-project.dto';
import { QueryPublicProjectsDto } from './dto/query-public-projects.dto';

const DEFAULT_PAGE = 1;
const DEFAULT_PER_PAGE = 50;

/** WHERE §2.6 — proyek terbit dengan judul publik terisi. */
const WHERE_PUBLISHED = {
  isPublished: true,
  publicTitle: { not: null },
  deletedAt: null,
} as const satisfies Prisma.ProjectWhereInput;

/** `select:` eksplisit — tujuh kolom sumber DTO publik, tak satu pun lebih. */
const PUBLIC_SELECT = {
  id: true,
  publicTitle: true,
  publicSummary: true,
  publicCategory: true,
  publicImages: true,
  location: true,
  endDate: true,
} as const satisfies Prisma.ProjectSelect;

type PublicProjectRow = Prisma.ProjectGetPayload<{
  select: typeof PUBLIC_SELECT;
}>;

function toPublicProjectDto(row: PublicProjectRow): PublicProjectDto {
  return {
    id: row.id,
    // WHERE_PUBLISHED menjamin publicTitle bukan null — aman non-null di sini.
    title: row.publicTitle as string,
    summary: row.publicSummary,
    category: row.publicCategory,
    images: row.publicImages,
    location: row.location,
    endDate: row.endDate ? row.endDate.toISOString().slice(0, 10) : null,
  };
}

@Injectable()
export class PublicService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    query: QueryPublicProjectsDto,
  ): Promise<PublicProjectsResponseDto> {
    const page = query.page ?? DEFAULT_PAGE;
    const perPage = query.perPage ?? DEFAULT_PER_PAGE;

    const [rows, total] = await Promise.all([
      this.prisma.project.findMany({
        where: WHERE_PUBLISHED,
        select: PUBLIC_SELECT,
        orderBy: { endDate: { sort: 'desc', nulls: 'last' } },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      this.prisma.project.count({ where: WHERE_PUBLISHED }),
    ]);

    return {
      data: rows.map(toPublicProjectDto),
      meta: { page, perPage, total },
    };
  }
}
