import { CONFIG } from './config.js';
import { loadSession, saveSession, clearSession } from './storage.js';
import {
  getElements,
  showLoginScreen,
  showAppScreen,
  setAuthButtonsReady,
  setDataLoading,
  setGlobalError,
  setBlockingLoading,
  renderDynamicForm,
  getFormValuesFromSchema,
  renderEntries,
  renderSettingsFields,
  readSettingsFields,
  openModal,
  closeModal,
  setModalEditing,
  previewImage,
  openSettingsModal,
  closeSettingsModal,
  openHelpModal,
  closeHelpModal,
  setThemeToggleState
} from './ui.js';
import { createImageLoader } from './images.js';

const CLASS_OPTIONS = [
  'Kelas 7.1', 'Kelas 7.2', 'Kelas 7.3', 'Kelas 7.4', 'Kelas 7.5', 'Kelas 7.6', 'Kelas 7.7', 'Kelas 7.8', 'Kelas 7.9', 'Kelas 7.10', 'Kelas 7.11',
  'Kelas 8.1', 'Kelas 8.2', 'Kelas 8.3', 'Kelas 8.4', 'Kelas 8.5', 'Kelas 8.6', 'Kelas 8.7', 'Kelas 8.8', 'Kelas 8.9', 'Kelas 8.10', 'Kelas 8.11',
  'Kelas 9.1', 'Kelas 9.2', 'Kelas 9.3', 'Kelas 9.4', 'Kelas 9.5', 'Kelas 9.6', 'Kelas 9.7', 'Kelas 9.8', 'Kelas 9.9', 'Kelas 9.10', 'Kelas 9.11'
];

const DEFAULT_SCHEMA = [
  { id: 'f1', label: 'Tanggal', type: 'date', required: true },
  { id: 'f2', label: 'Jenis Kegiatan', type: 'text', required: false },
  { id: 'f3', label: 'Sasaran', type: 'select', required: false, options: CLASS_OPTIONS },
  { id: 'f4', label: 'Nama Siswa', type: 'text', required: false },
  { id: 'f5', label: 'Bidang Layanan', type: 'text', required: false },
  { id: 'f6', label: 'Fungsi Layanan', type: 'text', required: false },
  { id: 'f7', label: 'Topik/Pokok Bahasan', type: 'text', required: false },
  { id: 'f8', label: 'Waktu', type: 'time', required: false },
  { id: 'f9', label: 'Catatan', type: 'textarea', required: false },
  { id: 'f10', label: 'Evaluasi', type: 'textarea', required: false },
  { id: 'f11', label: 'Tindak Lanjut', type: 'textarea', required: false }
];

const IMAGE_LINK_LABEL = 'Link Gambar';
const IMAGE_ID_LABEL = 'ID Gambar';
const THEME_STORAGE_KEY = 'journal_theme_mode';
const CONFIG_SHEET_NAME = '_CONFIG';
const PAGE_SIZE_STORAGE_KEY = 'journal_page_size';
const MONTH_SHEET_PATTERN = /^\d{4}-\d{2}$/;
const MONTH_NAMES = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

function createApp() {
  const els = getElements();
  const state = {
    tokenClient: null,
    gapiInited: false,
    gisInited: false,
    driveFolderId: null,
    spreadsheetId: null,
    configSheetId: null,
    userEmail: '',
    schema: [...DEFAULT_SCHEMA],
    isEditing: false,
    editingRowIndex: null,
    editingImageId: null,
    editingSourceMonthKey: null,
    activeMonthKey: null,
    activeSheetName: null,
    activeSheetGid: null,
    monthSheets: new Map(),
    quickMenuBound: false,
    paginationBound: false,
    allEntries: [],
    currentPage: 1,
    pageSize: 6
  };

  const imageLoader = createImageLoader(() => {
    const token = gapi.client.getToken();
    return token ? token.access_token : null;
  });

  function applyTheme(isDark) {
    document.body.classList.toggle('dark', isDark);
    setThemeToggleState(els, isDark);
  }

  function initializeTheme() {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    const isDark = saved === 'dark';
    applyTheme(isDark);
  }

  function toggleTheme() {
    const isDark = !document.body.classList.contains('dark');
    applyTheme(isDark);
    localStorage.setItem(THEME_STORAGE_KEY, isDark ? 'dark' : 'light');
  }

  function closeQuickMenu() {
    if (!els.quickMenuPanel) return;
    els.quickMenuPanel.classList.add('hidden');
  }

  function toggleQuickMenu() {
    if (!els.quickMenuPanel) return;
    els.quickMenuPanel.classList.toggle('hidden');
  }

  function setupQuickMenuEvents() {
    if (!els.quickMenuToggle || !els.quickMenuPanel || state.quickMenuBound) return;
    els.quickMenuToggle.onclick = (event) => {
      event.stopPropagation();
      toggleQuickMenu();
    };
    els.quickMenuPanel.onclick = () => closeQuickMenu();
    document.addEventListener('click', (event) => {
      if (!els.quickMenuPanel.contains(event.target) && !els.quickMenuToggle.contains(event.target)) {
        closeQuickMenu();
      }
    });
    state.quickMenuBound = true;
  }

  function getDefaultPageSize() {
    const saved = Number(localStorage.getItem(PAGE_SIZE_STORAGE_KEY) || '');
    if (saved > 0) return saved;
    return window.innerWidth < 640 ? 6 : 9;
  }

  function getTotalPages() {
    return Math.max(1, Math.ceil(state.allEntries.length / state.pageSize));
  }

  function updatePaginationUi() {
    const totalPages = getTotalPages();
    if (!els.paginationWrap || !els.prevPageButton || !els.nextPageButton || !els.pageInfo) return;

    if (state.allEntries.length <= state.pageSize) {
      els.paginationWrap.classList.add('hidden');
      return;
    }

    els.paginationWrap.classList.remove('hidden');
    els.pageInfo.textContent = `Halaman ${state.currentPage}/${totalPages}`;
    els.prevPageButton.disabled = state.currentPage <= 1;
    els.nextPageButton.disabled = state.currentPage >= totalPages;
  }

  function renderCurrentPage() {
    const totalPages = getTotalPages();
    if (state.currentPage > totalPages) state.currentPage = totalPages;
    if (state.currentPage < 1) state.currentPage = 1;

    const start = (state.currentPage - 1) * state.pageSize;
    const pageRows = state.allEntries.slice(start, start + state.pageSize);
    renderEntries(els, pageRows, state.schema, openEditModal, deleteEntry, imageLoader);
    updatePaginationUi();
  }

  function setupPaginationEvents() {
    if (!els.prevPageButton || !els.nextPageButton || !els.pageSizeSelector || state.paginationBound) return;
    state.pageSize = getDefaultPageSize();
    els.pageSizeSelector.value = String(state.pageSize);

    els.prevPageButton.onclick = () => {
      if (state.currentPage <= 1) return;
      state.currentPage -= 1;
      renderCurrentPage();
    };
    els.nextPageButton.onclick = () => {
      if (state.currentPage >= getTotalPages()) return;
      state.currentPage += 1;
      renderCurrentPage();
    };
    els.pageSizeSelector.onchange = () => {
      const nextSize = Number(els.pageSizeSelector.value);
      if (!nextSize || nextSize < 1) return;
      state.pageSize = nextSize;
      state.currentPage = 1;
      localStorage.setItem(PAGE_SIZE_STORAGE_KEY, String(nextSize));
      renderCurrentPage();
    };
    state.paginationBound = true;
  }

  function cloneDefaultSchema() {
    return DEFAULT_SCHEMA.map((field, idx) => ({
      id: `f${idx + 1}`,
      label: field.label,
      type: field.type,
      required: field.required,
      options: Array.isArray(field.options) ? [...field.options] : []
    }));
  }

  function normalizeSchema(rawSchema) {
    if (!Array.isArray(rawSchema) || rawSchema.length === 0) return cloneDefaultSchema();
    return rawSchema.map((f, idx) => ({
      id: `f${idx + 1}`,
      label: String(f.label || '').trim() || `Field ${idx + 1}`,
      type: ['text', 'textarea', 'date', 'time', 'select'].includes(f.type) ? f.type : 'text',
      required: Boolean(f.required),
      options: Array.isArray(f.options) ? f.options.map((v) => String(v).trim()).filter(Boolean) : []
    }));
  }

  function gapiLoaded() {
    gapi.load('client', initializeGapiClient);
  }

  async function initializeGapiClient() {
    await gapi.client.init({
      apiKey: CONFIG.API_KEY,
      discoveryDocs: [
        'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest',
        'https://sheets.googleapis.com/$discovery/rest?version=v4'
      ]
    });
    state.gapiInited = true;
    tryRestoreSession();
  }

  function gisLoaded() {
    state.tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: CONFIG.CLIENT_ID,
      scope: CONFIG.SCOPES,
      callback: async (resp) => {
        if (resp.error !== undefined) {
          setBlockingLoading(els, false);
          setGlobalError(els, 'Login gagal. Coba lagi.');
          return;
        }

        const expiresInMs = resp.expires_in * 1000;
        saveSession({ access_token: resp.access_token, expiry: Date.now() + expiresInMs });
        await handleAuthSuccess();
      }
    });
    state.gisInited = true;
    tryRestoreSession();
  }

  function tryRestoreSession() {
    if (!state.gapiInited || !state.gisInited) return;

    const session = loadSession();
    if (session && Date.now() < session.expiry - 60000) {
      gapi.client.setToken({ access_token: session.access_token });
      handleAuthSuccess();
      return;
    }

    if (session) clearSession();
    setAuthButtonsReady(els);
    els.authorizeButton.onclick = handleAuthClick;
  }

  function handleAuthClick() {
    setGlobalError(els, '');
    setBlockingLoading(els, true, 'Membuka login Google...');
    state.tokenClient.requestAccessToken({ prompt: 'consent' });
  }

  function handleSignoutClick() {
    const token = gapi.client.getToken();
    if (!token) return;

    google.accounts.oauth2.revoke(token.access_token);
    gapi.client.setToken('');
    clearSession();
    imageLoader.reset();

    showLoginScreen(els);
    closeQuickMenu();
    els.journalGrid.innerHTML = '';
    state.monthSheets.clear();
    setAuthButtonsReady(els);
  }

  async function handleAuthSuccess() {
    setBlockingLoading(els, true, 'Menyiapkan jurnal bulanan Anda...');
    setGlobalError(els, '');
    showAppScreen(els);

    const profile = await getGoogleProfile();
    state.userEmail = profile.email || '';
    els.userName.innerText = profile.name || profile.email || 'Pengguna';
    if (els.userName) {
      els.userName.title = profile.email || profile.name || 'Pengguna';
    }
    els.signoutButton.onclick = handleSignoutClick;
    els.currentDate.innerText = new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    els.monthSelector.onchange = handleMonthChange;
    setupQuickMenuEvents();
    setupPaginationEvents();
    els.exportMonthButton.onclick = exportCurrentMonthCsv;
    els.openSettingsButton.onclick = openSettings;
    els.helpButton.onclick = () => openHelpModal(els);
    els.closeHelpButton.onclick = () => closeHelpModal(els);
    els.themeToggleButton.onclick = toggleTheme;
    els.addSettingFieldButton.onclick = addSettingField;
    els.resetSettingFieldButton.onclick = resetSettingsToDefault;
    els.applySettingsButton.onclick = applySettings;
    els.closeSettingsButton.onclick = () => closeSettingsModal(els);

    try {
      await setupBackend();
      renderDynamicForm(els, state.schema);
      await loadJournalEntries();
    } catch (err) {
      setGlobalError(els, 'Gagal memuat data. Periksa koneksi dan izin Google.');
      setDataLoading(els, false);
    } finally {
      setBlockingLoading(els, false);
    }
  }

  function getHeadersFromSchema(schema = state.schema) {
    return [...schema.map((s) => s.label), IMAGE_LINK_LABEL, IMAGE_ID_LABEL];
  }

  async function getGoogleProfile() {
    try {
      const token = gapi.client.getToken();
      if (!token?.access_token) return { email: '', name: '' };
      const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${token.access_token}` }
      });
      if (!response.ok) return { email: '', name: '' };
      return response.json();
    } catch (err) {
      return { email: '', name: '' };
    }
  }

  async function ensureConfigSheet() {
    if (state.configSheetId) return;
    const response = await gapi.client.sheets.spreadsheets.batchUpdate({
      spreadsheetId: state.spreadsheetId,
      resource: { requests: [{ addSheet: { properties: { title: CONFIG_SHEET_NAME } } }] }
    });
    state.configSheetId = response.result.replies[0].addSheet.properties.sheetId;
    await gapi.client.sheets.spreadsheets.values.update({
      spreadsheetId: state.spreadsheetId,
      range: `'${CONFIG_SHEET_NAME}'!A1:C1`,
      valueInputOption: 'RAW',
      resource: { values: [['Email', 'SchemaJSON', 'UpdatedAt']] }
    });
  }

  async function saveSchemaByAccount(schema) {
    await ensureConfigSheet();
    const email = state.userEmail || 'unknown';
    const readRes = await gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId: state.spreadsheetId,
      range: `'${CONFIG_SHEET_NAME}'!A2:C`
    });
    const rows = readRes.result.values || [];
    const rowOffset = rows.findIndex((row) => (row[0] || '').toLowerCase() === email.toLowerCase());
    const rowNumber = rowOffset >= 0 ? rowOffset + 2 : rows.length + 2;

    await gapi.client.sheets.spreadsheets.values.update({
      spreadsheetId: state.spreadsheetId,
      range: `'${CONFIG_SHEET_NAME}'!A${rowNumber}:C${rowNumber}`,
      valueInputOption: 'RAW',
      resource: { values: [[email, JSON.stringify(schema), new Date().toISOString()]] }
    });
  }

  async function loadSchemaByAccount() {
    if (!state.userEmail) {
      state.schema = cloneDefaultSchema();
      return;
    }
    await ensureConfigSheet();
    const response = await gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId: state.spreadsheetId,
      range: `'${CONFIG_SHEET_NAME}'!A2:C`
    });
    const rows = response.result.values || [];
    const matched = rows.find((row) => (row[0] || '').toLowerCase() === state.userEmail.toLowerCase());
    if (!matched || !matched[1]) {
      state.schema = cloneDefaultSchema();
      return;
    }
    try {
      state.schema = normalizeSchema(JSON.parse(matched[1]));
    } catch (err) {
      state.schema = cloneDefaultSchema();
    }
  }

  function colLetter(columnNumber) {
    let result = '';
    let n = columnNumber;
    while (n > 0) {
      const rem = (n - 1) % 26;
      result = String.fromCharCode(65 + rem) + result;
      n = Math.floor((n - 1) / 26);
    }
    return result;
  }

  function formatMonthKey(dateInput) {
    const date = dateInput ? new Date(dateInput) : new Date();
    const validDate = Number.isNaN(date.getTime()) ? new Date() : date;
    return `${validDate.getFullYear()}-${String(validDate.getMonth() + 1).padStart(2, '0')}`;
  }

  function monthKeyToLabel(monthKey) {
    const [year, month] = monthKey.split('-');
    return `${MONTH_NAMES[Number(month) - 1] || month} ${year}`;
  }

  function parseSheetData(meta) {
    return { name: meta.properties.title, gid: meta.properties.sheetId };
  }

  async function loadSheetCatalog() {
    const sheetMeta = await gapi.client.sheets.spreadsheets.get({ spreadsheetId: state.spreadsheetId });
    state.monthSheets.clear();
    state.configSheetId = null;

    const allSheets = sheetMeta.result.sheets || [];
    allSheets.forEach((sheet) => {
      const data = parseSheetData(sheet);
      if (MONTH_SHEET_PATTERN.test(data.name)) state.monthSheets.set(data.name, data);
      if (data.name === CONFIG_SHEET_NAME) state.configSheetId = data.gid;
    });

    return allSheets;
  }

  async function ensureHeaders(sheetName, headers = getHeadersFromSchema()) {
    const endCol = colLetter(headers.length);
    await gapi.client.sheets.spreadsheets.values.update({
      spreadsheetId: state.spreadsheetId,
      range: `'${sheetName}'!A1:${endCol}1`,
      valueInputOption: 'USER_ENTERED',
      resource: { values: [headers] }
    });
  }

  async function createMonthSheet(monthKey) {
    const response = await gapi.client.sheets.spreadsheets.batchUpdate({
      spreadsheetId: state.spreadsheetId,
      resource: { requests: [{ addSheet: { properties: { title: monthKey } } }] }
    });

    const props = response.result.replies[0].addSheet.properties;
    state.monthSheets.set(monthKey, { name: monthKey, gid: props.sheetId });
    await ensureHeaders(monthKey);
    return state.monthSheets.get(monthKey);
  }

  async function ensureMonthSheet(monthKey) {
    const existing = state.monthSheets.get(monthKey);
    if (existing) return existing;
    return createMonthSheet(monthKey);
  }

  function refreshMonthSelector() {
    const monthKeys = Array.from(state.monthSheets.keys()).sort((a, b) => b.localeCompare(a));
    els.monthSelector.innerHTML = '';
    monthKeys.forEach((monthKey) => {
      const option = document.createElement('option');
      option.value = monthKey;
      option.textContent = `Riwayat ${monthKeyToLabel(monthKey)}`;
      option.selected = monthKey === state.activeMonthKey;
      els.monthSelector.appendChild(option);
    });
  }

  function updateActiveMonthUi() {
    els.currentMonthLabel.textContent = `Bulan aktif: ${monthKeyToLabel(state.activeMonthKey)}`;
    els.sheetLink.href = `https://docs.google.com/spreadsheets/d/${state.spreadsheetId}/edit#gid=${state.activeSheetGid}`;
  }

  async function setActiveMonth(monthKey, shouldLoad = true) {
    const monthSheet = await ensureMonthSheet(monthKey);
    state.activeMonthKey = monthKey;
    state.activeSheetName = monthSheet.name;
    state.activeSheetGid = monthSheet.gid;
    refreshMonthSelector();
    updateActiveMonthUi();
    if (shouldLoad) await loadJournalEntries();
  }

  async function migrateFirstSheetIfNeeded(allSheets, monthKey) {
    if (state.monthSheets.size > 0 || !allSheets.length) return;
    const first = allSheets[0].properties;
    if (first.title !== 'Sheet1') return;

    await gapi.client.sheets.spreadsheets.batchUpdate({
      spreadsheetId: state.spreadsheetId,
      resource: {
        requests: [{ updateSheetProperties: { properties: { sheetId: first.sheetId, title: monthKey }, fields: 'title' } }]
      }
    });

    state.monthSheets.set(monthKey, { name: monthKey, gid: first.sheetId });
    await ensureHeaders(monthKey);
  }

  async function setupBackend() {
    const folderQuery = `name = '${CONFIG.IMAGE_FOLDER_NAME}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
    let response = await gapi.client.drive.files.list({ q: folderQuery, fields: 'files(id, name)' });
    let files = response.result.files;

    if (files && files.length > 0) {
      state.driveFolderId = files[0].id;
    } else {
      response = await gapi.client.drive.files.create({
        resource: { name: CONFIG.IMAGE_FOLDER_NAME, mimeType: 'application/vnd.google-apps.folder' },
        fields: 'id'
      });
      state.driveFolderId = response.result.id;
    }

    const sheetQuery = `name = '${CONFIG.SPREADSHEET_NAME}' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false`;
    response = await gapi.client.drive.files.list({ q: sheetQuery, fields: 'files(id, name)' });
    files = response.result.files;

    if (files && files.length > 0) {
      state.spreadsheetId = files[0].id;
    } else {
      response = await gapi.client.sheets.spreadsheets.create({ resource: { properties: { title: CONFIG.SPREADSHEET_NAME } } });
      state.spreadsheetId = response.result.spreadsheetId;
    }

    const defaultMonth = formatMonthKey(new Date());
    const allSheets = await loadSheetCatalog();
    await migrateFirstSheetIfNeeded(allSheets, defaultMonth);
    if (state.monthSheets.size === 0) await ensureMonthSheet(defaultMonth);

    await loadSchemaByAccount();

    const latestMonth = Array.from(state.monthSheets.keys()).sort((a, b) => b.localeCompare(a))[0] || defaultMonth;
    await setActiveMonth(latestMonth, false);
  }

  function getDataRange(sheetName, includeHeader = false) {
    const endCol = colLetter(state.schema.length + 2);
    return includeHeader ? `'${sheetName}'!A1:${endCol}` : `'${sheetName}'!A2:${endCol}`;
  }

  async function loadJournalEntries() {
    setDataLoading(els, true);
    setGlobalError(els, '');

    try {
      const response = await gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId: state.spreadsheetId,
        range: getDataRange(state.activeSheetName, false)
      });
      const rows = response.result.values || [];
      setDataLoading(els, false);
      state.allEntries = rows.map((row, index) => ({ data: row, rowIndex: index + 2 })).reverse();
      state.currentPage = 1;
      renderCurrentPage();
    } catch (err) {
      setDataLoading(els, false);
      setGlobalError(els, 'Gagal mengambil data dari Spreadsheet.');
    }
  }

  async function handleMonthChange(event) {
    if (!event.target.value || event.target.value === state.activeMonthKey) return;
    try {
      await setActiveMonth(event.target.value, true);
    } catch (err) {
      setGlobalError(els, 'Gagal berpindah ke bulan yang dipilih.');
    }
  }

  function rowToFormValues(row) {
    const values = {};
    state.schema.forEach((field, idx) => {
      values[field.id] = row[idx] || '';
    });
    return values;
  }

  function openEditModal(data) {
    state.isEditing = true;
    state.editingRowIndex = data.rowIndex;
    state.editingImageId = data.row[state.schema.length + 1] || '';
    state.editingSourceMonthKey = state.activeMonthKey;

    setModalEditing(els, true);
    renderDynamicForm(els, state.schema, rowToFormValues(data.row));
    openModal(els);
  }

  async function deleteEntry(rowIndex, imgId) {
    if (!confirm('Hapus catatan ini permanen?')) return;
    setDataLoading(els, true);

    try {
      if (imgId) {
        try {
          await gapi.client.drive.files.delete({ fileId: imgId });
        } catch (err) {
          // ignore
        }
      }

      const startIndex = rowIndex - 1;
      await gapi.client.sheets.spreadsheets.batchUpdate({
        spreadsheetId: state.spreadsheetId,
        resource: {
          requests: [{ deleteDimension: { range: { sheetId: state.activeSheetGid, dimension: 'ROWS', startIndex, endIndex: startIndex + 1 } } }]
        }
      });

      await loadJournalEntries();
    } catch (err) {
      setGlobalError(els, 'Gagal menghapus catatan.');
      await loadJournalEntries();
    }
  }

  async function uploadImage(file, dateString) {
    const accessToken = gapi.client.getToken().access_token;
    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify({
      name: `Journal_${dateString || Date.now()}_${Date.now()}`,
      type: 'file',
      parents: [state.driveFolderId]
    })], { type: 'application/json' }));
    form.append('file', file);

    const uploadRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink', {
      method: 'POST',
      headers: new Headers({ Authorization: `Bearer ${accessToken}` }),
      body: form
    });

    if (!uploadRes.ok) throw new Error('Upload gagal');
    return uploadRes.json();
  }

  function resetEditState() {
    state.isEditing = false;
    state.editingRowIndex = null;
    state.editingImageId = null;
    state.editingSourceMonthKey = null;
  }

  function getPrimaryDateValue(valuesMap) {
    const dateField = state.schema.find((field) => field.type === 'date');
    return dateField ? valuesMap[dateField.id] : '';
  }

  function buildRowValues(valuesMap, imageLink, imageId) {
    const row = state.schema.map((field) => valuesMap[field.id] || '');
    row.push(imageLink || '');
    row.push(imageId || '');
    return row;
  }

  async function handleFormSubmit(e) {
    e.preventDefault();
    setGlobalError(els, '');
    setBlockingLoading(els, true, 'Menyimpan catatan...');

    const btnSave = els.btnSave;
    const originalText = btnSave.innerText;
    btnSave.disabled = true;
    btnSave.innerText = 'Menyimpan...';

    try {
      const valuesMap = getFormValuesFromSchema(state.schema);
      const dateValue = getPrimaryDateValue(valuesMap);
      const targetMonthKey = formatMonthKey(dateValue || new Date());
      const file = els.fileInput.files[0];

      let fileId = state.isEditing ? state.editingImageId : '';
      let webViewLink = '';

      if (file) {
        const uploadData = await uploadImage(file, dateValue);
        fileId = uploadData.id;
        webViewLink = uploadData.webViewLink;

        if (state.isEditing && state.editingImageId) {
          try {
            await gapi.client.drive.files.delete({ fileId: state.editingImageId });
          } catch (err) {
            // ignore
          }
        }
      }

      const rowValues = buildRowValues(valuesMap, webViewLink, fileId);
      const targetSheet = await ensureMonthSheet(targetMonthKey);
      const targetRange = getDataRange(targetSheet.name, false);

      if (state.isEditing) {
        if (targetMonthKey === state.editingSourceMonthKey) {
          const endCol = colLetter(state.schema.length + 2);
          const updateRange = `'${targetSheet.name}'!A${state.editingRowIndex}:${endCol}${state.editingRowIndex}`;
          await gapi.client.sheets.spreadsheets.values.update({
            spreadsheetId: state.spreadsheetId,
            range: updateRange,
            valueInputOption: 'USER_ENTERED',
            resource: { values: [rowValues] }
          });
        } else {
          await gapi.client.sheets.spreadsheets.values.append({
            spreadsheetId: state.spreadsheetId,
            range: targetRange,
            valueInputOption: 'USER_ENTERED',
            resource: { values: [rowValues] }
          });

          const sourceSheet = state.monthSheets.get(state.editingSourceMonthKey);
          const startIndex = state.editingRowIndex - 1;
          await gapi.client.sheets.spreadsheets.batchUpdate({
            spreadsheetId: state.spreadsheetId,
            resource: {
              requests: [{ deleteDimension: { range: { sheetId: sourceSheet.gid, dimension: 'ROWS', startIndex, endIndex: startIndex + 1 } } }]
            }
          });
        }
      } else {
        await gapi.client.sheets.spreadsheets.values.append({
          spreadsheetId: state.spreadsheetId,
          range: targetRange,
          valueInputOption: 'USER_ENTERED',
          resource: { values: [rowValues] }
        });
      }

      closeModal(els);
      setModalEditing(els, false);
      resetEditState();
      renderDynamicForm(els, state.schema);
      await setActiveMonth(targetMonthKey, true);
    } catch (err) {
      setGlobalError(els, 'Gagal menyimpan catatan.');
    } finally {
      setBlockingLoading(els, false);
      btnSave.disabled = false;
      btnSave.innerText = originalText;
    }
  }

  async function exportCurrentMonthCsv() {
    if (!state.activeSheetName) return;

    try {
      const response = await gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId: state.spreadsheetId,
        range: getDataRange(state.activeSheetName, true)
      });

      const rows = response.result.values || [];
      if (rows.length === 0) {
        setGlobalError(els, 'Tidak ada data untuk diekspor pada bulan ini.');
        return;
      }

      const csv = rows
        .map((row) => row.map((cell) => `"${String(cell || '').replaceAll('"', '""')}"`).join(','))
        .join('\n');

      const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `journal-${state.activeMonthKey}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      setGlobalError(els, 'Export CSV gagal. Coba lagi.');
    }
  }

  function openSettings() {
    renderSettingsFields(els, state.schema);
    openSettingsModal(els);

    els.settingsFields.onclick = (event) => {
      const btn = event.target.closest('[data-role="remove"]');
      if (!btn) return;
      const row = btn.closest('[data-index]');
      if (row) row.remove();
    };
  }

  function addSettingField() {
    const current = readSettingsFields(els);
    current.push({ id: `f${current.length + 1}`, label: 'Field Baru', type: 'text', required: false, options: [] });
    renderSettingsFields(els, current);
  }

  function validateSchema(schema) {
    if (schema.length === 0) return 'Minimal harus ada 1 field.';
    if (schema.some((f) => !f.label)) return 'Semua field harus punya nama.';
    if (!schema.some((f) => f.type === 'date')) return 'Minimal harus ada 1 field bertipe date agar history bulanan berjalan.';
    if (schema.some((f) => f.type === 'select' && (!Array.isArray(f.options) || f.options.length === 0))) {
      return 'Field bertipe select harus memiliki minimal satu opsi.';
    }
    return '';
  }

  async function applySettings() {
    const nextSchema = readSettingsFields(els).map((field, idx) => ({
      id: `f${idx + 1}`,
      label: field.label,
      type: field.type,
      required: field.required,
      options: Array.isArray(field.options) ? field.options : []
    }));

    const validationError = validateSchema(nextSchema);
    if (validationError) {
      setGlobalError(els, validationError);
      return;
    }

    const proceed = confirm('Yakin ingin mengubah struktur input untuk akun ini? Perubahan akan tersimpan pada konfigurasi akun Google yang sedang login.');
    if (!proceed) return;

    setBlockingLoading(els, true, 'Menyimpan setting user...');
    setGlobalError(els, '');

    try {
      state.schema = nextSchema;
      await saveSchemaByAccount(nextSchema);
      renderDynamicForm(els, state.schema);
      closeSettingsModal(els);
      await loadJournalEntries();
    } catch (err) {
      setGlobalError(els, 'Gagal menerapkan setting. Struktur lama tetap dipertahankan.');
    } finally {
      setBlockingLoading(els, false);
    }
  }

  function resetSettingsToDefault() {
    const proceed = confirm('Kembalikan struktur input ke default untuk user ini?');
    if (!proceed) return;
    const defaults = cloneDefaultSchema();
    renderSettingsFields(els, defaults);
  }

  function openModalWrapper() {
    setModalEditing(els, false);
    renderDynamicForm(els, state.schema);
    openModal(els);
  }

  function closeModalWrapper() {
    closeModal(els);
    resetEditState();
    setModalEditing(els, false);
    renderDynamicForm(els, state.schema);
  }

  function previewImageWrapper(input) {
    previewImage(els, input);
  }

  initializeTheme();

  return {
    gapiLoaded,
    gisLoaded,
    handleFormSubmit,
    openModal: openModalWrapper,
    closeModal: closeModalWrapper,
    previewImage: previewImageWrapper
  };
}

export { createApp };
