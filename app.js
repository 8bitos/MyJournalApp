// --- GLOBAL VARIABLES ---
let tokenClient;
let gapiInited = false;
let gisInited = false;
let driveFolderId = null;
let spreadsheetId = null;
let sheetGid = 0; 

// State Editor
let isEditing = false;
let editingRowIndex = null;
let editingImageId = null;

// Constants
const STORAGE_KEY = 'journal_auth_session'; // Key untuk simpan login

// --- INITIALIZATION ---

function gapiLoaded() {
    gapi.load('client', initializeGapiClient);
}

async function initializeGapiClient() {
    await gapi.client.init({
        apiKey: CONFIG.API_KEY,
        discoveryDocs: [
            "https://www.googleapis.com/discovery/v1/apis/drive/v3/rest",
            "https://sheets.googleapis.com/$discovery/rest?version=v4"
        ],
    });
    gapiInited = true;
    tryRestoreSession(); // Coba restore sesi login
}

function gisLoaded() {
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CONFIG.CLIENT_ID,
        scope: CONFIG.SCOPES,
        callback: async (resp) => {
            if (resp.error !== undefined) {
                throw (resp);
            }
            // SIMPAN SESI LOGIN
            const expiresInMs = resp.expires_in * 1000;
            const expiryTime = Date.now() + expiresInMs;
            const sessionData = {
                access_token: resp.access_token,
                expiry: expiryTime
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(sessionData));

            await handleAuthSuccess();
        },
    });
    gisInited = true;
    tryRestoreSession();
}

function tryRestoreSession() {
    // Hanya jalankan jika kedua library sudah siap
    if (!gapiInited || !gisInited) return;

    const storedSession = localStorage.getItem(STORAGE_KEY);
    if (storedSession) {
        const session = JSON.parse(storedSession);
        // Cek apakah token masih berlaku (kurangi 1 menit untuk buffer)
        if (Date.now() < (session.expiry - 60000)) {
            // Restore Token
            gapi.client.setToken({ access_token: session.access_token });
            handleAuthSuccess(); // Masuk otomatis
        } else {
            // Token kadaluarsa, hapus storage
            console.log("Sesi kadaluarsa");
            localStorage.removeItem(STORAGE_KEY);
            document.getElementById('loading_api').classList.add('hidden');
            document.getElementById('authorize_button').classList.remove('hidden');
            document.getElementById('authorize_button').onclick = handleAuthClick;
        }
    } else {
        // Tidak ada sesi tersimpan
        document.getElementById('loading_api').classList.add('hidden');
        document.getElementById('authorize_button').classList.remove('hidden');
        document.getElementById('authorize_button').onclick = handleAuthClick;
    }
}

function handleAuthClick() {
    tokenClient.requestAccessToken({ prompt: 'consent' });
}

function handleSignoutClick() {
    const token = gapi.client.getToken();
    if (token !== null) {
        google.accounts.oauth2.revoke(token.access_token);
        gapi.client.setToken('');
        localStorage.removeItem(STORAGE_KEY); // Hapus sesi tersimpan
        
        document.getElementById('app-screen').classList.add('hidden');
        document.getElementById('login-screen').classList.remove('hidden');
        document.getElementById('journal-grid').innerHTML = '';
        
        // Reset tombol login
        document.getElementById('authorize_button').classList.remove('hidden');
    }
}

// --- CORE LOGIC ---

async function handleAuthSuccess() {
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('app-screen').classList.remove('hidden');
    
    document.getElementById('user-name').innerText = "Pengguna"; 
    document.getElementById('signout_button').onclick = handleSignoutClick;
    document.getElementById('current-date').innerText = new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    document.getElementById('input-date').valueAsDate = new Date();

    await setupBackend();
    await loadJournalEntries();
}

// 1. SETUP: Check/Create Folder & Sheet
async function setupBackend() {
    // A. Cari Folder
    const folderQuery = `name = '${CONFIG.IMAGE_FOLDER_NAME}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
    let response = await gapi.client.drive.files.list({ q: folderQuery, fields: 'files(id, name)' });
    let files = response.result.files;

    if (files && files.length > 0) {
        driveFolderId = files[0].id;
    } else {
        const fileMetadata = {
            'name': CONFIG.IMAGE_FOLDER_NAME,
            'mimeType': 'application/vnd.google-apps.folder'
        };
        response = await gapi.client.drive.files.create({ resource: fileMetadata, fields: 'id' });
        driveFolderId = response.result.id;
    }

    // B. Cari Spreadsheet
    const sheetQuery = `name = '${CONFIG.SPREADSHEET_NAME}' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false`;
    response = await gapi.client.drive.files.list({ q: sheetQuery, fields: 'files(id, name)' });
    files = response.result.files;

    if (files && files.length > 0) {
        spreadsheetId = files[0].id;
        const sheetMeta = await gapi.client.sheets.spreadsheets.get({ spreadsheetId: spreadsheetId });
        sheetGid = sheetMeta.result.sheets[0].properties.sheetId;
    } else {
        const resource = { properties: { title: CONFIG.SPREADSHEET_NAME } };
        response = await gapi.client.sheets.spreadsheets.create({ resource });
        spreadsheetId = response.result.spreadsheetId;
        sheetGid = response.result.sheets[0].properties.sheetId;
        
        // HEADER BARU (13 Kolom - Termasuk Nama Siswa)
        const headers = [
            'Tanggal', 
            'Jenis Kegiatan', 
            'Sasaran', 
            'Nama Siswa', // Baru
            'Bidang Layanan', 
            'Fungsi Layanan', 
            'Topik/Pokok Bahasan', 
            'Waktu', 
            'Catatan', 
            'Evaluasi', 
            'Tindak Lanjut', 
            'Link Gambar', 
            'ID Gambar'
        ];
        await gapi.client.sheets.spreadsheets.values.append({
            spreadsheetId: spreadsheetId,
            range: 'Sheet1!A1',
            valueInputOption: 'USER_ENTERED',
            resource: { values: [headers] }
        });
    }

    document.getElementById('sheet-link').href = `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;
}

// 2. LOAD DATA
async function loadJournalEntries() {
    const loader = document.getElementById('data-loader');
    const grid = document.getElementById('journal-grid');
    const emptyState = document.getElementById('empty-state');
    
    loader.classList.remove('hidden');
    grid.innerHTML = '';
    emptyState.classList.add('hidden');

    try {
        // Baca kolom A sampai M (13 Kolom)
        const response = await gapi.client.sheets.spreadsheets.values.get({
            spreadsheetId: spreadsheetId,
            range: 'Sheet1!A2:M', 
        });

        const rows = response.result.values;
        loader.classList.add('hidden');

        if (!rows || rows.length === 0) {
            emptyState.classList.remove('hidden');
            return;
        }

        const rowsWithIndex = rows.map((row, index) => ({ data: row, rowIndex: index + 2 }));

        rowsWithIndex.reverse().forEach(item => {
            if(!item.data || item.data.length === 0) return;
            
            // Destructuring 13 Kolom
            const [
                date, jenis, sasaran, namaSiswa, bidang, fungsi, topik, waktu, 
                note, evaluasi, tindakLanjut, imgLink, imgId
            ] = item.data;

            createCard({
                date, jenis, sasaran, namaSiswa, bidang, fungsi, topik, waktu, 
                note, evaluasi, tindakLanjut, imgId, 
                rowIndex: item.rowIndex
            });
        });

    } catch (err) {
        console.error(err);
        loader.classList.add('hidden');
    }
}

function createCard(params) {
    const grid = document.getElementById('journal-grid');
    const { 
        date, jenis, sasaran, namaSiswa, bidang, fungsi, topik, waktu, 
        note, evaluasi, tindakLanjut, imgId, rowIndex 
    } = params;
    
    const jsonParams = JSON.stringify(params).replace(/"/g, '&quot;');

    const card = document.createElement('div');
    card.className = 'bg-white rounded-xl shadow-sm overflow-hidden border hover:shadow-md transition flex flex-col relative group';
    
    card.innerHTML = `
        <div class="absolute top-2 right-2 flex gap-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 p-1 rounded-lg backdrop-blur-sm shadow-sm">
            <button onclick="openEditModal(${jsonParams})" class="text-blue-600 hover:text-blue-800 p-1 rounded-full hover:bg-blue-50" title="Edit">
                <span class="material-icons text-lg">edit</span>
            </button>
            <button onclick="deleteEntry(${rowIndex}, '${imgId}')" class="text-red-600 hover:text-red-800 p-1 rounded-full hover:bg-red-50" title="Hapus">
                <span class="material-icons text-lg">delete</span>
            </button>
        </div>

        <div class="h-48 w-full bg-gray-100 relative overflow-hidden flex items-center justify-center group">
            <img id="img-${imgId}" src="https://via.placeholder.com/400x300?text=Memuat..." class="w-full h-full object-cover opacity-60 transition-opacity duration-500" alt="Journal Image">
             <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-5 transition"></div>
        </div>
        <div class="p-5 flex-grow flex flex-col gap-3">
            <div class="flex justify-between items-start">
                <div class="text-xs font-bold text-blue-600 uppercase tracking-wide flex items-center gap-1 bg-blue-50 px-2 py-1 rounded-md">
                    <span class="material-icons text-xs">calendar_today</span> ${date}
                </div>
                <div class="text-xs font-semibold text-gray-500 flex items-center gap-1 bg-gray-100 px-2 py-1 rounded-md">
                    <span class="material-icons text-xs">schedule</span> ${waktu || '-'}
                </div>
            </div>

            <div>
                <h3 class="font-bold text-gray-900 text-lg leading-tight mb-1">${topik || 'Tanpa Topik'}</h3>
                <div class="flex flex-wrap gap-y-1 gap-x-2 text-xs text-gray-500 mb-2">
                    <span>${jenis || '-'}</span>
                    <span>•</span>
                    <span>${sasaran || '-'}</span>
                    ${namaSiswa ? `<span>•</span><span class="font-semibold text-blue-600">${namaSiswa}</span>` : ''}
                </div>
                
                <div class="grid grid-cols-2 gap-2 text-xs text-gray-600 bg-gray-50 p-2 rounded border border-gray-100">
                    <div><span class="font-semibold">Bidang:</span> ${bidang || '-'}</div>
                    <div><span class="font-semibold">Fungsi:</span> ${fungsi || '-'}</div>
                </div>
            </div>

            <div class="space-y-2 mt-2 border-t pt-2">
                ${note ? `<div><span class="text-xs font-bold text-gray-700 uppercase">Catatan:</span><p class="text-sm text-gray-800 whitespace-pre-line">${note}</p></div>` : ''}
                ${evaluasi ? `<div><span class="text-xs font-bold text-red-600 uppercase">Evaluasi:</span><p class="text-sm text-gray-700 italic">${evaluasi}</p></div>` : ''}
                ${tindakLanjut ? `<div><span class="text-xs font-bold text-green-600 uppercase">Tindak Lanjut:</span><p class="text-sm text-gray-700">${tindakLanjut}</p></div>` : ''}
            </div>
        </div>
    `;
    grid.appendChild(card);

    if(imgId) loadImageSecurely(imgId);
}

async function loadImageSecurely(fileId) {
    try {
        const accessToken = gapi.client.getToken().access_token;
        const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        if (!response.ok) throw new Error('Network response was not ok');
        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        const imgElement = document.getElementById(`img-${fileId}`);
        if (imgElement) {
            imgElement.src = objectUrl;
            imgElement.classList.remove('opacity-60');
        }
    } catch (error) {}
}

// 3. DELETE FUNCTION
async function deleteEntry(rowIndex, imgId) {
    if(!confirm("Hapus catatan ini permanen?")) return;

    const loader = document.getElementById('data-loader');
    loader.classList.remove('hidden');
    document.getElementById('journal-grid').classList.add('hidden');

    try {
        if(imgId) {
            try { await gapi.client.drive.files.delete({ fileId: imgId }); } catch (e) {}
        }

        const sheetIndex = rowIndex - 1;
        await gapi.client.sheets.spreadsheets.batchUpdate({
            spreadsheetId: spreadsheetId,
            resource: { requests: [{ deleteDimension: { range: { sheetId: sheetGid, dimension: "ROWS", startIndex: sheetIndex, endIndex: sheetIndex + 1 } } }] }
        });

        await loadJournalEntries();
    } catch (error) {
        alert("Gagal menghapus.");
        await loadJournalEntries();
    }
}

// 4. EDIT FUNCTION
function openEditModal(data) {
    isEditing = true;
    editingRowIndex = data.rowIndex;
    editingImageId = data.imgId;

    document.getElementById('modal-title').innerText = "Edit Catatan";
    document.getElementById('btn-save').innerText = "Update";
    
    document.getElementById('input-date').value = data.date || '';
    document.getElementById('input-jenis').value = data.jenis || '';
    document.getElementById('input-sasaran').value = data.sasaran || '';
    document.getElementById('input-nama').value = data.namaSiswa || ''; // Load Nama Siswa
    document.getElementById('input-bidang').value = data.bidang || '';
    document.getElementById('input-fungsi').value = data.fungsi || '';
    document.getElementById('input-topik').value = data.topik || '';
    document.getElementById('input-waktu').value = data.waktu || '';
    document.getElementById('input-notes').value = data.note || '';
    document.getElementById('input-evaluasi').value = data.evaluasi || '';
    document.getElementById('input-tindak-lanjut').value = data.tindakLanjut || '';

    document.getElementById('file-upload').required = false;
    document.getElementById('upload-placeholder').innerHTML = `<span class="material-icons text-gray-400 text-4xl">image</span><p class="text-xs text-gray-500">Gambar tersimpan.<br>Klik untuk ganti.</p>`;
    
    openModal();
}

// 5. SAVE FUNCTION
async function handleFormSubmit(e) {
    e.preventDefault();
    const btnSave = document.getElementById('btn-save');
    const originalText = btnSave.innerText;
    btnSave.disabled = true;
    btnSave.innerText = "Menyimpan...";

    // Ambil Value Form
    const values = [
        document.getElementById('input-date').value,
        document.getElementById('input-jenis').value,
        document.getElementById('input-sasaran').value,
        document.getElementById('input-nama').value, // Nama Siswa
        document.getElementById('input-bidang').value,
        document.getElementById('input-fungsi').value,
        document.getElementById('input-topik').value,
        document.getElementById('input-waktu').value,
        document.getElementById('input-notes').value,
        document.getElementById('input-evaluasi').value,
        document.getElementById('input-tindak-lanjut').value
    ];

    const fileInput = document.getElementById('file-upload');
    const file = fileInput.files[0];

    try {
        let fileId = isEditing ? editingImageId : "";
        let webViewLink = "";

        // Upload Gambar jika ada
        if (file) {
            const accessToken = gapi.client.getToken().access_token;
            const metadata = {
                'name': `Journal_${values[0]}_${Date.now()}`,
                'type': 'file',
                'parents': [driveFolderId]
            };

            const form = new FormData();
            form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
            form.append('file', file);

            const uploadRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink', {
                method: 'POST',
                headers: new Headers({ 'Authorization': 'Bearer ' + accessToken }),
                body: form
            });
            const uploadData = await uploadRes.json();
            
            fileId = uploadData.id;
            webViewLink = uploadData.webViewLink;

            if (isEditing && editingImageId) {
                try { await gapi.client.drive.files.delete({ fileId: editingImageId }); } catch (e) {}
            }
        }

        values.push(webViewLink);
        values.push(fileId);

        if (isEditing) {
            // Update Row (M = Kolom ke-13)
            const range = `Sheet1!A${editingRowIndex}:M${editingRowIndex}`;
            await gapi.client.sheets.spreadsheets.values.update({
                spreadsheetId: spreadsheetId,
                range: range,
                valueInputOption: 'USER_ENTERED',
                resource: { values: [values] }
            });
        } else {
            await gapi.client.sheets.spreadsheets.values.append({
                spreadsheetId: spreadsheetId,
                range: 'Sheet1!A:M',
                valueInputOption: 'USER_ENTERED',
                resource: { values: [values] }
            });
        }

        closeModal();
        loadJournalEntries();

    } catch (error) {
        console.error('Error:', error);
        alert('Gagal menyimpan.');
    } finally {
        btnSave.disabled = false;
        btnSave.innerText = originalText;
    }
}

// UI Helpers
function openModal() { document.getElementById('add-modal').classList.remove('hidden'); }
function closeModal() { 
    document.getElementById('add-modal').classList.add('hidden');
    document.getElementById('journal-form').reset();
    document.getElementById('image-preview').classList.add('hidden');
    document.getElementById('upload-placeholder').classList.remove('hidden');
    document.getElementById('upload-placeholder').innerHTML = `<span class="material-icons text-gray-400 text-4xl">cloud_upload</span><p class="text-xs text-gray-500">Klik untuk upload gambar</p>`;
    isEditing = false;
    editingRowIndex = null;
    editingImageId = null;
    document.getElementById('modal-title').innerText = "Catatan Baru";
    document.getElementById('btn-save').innerText = "Simpan";
    document.getElementById('file-upload').required = true;
}
function previewImage(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = document.getElementById('image-preview');
            img.src = e.target.result;
            img.classList.remove('hidden');
            document.getElementById('upload-placeholder').classList.add('hidden');
        }
        reader.readAsDataURL(input.files[0]);
    }
}
