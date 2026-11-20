-- SEC-6: email disimpan lowercase + trim. Gagal keras bila dua user bentrok setelah normalisasi
-- (butuh keputusan manusia: gabung/hapus salah satu), supaya tak ada data hilang diam-diam.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM users GROUP BY lower(trim(email)) HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'users.email bentrok setelah lower(trim()) — selesaikan duplikat secara manual sebelum migrasi';
  END IF;
END $$;

UPDATE users SET email = lower(trim(email)) WHERE email <> lower(trim(email));

-- Menjaga agar data baru yang lolos tanpa normalisasi aplikasi pun tetap unik tanpa peka huruf.
CREATE UNIQUE INDEX users_email_lower_key ON users (lower(email));
