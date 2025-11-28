const { contextBridge } = require("electron");

// local backend; change to Render URL after deploy
contextBridge.exposeInMainWorld("api", {
  backend: "http://127.0.0.1:8000"
});
