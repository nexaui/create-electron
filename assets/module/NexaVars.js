import NexaFilter from "./NexaFilter.js";

export class NexaVars {
  constructor(options) {
    // Tambahkan unique identifier untuk instance
    this._instanceId = `nexavars_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    this._templateSelector =
      options.templateSelector || '[data-template="static"]';

    // Gunakan WeakMap untuk menyimpan data private
    this._storage = new WeakMap();
    this._storage.set(this, {
      nexadom: {
        ".": {}, // Root level variables
      },
    });

    this.filter = new NexaFilter();

    // Simpan keyExtractor
    this._keyExtractor = options.keyExtractor || ".";

    // Set data langsung dari options
    if (options && options.data) {
      this.nexaVars(options.data, this._keyExtractor);
    }

    // Inisialisasi templates setelah data diset
    this.initTemplates();
  }

  /**
   * Menetapkan variabel berdasarkan keyExtractor
   * @param {Object} vararray - Object berisi variabel yang akan diset
   * @param {string} keyExtractor - Namespace untuk variabel
   * @param {boolean} bAppend - Jika true, menambahkan ke nilai yang ada
   * @returns {boolean} - Selalu mengembalikan true setelah operasi selesai
   */
  nexaVars(vararray, keyExtractor = ".", bAppend = false) {
    const storage = this._storage.get(this);

    if (!storage.nexadom[keyExtractor]) {
      storage.nexadom[keyExtractor] = {};
    }

    Object.entries(vararray).forEach(([key, val]) => {
      const targetKey = `${this._instanceId}_${key}`;
      if (bAppend && storage.nexadom[keyExtractor][targetKey]) {
        storage.nexadom[keyExtractor][targetKey] += val;
        return;
      }
      storage.nexadom[keyExtractor][targetKey] = val;
    });
    return true;
  }

  /**
   * Mengambil nilai variabel berdasarkan nama blok dan keyExtractor
   * @param {string} blockname - Nama blok yang akan diambil nilainya
   * @param {string} keyExtractor - Namespace untuk variabel
   * @returns {*} - Nilai variabel atau false jika tidak ditemukan
   */
  getBlock(blockname, keyExtractor = ".") {
    const storage = this._storage.get(this);

    if (blockname.startsWith(keyExtractor + ".")) {
      blockname = blockname.substring(keyExtractor.length + 1);
    }

    const targetKey = `${this._instanceId}_${blockname}`;
    const namespace = storage.nexadom[keyExtractor] || {};
    return namespace[targetKey] ?? false;
  }

  /**
   * Memproses string template dan mengganti variabel
   * @param {string} content - Content yang akan diproses
   * @param {string} keyExtractor - Namespace untuk variabel
   * @returns {string} - Content yang sudah diproses
   */
  processTemplate(content, keyExtractor = ".") {
    // Perbaiki regex pattern untuk mengambil group dengan benar
    return content.replace(/{(?!list\.)([^}]+)}/g, (match, varName) => {
      if (!varName) return match;

      const parts = varName.trim().split("|");
      const name = parts[0];
      const filters = parts.slice(1);

      let value = this.getBlock(name, keyExtractor);
      if (value === false) return match;

      filters.forEach((filterName) => {
        const [filterType, ...args] = filterName.split(":");
        value = this.filter.applyFilter(value, filterType, args);
      });

      return value;
    });
  }

  /**
   * Menginisialisasi dan memproses semua template
   */
  initTemplates() {
    // Cari template yang sesuai
    const templates = document.querySelectorAll('script[type="text/template"]');
    templates.forEach((template) => {
      // Skip template yang digunakan NexaDom atau sudah diproses NexaVars
      if (
        template.hasAttribute("extractor") ||
        template.hasAttribute("data-nexadom")
      ) {
        return;
      }

      // Mark template as processed by NexaVars
      template.setAttribute("data-nexavars", this._instanceId);
      const targetId = template.id;
      const content = template.innerHTML;

      // Log untuk debugging
      // console.log("Processing template:", {
      //   id: targetId,
      //   content: content,
      //   data: this._storage.get(this),
      // });

      const processedContent = this.processTemplate(
        content,
        this._keyExtractor
      );

      // Buat atau dapatkan target element dengan ID yang unik untuk NexaVars
      const targetElement =
        document.getElementById(`${targetId}-nexavars-target`) ||
        (() => {
          const el = document.createElement("div");
          el.id = `${targetId}-nexavars-target`;
          el.setAttribute("data-nexavars-content", this._instanceId);
          template.parentNode.insertBefore(el, template.nextSibling);
          return el;
        })();

      // Set content
      targetElement.innerHTML = processedContent;
    });
  }

  /**
   * Method untuk memperbarui nilai variabel dan me-render ulang templates
   */
  update(data, keyExtractor = ".") {
    // Update data
    this.nexaVars(data, keyExtractor);

    // Re-render semua template yang terkait
    const templates = document.querySelectorAll(
      `script[type="text/template"][data-nexavars="${this._instanceId}"]`
    );

    templates.forEach((template) => {
      const targetId = template.id;
      const content = template.innerHTML;
      const processedContent = this.processTemplate(content, keyExtractor);

      const targetElement = document.getElementById(`${targetId}-target`);
      if (targetElement) {
        targetElement.innerHTML = processedContent;
      }
    });
  }

  // Tambahkan method untuk cleanup
  destroy() {
    const storage = this._storage.get(this);
    if (storage) {
      storage.nexadom = null;
      this._storage.delete(this);
    }

    // Cleanup templates and content elements
    document
      .querySelectorAll(
        `[data-nexavars="${this._instanceId}"], [data-nexavars-content="${this._instanceId}"]`
      )
      .forEach((el) => el.remove());
  }
}
