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
  openOrganizationModal,
  closeOrganizationModal,
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
const ORG_CONTEXT_STORAGE_KEY = 'journal_org_context';
const ORG_LAST_CONTEXT_STORAGE_KEY = 'journal_last_org_context';
const ORG_REGISTRY_STORAGE_KEY = 'journal_org_registry';
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
    userDisplayName: '',
    userEmail: '',
    orgContext: null,
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
    userNameResizeBound: false,
    paginationBound: false,
    allEntries: [],
    currentPage: 1,
    pageSize: 6
  };

  function ensureOrgSchema(schemaInput) {
    const schema = normalizeSchema(schemaInput);
    const hasDate = schema.some((field) => field.type === 'date');
    if (!hasDate) {
      schema.unshift({ id: 'f0', label: 'Tanggal', type: 'date', required: true, options: [] });
    }

    const guruIndex = schema.findIndex((field) => field.label.trim().toLowerCase() === 'nama guru');
    if (guruIndex === -1) {
      const insertAt = Math.min(1, schema.length);
      schema.splice(insertAt, 0, { id: 'f0', label: 'Nama Guru', type: 'text', required: true, options: [] });
    } else {
      schema[guruIndex].required = true;
      if (schema[guruIndex].type !== 'text') schema[guruIndex].type = 'text';
    }

    return schema.map((field, idx) => ({
      id: `f${idx + 1}`,
      label: field.label,
      type: field.type,
      required: field.required,
      options: Array.isArray(field.options) ? field.options : []
    }));
  }

  function isOrgMode() {
    return Boolean(state.orgContext?.spreadsheetId && state.orgContext?.folderId);
  }

  function loadOrgContext() {
    const raw = localStorage.getItem(ORG_CONTEXT_STORAGE_KEY);
    if (!raw) {
      state.orgContext = null;
      return;
    }
    try {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.mode === 'org' && parsed.spreadsheetId && parsed.folderId) {
        state.orgContext = parsed;
      } else {
        state.orgContext = null;
      }
    } catch (err) {
      state.orgContext = null;
    }
  }

  function saveOrgContext(context) {
    if (!context) {
      localStorage.removeItem(ORG_CONTEXT_STORAGE_KEY);
      state.orgContext = null;
      return;
    }
    const clean = {
      mode: 'org',
      name: String(context.name || 'Organisasi'),
      spreadsheetId: String(context.spreadsheetId || ''),
      folderId: String(context.folderId || ''),
      ownerEmail: String(context.ownerEmail || '')
    };
    localStorage.setItem(ORG_CONTEXT_STORAGE_KEY, JSON.stringify(clean));
    localStorage.setItem(ORG_LAST_CONTEXT_STORAGE_KEY, JSON.stringify(clean));
    upsertOrgRegistry(clean);
    state.orgContext = clean;
  }

  function loadLastOrgContext() {
    const raw = localStorage.getItem(ORG_LAST_CONTEXT_STORAGE_KEY);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.mode === 'org' && parsed.spreadsheetId && parsed.folderId) {
        return parsed;
      }
      return null;
    } catch (err) {
      return null;
    }
  }

  function loadOrgRegistry() {
    const raw = localStorage.getItem(ORG_REGISTRY_STORAGE_KEY);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter((item) => item && item.spreadsheetId && item.folderId);
    } catch (err) {
      return [];
    }
  }

  function saveOrgRegistry(list) {
    localStorage.setItem(ORG_REGISTRY_STORAGE_KEY, JSON.stringify(list));
  }

  function upsertOrgRegistry(context) {
    const list = loadOrgRegistry();
    const normalized = {
      mode: 'org',
      name: String(context.name || 'Organisasi'),
      spreadsheetId: String(context.spreadsheetId || ''),
      folderId: String(context.folderId || ''),
      ownerEmail: String(context.ownerEmail || '')
    };
    const existingIndex = list.findIndex((item) => item.spreadsheetId === normalized.spreadsheetId);
    if (existingIndex >= 0) {
      list[existingIndex] = normalized;
    } else {
      list.push(normalized);
    }
    saveOrgRegistry(list);
  }

  function removeOrgFromRegistry(spreadsheetId) {
    const list = loadOrgRegistry();
    const next = list.filter((item) => item.spreadsheetId !== spreadsheetId);
    saveOrgRegistry(next);
  }

  function isCurrentUserOrgOwner() {
    if (!isOrgMode()) return false;
    const owner = String(state.orgContext.ownerEmail || '').toLowerCase();
    const user = String(state.userEmail || '').toLowerCase();
    if (!owner || !user) return false;
    return owner === user;
  }

  function encodeInvitePayload(payload) {
    const json = JSON.stringify(payload);
    return btoa(unescape(encodeURIComponent(json)));
  }

  function decodeInvitePayload(token) {
    const json = decodeURIComponent(escape(atob(token)));
    return JSON.parse(json);
  }

  function parseInviteInput(raw) {
    const trimmed = (raw || '').trim();
    if (!trimmed) return null;
    try {
      if (trimmed.includes('invite=')) {
        const url = new URL(trimmed);
        const token = url.searchParams.get('invite');
        if (!token) return null;
        return decodeInvitePayload(token);
      }
      return decodeInvitePayload(trimmed);
    } catch (err) {
      return null;
    }
  }

  function getOrgInviteToken() {
    return getOrgInviteTokenForEmail('');
  }

  function getOrgInviteTokenForEmail(targetEmail = '') {
    if (!isOrgMode()) return '';
    const payload = {
      name: state.orgContext.name,
      spreadsheetId: state.orgContext.spreadsheetId,
      folderId: state.orgContext.folderId,
      ownerEmail: state.orgContext.ownerEmail,
      targetEmail: String(targetEmail || '').trim().toLowerCase(),
      createdAt: new Date().toISOString()
    };
    return encodeInvitePayload(payload);
  }

  function updateModeUi() {
    const orgActive = isOrgMode();
    if (els.orgModeLabel) {
      els.orgModeLabel.textContent = orgActive
        ? `Mode: Organisasi (${state.orgContext.name})`
        : 'Mode: Personal';
    }
    if (els.organizationCurrentInfo) {
      els.organizationCurrentInfo.textContent = orgActive
        ? `Anda sedang di organisasi: ${state.orgContext.name}`
        : 'Anda sedang memakai mode personal.';
    }
    if (els.orgMenuBadge) {
      els.orgMenuBadge.textContent = orgActive ? 'Aktif' : 'Personal';
      els.orgMenuBadge.className = orgActive
        ? 'text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-700'
        : 'text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600';
    }
    if (els.teacherFilterSelector) {
      const guruExists = getTeacherFieldIndex() >= 0;
      const shouldShow = orgActive && guruExists;
      els.teacherFilterSelector.classList.toggle('hidden', !shouldShow);
      if (!shouldShow) {
        els.teacherFilterSelector.value = 'ALL';
      }
    }
    if (els.rejoinLastOrgButton) {
      const hasLastOrg = Boolean(loadLastOrgContext());
      const showRejoin = !orgActive && hasLastOrg;
      els.rejoinLastOrgButton.classList.toggle('hidden', !showRejoin);
    }
    if (els.deleteOrganizationButton) {
      const canDelete = orgActive && isCurrentUserOrgOwner();
      els.deleteOrganizationButton.disabled = !canDelete;
      els.deleteOrganizationButton.classList.toggle('opacity-50', !canDelete);
      els.deleteOrganizationButton.classList.toggle('cursor-not-allowed', !canDelete);
    }
  }

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

  function isMobileViewport() {
    return window.matchMedia('(max-width: 639px)').matches;
  }

  function formatUserNameForViewport(name) {
    const safeName = String(name || 'Pengguna');
    if (!isMobileViewport()) return safeName;
    if (safeName.length <= 7) return safeName;
    return `${safeName.slice(0, 5)}...`;
  }

  function renderUserName() {
    if (!els.userName) return;
    const fullName = state.userDisplayName || state.userEmail || 'Pengguna';
    els.userName.innerText = formatUserNameForViewport(fullName);
    els.userName.title = fullName;
  }

  function setupUserNameResizeHandler() {
    if (state.userNameResizeBound) return;
    window.addEventListener('resize', renderUserName);
    state.userNameResizeBound = true;
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
    return Math.max(1, Math.ceil(getFilteredEntries().length / state.pageSize));
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
    const entries = getFilteredEntries();
    const totalPages = getTotalPages();
    if (state.currentPage > totalPages) state.currentPage = totalPages;
    if (state.currentPage < 1) state.currentPage = 1;

    const start = (state.currentPage - 1) * state.pageSize;
    const pageRows = entries.slice(start, start + state.pageSize);
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

  function getTeacherFieldIndex() {
    return state.schema.findIndex((field) => field.label.trim().toLowerCase() === 'nama guru');
  }

  function getFilteredEntries() {
    const selected = els.teacherFilterSelector?.value || 'ALL';
    if (selected === 'ALL') return state.allEntries;
    const guruIndex = getTeacherFieldIndex();
    if (guruIndex < 0) return state.allEntries;
    return state.allEntries.filter((item) => (item.data[guruIndex] || '').trim() === selected);
  }

  function refreshTeacherFilterOptions() {
    if (!els.teacherFilterSelector) return;
    const guruIndex = getTeacherFieldIndex();
    const previous = els.teacherFilterSelector.value || 'ALL';
    const names = new Set();
    if (guruIndex >= 0) {
      state.allEntries.forEach((item) => {
        const value = (item.data[guruIndex] || '').trim();
        if (value) names.add(value);
      });
    }

    const sorted = Array.from(names).sort((a, b) => a.localeCompare(b, 'id'));
    els.teacherFilterSelector.innerHTML = '<option value="ALL">Semua Guru</option>';
    sorted.forEach((name) => {
      const option = document.createElement('option');
      option.value = name;
      option.textContent = name;
      els.teacherFilterSelector.appendChild(option);
    });

    els.teacherFilterSelector.value = sorted.includes(previous) || previous === 'ALL' ? previous : 'ALL';
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
    state.userDisplayName = profile.name || profile.email || 'Pengguna';
    renderUserName();
    setupUserNameResizeHandler();
    els.signoutButton.onclick = handleSignoutClick;
    els.currentDate.innerText = new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    els.monthSelector.onchange = handleMonthChange;
    els.teacherFilterSelector.onchange = () => {
      state.currentPage = 1;
      renderCurrentPage();
    };
    setupQuickMenuEvents();
    setupPaginationEvents();
    els.exportMonthButton.onclick = exportCurrentMonthCsv;
    els.organizationButton.onclick = openOrganizationPanel;
    els.openSettingsButton.onclick = openSettings;
    els.helpButton.onclick = () => openHelpModal(els);
    els.closeHelpButton.onclick = () => closeHelpModal(els);
    els.themeToggleButton.onclick = toggleTheme;
    els.addSettingFieldButton.onclick = addSettingField;
    els.resetSettingFieldButton.onclick = resetSettingsToDefault;
    els.applySettingsButton.onclick = applySettings;
    els.closeSettingsButton.onclick = () => closeSettingsModal(els);
    els.createOrganizationButton.onclick = createOrganization;
    els.joinOrganizationButton.onclick = joinOrganizationFromInput;
    els.shareAndCopyInviteButton.onclick = shareAndCopyInvite;
    els.copyOrgInviteButton.onclick = copyOrganizationInvite;
    els.switchPersonalButton.onclick = switchToPersonalMode;
    els.closeOrganizationButton.onclick = () => closeOrganizationModal(els);
    els.orgOpenCreateButton.onclick = () => toggleOrganizationSection('create');
    els.orgOpenJoinButton.onclick = () => toggleOrganizationSection('join');
    els.orgOpenActiveButton.onclick = () => {
      if (!isOrgMode()) {
        setGlobalError(els, 'Aktifkan atau join organisasi dulu untuk membuka panel kelola.');
        return;
      }
      toggleOrganizationSection('active');
    };
    if (els.rejoinLastOrgButton) {
      els.rejoinLastOrgButton.onclick = rejoinLastOrganization;
    }
    if (els.saveOrganizationButton) {
      els.saveOrganizationButton.onclick = saveCurrentOrganization;
    }
    if (els.deleteOrganizationButton) {
      els.deleteOrganizationButton.onclick = deleteCurrentOrganization;
    }

    try {
      await applyInviteFromUrlIfExists();
      await setupBackend();
      renderDynamicForm(els, state.schema, getDefaultFormValues());
      await loadJournalEntries();
    } catch (err) {
      setGlobalError(els, 'Gagal memuat data. Periksa koneksi dan izin Google.');
      setDataLoading(els, false);
    } finally {
      setBlockingLoading(els, false);
    }
  }

  async function applyInviteFromUrlIfExists() {
    const params = new URLSearchParams(window.location.search);
    const inviteToken = params.get('invite');
    if (!inviteToken) return;
    const payload = parseInviteInput(inviteToken);
    if (!payload?.spreadsheetId || !payload?.folderId) return;
    const proceed = confirm(`Join organisasi "${payload.name || 'Organisasi'}" dari invite link?`);
    if (!proceed) return;
    saveOrgContext({
      name: payload.name || 'Organisasi',
      spreadsheetId: payload.spreadsheetId,
      folderId: payload.folderId,
      ownerEmail: payload.ownerEmail || ''
    });
    window.history.replaceState({}, document.title, window.location.pathname);
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
      const parsed = normalizeSchema(JSON.parse(matched[1]));
      state.schema = isOrgMode() ? ensureOrgSchema(parsed) : parsed;
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
    loadOrgContext();
    let response;
    let files;

    if (isOrgMode()) {
      state.driveFolderId = state.orgContext.folderId;
      state.spreadsheetId = state.orgContext.spreadsheetId;
      await gapi.client.sheets.spreadsheets.get({ spreadsheetId: state.spreadsheetId });
    } else {
      const folderQuery = `name = '${CONFIG.IMAGE_FOLDER_NAME}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
      response = await gapi.client.drive.files.list({ q: folderQuery, fields: 'files(id, name)' });
      files = response.result.files;

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
    }

    const defaultMonth = formatMonthKey(new Date());
    const allSheets = await loadSheetCatalog();
    await migrateFirstSheetIfNeeded(allSheets, defaultMonth);
    if (state.monthSheets.size === 0) await ensureMonthSheet(defaultMonth);

    await loadSchemaByAccount();
    state.schema = isOrgMode() ? ensureOrgSchema(state.schema) : normalizeSchema(state.schema);
    updateModeUi();

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
      refreshTeacherFilterOptions();
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

  function getDefaultFormValues() {
    const values = {};
    const guruField = state.schema.find((field) => field.label.trim().toLowerCase() === 'nama guru');
    if (guruField) {
      values[guruField.id] = state.userEmail || state.userDisplayName || '';
    }
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
      renderDynamicForm(els, state.schema, getDefaultFormValues());
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
      const selectedGuru = els.teacherFilterSelector?.value || 'ALL';
      const filtered = getFilteredEntries().map((item) => item.data);
      const exportRows = selectedGuru === 'ALL'
        ? rows
        : [rows[0] || getHeadersFromSchema(), ...filtered];

      if (selectedGuru !== 'ALL' && filtered.length === 0) {
        setGlobalError(els, 'Tidak ada data guru terpilih untuk diekspor pada bulan ini.');
        return;
      }

      if (exportRows.length === 0) {
        setGlobalError(els, 'Tidak ada data untuk diekspor pada bulan ini.');
        return;
      }

      const csv = exportRows
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

  function openOrganizationPanel() {
    updateModeUi();
    if (els.organizationInviteInput) els.organizationInviteInput.value = '';
    if (els.inviteEmailInput) els.inviteEmailInput.value = '';
    if (els.organizationNameInput) els.organizationNameInput.value = '';
    toggleOrganizationSection('');
    openOrganizationModal(els);
  }

  function toggleOrganizationSection(section) {
    if (els.orgCreateSection) {
      els.orgCreateSection.classList.toggle('hidden', section !== 'create');
    }
    if (els.orgJoinSection) {
      els.orgJoinSection.classList.toggle('hidden', section !== 'join');
    }
    if (els.orgActiveSection) {
      const canShowActive = isOrgMode() && section === 'active';
      els.orgActiveSection.classList.toggle('hidden', !canShowActive);
    }
  }

  async function createOrganization() {
    const orgName = (els.organizationNameInput?.value || '').trim();
    if (!orgName) {
      setGlobalError(els, 'Nama organisasi wajib diisi.');
      return;
    }
    setBlockingLoading(els, true, 'Membuat organisasi...');
    setGlobalError(els, '');
    try {
      const folderRes = await gapi.client.drive.files.create({
        resource: { name: `Org ${orgName} - Images`, mimeType: 'application/vnd.google-apps.folder' },
        fields: 'id'
      });
      const sheetRes = await gapi.client.sheets.spreadsheets.create({
        resource: { properties: { title: `Org ${orgName} - Journal` } }
      });
      saveOrgContext({
        name: orgName,
        spreadsheetId: sheetRes.result.spreadsheetId,
        folderId: folderRes.result.id,
        ownerEmail: state.userEmail
      });
      closeOrganizationModal(els);
      await setupBackend();
      await loadJournalEntries();
    } catch (err) {
      setGlobalError(els, 'Gagal membuat organisasi.');
    } finally {
      setBlockingLoading(els, false);
    }
  }

  async function joinOrganizationFromInput() {
    const payload = parseInviteInput(els.organizationInviteInput?.value || '');
    if (!payload?.spreadsheetId || !payload?.folderId) {
      setGlobalError(els, 'Invite tidak valid.');
      return;
    }
    if (payload.targetEmail && state.userEmail && payload.targetEmail !== state.userEmail.toLowerCase()) {
      setGlobalError(els, 'Invite ini hanya untuk email yang ditentukan owner.');
      return;
    }
    setBlockingLoading(els, true, 'Bergabung ke organisasi...');
    setGlobalError(els, '');
    try {
      saveOrgContext({
        name: payload.name || 'Organisasi',
        spreadsheetId: payload.spreadsheetId,
        folderId: payload.folderId,
        ownerEmail: payload.ownerEmail || ''
      });
      closeOrganizationModal(els);
      await setupBackend();
      await loadJournalEntries();
    } catch (err) {
      setGlobalError(els, 'Gagal join organisasi. Pastikan Anda sudah diberi akses oleh owner.');
    } finally {
      setBlockingLoading(els, false);
    }
  }

  async function copyOrganizationInvite() {
    if (!isOrgMode()) {
      setGlobalError(els, 'Anda belum berada di mode organisasi.');
      return;
    }
    const inviteToken = getOrgInviteToken();
    if (!inviteToken) return;
    try {
      await navigator.clipboard.writeText(inviteToken);
      setGlobalError(els, ''); // clear old error
      alert('Invite token berhasil disalin.');
    } catch (err) {
      setGlobalError(els, 'Gagal menyalin invite token.');
    }
  }

  async function grantDriveWriteAccess(fileId, email) {
    await gapi.client.drive.permissions.create({
      fileId,
      sendNotificationEmail: true,
      resource: {
        type: 'user',
        role: 'writer',
        emailAddress: email
      }
    });
  }

  function isValidEmailFormat(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
  }

  function parseShareError(err) {
    const message = String(err?.result?.error?.message || err?.message || '').toLowerCase();
    const reason = String(err?.result?.error?.errors?.[0]?.reason || '').toLowerCase();

    if (message.includes('invalid') && message.includes('email')) {
      return 'Format email tidak valid.';
    }
    if (message.includes('not found') || message.includes('cannot find') || reason.includes('notfound')) {
      return 'Email tidak ditemukan sebagai akun Google.';
    }
    if (message.includes('invalidsharingrequest') || message.includes('sharing') || reason.includes('invalidsharingrequest')) {
      return 'Email tidak bisa di-share. Pastikan email adalah akun Google yang aktif.';
    }
    if (message.includes('forbidden') || reason.includes('forbidden')) {
      return 'Akses share ditolak. Pastikan Anda owner resource organisasi.';
    }
    return 'Gagal validasi email atau share akses.';
  }

  async function shareAndCopyInvite() {
    if (!isOrgMode()) {
      setGlobalError(els, 'Aktifkan mode organisasi terlebih dahulu.');
      return;
    }
    const email = (els.inviteEmailInput?.value || '').trim().toLowerCase();
    if (!email) {
      setGlobalError(els, 'Isi email anggota terlebih dahulu.');
      return;
    }
    if (!isValidEmailFormat(email)) {
      setGlobalError(els, 'Format email tidak valid.');
      return;
    }
    setBlockingLoading(els, true, 'Membagikan akses organisasi...');
    setGlobalError(els, '');
    try {
      // Step 1: validasi email + akses owner pada spreadsheet terlebih dahulu.
      await grantDriveWriteAccess(state.orgContext.spreadsheetId, email);
      // Step 2: jika valid, lanjutkan share folder gambar.
      await grantDriveWriteAccess(state.orgContext.folderId, email);
      const inviteToken = getOrgInviteTokenForEmail(email);
      await navigator.clipboard.writeText(inviteToken);
      alert('Akses berhasil dibagikan dan invite token sudah disalin.');
    } catch (err) {
      setGlobalError(els, parseShareError(err));
    } finally {
      setBlockingLoading(els, false);
    }
  }

  async function rejoinLastOrganization() {
    if (isOrgMode()) {
      setGlobalError(els, '');
      return;
    }
    const lastOrg = loadLastOrgContext();
    if (!lastOrg) {
      setGlobalError(els, 'Belum ada organisasi terakhir yang tersimpan.');
      return;
    }
    setBlockingLoading(els, true, 'Masuk ke organisasi terakhir...');
    setGlobalError(els, '');
    try {
      saveOrgContext(lastOrg);
      closeOrganizationModal(els);
      await setupBackend();
      await loadJournalEntries();
    } catch (err) {
      setGlobalError(els, 'Gagal masuk ke organisasi terakhir. Pastikan akses Anda masih ada.');
    } finally {
      setBlockingLoading(els, false);
    }
  }

  function saveCurrentOrganization() {
    if (!isOrgMode()) {
      setGlobalError(els, 'Aktifkan mode organisasi terlebih dahulu.');
      return;
    }
    upsertOrgRegistry(state.orgContext);
    setGlobalError(els, '');
    alert('Organisasi berhasil disimpan.');
  }

  async function deleteCurrentOrganization() {
    if (!isOrgMode()) {
      setGlobalError(els, 'Aktifkan mode organisasi terlebih dahulu.');
      return;
    }
    if (!isCurrentUserOrgOwner()) {
      setGlobalError(els, 'Hanya host/owner yang bisa menghapus organisasi.');
      return;
    }

    const orgName = state.orgContext.name || 'Organisasi';
    const confirmText = prompt(`Ketik HAPUS untuk menghapus organisasi "${orgName}" beserta spreadsheet dan folder Drive-nya.`);
    if (confirmText !== 'HAPUS') return;

    const deletingSpreadsheetId = state.orgContext.spreadsheetId;
    const deletingFolderId = state.orgContext.folderId;

    setBlockingLoading(els, true, 'Menghapus organisasi...');
    setGlobalError(els, '');
    try {
      await gapi.client.drive.files.delete({ fileId: deletingSpreadsheetId });
      await gapi.client.drive.files.delete({ fileId: deletingFolderId });

      removeOrgFromRegistry(deletingSpreadsheetId);
      const lastOrg = loadLastOrgContext();
      if (lastOrg?.spreadsheetId === deletingSpreadsheetId) {
        localStorage.removeItem(ORG_LAST_CONTEXT_STORAGE_KEY);
      }

      saveOrgContext(null);
      closeOrganizationModal(els);
      await setupBackend();
      await loadJournalEntries();
      alert('Organisasi berhasil dihapus.');
    } catch (err) {
      setGlobalError(els, 'Gagal menghapus organisasi. Pastikan Anda owner dan masih punya izin hapus file.');
    } finally {
      setBlockingLoading(els, false);
    }
  }

  async function switchToPersonalMode() {
    const proceed = confirm('Keluar dari mode organisasi dan kembali ke mode personal?');
    if (!proceed) return;
    saveOrgContext(null);
    closeOrganizationModal(els);
    setBlockingLoading(els, true, 'Beralih ke mode personal...');
    try {
      await setupBackend();
      await loadJournalEntries();
    } finally {
      setBlockingLoading(els, false);
    }
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
    const baseSchema = readSettingsFields(els).map((field, idx) => ({
      id: `f${idx + 1}`,
      label: field.label,
      type: field.type,
      required: field.required,
      options: Array.isArray(field.options) ? field.options : []
    }));
    const nextSchema = isOrgMode() ? ensureOrgSchema(baseSchema) : normalizeSchema(baseSchema);

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
      renderDynamicForm(els, state.schema, getDefaultFormValues());
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
    renderDynamicForm(els, state.schema, getDefaultFormValues());
    openModal(els);
  }

  function closeModalWrapper() {
    closeModal(els);
    resetEditState();
    setModalEditing(els, false);
    renderDynamicForm(els, state.schema, getDefaultFormValues());
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
