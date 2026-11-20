// acme-backend/test/authz/matrix.ts
//
// HARNESS MATRIKS OTORISASI (master §9.3, §12; DoD WP-04 fase-0-fondasi.md
// §WP-04). Mengenumerasi SEMUA route yang benar-benar terdaftar di Nest
// lewat `DiscoveryService` — sumber kebenaran yang SAMA dipakai Nest sendiri
// untuk membangun router, jadi mustahil ketinggalan satu controller pun
// (beda dengan menyisir folder controller manual, yang bisa lupa satu file).
//
// File ini murni LOGIKA (scan + bandingkan) — reusable, tak mengandung
// `it()`/`describe()`. Assersi jest sungguhan ada di `matrix.e2e-spec.ts`
// (dijalankan `npm run test:e2e`, tak butuh Postgres nyata — pemeriksaan di
// sini murni metadata reflection, bukan panggilan HTTP).
import { INestApplication, RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { DiscoveryService, MetadataScanner } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../../src/common/decorators/public.decorator';
import {
  AppRole,
  ROLES_KEY,
} from '../../src/common/decorators/roles.decorator';
import { Actor, ALL_ACTORS, MatrixRow } from './registry';

const METHOD_NAMES: Record<number, string> = {
  [RequestMethod.GET]: 'GET',
  [RequestMethod.POST]: 'POST',
  [RequestMethod.PUT]: 'PUT',
  [RequestMethod.DELETE]: 'DELETE',
  [RequestMethod.PATCH]: 'PATCH',
  [RequestMethod.ALL]: 'ALL',
  [RequestMethod.OPTIONS]: 'OPTIONS',
  [RequestMethod.HEAD]: 'HEAD',
};

export interface ScannedRoute {
  controllerName: string;
  handlerName: string;
  method: string;
  path: string;
  isPublic: boolean;
  /** undefined = tak ada `@Roles()` pada route ini (semua role terautentikasi lolos RolesGuard). */
  requiredRoles: AppRole[] | undefined;
}

/** Konstruktor generik — cukup untuk identitas/refleksi, tak perlu tipe param asli. */
type AnyConstructor = new (...args: unknown[]) => unknown;

/**
 * `DiscoveryService.getControllers()` mengembalikan `InstanceWrapper[]`
 * (tanpa parameter generik eksplisit dari `@nestjs/core`, jadi `instance`/
 * `metatype` luruh ke `any` di sisi pemanggil). Bentuk minimal yang benar-
 * benar dipakai di sini dinyatakan ulang secara eksplisit supaya tak ada
 * `any` yang mengalir diam-diam ke kode di bawah.
 */
interface ControllerWrapperShape {
  instance: object | undefined;
  metatype: AnyConstructor | null;
}

/** Pembungkus `Reflect.getMetadata` (reflect-metadata tak diketik generik — selalu `any`). */
function readMetadata<T>(key: string, target: object): T | undefined {
  return Reflect.getMetadata(key, target) as T | undefined;
}

function joinPaths(controllerPath: string, methodPath: string): string {
  const parts = [controllerPath, methodPath]
    .map((p) => p.trim())
    .filter((p) => p.length > 0 && p !== '/');
  const joined = `/${parts.join('/')}`.replace(/\/+/g, '/');
  return joined.length > 1 ? joined.replace(/\/$/, '') : joined;
}

/**
 * Enumerasi semua route Nest yang terdaftar di aplikasi yang sudah di-boot
 * (`app.init()` sudah dipanggil, atau minimal module sudah `compile()`).
 * Dibaca dari metadata dekorator (`@Controller`, `@Get`/`@Post`/dst,
 * `@Public()`, `@Roles()`) via reflection — TAK memanggil HTTP sama sekali.
 */
export function scanRoutes(app: INestApplication): ScannedRoute[] {
  const discovery = app.get(DiscoveryService);
  const scanner = app.get(MetadataScanner);
  const routes: ScannedRoute[] = [];

  for (const raw of discovery.getControllers()) {
    const { instance, metatype } = raw as unknown as ControllerWrapperShape;
    if (!instance || !metatype) continue;
    const prototype = Object.getPrototypeOf(instance) as object;

    const controllerPath = readMetadata<string>(PATH_METADATA, metatype) ?? '';

    for (const handlerName of scanner.getAllMethodNames(prototype)) {
      const handler = (prototype as Record<string, unknown>)[handlerName] as (
        ...args: unknown[]
      ) => unknown;

      const methodPath = readMetadata<string>(PATH_METADATA, handler);
      const requestMethod = readMetadata<number>(METHOD_METADATA, handler);
      // Bukan route handler (mis. method privat helper) -> tak punya metadata ini.
      if (methodPath === undefined || requestMethod === undefined) continue;

      const isPublic: boolean =
        readMetadata<boolean>(IS_PUBLIC_KEY, handler) ??
        readMetadata<boolean>(IS_PUBLIC_KEY, metatype) ??
        false;
      const requiredRoles: AppRole[] | undefined =
        readMetadata<AppRole[]>(ROLES_KEY, handler) ??
        readMetadata<AppRole[]>(ROLES_KEY, metatype);

      routes.push({
        controllerName: metatype.name,
        handlerName,
        method: METHOD_NAMES[requestMethod] ?? String(requestMethod),
        path: joinPaths(controllerPath, methodPath),
        isPublic,
        requiredRoles,
      });
    }
  }
  return routes;
}

/**
 * Turunkan access yang DIHARAPKAN semata dari metadata dekorator sungguhan
 * di kode (`@Public()` / `@Roles()`) — dipakai memverifikasi baris registry
 * tak drift dari kode. Ini HANYA menilai gerbang RolesGuard/JwtAuthGuard;
 * aturan state-dependent (mis. admin ditolak PolicyService saat rab_status
 * approved) sengaja TIDAK tercermin di sini — itu ranah PolicyService +
 * test unitnya sendiri (master §5.2), bukan harness route-level ini. Lihat
 * README.md bagian "Matriks otorisasi (Fase 1+)" untuk penjelasan penuh.
 */
export function expectedAccessFromMetadata(
  route: ScannedRoute,
): Record<Actor, boolean> {
  if (route.isPublic) {
    return { pimpinan: true, admin: true, staff_gudang: true, anonim: true };
  }
  const roles = route.requiredRoles;
  if (!roles || roles.length === 0) {
    return {
      pimpinan: true,
      admin: true,
      staff_gudang: true,
      anonim: false,
    };
  }
  return {
    pimpinan: roles.includes('pimpinan'),
    admin: roles.includes('admin'),
    staff_gudang: roles.includes('staff_gudang'),
    anonim: false,
  };
}

export function findMatrixRow(
  registry: MatrixRow[],
  route: Pick<ScannedRoute, 'method' | 'path'>,
): MatrixRow | undefined {
  return registry.find(
    (row) => row.method === route.method && row.path === route.path,
  );
}

/** Baris registry yang tak cocok metadata kode, untuk pesan gagal yang jelas. */
export function diffAccess(route: ScannedRoute, row: MatrixRow): string[] {
  const expected = expectedAccessFromMetadata(route);
  const mismatches: string[] = [];
  for (const actor of ALL_ACTORS) {
    if (row.access[actor] !== expected[actor]) {
      mismatches.push(
        `${route.method} ${route.path}: registry.access.${actor}=${row.access[actor]}, ` +
          `tapi metadata kode (@Public/@Roles) mengharapkan ${expected[actor]}`,
      );
    }
  }
  return mismatches;
}
