# MyJournal App

MyJournal adalah aplikasi jurnal bulanan berbasis web yang menyimpan:
- Data catatan ke **Google Sheets**
- Gambar ke **Google Drive**

Setiap data dikelompokkan per bulan (sheet `YYYY-MM`) agar rapi dan mudah direkap.

## Live Demo

Uji aplikasi di:

**https://bk-spensix.web.app/**

## Ringkasan Fitur

- Login Google OAuth
- Penyimpanan data ke Google Sheets
- Penyimpanan gambar ke Google Drive
- History bulanan (per sheet `YYYY-MM`)
- Export CSV per bulan aktif
- Edit/Hapus catatan
- Dark mode
- Modal bantuan
- Setting Input dinamis:
  - Tambah/hapus field
  - Ubah label
  - Ubah tipe field (`text`, `textarea`, `date`, `time`, `select`)
  - Opsi dropdown custom untuk tipe `select`
  - Set field wajib isi
  - Reset ke default
- Setting Input berbasis akun Google (bukan sekadar browser lokal)
- Pagination + pengaturan jumlah item per halaman

## Arsitektur Data

### 1) Google Drive

- Folder default gambar:
  - `My Monthly Journal - Images`
- File gambar dari form upload disimpan ke folder ini.

### 2) Google Sheets

- Spreadsheet default:
  - `My Monthly Journal - Data`
- Sheet bulanan:
  - Format nama `YYYY-MM` (contoh `2026-02`, `2026-03`)
- Sheet konfigurasi:
  - `_CONFIG`
  - Menyimpan konfigurasi schema per akun Google

### 3) Skema Kolom

Kolom dinamis mengikuti Setting Input user, lalu sistem menambahkan:
- `Link Gambar`
- `ID Gambar`

## Struktur Project

```txt
.
├── index.html
├── firebase.json
├── package.json
├── src/
│   ├── app.js
│   ├── ui.js
│   ├── images.js
│   ├── storage.js
│   ├── config.js
│   └── main.js
└── readmin.md
```

## Teknologi

- Vite (frontend bundler)
- Vanilla JavaScript (ES Modules)
- Tailwind CSS (CDN)
- Google API Client (`gapi`)
- Google Identity Services (OAuth)
- Firebase Hosting (deployment)

## Prasyarat

- Node.js + npm
- Akun Google Cloud dengan:
  - OAuth Client ID (Web)
  - API Key
  - Google Drive API enabled
  - Google Sheets API enabled
- Firebase CLI (untuk deployment)

## Konfigurasi Environment

Buat file `.env`:

```env
VITE_GOOGLE_CLIENT_ID=YOUR_CLIENT_ID.apps.googleusercontent.com
VITE_GOOGLE_API_KEY=YOUR_API_KEY
```

Contoh template tersedia di `.env.example`.

## Setup Google Cloud (Detail)

### 1. Aktifkan API

Di Google Cloud Console > APIs & Services > Library:
- Enable **Google Drive API**
- Enable **Google Sheets API**

### 2. OAuth Consent Screen

- Isi data aplikasi
- Tambahkan scope:
  - `https://www.googleapis.com/auth/drive.file`
  - `https://www.googleapis.com/auth/spreadsheets`
  - `https://www.googleapis.com/auth/userinfo.email`

### 3. OAuth Client ID (Web)

- Authorized JavaScript origins:
  - `http://localhost:5173`
  - Tambahkan domain produksi bila perlu

### 4. API Key Restriction

Disarankan:
- Application restriction: HTTP referrer
  - `http://localhost:5173/*`
  - domain produksi
- API restriction:
  - Google Drive API
  - Google Sheets API

## Jalankan Lokal

```bash
npm install
npm run dev
```

Buka URL Vite yang tampil di terminal (default `http://localhost:5173`).

## Build Produksi

```bash
npm run build
```

Output akan berada di folder `dist/`.

## Deploy ke Firebase Hosting

Project ini sudah disiapkan deploy dari `dist`.

```bash
firebase login
firebase deploy --only hosting --project bk-spensix
```

## Alur Penggunaan Aplikasi

### 1) Login

- Klik **Masuk dengan Google**
- Sistem inisialisasi Drive + Sheets
- Jika belum ada, folder dan spreadsheet akan dibuat otomatis

### 2) Tambah Catatan

- Klik **Tambah Catatan**
- Isi field
- Upload gambar
- Simpan

Catatan akan masuk ke sheet sesuai bulan dari field tanggal.

### 3) Riwayat Bulanan

- Pilih bulan dari dropdown Riwayat
- Data ditampilkan sesuai bulan aktif

### 4) Edit/Hapus

- Edit dari kartu catatan
- Jika tanggal diganti ke bulan lain, data dipindah otomatis ke sheet bulan target
- Hapus juga akan mencoba menghapus gambar di Drive

### 5) Export

- Pilih bulan
- Klik **Export Bulan**
- File `journal-YYYY-MM.csv` terunduh

### 6) Buka Rekap

- Klik **Buka Rekap (Sheets)** untuk langsung membuka spreadsheet aktif

## Setting Input 

Fitur ini untuk kustomisasi form input sesuai kebutuhan pengguna.

### Kontrol yang Tersedia

- **Label**
  - Menentukan judul field pada form dan tampilan kartu
- **Type**
  - `text`: input singkat
  - `textarea`: input panjang
  - `date`: tanggal (wajib minimal ada satu field date)
  - `time`: jam
  - `select`: dropdown pilihan
- **Wajib**
  - Jika aktif, field harus diisi sebelum submit
- **Hapus**
  - Menghapus field dari struktur form
- **Tambah Field**
  - Menambahkan field baru
- **Reset Default**
  - Mengembalikan struktur bawaan

### Khusus Type `select`

Saat memilih type `select`, akan muncul area:
- **Opsi dropdown (pisahkan dengan koma)**

Contoh:

```txt
Kelas 7.1, Kelas 7.2, Kelas 7.3
```

### Validasi Setting

- Minimal 1 field harus bertipe `date`
- Label field tidak boleh kosong
- Field `select` harus memiliki minimal 1 opsi

### Scope Penyimpanan Setting

Setting disimpan per akun Google (di sheet `_CONFIG`), sehingga:
- Akun yang sama bisa membawa setting ke device/browser lain
- Akun lain tidak terpengaruh

## UI/UX Notes

- Mobile card dioptimalkan agar compact
- Grid mobile mendukung 2 card per baris
- Pagination tersedia dengan ukuran halaman yang dapat dipilih user
- Dark mode disimpan ke preferensi user

## Troubleshooting

### Login mentok / loading terus

Periksa:
- OAuth origin sesuai (`http://localhost:5173`)
- API key restriction benar
- Drive/Sheets API sudah enabled

### Error 403 discovery

Biasanya API key restriction salah atau API belum di-enable.

### `origin_mismatch`

Origin di OAuth Client ID tidak sama dengan URL aplikasi.

### Gambar gagal upload

Kemungkinan:
- Kuota Google Drive habis
- Token kedaluwarsa
- Permission API bermasalah

### Setting Input tidak berubah

- Pastikan klik simpan pengaturan
- Pastikan akun Google yang dipakai benar

## Terms & Conditions 

1. Data dan file disimpan di akun Google pengguna.
2. Beban storage mengikuti kuota Google Drive pengguna.
3. Jika kuota Drive penuh, upload/simpan bisa gagal.
4. Pengguna bertanggung jawab menjaga keamanan akun dan data.
5. Disarankan backup berkala spreadsheet dan folder gambar.

## Catatan Pengembangan Lanjutan

Ide peningkatan berikutnya:
- Export XLSX/PDF per bulan
- Search/filter lanjutan
- Multi-role user management
- Audit log aktivitas

