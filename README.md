# OTDRKU

OTDRKU adalah aplikasi web untuk membuka, membaca, memvisualisasikan, dan menganalisis file pengukuran Optical Time Domain Reflectometer dalam format Bellcore atau Telcordia `.SOR`. Seluruh pemrosesan file berlangsung di browser pengguna.

## Fitur

- Membuka file `.sor` melalui pemilih file atau seret dan lepas.
- Memvalidasi ukuran dan format file sebelum diproses.
- Membaca metadata, trace, event, serta ringkasan hasil pengukuran.
- Menampilkan grafik trace interaktif dengan pan, zoom, dan penanda A serta B.
- Menampilkan tabel event yang dapat dipilih untuk diperiksa.
- Mengganti satuan jarak antara meter dan kilometer.
- Mengekspor data trace dan event ke CSV.
- Menangani nomor event duplikat dari perangkat SOR dengan ID internal yang unik.

## Teknologi

- Next.js 15
- React 19
- TypeScript
- Tailwind CSS
- Vitest
- Lucide React

## Kebutuhan

- Node.js versi LTS yang masih didukung.
- npm.

## Menjalankan Proyek

Pasang dependensi terlebih dahulu.

```bash
npm install
```

Jalankan server pengembangan.

```bash
npm run dev
```

Buka alamat yang ditampilkan terminal, umumnya `http://localhost:3000`.

## Perintah yang Tersedia

- `npm run dev`: Menjalankan server pengembangan.
- `npm run build`: Membuat build produksi.
- `npm run start`: Menjalankan aplikasi dari build produksi.
- `npm test`: Menjalankan seluruh pengujian.

## Penggunaan

1. Jalankan aplikasi lalu pilih file `.sor`, atau seret file ke area unggah.
2. Setelah file berhasil diproses, gunakan toolbar untuk membuka file lain, mengatur tampilan grafik, memilih marker, atau mengekspor CSV.
3. Klik baris pada Event Table untuk memilih event yang ingin diperiksa.
4. Gunakan tombol Unit untuk mengubah tampilan jarak dalam meter atau kilometer.

Ukuran file yang dapat diproses dibatasi hingga 50 MB.

## Struktur Proyek

```text
src/
  app/                 Halaman, metadata, dan gaya global
  components/          Komponen antarmuka pengguna
  lib/otdr/            Parser SOR, kalkulasi, dan deteksi event
  lib/utils/           Utilitas ekspor CSV
  types/               Definisi tipe TypeScript
public/media/          Aset ikon aplikasi
contohsor/             File SOR contoh untuk pengujian
test/                  Pengujian parser dan kalkulasi
```

## Pengujian

Jalankan pengujian dengan perintah berikut.

```bash
npm test
```

Folder `test` menggunakan file di `contohsor` untuk memastikan parser dapat membaca data SOR nyata, selain menguji data SOR sintetis dan fungsi kalkulasi.

## Catatan Privasi

File SOR diproses secara lokal di browser. Aplikasi ini tidak mengunggah file pengukuran ke server.
