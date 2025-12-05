// KONFIGURASI GOOGLE API
// Dapatkan Client ID dan API Key dari Google Cloud Console: https://console.cloud.google.com/
// Pastikan mengaktifkan API berikut di Library:
// 1. Google Drive API
// 2. Google Sheets API

const CONFIG = {
    CLIENT_ID: '387519648442-r9ujkr1pi0oa6gd4t0km8am1pd6p3bhm.apps.googleusercontent.com',
    API_KEY: 'AIzaSyDd7TWtc-vppUV6sZBs1eEN7gHW4sW38oA',
    
    // Scope izin yang dibutuhkan user
    SCOPES: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/spreadsheets',
    
    // Nama file spreadsheet database (jangan diubah kecuali perlu)
    SPREADSHEET_NAME: 'My Monthly Journal - Data',
    
    // Nama folder untuk menyimpan gambar
    IMAGE_FOLDER_NAME: 'My Monthly Journal - Images'
};