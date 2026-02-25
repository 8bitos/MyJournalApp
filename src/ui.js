function getElements() {
  return {
    loginScreen: document.getElementById('login-screen'),
    appScreen: document.getElementById('app-screen'),
    journalGrid: document.getElementById('journal-grid'),
    paginationWrap: document.getElementById('pagination-wrap'),
    pageSizeSelector: document.getElementById('page-size-selector'),
    prevPageButton: document.getElementById('prev-page-button'),
    nextPageButton: document.getElementById('next-page-button'),
    pageInfo: document.getElementById('page-info'),
    emptyState: document.getElementById('empty-state'),
    dataLoader: document.getElementById('data-loader'),
    loadingApi: document.getElementById('loading_api'),
    authorizeButton: document.getElementById('authorize_button'),
    signoutButton: document.getElementById('signout_button'),
    userName: document.getElementById('user-name'),
    currentDate: document.getElementById('current-date'),
    currentMonthLabel: document.getElementById('current-month-label'),
    quickMenuToggle: document.getElementById('quick-menu-toggle'),
    quickMenuPanel: document.getElementById('quick-menu-panel'),
    orgModeLabel: document.getElementById('org-mode-label'),
    monthSelector: document.getElementById('month-selector'),
    teacherFilterSelector: document.getElementById('teacher-filter-selector'),
    exportMonthButton: document.getElementById('export-month-button'),
    openSettingsButton: document.getElementById('open-settings-button'),
    helpButton: document.getElementById('help-button'),
    themeToggleButton: document.getElementById('theme-toggle-button'),
    inputDate: document.getElementById('input-date'),
    sheetLink: document.getElementById('sheet-link'),
    modal: document.getElementById('add-modal'),
    form: document.getElementById('journal-form'),
    dynamicFields: document.getElementById('dynamic-fields'),
    fileInput: document.getElementById('file-upload'),
    imagePreview: document.getElementById('image-preview'),
    uploadPlaceholder: document.getElementById('upload-placeholder'),
    modalTitle: document.getElementById('modal-title'),
    btnSave: document.getElementById('btn-save'),
    globalError: document.getElementById('global-error'),
    globalErrorText: document.getElementById('global-error-text'),
    blockingLoading: document.getElementById('blocking-loading'),
    blockingLoadingText: document.getElementById('blocking-loading-text'),
    settingsModal: document.getElementById('settings-modal'),
    settingsFields: document.getElementById('settings-fields'),
    addSettingFieldButton: document.getElementById('add-setting-field-button'),
    resetSettingFieldButton: document.getElementById('reset-setting-field-button'),
    applySettingsButton: document.getElementById('apply-settings-button'),
    closeSettingsButton: document.getElementById('close-settings-button'),
    organizationButton: document.getElementById('organization-button'),
    orgMenuBadge: document.getElementById('org-menu-badge'),
    organizationModal: document.getElementById('organization-modal'),
    organizationCurrentInfo: document.getElementById('organization-current-info'),
    orgOpenCreateButton: document.getElementById('org-open-create-button'),
    orgOpenJoinButton: document.getElementById('org-open-join-button'),
    orgOpenActiveButton: document.getElementById('org-open-active-button'),
    rejoinLastOrgButton: document.getElementById('rejoin-last-org-button'),
    orgCreateSection: document.getElementById('org-create-section'),
    orgJoinSection: document.getElementById('org-join-section'),
    orgActiveSection: document.getElementById('org-active-section'),
    organizationNameInput: document.getElementById('organization-name-input'),
    createOrganizationButton: document.getElementById('create-organization-button'),
    organizationInviteInput: document.getElementById('organization-invite-input'),
    joinOrganizationButton: document.getElementById('join-organization-button'),
    inviteEmailInput: document.getElementById('invite-email-input'),
    shareAndCopyInviteButton: document.getElementById('share-and-copy-invite-button'),
    saveOrganizationButton: document.getElementById('save-organization-button'),
    copyOrgInviteButton: document.getElementById('copy-org-invite-button'),
    deleteOrganizationButton: document.getElementById('delete-organization-button'),
    switchPersonalButton: document.getElementById('switch-personal-button'),
    closeOrganizationButton: document.getElementById('close-organization-button'),
    helpModal: document.getElementById('help-modal'),
    closeHelpButton: document.getElementById('close-help-button')
  };
}

function showLoginScreen(els) {
  els.appScreen.classList.add('hidden');
  els.loginScreen.classList.remove('hidden');
}

function showAppScreen(els) {
  els.loginScreen.classList.add('hidden');
  els.appScreen.classList.remove('hidden');
}

function setAuthButtonsReady(els) {
  els.loadingApi.classList.add('hidden');
  els.authorizeButton.classList.remove('hidden');
}

function setDataLoading(els, isLoading) {
  if (isLoading) {
    els.dataLoader.classList.remove('hidden');
    els.journalGrid.classList.add('hidden');
  } else {
    els.dataLoader.classList.add('hidden');
    els.journalGrid.classList.remove('hidden');
  }
}

function setEmptyState(els, isEmpty) {
  if (isEmpty) {
    els.emptyState.classList.remove('hidden');
  } else {
    els.emptyState.classList.add('hidden');
  }
}

function setGlobalError(els, message) {
  if (!els.globalError || !els.globalErrorText) return;
  if (!message) {
    els.globalError.classList.add('hidden');
    els.globalErrorText.textContent = '';
    return;
  }
  els.globalErrorText.textContent = message;
  els.globalError.classList.remove('hidden');
}

function setBlockingLoading(els, isLoading, message = 'Sedang memproses data.') {
  if (!els.blockingLoading || !els.blockingLoadingText) return;
  els.blockingLoadingText.textContent = message;
  if (isLoading) {
    els.blockingLoading.classList.remove('hidden');
    els.blockingLoading.classList.add('flex');
  } else {
    els.blockingLoading.classList.add('hidden');
    els.blockingLoading.classList.remove('flex');
  }
}

function renderDynamicForm(els, schema, initialValues = {}) {
  els.dynamicFields.innerHTML = '';

  schema.forEach((field) => {
    const wrap = document.createElement('div');
    wrap.className = field.type === 'textarea' ? 'space-y-1 sm:col-span-2' : 'space-y-1';

    const label = document.createElement('label');
    label.className = 'block text-xs sm:text-sm font-medium text-gray-700';
    label.htmlFor = `field-${field.id}`;
    label.textContent = field.label;

    let input;
    if (field.type === 'textarea') {
      input = document.createElement('textarea');
      input.rows = 3;
    } else if (field.type === 'select') {
      input = document.createElement('select');
      const options = Array.isArray(field.options) ? field.options : [];
      const initialValue = initialValues[field.id] || '';
      if (!field.required) {
        const emptyOption = document.createElement('option');
        emptyOption.value = '';
        emptyOption.textContent = '-- Pilih --';
        input.appendChild(emptyOption);
      }
      options.forEach((optionValue) => {
        const opt = document.createElement('option');
        opt.value = optionValue;
        opt.textContent = optionValue;
        if (optionValue === initialValue) opt.selected = true;
        input.appendChild(opt);
      });
      if (initialValue && !options.includes(initialValue)) {
        const fallback = document.createElement('option');
        fallback.value = initialValue;
        fallback.textContent = initialValue;
        fallback.selected = true;
        input.appendChild(fallback);
      }
    } else {
      input = document.createElement('input');
      input.type = field.type || 'text';
    }

    input.id = `field-${field.id}`;
    input.dataset.fieldId = field.id;
    input.className = 'mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm text-sm border-gray-300 rounded-md border px-2.5 py-2';
    input.required = Boolean(field.required);
    if (field.type !== 'select') {
      input.value = initialValues[field.id] || '';
    }

    wrap.appendChild(label);
    wrap.appendChild(input);
    els.dynamicFields.appendChild(wrap);
  });
}

function getFormValuesFromSchema(schema) {
  const values = {};
  schema.forEach((field) => {
    const input = document.getElementById(`field-${field.id}`);
    values[field.id] = input ? input.value : '';
  });
  return values;
}

function renderEntries(els, rows, schema, onEdit, onDelete, imageLoader) {
  els.journalGrid.innerHTML = '';
  if (!rows || rows.length === 0) {
    setEmptyState(els, true);
    return;
  }
  setEmptyState(els, false);

  const fragment = document.createDocumentFragment();
  rows.forEach((item) => {
    if (!item.data || item.data.length === 0) return;
    const card = createCard(item, schema, onEdit, onDelete, imageLoader);
    fragment.appendChild(card);
  });

  els.journalGrid.appendChild(fragment);
}

function createCard(item, schema, onEdit, onDelete, imageLoader) {
  const row = item.data;
  const imageId = row[schema.length + 1] || '';

  const card = document.createElement('div');
  card.className = 'bg-white rounded-lg sm:rounded-xl shadow-sm overflow-hidden border hover:shadow-md transition flex flex-col relative group';

  const actionWrap = document.createElement('div');
  actionWrap.className = 'absolute top-1.5 right-1.5 sm:top-2 sm:right-2 flex gap-1.5 sm:gap-2 z-10 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity bg-white/85 p-1 rounded-lg backdrop-blur-sm shadow-sm';

  const editButton = document.createElement('button');
  editButton.className = 'text-blue-600 hover:text-blue-800 p-1 rounded-full hover:bg-blue-50';
  editButton.title = 'Edit';
  editButton.innerHTML = '<span class="material-icons text-lg">edit</span>';
  editButton.addEventListener('click', () => onEdit({ row, rowIndex: item.rowIndex }));

  const deleteButton = document.createElement('button');
  deleteButton.className = 'text-red-600 hover:text-red-800 p-1 rounded-full hover:bg-red-50';
  deleteButton.title = 'Hapus';
  deleteButton.innerHTML = '<span class="material-icons text-lg">delete</span>';
  deleteButton.addEventListener('click', () => onDelete(item.rowIndex, imageId));

  actionWrap.appendChild(editButton);
  actionWrap.appendChild(deleteButton);

  const imageWrap = document.createElement('div');
  imageWrap.className = 'h-20 sm:h-36 w-full bg-gray-100 relative overflow-hidden flex items-center justify-center group';

  const img = document.createElement('img');
  img.src = 'https://via.placeholder.com/400x300?text=Memuat...';
  img.className = 'w-full h-full object-cover opacity-60 transition-opacity duration-500';
  img.alt = 'Journal Image';
  imageWrap.appendChild(img);

  const imageOverlay = document.createElement('div');
  imageOverlay.className = 'absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-5 transition';
  imageWrap.appendChild(imageOverlay);

  const content = document.createElement('div');
  content.className = 'p-2 sm:p-4 flex-grow flex flex-col gap-1';

  const titleIndex = schema.findIndex((f) => f.type === 'date') >= 0 ? 0 : 0;
  const titleValue = row[titleIndex] || 'Tanpa Judul';
  const title = document.createElement('h3');
  title.className = 'font-semibold text-gray-900 text-xs sm:text-base leading-tight max-h-9 overflow-hidden';
  title.textContent = titleValue;

  const list = document.createElement('div');
  list.className = 'space-y-0.5 sm:space-y-1 text-[10px] sm:text-sm text-gray-700';
  schema.forEach((field, idx) => {
    const value = row[idx];
    if (!value) return;
    const line = document.createElement('p');
    line.className = 'truncate';
    line.innerHTML = `<span class="font-semibold text-gray-800">${field.label}:</span> ${value}`;
    list.appendChild(line);
  });

  content.appendChild(title);
  content.appendChild(list);

  card.appendChild(actionWrap);
  card.appendChild(imageWrap);
  card.appendChild(content);

  if (imageId && imageLoader) {
    imageLoader.observeImage(img, imageId);
  }

  return card;
}

function renderSettingsFields(els, schema) {
  els.settingsFields.innerHTML = '';

  schema.forEach((field, index) => {
    const row = document.createElement('div');
    row.className = 'space-y-2 border rounded-lg p-3 bg-white';

    const labelInput = document.createElement('input');
    labelInput.type = 'text';
    labelInput.value = field.label;
    labelInput.placeholder = 'Label field';
    labelInput.className = 'w-full border rounded-md p-2 text-sm';
    labelInput.dataset.role = 'label';

    const typeSelect = document.createElement('select');
    typeSelect.className = 'w-full border rounded-md p-2 text-sm';
    typeSelect.dataset.role = 'type';
    ['text', 'textarea', 'date', 'time', 'select'].forEach((type) => {
      const opt = document.createElement('option');
      opt.value = type;
      opt.textContent = type;
      if (field.type === type) opt.selected = true;
      typeSelect.appendChild(opt);
    });

    const optionsWrap = document.createElement('div');
    optionsWrap.className = field.type === 'select' ? 'space-y-1' : 'space-y-1 hidden';

    const optionsLabel = document.createElement('label');
    optionsLabel.className = 'block text-xs text-gray-500';
    optionsLabel.textContent = 'Opsi dropdown (pisahkan dengan koma)';

    const optionsInput = document.createElement('textarea');
    optionsInput.rows = 2;
    optionsInput.className = 'w-full border rounded-md p-2 text-sm';
    optionsInput.placeholder = 'Contoh: Kelas 7.1, Kelas 7.2, Kelas 7.3';
    optionsInput.dataset.role = 'options';
    optionsInput.value = Array.isArray(field.options) ? field.options.join(', ') : '';
    optionsWrap.appendChild(optionsLabel);
    optionsWrap.appendChild(optionsInput);

    const requiredWrap = document.createElement('label');
    requiredWrap.className = 'inline-flex items-center gap-2 text-sm';
    const requiredInput = document.createElement('input');
    requiredInput.type = 'checkbox';
    requiredInput.checked = Boolean(field.required);
    requiredInput.dataset.role = 'required';
    requiredWrap.appendChild(requiredInput);
    requiredWrap.appendChild(document.createTextNode('Wajib'));

    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.className = 'px-3 py-2 rounded-md border text-red-600 hover:bg-red-50 text-sm';
    removeButton.textContent = 'Hapus';
    removeButton.dataset.role = 'remove';
    removeButton.disabled = schema.length <= 1;

    row.dataset.index = String(index);
    const topGrid = document.createElement('div');
    topGrid.className = 'grid grid-cols-1 sm:grid-cols-2 gap-2';
    topGrid.appendChild(labelInput);
    topGrid.appendChild(typeSelect);

    const bottomRow = document.createElement('div');
    bottomRow.className = 'flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2';
    bottomRow.appendChild(requiredWrap);
    bottomRow.appendChild(removeButton);

    typeSelect.addEventListener('change', () => {
      optionsWrap.classList.toggle('hidden', typeSelect.value !== 'select');
    });

    row.appendChild(topGrid);
    row.appendChild(optionsWrap);
    row.appendChild(bottomRow);
    els.settingsFields.appendChild(row);
  });
}

function readSettingsFields(els) {
  const rows = Array.from(els.settingsFields.querySelectorAll('[data-index]'));
  return rows.map((row, index) => {
    const label = row.querySelector('[data-role="label"]').value.trim();
    const type = row.querySelector('[data-role="type"]').value;
    const required = row.querySelector('[data-role="required"]').checked;
    const optionsRaw = row.querySelector('[data-role="options"]')?.value || '';
    const options = optionsRaw.split(',').map((item) => item.trim()).filter(Boolean);
    return {
      id: `f${index + 1}`,
      label,
      type,
      required,
      options
    };
  });
}

function openModal(els) {
  els.modal.classList.remove('hidden');
}

function closeModal(els) {
  els.modal.classList.add('hidden');
  els.form.reset();
  els.imagePreview.classList.add('hidden');
  els.uploadPlaceholder.classList.remove('hidden');
  els.uploadPlaceholder.innerHTML = '<span class="material-icons text-gray-400 text-4xl">cloud_upload</span><p class="text-xs text-gray-500">Klik untuk upload gambar</p>';
}

function setModalEditing(els, isEditing) {
  if (isEditing) {
    els.modalTitle.innerText = 'Edit Catatan';
    els.btnSave.innerText = 'Update';
    els.fileInput.required = false;
    els.uploadPlaceholder.innerHTML = '<span class="material-icons text-gray-400 text-4xl">image</span><p class="text-xs text-gray-500">Gambar tersimpan.<br>Klik untuk ganti.</p>';
  } else {
    els.modalTitle.innerText = 'Catatan Baru';
    els.btnSave.innerText = 'Simpan';
    els.fileInput.required = true;
  }
}

function previewImage(els, input) {
  if (!input.files || !input.files[0]) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    els.imagePreview.src = e.target.result;
    els.imagePreview.classList.remove('hidden');
    els.uploadPlaceholder.classList.add('hidden');
  };
  reader.readAsDataURL(input.files[0]);
}

function openSettingsModal(els) {
  els.settingsModal.classList.remove('hidden');
}

function closeSettingsModal(els) {
  els.settingsModal.classList.add('hidden');
}

function openOrganizationModal(els) {
  els.organizationModal.classList.remove('hidden');
}

function closeOrganizationModal(els) {
  els.organizationModal.classList.add('hidden');
}

function openHelpModal(els) {
  els.helpModal.classList.remove('hidden');
}

function closeHelpModal(els) {
  els.helpModal.classList.add('hidden');
}

function setThemeToggleState(els, isDark) {
  if (!els.themeToggleButton) return;
  els.themeToggleButton.innerHTML = isDark
    ? '<span class="material-icons text-gray-700 mr-2 text-lg">light_mode</span>Light Mode'
    : '<span class="material-icons text-gray-700 mr-2 text-lg">dark_mode</span>Dark Mode';
}

export {
  getElements,
  showLoginScreen,
  showAppScreen,
  setAuthButtonsReady,
  setDataLoading,
  setEmptyState,
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
};
