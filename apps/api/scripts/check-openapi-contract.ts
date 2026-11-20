// acme-backend/scripts/check-openapi-contract.ts
//
// GERBANG KONTRAK RESPONSE — U1 (fase-1-vertikal-rab.md §5b).
//
// Kenapa ada: `lib/types/api.ts` di web di-generate dari openapi.json (master
// §6.2), dan schema response hanya terbit kalau handler mendeklarasikan
// `@ApiOkResponse({ type: SomeDto })`. Plugin swagger TIDAK bisa menurunkannya
// sendiri — tipe response service adalah type alias/interface, yang hilang saat
// kompilasi, jadi yang terbit cuma `{ "type": "object" }` (nol field).
//
// Handoff Fase 1 sudah menyimpulkan hal yang benar: "disiplin per-paket persis
// yang terlupa di paket kesepuluh". Jadi disiplinnya tidak dititipkan ke
// ingatan — script ini gagal keras, sama seperti harness matriks otorisasi
// gagal untuk endpoint tanpa baris matriks.
//
// Dipakai integrator di gerbang tiap gelombang:
//   npm run generate:openapi && npm run check:openapi
import { readFileSync } from 'fs';
import { join } from 'path';

interface Schema {
  $ref?: string;
  items?: Schema;
}
interface Operation {
  responses?: Record<string, { content?: Record<string, { schema?: Schema }> }>;
}
type Doc = { paths: Record<string, Record<string, Operation>> };

const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete'];

/**
 * Schema dianggap konkret kalau menunjuk komponen (`$ref`) — langsung atau
 * sebagai `items` array. `{ "type": "object" }` polos TIDAK konkret: itu
 * justru bentuk kosong yang script ini cari.
 */
function isConcrete(schema: Schema | undefined): boolean {
  if (!schema) return false;
  return Boolean(schema.$ref ?? schema.items?.$ref);
}

function findOffenders(doc: Doc): string[] {
  const offenders: string[] = [];

  for (const [path, operations] of Object.entries(doc.paths)) {
    for (const [method, operation] of Object.entries(operations)) {
      if (!HTTP_METHODS.includes(method)) continue;

      const responses = operation.responses ?? {};
      const successCode = Object.keys(responses).find((code) =>
        code.startsWith('2'),
      );
      if (!successCode) {
        offenders.push(
          `${method.toUpperCase()} ${path} — tak ada response 2xx`,
        );
        continue;
      }
      // 204 memang tak berbadan — bukan pelanggaran.
      if (successCode === '204') continue;

      const content = responses[successCode].content ?? {};
      // Unduhan biner (mis. `@ApiProduces('application/octet-stream')`) tak punya DTO JSON.
      if (Object.keys(content).length > 0 && !content['application/json']) {
        continue;
      }
      const schema = content['application/json']?.schema;
      if (!isConcrete(schema)) {
        offenders.push(`${method.toUpperCase()} ${path} (${successCode})`);
      }
    }
  }

  return offenders;
}

function main(): void {
  const docPath = join(__dirname, '..', 'openapi.json');
  const doc = JSON.parse(readFileSync(docPath, 'utf8')) as Doc;
  const offenders = findOffenders(doc);

  if (offenders.length > 0) {
    console.error(
      `Kontrak response OpenAPI belum lengkap — ${offenders.length} endpoint:\n` +
        offenders.map((o) => `  - ${o}`).join('\n') +
        '\n\nPerbaikan: deklarasikan kelas DTO response (contoh: ' +
        'src/projects/dto/project-response.dto.ts) lalu pasang ' +
        '`@ApiOkResponse({ type: XxxResponseDto })` di handler-nya. ' +
        'Jangan pakai interface/type alias — keduanya hilang saat kompilasi.',
    );
    process.exitCode = 1;
    return;
  }

  console.log(
    `Kontrak response OpenAPI lengkap: ${Object.keys(doc.paths).length} path.`,
  );
}

// Self-check logika detektor — dijalankan `npx ts-node scripts/check-openapi-contract.ts --self-check`.
// Tanpa ini, script yang selalu mengembalikan "lengkap" akan lolos tanpa suara.
function selfCheck(): void {
  const assert = (ok: boolean, label: string): void => {
    if (!ok) throw new Error(`self-check gagal: ${label}`);
  };
  const ref = { $ref: '#/components/schemas/X' };
  const wrap = (op: Operation): Doc => ({ paths: { '/x': { get: op } } });

  assert(
    findOffenders(
      wrap({
        responses: {
          '200': { content: { 'application/json': { schema: ref } } },
        },
      }),
    ).length === 0,
    '$ref langsung dianggap lengkap',
  );
  assert(
    findOffenders(
      wrap({
        responses: {
          '200': {
            content: { 'application/json': { schema: { items: ref } } },
          },
        },
      }),
    ).length === 0,
    'array of $ref dianggap lengkap',
  );
  assert(
    findOffenders(
      wrap({
        responses: {
          '200': { content: { 'application/json': { schema: {} } } },
        },
      }),
    ).length === 1,
    'schema tanpa $ref ditandai',
  );
  assert(
    findOffenders(wrap({ responses: { '204': {} } })).length === 0,
    '204 dikecualikan',
  );
  assert(
    findOffenders(wrap({ responses: {} })).length === 1,
    'tanpa 2xx ditandai',
  );

  console.log('self-check lulus (5 kasus).');
}

if (process.argv.includes('--self-check')) {
  selfCheck();
} else {
  main();
}
