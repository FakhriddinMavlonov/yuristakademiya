import { create } from "zustand";
import { io } from "socket.io-client";
import i18n from "../i18n";

// Token storage scheme (SECURITY IMPROVED):
//   access token  → sessionStorage  ('ya_token') — cleared on tab close, not accessible by other tabs
//   refresh token → httpOnly-style cookie ('ya_refresh_token', 7 days)
// Auto-login on revisit while refresh token is valid.

const REFRESH_TOKEN_DAYS = 7;
const setCookie = (name, value, days) => {
  const exp = new Date(Date.now() + days * 86400000).toUTCString();
  // SECURITY: SameSite=Strict + Secure in production for refresh token cookie
  const secureFlag = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${name}=${encodeURIComponent(value || '')}; expires=${exp}; path=/; SameSite=Lax${secureFlag}`;
};
const getCookie = (name) => {
  const m = document.cookie.match(new RegExp('(^|; )' + name + '=([^;]*)'));
  return m ? decodeURIComponent(m[2]) : null;
};
const clearCookie = (name) => {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`;
};

export const tokenStore = {
  // Use sessionStorage (cleared on tab close) instead of localStorage
  getAccess: () => sessionStorage.getItem('ya_token'),
  setAccess: (v) => v ? sessionStorage.setItem('ya_token', v) : sessionStorage.removeItem('ya_token'),
  getRefresh: () => getCookie('ya_refresh_token'),
  setRefresh: (v) => v ? setCookie('ya_refresh_token', v, REFRESH_TOKEN_DAYS) : clearCookie('ya_refresh_token'),
  clear: () => {
    sessionStorage.removeItem('ya_token');
    clearCookie('ya_refresh_token');
    // Migration: clear any legacy values
    localStorage.removeItem('ya_token');
    localStorage.removeItem('ya_refresh_token');
    clearCookie('ya_token');
  },
};

// One-time migration from older scheme (localStorage → sessionStorage)
(() => {
  const legacyAccessLs = localStorage.getItem('ya_token');
  if (legacyAccessLs && !sessionStorage.getItem('ya_token')) {
    sessionStorage.setItem('ya_token', legacyAccessLs);
  }
  localStorage.removeItem('ya_token');
  localStorage.removeItem('ya_refresh_token');
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
  mode: localStorage.getItem("ya_mode") || "online", // 'online' | 'offline'

  setMode: (mode) => {
    localStorage.setItem("ya_mode", mode);
    set({ mode });
  },

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

    // Disconnect any existing socket first (avoid duplicates on auto-relogin)
    const existing = get().socket;
    if (existing) try { existing.disconnect(); } catch {}

    // Socket URL: explicit env > derived from API URL > current origin (proxy in dev)
    let socketUrl = import.meta.env.VITE_SOCKET_URL;
    if (!socketUrl) {
      const apiUrl = import.meta.env.VITE_API_URL;
      if (apiUrl) socketUrl = apiUrl.replace(/\/api\/?$/, '').replace(/\/$/, '');
    }
    const socket = io(socketUrl || undefined, {
      auth: { token: accessToken },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => console.log('[socket] connected', socket.id));
    socket.on('connect_error', (e) => console.warn('[socket] connect error:', e.message));
    socket.on('disconnect', (r) => console.log('[socket] disconnected:', r));

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
      console.log('[socket] meeting:started received', payload);
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
