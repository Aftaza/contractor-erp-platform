import { describe, expect, it, vi } from 'vitest';
import { api, ApiError } from './api';

const json = (status: number, body: unknown) =>
	new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

describe('api()', () => {
	it('mengirim JSON ke /api/v1 dengan cookie same-origin', async () => {
		const f = vi.fn().mockResolvedValue(json(200, { ok: 1 }));
		await expect(api('/projects', { method: 'POST', body: { a: 1 } }, f)).resolves.toEqual({ ok: 1 });
		const [url, init] = f.mock.calls[0];
		expect(url).toBe('/api/v1/projects');
		expect(init.credentials).toBe('same-origin');
		expect(init.body).toBe('{"a":1}');
		expect(init.headers['Content-Type']).toBe('application/json');
	});

	it('FormData dikirim mentah tanpa Content-Type manual', async () => {
		const f = vi.fn().mockResolvedValue(json(200, {}));
		const fd = new FormData();
		await api('/uploads', { method: 'POST', body: fd }, f);
		expect(f.mock.calls[0][1].body).toBe(fd);
		expect(f.mock.calls[0][1].headers['Content-Type']).toBeUndefined();
	});

	it('401 → refresh sekali → ulangi request', async () => {
		const f = vi
			.fn()
			.mockResolvedValueOnce(json(401, {}))
			.mockResolvedValueOnce(new Response(null, { status: 200 }))
			.mockResolvedValueOnce(json(200, { id: 'x' }));
		await expect(api('/projects/x', {}, f)).resolves.toEqual({ id: 'x' });
		expect(f.mock.calls.map((c) => c[0])).toEqual(['/api/v1/projects/x', '/api/v1/auth/refresh', '/api/v1/projects/x']);
	});

	it('refresh gagal → ApiError 401, tanpa ulang', async () => {
		const body = { statusCode: 401, error: 'Unauthorized', message: 'Sesi berakhir', requestId: 'r' };
		const f = vi.fn().mockResolvedValueOnce(json(401, body)).mockResolvedValueOnce(new Response(null, { status: 401 }));
		const err = (await api('/projects', {}, f).catch((e: unknown) => e)) as ApiError;
		expect(err).toBeInstanceOf(ApiError);
		expect(err.status).toBe(401);
		expect(err.message).toBe('Sesi berakhir');
		expect(f).toHaveBeenCalledTimes(2);
	});

	it('401 dari /auth/* tidak memicu refresh', async () => {
		const f = vi.fn().mockResolvedValue(json(401, { statusCode: 401, error: 'Unauthorized', message: 'Email atau password salah', requestId: '' }));
		await expect(api('/auth/login', { method: 'POST', body: {} }, f)).rejects.toThrow('Email atau password salah');
		expect(f).toHaveBeenCalledTimes(1);
	});

	it('body error bukan JSON → pesan Indonesia default', async () => {
		const f = vi.fn().mockResolvedValue(new Response('boom', { status: 502 }));
		await expect(api('/x', {}, f)).rejects.toThrow('Gagal menghubungi server');
	});
});
