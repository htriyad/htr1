import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

document.title = "RedRose🥀";

createRoot(document.getElementById("root")!).render(<App />);

/* Register service worker for offline mode + faster loads.
   Skipped in dev (Vite hot-reload doesn't play well with SW caching). */
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
} else if ("serviceWorker" in navigator) {
  // In dev, make sure no leftover SW is interfering
  navigator.serviceWorker.getRegistrations().then(rs => rs.forEach(r => r.unregister())).catch(() => {});
}
