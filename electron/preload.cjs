const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('celdraftDesktop', {
  isDesktop: true,
  platform: process.platform,
});
