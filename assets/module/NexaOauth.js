// Fungsi helper untuk addCookie dengan callback
import { NexaStorage } from './NexaStorage.js';

// NexaOauth
export function NexaOauth(setData) {
      const storage = new NexaStorage();
      // Dapatkan akses ke IndexDB
      const db = storage.getIndexDB();
      // Menambah data baru
      const addData = async () => {
          const result = await db.add({
              key: "Oauth",
              data: setData
          });
          setCookie("pathname", setData.pathname, 7); // Cookie akan expired dalam 7 hari
          setCookie("NEXAUID", setData.credensial, 7); // Cookie akan expired dalam 7 hari
            // Menambahkan setTimeout untuk redirect ke halaman profile
             setTimeout(() => {
               window.location.href = window.location.origin+'/'+setData.pathname;
             }, 3000); // 3000 ms = 3 detik

      };
      addData();
}

export async function NexaLogout(pathname='/home') {
  try {
    const storage = new NexaStorage();
    const indexDB = storage.getIndexDB();
    // Menghapus data user dari IndexDB
    const result = await indexDB.del("Oauth");
    // Menghapus cookie pathname
    deleteCookie("pathname");
    deleteCookie("NEXAUID");
     setTimeout(() => {
       window.location.href = window.location.origin+'/home';
     }, 1000); // 3000 ms = 3 detik
  } catch (error) {
    console.error("Gagal menghapus data:", error);
  }
}


export function setCookie(name, value, days) {
    const d = new Date();
    d.setTime(d.getTime() + (days * 24 * 60 * 60 * 1000));
    const expires = "expires=" + d.toUTCString();
    document.cookie = name + "=" + value + ";" + expires + ";path=/";
}

// Fungsi untuk menghapus cookie
export function deleteCookie(name) {
    document.cookie = name + "=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
}

