import { createApp } from './app.js';

const app = createApp();

window.gapiLoaded = app.gapiLoaded;
window.gisLoaded = app.gisLoaded;
window.handleFormSubmit = app.handleFormSubmit;
window.openModal = app.openModal;
window.closeModal = app.closeModal;
window.previewImage = app.previewImage;
