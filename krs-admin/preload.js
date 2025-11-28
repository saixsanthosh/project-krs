const { contextBridge } = require("electron");

// local backend; change to Render URL after deploy
contextBridge.exposeInMainWorld("api", {
  backend: "https://project-krs.onrender.com"
});
