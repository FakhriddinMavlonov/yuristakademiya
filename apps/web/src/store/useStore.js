import { create } from "zustand";
import { io } from "socket.io-client";
import i18n from "../i18n";

const useStore = create((set, get) => ({
  user: null,
  token: localStorage.getItem("ya_token"),
  socket: null,
  toast: null,
  unreadMessages: 0,
  theme: localStorage.getItem("ya_theme") || "light",
  language: localStorage.getItem("ya_lang") || "uz",

  setUser: (user) => set({ user }),

  setToken: (token) => {
    localStorage.setItem("ya_token", token);
    set({ token });
  },

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
    localStorage.setItem("ya_token", accessToken);
    if (refreshToken) localStorage.setItem("ya_refresh_token", refreshToken);
    let backendUrl = "/";
    const apiUrl = import.meta.env.VITE_API_URL;
    if (apiUrl) {
      backendUrl = apiUrl.replace("/api", "").replace(/\/$/, "") || "/";
    }
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
    socket.on("meeting:started", () =>
      get().showToast(i18n.t("toast.meetingStarted")),
    );
    set({ user, token: accessToken, socket });
  },

  logout: () => {
    localStorage.removeItem("ya_token");
    localStorage.removeItem("ya_refresh_token");
    get().socket?.disconnect();
    set({ user: null, token: null, socket: null });
  },

  showToast: (msg) => {
    set({ toast: msg });
    setTimeout(() => set({ toast: null }), 2800);
  },
}));

export default useStore;
