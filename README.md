# MyJournal App

MyJournal adalah aplikasi jurnal bulanan berbasis web yang menyimpan data ke Google Sheets dan gambar ke Google Drive.

Live: https://bk-spensix.web.app/

## Fitur Utama

- Login Google OAuth
- Simpan catatan ke Google Sheets
- Simpan gambar ke Google Drive
- Riwayat bulanan per sheet (`YYYY-MM`)
- Export CSV per bulan aktif
- Edit/hapus catatan
- Dark mode
- Loading overlay saat login/simpan/proses API
- Bantuan penggunaan di aplikasi
- Setting Input dinamis (label, tipe, wajib, opsi dropdown, reset default)
- Setting Input berbasis akun Google (disimpan di sheet `_CONFIG`)
- Mode Organisasi (opsional): buat/join organisasi, invite anggota, kerja kolaboratif pada sheet/folder yang sama
- Pagination + page size selector

## Arsitektur Data

### Google Drive

- Folder personal default: `My Monthly Journal - Images`
- Gambar catatan di-upload ke folder ini (atau folder organisasi saat mode organisasi aktif)

### Google Sheets

- Spreadsheet personal default: `My Monthly Journal - Data`
- Sheet bulanan: format `YYYY-MM` (contoh `2026-02`)
- Sheet konfigurasi akun: `_CONFIG`

### Mode Personal vs Organisasi

- Personal:
  - Resource (spreadsheet + folder) milik user login
  - Cocok untuk pemakaian individual
- Organisasi:
  - Resource milik organisasi (owner)
  - Anggota yang join menulis ke resource yang sama
  - Owner bisa share akses Editor + kirim invite

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

## Teknologi

- Vite
- Vanilla JavaScript (ES Modules)
- Tailwind CSS (CDN)
- Google API Client (`gapi`)
- Google Identity Services
- Firebase Hosting

## Prasyarat

- Node.js + npm
- Google Cloud Project aktif
- OAuth Client ID (Web)
- API Key
- Google Drive API enabled
- Google Sheets API enabled
- Firebase CLI (untuk deploy)

## Konfigurasi Environment

Buat `.env`:

```env
VITE_GOOGLE_CLIENT_ID=YOUR_CLIENT_ID.apps.googleusercontent.com
VITE_GOOGLE_API_KEY=YOUR_API_KEY
```

## Setup Google Cloud

1. Enable API di Google Cloud Console:
- Google Drive API
- Google Sheets API

2. OAuth consent screen:
- Tambahkan scope:
  - `https://www.googleapis.com/auth/drive.file`
  - `https://www.googleapis.com/auth/spreadsheets`
  - `https://www.googleapis.com/auth/userinfo.email`

3. OAuth Client ID (Web):
- Authorized JavaScript origins minimal:
  - `http://localhost:5173`
  - domain produksi (mis. `https://bk-spensix.web.app` jika dipakai)

4. API key restriction (disarankan):
- HTTP referrer sesuai domain local + production
- Batasi ke Drive API dan Sheets API

## Menjalankan Lokal

```bash
npm install
npm run dev
```

Buka URL Vite (default `http://localhost:5173`).

## Build

```bash
npm run build
```

Output ke folder `dist/`.

## Deploy Firebase Hosting

```bash
firebase login
firebase deploy --only hosting --project bk-spensix
```

## Cara Pakai

### 1. Login dan Inisialisasi

- Klik `Masuk dengan Google`
- Sistem akan menyiapkan resource personal jika belum ada:
  - Spreadsheet `My Monthly Journal - Data`
  - Folder `My Monthly Journal - Images`

### 2. Tambah Catatan

- Klik `Tambah Catatan`
- Isi field sesuai struktur input
- Upload gambar
- Klik `Simpan`

Catatan akan masuk ke sheet bulan berdasarkan field bertipe `date`.

### 3. Riwayat Bulanan

- Pilih bulan dari dropdown bulan
- Data tampil sesuai bulan aktif
- Saat mode organisasi aktif, tersedia filter guru (jika field `Nama Guru` ada)

### 4. Export Bulanan

- Pilih bulan target
- Klik `Export Bulan`
- File terunduh sebagai `journal-YYYY-MM.csv`

### 5. Rekap Sheets

- Klik `Buka Rekap (Sheets)` untuk membuka spreadsheet aktif

### 6. Setting Input

Buka `Setting Input` dari menu.

<<<<<<< HEAD
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
=======
Fungsi kontrol:
- Label: nama kolom/field
- Type: `text`, `textarea`, `date`, `time`, `select`
- Wajib: field harus diisi sebelum submit
- Opsi dropdown: khusus `select`, pisahkan opsi dengan koma
- Tambah Field: tambah field baru
- Reset Default: kembali ke struktur bawaan
>>>>>>> 6b24d31 (Initial commit: My Journal V.1.2)

Validasi:
- Minimal 1 field harus bertipe `date`
- Label tidak boleh kosong
- Field `select` harus punya minimal 1 opsi

Penyimpanan setting:
- Disimpan per akun Google di `_CONFIG`
- Tidak otomatis mengubah setting akun Google lain

### 7. Mode Organisasi (Opsional)

Akses dari tombol `Organisasi` di samping nama user.

Alur utama:
1. Owner klik `Buat Organisasi`
2. Owner masuk `Kelola Organisasi`
3. Owner isi email anggota lalu klik `Share + Copy Invite`
4. Anggota buka link invite atau paste token di menu `Join Organisasi`
5. Setelah join, anggota menulis ke spreadsheet/folder organisasi

Catatan penting:
- Default aplikasi tetap mode personal
- Owner harus memberi akses editor; tanpa akses, anggota bisa gagal simpan
- Tombol `Kembali ke Personal` untuk keluar mode organisasi

## Lokasi Akses File di Drive

- Personal mode:
  - Folder gambar: `My Monthly Journal - Images`
  - Spreadsheet: `My Monthly Journal - Data`
- Organisasi mode:
  - Folder + spreadsheet mengikuti resource organisasi yang aktif

## Troubleshooting Ringkas

- Login loading terus:
  - Cek origin OAuth sesuai URL aplikasi
  - Cek API key dan restriction
  - Cek Drive API / Sheets API enabled
- Error 403 discovery:
  - API key restriction salah atau API belum enabled
- `origin_mismatch`:
  - Origin OAuth tidak sama dengan domain aplikasi
- Gambar gagal upload:
  - Kuota Drive penuh / token expired / permission kurang

## Terms & Conditions

<<<<<<< HEAD
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
=======
1. Seluruh data dan file disimpan pada Google account pengguna/organisasi, bukan server aplikasi terpisah.
2. Beban storage sepenuhnya mengikuti kuota Google Drive pemilik resource.
3. Jika kuota penuh, upload/simpan dapat gagal.
4. Pengguna bertanggung jawab menjaga keamanan akun, data, dan izin berbagi file.
>>>>>>> 6b24d31 (Initial commit: My Journal V.1.2)
5. Disarankan backup berkala spreadsheet dan folder gambar.
