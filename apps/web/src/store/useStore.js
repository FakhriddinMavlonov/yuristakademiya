import { create } from "zustand";
import { io } from "socket.io-client";
import i18n from "../i18n";

// Token storage scheme:
//   access token  → localStorage  ('ya_token')
//   refresh token → cookie        ('ya_refresh_token', 1 year)
// Auto-login on revisit while either is valid.

const ONE_YEAR_DAYS = 365;
const setCookie = (name, value, days) => {
  const exp = new Date(Date.now() + days * 86400000).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value || '')}; expires=${exp}; path=/; SameSite=Lax`;
};
const getCookie = (name) => {
  const m = document.cookie.match(new RegExp('(^|; )' + name + '=([^;]*)'));
  return m ? decodeURIComponent(m[2]) : null;
};
const clearCookie = (name) => {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
};

export const tokenStore = {
  getAccess: () => localStorage.getItem('ya_token'),
  setAccess: (v) => v ? localStorage.setItem('ya_token', v) : localStorage.removeItem('ya_token'),
  getRefresh: () => getCookie('ya_refresh_token'),
  setRefresh: (v) => v ? setCookie('ya_refresh_token', v, ONE_YEAR_DAYS) : clearCookie('ya_refresh_token'),
  clear: () => {
    localStorage.removeItem('ya_token');
    clearCookie('ya_refresh_token');
    // Migration: clear any legacy values
    localStorage.removeItem('ya_refresh_token');
    clearCookie('ya_token');
  },
};

// One-time migration from older scheme (access in cookie or refresh in localStorage)
(() => {
  const legacyRefreshLs = localStorage.getItem('ya_refresh_token');
  if (legacyRefreshLs && !getCookie('ya_refresh_token')) {
    setCookie('ya_refresh_token', legacyRefreshLs, ONE_YEAR_DAYS);
  }
  localStorage.removeItem('ya_refresh_token');
  const legacyAccessCookie = getCookie('ya_token');
  if (legacyAccessCookie && !localStorage.getItem('ya_token')) {
    localStorage.setItem('ya_token', legacyAccessCookie);
  }
  clearCookie('ya_token');
})();

const useStore = create((set, get) => ({
  user: null,
  token: tokenStore.getAccess(),
  authResolving: !!tokenStore.getAccess() || !!tokenStore.getRefresh(),
  socket: null,
  toast: null,
  incomingMeeting: null,
  unreadMessages: 0,
  theme: localStorage.getItem("ya_theme") || "light",
  language: localStorage.getItem("ya_lang") || "uz",

  setUser: (user) => set({ user }),

  setAuthResolving: (v) => set({ authResolving: v }),

  setToken: (token) => {
    tokenStore.setAccess(token);
    set({ token });
  },

  setIncomingMeeting: (m) => set({ incomingMeeting: m }),

  setTheme: (theme) => {
    localStorage.setItem("ya_theme", theme);
    document.documentElement.setAttribute("data-theme", theme);
    set({ theme });
  },

  setLanguage: (lang) => {
    localStorage.setItem("ya_lang", lang);
    i18n.changeLanguage(lang);
    set({ language: lang });
  },

  login: (user, accessToken, refreshToken) => {
    tokenStore.setAccess(accessToken);
    if (refreshToken) tokenStore.setRefresh(refreshToken);
    const socket = io(import.meta.env.VITE_SOCKET_URL, {
      auth: { token: accessToken },
      transports: ["websocket"],
    });
    socket.on("chat:message", () =>
      set((s) => ({ unreadMessages: s.unreadMessages + 1 })),
    );
    socket.on("assignment:graded", ({ score }) =>
      get().showToast(i18n.t("toast.homeworkGraded", { score })),
    );
    socket.on("meeting:scheduled", () =>
      get().showToast(i18n.t("toast.newMeeting")),
    );
    socket.on("meeting:started", (payload) => {
      // student: trigger incoming-call modal with ringing
      if (user?.role === 'student') {
        set({ incomingMeeting: payload });
      } else {
        get().showToast(i18n.t("toast.meetingStarted"));
      }
    });
    socket.on("exam:scheduled", () =>
      get().showToast(i18n.t("toast.newExam") || 'Yangi mock imtihon!'),
    );
    socket.on("exam:result_posted", ({ score }) =>
      get().showToast(i18n.t("toast.examResult", { score }) || `Imtihon natijangiz: ${score}`),
    );
    set({ user, token: accessToken, socket, authResolving: false });
  },

  logout: () => {
    tokenStore.clear();
    get().socket?.disconnect();
    set({ user: null, token: null, socket: null, incomingMeeting: null, authResolving: false });
  },

  showToast: (msg) => {
    set({ toast: msg });
    setTimeout(() => set({ toast: null }), 2800);
  },
}));

export default useStore;
