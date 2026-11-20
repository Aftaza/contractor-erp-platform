import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  DateInRange,
  DateNotBefore,
  LongText,
  NormalizedEmail,
  Percent,
  PhoneId,
  Rupiah,
  ShortText,
  Volume,
} from './validation.decorators';

class T {
  @ShortText() s?: string;
  @LongText() l?: string;
  @Rupiah() r?: number;
  @Rupiah({ allowZero: true }) r0?: number;
  @Volume() v?: number;
  @Percent() p?: number;
  @DateInRange() d?: string;
  @DateInRange() @DateNotBefore('d') d2?: string;
  @NormalizedEmail() e?: string;
  @PhoneId() ph?: string;
}

async function bad(o: object) {
  const inst = plainToInstance(T, o);
  const errs = await validate(inst, { skipMissingProperties: true });
  return { inst, props: errs.map((e) => e.property), errs };
}
const ok = async (o: object) => (await bad(o)).props.length === 0;
const year = new Date().getUTCFullYear();

describe('validation decorators', () => {
  it('teks: trim, kosong ditolak, batas 200/2000', async () => {
    expect((await bad({ s: '  abc ' })).inst.s).toBe('abc');
    expect(await ok({ s: 'a'.repeat(200) })).toBe(true);
    expect(await ok({ s: 'a'.repeat(201) })).toBe(false);
    expect(await ok({ l: 'a'.repeat(2000) })).toBe(true);
    expect(await ok({ l: 'a'.repeat(2001) })).toBe(false);
    expect((await bad({ s: '   ' })).inst.s).toBeUndefined();
  });

  it('rupiah: 0, 1, 1e15, 1e15+1, pecahan', async () => {
    expect(await ok({ r: 0 })).toBe(false);
    expect(await ok({ r: 1 })).toBe(true);
    expect(await ok({ r: 10 ** 15 })).toBe(true);
    expect(await ok({ r: 10 ** 15 + 1 })).toBe(false);
    expect(await ok({ r: 1.5 })).toBe(false);
    expect(await ok({ r0: 0 })).toBe(true);
    expect(await ok({ r0: -1 })).toBe(false);
  });

  it('volume: 0, 4 desimal, 5 desimal, 1e9, >1e9', async () => {
    expect(await ok({ v: 0 })).toBe(false);
    expect(await ok({ v: 0.0001 })).toBe(true);
    expect(await ok({ v: 0.00001 })).toBe(false);
    expect(await ok({ v: 1e9 })).toBe(true);
    expect(await ok({ v: 1e9 + 1 })).toBe(false);
  });

  it('persen: -1, 0, 100, 100.01, 3 desimal', async () => {
    expect(await ok({ p: -1 })).toBe(false);
    expect(await ok({ p: 0 })).toBe(true);
    expect(await ok({ p: 100 })).toBe(true);
    expect(await ok({ p: 100.01 })).toBe(false);
    expect(await ok({ p: 12.345 })).toBe(false);
  });

  it('tanggal: 1999/2000/+5/+6, format, tak ada di kalender', async () => {
    expect(await ok({ d: '1999-12-31' })).toBe(false);
    expect(await ok({ d: '2000-01-01' })).toBe(true);
    expect(await ok({ d: `${year + 5}-01-01` })).toBe(true);
    expect(await ok({ d: `${year + 6}-01-01` })).toBe(false);
    expect(await ok({ d: '2026-02-31' })).toBe(false);
    expect(await ok({ d: '2026-01-01T00:00:00Z' })).toBe(false);
  });

  it('antar-field: d2 >= d', async () => {
    expect(await ok({ d: '2026-05-02', d2: '2026-05-01' })).toBe(false);
    expect(await ok({ d: '2026-05-01', d2: '2026-05-01' })).toBe(true);
    expect(await ok({ d2: '2026-05-01' })).toBe(true);
  });

  it('email: lowercase + trim, sampah ditolak', async () => {
    const r = await bad({ e: '  Budi@Acme.Co.ID ' });
    expect(r.inst.e).toBe('budi@acme.co.id');
    expect(r.props).toEqual([]);
    expect(await ok({ e: 'bukan-email' })).toBe(false);
  });

  it('telepon: 08…, 62…, +62…, spasi, sampah', async () => {
    expect((await bad({ ph: '0812-3456 789' })).inst.ph).toBe('+628123456789');
    expect((await bad({ ph: '6281234567' })).inst.ph).toBe('+6281234567');
    expect(await ok({ ph: '+6281234567' })).toBe(true);
    expect(await ok({ ph: 'abc' })).toBe(false);
    expect(await ok({ ph: '0812' })).toBe(false);
    expect(await ok({ ph: '+62' + '8'.repeat(14) })).toBe(false);
  });

  it('pesan berbahasa Indonesia menyebut field', async () => {
    const { errs } = await bad({ r: 0 });
    expect(Object.values(errs[0].constraints ?? {})[0]).toBe('r minimal 1');
  });
});
