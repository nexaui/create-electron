const { app, BrowserWindow, globalShortcut } = require("electron");
const express = require("express");
const path = require("path");
const portfinder = require("portfinder");
const Nexautility = require("./assets/components/Nexautility");
const fs = require("fs");
const fsPromises = require("fs").promises;
const NexaTextInput = require("./assets/components/NexaTextInput");
const NexaButton = require("./assets/components/NexaButton");

// Tambahkan ini di awal file, sebelum membuat window
app.commandLine.appendSwitch("disable-gpu-cache");
// Opsional: tambahkan ini jika masih mengalami masalah
app.commandLine.appendSwitch("disable-http-cache");

app.setPath("userData", path.join(app.getPath("temp"), app.getName()));

// Inisialisasi Express
const server = express();
let mainWindow = null;
let serverInstance = null;

// Tentukan base path berdasarkan environment
const basePath = app.isPackaged ? path.join(process.resourcesPath) : __dirname;

// Tambahkan middleware untuk parse JSON
server.use(express.json());

// Middleware untuk transform HTML sebelum dikirim
async function transformHTML(req, res, next) {
  // Skip jika bukan request HTML
  if (!req.path.endsWith(".html") && !req.path.endsWith("/")) {
    return next();
  }

  try {
    // Tentukan path file HTML
    let htmlPath = req.path;
    if (req.path.endsWith("/")) {
      htmlPath += "index.html";
    }
    if (!htmlPath.endsWith(".html")) {
      htmlPath += ".html";
    }

    // Baca file HTML - gunakan fsPromises
    const filePath = path.join(basePath, "public", htmlPath);
    const content = await fsPromises.readFile(filePath, "utf8");

    // Transform konten dengan semua komponen
    let transformedContent = Nexautility.transform(content);
    transformedContent = NexaTextInput.transform(transformedContent);
    transformedContent = NexaButton.transform(transformedContent);

    // Kirim hasil transform
    res.send(transformedContent);
  } catch (error) {
    console.error("Transform error:", error);
    next();
  }
}

// Gunakan middleware transform sebelum static file serving
server.use(transformHTML);

// Konfigurasi Express untuk serving file statis
server.use(express.static(path.join(basePath, "public")));
server.use("/assets", express.static(path.join(basePath, "assets")));
server.use(
  "/fa",
  express.static(
    path.join(basePath, "node_modules/@fortawesome/fontawesome-free")
  )
);

// Pastikan direktori assets/js ada - gunakan fs biasa
const jsDir = path.join(basePath, "assets", "js");
if (!fs.existsSync(jsDir)) {
  fs.mkdirSync(jsDir, { recursive: true });
}

// Tambahkan endpoint untuk nexa-components.js dengan path yang benar
server.get("/assets/js/nexa-components.js", (req, res) => {
  res.sendFile(path.join(basePath, "assets", "js", "nexa-components.js"));
});

// Tambahkan endpoint untuk nexaRouter.js
server.get("/assets/js/nexaRouter.js", (req, res) => {
  res.sendFile(path.join(basePath, "assets", "js", "nexaRouter.js"));
});

// API Endpoints untuk Nexautility
server.post("/api/transform", (req, res) => {
  try {
    const { content } = req.body;
    if (!content) {
      return res.status(400).json({ error: "Content is required" });
    }
    const transformed = Nexautility.transform(content);
    res.json({ result: transformed });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

server.get("/api/utilities", (req, res) => {
  res.json({
    utilities: Nexautility.utilities,
    customColors: Nexautility.customColors,
  });
});

// Tambahkan endpoint API untuk NexaTextInput
server.post("/api/textinput/transform", (req, res) => {
  try {
    const { attributes } = req.body;
    if (!attributes) {
      return res.status(400).json({ error: "Attributes are required" });
    }
    const transformed = NexaTextInput.transformServer(attributes);
    res.json({ result: transformed });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Tambahkan endpoint API untuk NexaButton
server.post("/api/button/transform", (req, res) => {
  try {
    const { attributes } = req.body;
    if (!attributes) {
      return res.status(400).json({ error: "Attributes are required" });
    }
    const transformed = NexaButton.transformServer(attributes);
    res.json({ result: transformed });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Tambahkan middleware untuk menangani rout
// e tanpa ekstensi .html
server.use((req, res, next) => {
  if (!req.path.includes(".")) {
    const filePath = path.join(basePath, "public", `${req.path}.html`);
    res.sendFile(filePath, (err) => {
      if (err) {
        next();
      }
    });
  } else {
    next();
  }
});

// Optional: Tambahkan handler untuk 404
server.use((req, res) => {
  res.status(404).sendFile(path.join(basePath, "public", "404.html"));
});

// Fungsi untuk memulai server
async function startServer() {
  try {
    // Cari port yang tersedia, mulai dari 3000
    const port = await portfinder.getPortPromise({
      port: 3000,
    });

    return new Promise((resolve, reject) => {
      serverInstance = server.listen(port, () => {
        console.log(`Server Express berjalan di port ${port}`);
        resolve(port);
      });

      serverInstance.on("error", (err) => {
        reject(err);
      });
    });
  } catch (err) {
    console.error("Gagal memulai server:", err);
    throw err;
  }
}

// Fungsi untuk membuat jendela aplikasi
async function createWindow() {
  try {
    const port = await startServer();

    mainWindow = new BrowserWindow({
      width: 800,
      height: 600,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
        webSecurity: !process.argv.includes("--dev"), // Aktifkan webSecurity di production
        partition: "persist:main",
        cache: {
          enable: false, // Nonaktifkan cache
        },
      },
      show: false,
      autoHideMenuBar: true,
    });

    // Bersihkan cache saat startup
    await mainWindow.webContents.session.clearCache();

    // Maksimalkan window sebelum menampilkan
    mainWindow.maximize();
    mainWindow.show();

    // Hapus menu
    mainWindow.removeMenu();

    await mainWindow.loadURL(`http://localhost:${port}`);

    // Tambahkan fungsi untuk memantau koneksi internet
    function checkInternetConnection() {
      if (!mainWindow) return;
      const isOnline = mainWindow.webContents.isCrashed() ? false : true;
      mainWindow.webContents.send("online-status", isOnline);
    }

    // Monitor perubahan status koneksi
    mainWindow.webContents.on("did-start-loading", checkInternetConnection);
    mainWindow.webContents.on("did-stop-loading", checkInternetConnection);
    mainWindow.webContents.on("did-fail-load", () => {
      mainWindow.webContents.send("online-status", false);
    });

    // Cek koneksi setiap 5 detik
    setInterval(checkInternetConnection, 5000);

    // Cek koneksi saat startup
    checkInternetConnection();

    // Tambahkan opsi ke menu konteks
    if (process.argv.includes("--dev")) {
      mainWindow.webContents.on("context-menu", (e, props) => {
        const { Menu } = require("electron");
        const menu = Menu.buildFromTemplate([
          {
            label: "Refresh Halaman",
            click: () => {
              mainWindow.reload();
            },
          },
          {
            label: "Inspect Element",
            click: () => {
              mainWindow.webContents.inspectElement(props.x, props.y);
            },
          },
          {
            type: "separator",
          },
          {
            label: "Bantuan",
            click: () => {
              mainWindow.loadURL(`http://localhost:${port}/bantuan`);
            },
          },
        ]);
        menu.popup();
      });
    } else {
      mainWindow.webContents.on("context-menu", (e, props) => {
        const { Menu } = require("electron");
        const menu = Menu.buildFromTemplate([
          {
            label: "Refresh Halaman",
            click: () => {
              mainWindow.reload();
            },
          },
          {
            type: "separator",
          },
          {
            label: "Bantuan",
            click: () => {
              mainWindow.loadURL(`http://localhost:${port}/bantuan`);
            },
          },
        ]);
        menu.popup();
      });
    }

    mainWindow.on("closed", () => {
      mainWindow = null;
      // Hentikan server saat window ditutup
      if (serverInstance) {
        serverInstance.close();
      }
    });
  } catch (err) {
    console.error("Error saat membuat window:", err);
    app.quit();
  }
}

// Event ketika Electron siap
app.whenReady().then(() => {
  createWindow();
});

// Event ketika semua jendela ditutup
app.on("window-all-closed", () => {
  // Hentikan server sebelum quit
  if (serverInstance) {
    serverInstance.close();
  }
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// Event untuk macOS
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Hot reload untuk development
if (process.argv.includes("--dev")) {
  try {
    require("electron-reloader")(module);
  } catch (err) {
    console.error("Error:", err);
  }
}
