// acme-backend/src/common/dto/paginated-response.spec.ts
import { paginate } from './paginated-response.dto';

describe('paginate (bentuk list §3.2)', () => {
  it('membungkus data + meta persis sesuai kontrak { data, meta: { page, perPage, total } }', () => {
    const result = paginate([{ id: 1 }, { id: 2 }], {
      page: 1,
      perPage: 25,
      total: 2,
    });

    expect(result).toEqual({
      data: [{ id: 1 }, { id: 2 }],
      meta: { page: 1, perPage: 25, total: 2 },
    });
  });

  it('mempertahankan array kosong untuk hasil tanpa data', () => {
    const result = paginate([], { page: 1, perPage: 25, total: 0 });
    expect(result.data).toEqual([]);
    expect(result.meta.total).toBe(0);
  });
});
