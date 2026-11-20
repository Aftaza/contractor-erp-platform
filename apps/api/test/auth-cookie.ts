// Token auth hanya dikirim lewat cookie httpOnly (SEC-2) — test mengambilnya
// dari header Set-Cookie respons login/refresh, lalu memakainya sebagai Bearer.
export function authCookie(
  res: { headers: Record<string, unknown> },
  name: 'access_token' | 'refresh_token',
): string {
  const cookies = (res.headers['set-cookie'] as string[] | undefined) ?? [];
  const pair = cookies.find((c) => c.startsWith(`${name}=`))?.split(';')[0];
  if (!pair) throw new Error(`Cookie ${name} tidak ada di respons`);
  return pair.slice(name.length + 1);
}
