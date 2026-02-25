# MyJournal App

MyJournal adalah aplikasi jurnal bulanan berbasis web untuk menyimpan catatan ke Google Sheets dan gambar ke Google Drive.

Live demo: https://bk-spensix.web.app/

## Fitur Utama

- Login Google OAuth
- Simpan catatan ke Google Sheets
- Simpan gambar ke Google Drive
- Riwayat bulanan per sheet (`YYYY-MM`)
- Export CSV per bulan aktif
- Edit dan hapus catatan
- Dark mode
- Loading overlay saat proses login/simpan
- Bantuan penggunaan di aplikasi
- Setting input dinamis (label, tipe, wajib, opsi dropdown, reset)
- Setting input berbasis akun Google (`_CONFIG`)
- Mode Organisasi (opsional)
  - Buat organisasi
  - Join organisasi via token invite
  - Share akses anggota + copy token
  - Masuk lagi ke organisasi terakhir
  - Simpan organisasi
  - Hapus organisasi (khusus owner)
- Pagination + pilihan jumlah item per halaman

## Arsitektur Data

### Google Drive

- Personal mode:
  - Folder default: `My Monthly Journal - Images`
- Organisasi mode:
  - Folder mengikuti resource organisasi aktif

### Google Sheets

- Personal mode:
  - Spreadsheet default: `My Monthly Journal - Data`
- Organisasi mode:
  - Spreadsheet mengikuti resource organisasi aktif
- Sheet bulanan:
  - `YYYY-MM` (contoh `2026-02`)
- Sheet konfigurasi per akun:
  - `_CONFIG`

## Struktur Project

```txt
.
├── index.html
├── firebase.json
├── package.json
├── README.md
├── .env.example
└── src/
    ├── app.js
    ├── ui.js
    ├── images.js
    ├── storage.js
    ├── config.js
    └── main.js
```

## Konfigurasi Environment

Buat file `.env`:

```env
VITE_GOOGLE_CLIENT_ID=YOUR_CLIENT_ID.apps.googleusercontent.com
VITE_GOOGLE_API_KEY=YOUR_API_KEY
```

## Setup Google Cloud

1. Enable API:
- Google Drive API
- Google Sheets API

2. OAuth consent screen:
- Tambahkan scope:
  - `https://www.googleapis.com/auth/drive.file`
  - `https://www.googleapis.com/auth/spreadsheets`
  - `https://www.googleapis.com/auth/userinfo.email`

3. OAuth Client ID (Web):
- Authorized origins minimal:
  - `http://localhost:5173`
  - domain production (jika dipakai)

4. API key restriction (disarankan):
- HTTP referrer sesuai domain
- Batasi ke Drive API + Sheets API

## Menjalankan Lokal

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Deploy Firebase Hosting

```bash
firebase login
firebase deploy --only hosting --project bk-spensix
```

## Cara Pakai

### 1) Login

- Klik `Masuk dengan Google`
- Sistem akan inisialisasi resource personal jika belum ada

### 2) Tambah Catatan

- Klik `Tambah Catatan`
- Isi field form
- Upload gambar
- Klik `Simpan`

Catatan akan masuk ke sheet bulan berdasarkan field bertipe `date`.

### 3) Riwayat Bulanan

- Pilih bulan dari dropdown
- Data tampil sesuai bulan aktif

### 4) Export Bulan

- Pilih bulan target
- Klik `Export Bulan`
- File `journal-YYYY-MM.csv` akan terunduh

### 5) Setting Input

Atur struktur form sesuai kebutuhan:
- Label
- Type (`text`, `textarea`, `date`, `time`, `select`)
- Wajib isi
- Opsi dropdown (untuk `select`)
- Tambah field
- Reset default

Validasi:
- Minimal ada 1 field `date`
- Label tidak boleh kosong
- `select` wajib punya minimal 1 opsi

Penyimpanan setting:
- Disimpan per akun Google di `_CONFIG`
- Tidak otomatis mengubah akun lain

### 6) Mode Organisasi (Opsional)

Akses dari `Menu -> Organisasi`.

Alur umum:
1. Owner klik `Buat Organisasi`
2. Owner buka `Kelola Organisasi`
3. Owner isi email anggota lalu klik `Share + Copy Invite`
4. Anggota paste token di `Join Organisasi`
5. Setelah join, anggota menulis ke spreadsheet/folder organisasi

Aksi organisasi:
- `Share + Copy Invite`
  - Validasi email
  - Share editor ke spreadsheet + folder
  - Copy token invite
- `Copy Invite Token`
  - Copy token tanpa proses share email
- `Simpan Organisasi`
  - Simpan organisasi aktif ke daftar lokal
- `Masuk Lagi Terakhir`
  - Aktifkan ulang organisasi terakhir tanpa paste token
- `Kembali ke Personal`
  - Keluar dari mode organisasi (resource organisasi tidak dihapus)
- `Hapus Organisasi` (owner only)
  - Menghapus spreadsheet + folder organisasi dari Google Drive

Catatan penting:
- Default aplikasi tetap personal mode
- Anggota harus diberi akses oleh owner agar bisa menulis
- Jika token ada tapi akses belum dishare, proses simpan bisa gagal

## Troubleshooting

- Login loading terus:
  - Cek origin OAuth
  - Cek API key restriction
  - Cek Drive/Sheets API enabled
- Error 403 discovery:
  - API key restriction salah atau API belum enabled
- `origin_mismatch`:
  - Origin OAuth tidak sama dengan URL aplikasi
- Gambar gagal upload:
  - Kuota Drive penuh / token expired / permission kurang
- Join organisasi tapi tetap data personal:
  - Pastikan owner memakai `Share + Copy Invite`
  - Pastikan ID spreadsheet pada `Buka Rekap` sama antar akun

## Terms & Conditions

1. Seluruh data dan file disimpan pada Google account pengguna/organisasi, bukan server aplikasi terpisah.
2. Beban storage mengikuti kuota Google Drive pemilik resource.
3. Jika kuota penuh, upload/simpan dapat gagal.
4. Pengguna bertanggung jawab menjaga keamanan akun, data, dan izin berbagi file.
5. Disarankan backup berkala spreadsheet dan folder gambar.
