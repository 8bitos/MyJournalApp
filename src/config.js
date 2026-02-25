const CONFIG = {
  CLIENT_ID: import.meta.env.VITE_GOOGLE_CLIENT_ID || '387519648442-r9ujkr1pi0oa6gd4t0km8am1pd6p3bhm.apps.googleusercontent.com',
  API_KEY: import.meta.env.VITE_GOOGLE_API_KEY || 'AIzaSyDd7TWtc-vppUV6sZBs1eEN7gHW4sW38oA',
  SCOPES: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/userinfo.email',
  SPREADSHEET_NAME: 'My Monthly Journal - Data',
  IMAGE_FOLDER_NAME: 'My Monthly Journal - Images'
};

export { CONFIG };
