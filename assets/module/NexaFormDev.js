import { NexaFilePreview } from "./NexaFilePreview.js";

export function createForm(ret, callback) {
  const formInput = ret.formid;
  const submitForm = ret.submitid;
  const fileInput = ret.fileInput;
  const validasi = ret.validasi || {}; // Ambil aturan validasi jika ada

  // Periksa apakah form ada
  const form = document.getElementById(formInput);
  if (!form) {
    console.error(`Form dengan ID "${formInput}" tidak ditemukan`);
    return Promise.reject(
      new Error(`Form dengan ID "${formInput}" tidak ditemukan`)
    );
  }

  // Periksa apakah tombol submit ada
  const submitButton = document.getElementById(submitForm);
  if (!submitButton) {
    console.error(`Tombol submit dengan ID "${submitForm}" tidak ditemukan`);
    return Promise.reject(
      new Error(`Tombol submit dengan ID "${submitForm}" tidak ditemukan`)
    );
  }

  // Inisialisasi file input jika ada
  if (fileInput) {
    initFileInput();
  }

  // Inisialisasi preview file
  const initFilePreview = () => {
    const filePreview = new NexaFilePreview();
    return filePreview;
  };

  // Inisialisasi input file dengan fungsi drag & drop
  const initFileInput = () => {
    const fileInputs = form.querySelectorAll(".form-nexa-file-input");

    fileInputs.forEach((input) => {
      const dropZone = input.closest(".form-nexa-file-dragdrop");
      if (!dropZone) return;

      const label = dropZone.querySelector(".form-nexa-file-label");
      const preview = dropZone
        .closest(".form-nexa")
        .querySelector(".form-nexa-file-preview");
      const fileList = dropZone
        .closest(".form-nexa")
        .querySelector(".form-nexa-file-list");

      // Mencegah perilaku drag & drop default
      ["dragenter", "dragover", "dragleave", "drop"].forEach((eventName) => {
        dropZone.addEventListener(eventName, preventDefaults, false);
        document.body.addEventListener(eventName, preventDefaults, false);
      });

      // Sorot area drop saat file di-drag di atasnya
      ["dragenter", "dragover"].forEach((eventName) => {
        dropZone.addEventListener(eventName, highlight, false);
      });

      // Hilangkan sorotan saat file meninggalkan area atau di-drop
      ["dragleave", "drop"].forEach((eventName) => {
        dropZone.addEventListener(eventName, unhighlight, false);
      });

      // Tangani file yang di-drop
      dropZone.addEventListener("drop", handleDrop, false);

      function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
      }

      function highlight(e) {
        dropZone.classList.add("form-nexa-file-dragdrop-highlight");
      }

      function unhighlight(e) {
        dropZone.classList.remove("form-nexa-file-dragdrop-highlight");
      }

      function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        input.files = files;

        // Picu event change untuk memperbarui preview
        const event = new Event("change");
        input.dispatchEvent(event);
      }

      // Tangani perubahan file yang dipilih
      input.addEventListener("change", () => {
        const files = Array.from(input.files);
        updateFileList(files, fileList);
      });
    });
  };

  // Fungsi untuk memperbarui daftar file
  const updateFileList = (files, listElement) => {
    if (!listElement) return;

    listElement.innerHTML = "";
    files.forEach((file) => {
      const item = document.createElement("div");
      item.className = "form-nexa-file-item";
      item.innerHTML = `
        <span class="file-name">${file.name}</span>
        <span class="file-size">(${formatFileSize(file.size)})</span>
      `;
      listElement.appendChild(item);
    });
  };

  // Fungsi untuk memformat ukuran file
  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // Inisialisasi input file jika ada
  const fileInputs = form.querySelectorAll(".form-nexa-file-input");
  if (fileInputs.length > 0) {
    initFileInput();
    initFilePreview();
  }

  // Mengembalikan Promise untuk menangani data form
  return new Promise((resolve) => {
    // Fungsi untuk menghapus class error
    const removeErrorClass = (element) => {
      const formGroup = element.closest(".form-nexa");
      if (formGroup) {
        formGroup.classList.remove("form-error");
        const errorMessage = formGroup.querySelector(".error-message");
        if (errorMessage) {
          errorMessage.remove();
        }
      }
    };

    // Fungsi validasi berdasarkan tipe input
    const validateInput = (element) => {
      const type = element.type;
      const name = element.name;
      const placeholder = element.placeholder;

      // Check custom validation rules first
      if (validasi[name]) {
        if (Array.isArray(validasi[name])) {
          const [minLength, maxLength] = validasi[name];
          if (element.value.length < minLength) {
            return `${placeholder} minimal ${minLength} karakter`;
          }
          if (maxLength && element.value.length > maxLength) {
            return `${placeholder} tidak boleh lebih dari ${maxLength} karakter`;
          }
        } else {
          const minLength = validasi[name];
          if (element.value.length < minLength) {
            return `${name} minimal ${minLength} karakter`;
          }
        }
      }

      switch (type) {
        case "email":
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(element.value)) {
            return `${name} harus berupa email yang valid`;
          }
          break;

        case "tel":
          const cleanNumber = element.value.replace(/[^\d]/g, "");
          const isStartWith08 = /^08\d{8,11}$/.test(cleanNumber);
          const isStartWith62 = /^62\d{9,12}$/.test(cleanNumber);
          const isStartWithArea = /^[2-3]\d{8,11}$/.test(cleanNumber);

          if (!element.value) {
            return `${name} tidak boleh kosong`;
          }

          if (!isStartWith08 && !isStartWith62 && !isStartWithArea) {
            return `${name} tidak valid. Gunakan format: 08xx, +62xx, 02x, atau 03x`;
          }

          if (cleanNumber.length < 8 || cleanNumber.length > 13) {
            return `${name} harus antara 8-13 digit`;
          }
          break;

        case "radio":
          const radioGroup = document.querySelectorAll(`input[name="${name}"]`);
          const isChecked = Array.from(radioGroup).some(
            (radio) => radio.checked
          );
          if (!isChecked) {
            return `${name} harus dipilih`;
          }
          break;

        case "checkbox":
          const checkboxGroup = document.querySelectorAll(
            `input[name="${name}"]:checked`
          );
          if (checkboxGroup.length === 0) {
            return `${name} minimal pilih satu`;
          }
          break;

        case "select-one":
          if (!element.value) {
            return `${name} harus dipilih`;
          }
          break;

        case "file": {
          if (element.required && element.files.length === 0) {
            return `${name} harus diisi`;
          }

          if (element.files.length > 0) {
            // Check total size of all files
            const totalSize = Array.from(element.files).reduce(
              (sum, file) => sum + file.size,
              0
            );

            // Get max size from data attribute
            const maxSizeStr = element.dataset.maxSize || "5MB";
            const maxSizeMB = parseInt(maxSizeStr);
            const maxSizeBytes = maxSizeMB * 1024 * 1024;

            if (totalSize > maxSizeBytes) {
              return `Total ukuran file tidak boleh lebih dari ${maxSizeMB}MB`;
            }

            // Check number of files if multiple
            if (element.multiple) {
              const maxFiles = parseInt(element.dataset.maxFiles || "5");
              if (element.files.length > maxFiles) {
                return `Maksimal ${maxFiles} file yang dapat diunggah`;
              }
            }

            // Check file types
            if (element.accept) {
              const allowedTypes = element.accept
                .split(",")
                .map((type) => type.trim());
              const fileType = element.files[0].type;
              const fileExtension =
                "." + element.files[0].name.split(".").pop().toLowerCase();

              const isValidType = allowedTypes.some((type) => {
                if (type.startsWith(".")) {
                  // Check file extension
                  return type.toLowerCase() === fileExtension;
                } else {
                  // Check mime type
                  return fileType.match(new RegExp(type.replace("*", ".*")));
                }
              });

              if (!isValidType) {
                return `Tipe file ${name} tidak didukung. Gunakan: ${element.accept}`;
              }
            }
          }
          break;
        }

        default:
          if (!element.value.trim()) {
            return `${name} tidak boleh kosong`;
          }
      }
      return null;
    };

    const addErrorClass = (element, message) => {
      const formGroup = element.closest(".form-nexa");
      if (formGroup) {
        formGroup.classList.add("form-error");
        const existingError = formGroup.querySelector(".error-message");
        if (existingError) {
          existingError.remove();
        }
        const errorDiv = document.createElement("div");
        errorDiv.className = "error-message";
        errorDiv.textContent = message;
        formGroup.appendChild(errorDiv);
      }
    };

    // Event listeners untuk validasi real-time
    form.querySelectorAll("[name]").forEach((element) => {
      const events = ["input", "change", "blur"];
      events.forEach((eventType) => {
        element.addEventListener(eventType, () => {
          const errorMessage = validateInput(element);
          if (errorMessage) {
            addErrorClass(element, errorMessage);
          } else {
            removeErrorClass(element);
          }
        });
      });
    });

    // Tambahkan event listener untuk input file
    form.querySelectorAll('input[type="file"]').forEach((element) => {
      const events = ["input", "change", "blur"];
      events.forEach((eventType) => {
        element.addEventListener(eventType, () => {
          // Validasi file
          const errorMessage = validateInput(element);
          if (errorMessage) {
            addErrorClass(element, errorMessage);
          } else {
            removeErrorClass(element);
          }

          // Preview akan ditangani oleh NexaFilePreview secara otomatis
        });
      });
    });

    // Tangani submit form
    submitButton.addEventListener("click", async (e) => {
      e.preventDefault(); // Cegah submit form default
      const formData = new FormData(form);
      const dataObject = {};

      // Tangani input file terlebih dahulu
      for (const fileInput of form.querySelectorAll('input[type="file"]')) {
        const name = fileInput.name;
        if (!name) continue; // Lewati jika tidak ada atribut name

        if (fileInput.multiple && fileInput.files.length > 0) {
          // Tangani multiple files
          dataObject[name] = await Promise.all(
            Array.from(fileInput.files).map(async (file) => ({
              name: file.name,
              size: file.size,
              type: file.type,
              content: await convertToBase64(file), // Tambah konversi ke base64
            }))
          );
        } else if (fileInput.files.length > 0) {
          // Tangani single file
          const file = fileInput.files[0];
          dataObject[name] = {
            name: file.name,
            size: file.size,
            type: file.type,
            content: await convertToBase64(file), // Tambah konversi ke base64
          };
        }
      }

      // Tangani field form lainnya
      formData.forEach((value, key) => {
        if (!(value instanceof File) && !dataObject[key]) {
          dataObject[key] = value;
        }
      });

      // Validasi semua field sebelum submit
      let isValid = true;
      form.querySelectorAll("[name]").forEach((element) => {
        const errorMessage = validateInput(element);
        if (errorMessage) {
          addErrorClass(element, errorMessage);
          isValid = false;
        }
      });

      if (isValid && callback) {
        callback({
          response: {
            status: "success",
            message: "Form berhasil dikirim",
            data: dataObject,
          },
        });
        form.reset();
      }
    });

    resolve();
  });
}

// Tambahkan fungsi untuk konversi file ke base64
const convertToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      // Hapus prefix data URL (contoh: "data:image/png;base64,")
      const base64String = reader.result.split(",")[1];
      resolve(base64String);
    };
    reader.onerror = (error) => {
      console.error("Error converting file to base64:", error);
      reject(error);
    };
  });
};
