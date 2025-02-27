export class NexaSync {
  #config = {
    key: null,
    secret: null,
    url: null,
    contentType: "application/json", // Default content type
  };

  constructor(config) {
    this.setConfig(config);
  }

  setConfig(config) {
    if (typeof config !== "object") {
      throw new Error("Config harus berupa object");
    }

    // Check if URL contains v1 - secret is not required for v1
    const isV1 = config.url?.includes("/v1");

    const requiredFields = ["key", "url"];
    // Add secret as required field only for v2+
    if (!isV1) {
      requiredFields.push("secret");
    }

    for (const field of requiredFields) {
      if (!config[field]) {
        throw new Error(`${field} harus diisi dalam config`);
      }
    }

    this.#config = { ...this.#config, ...config };
  }

  getConfig() {
    return { ...this.#config }; // Return copy of config
  }

  // Method untuk mengubah content type
  setContentType(contentType) {
    const validTypes = [
      "application/json",
      "application/x-www-form-urlencoded",
      "multipart/form-data",
      "text/plain",
    ];

    if (!validTypes.includes(contentType)) {
      throw new Error("Content type tidak valid");
    }

    this.#config.contentType = contentType;
  }

  async get(endpoint) {
    return this.#request(endpoint, "GET");
  }

  async post(endpoint, data) {
    return this.#request(endpoint, "POST", data);
  }

  async put(endpoint, data) {
    return this.#request(endpoint, "PUT", data);
  }

  async delete(endpoint) {
    return this.#request(endpoint, "DELETE");
  }

  async #request(endpoint, method, data = null) {
    if (!this.#config.key || !this.#config.url) {
      throw new Error(
        "Konfigurasi API belum diatur. Gunakan NexaSync.setConfig()"
      );
    }

    try {
      const options = {
        method,
        headers: {
          "API-Key": this.#config.key,
          Accept: "application/json",
        },
      };

      // Add API-Secret header only if secret is configured
      if (this.#config.secret) {
        options.headers["API-Secret"] = this.#config.secret;
      }

      if (data) {
        // Handle different content types
        switch (this.#config.contentType) {
          case "application/x-www-form-urlencoded":
            options.headers["Content-Type"] =
              "application/x-www-form-urlencoded";
            options.body = new URLSearchParams(data).toString();
            break;

          case "multipart/form-data":
            // Don't set Content-Type for multipart/form-data
            const formData = new FormData();
            Object.entries(data).forEach(([key, value]) => {
              formData.append(key, value);
            });
            options.body = formData;
            break;

          case "text/plain":
            options.headers["Content-Type"] = "text/plain";
            options.body =
              typeof data === "string" ? data : JSON.stringify(data);
            break;

          case "application/json":
          default:
            options.headers["Content-Type"] = "application/json";
            options.body = JSON.stringify(data);
            break;
        }
      }

      // Ensure clean URL construction by removing extra slashes
      const baseUrl = this.#config.url.endsWith("/")
        ? this.#config.url.slice(0, -1)
        : this.#config.url;
      const cleanEndpoint = endpoint.startsWith("/")
        ? endpoint.slice(1)
        : endpoint;

      const response = await fetch(`${baseUrl}/${cleanEndpoint}`, options);

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || `HTTP Error: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error("Error in API request:", error);
      throw error;
    }
  }
}

// Factory function now returns a new instance
export const createNexaSync = (config) => {
  return new NexaSync(config);
};
