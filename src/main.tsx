import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Sign-in flows return to these paths.
const path = window.location.pathname;
if (path === "/auth/microsoft") {
  import("@azure/msal-browser/redirect-bridge").then(({ broadcastResponseToMainFrame }) =>
    broadcastResponseToMainFrame().catch((err) => console.error("Microsoft sign-in return failed:", err))
  );
} else if (path === "/auth/dropbox") {
  // Finish the Dropbox sign-in, then return to the Connections page with the outcome.
  import("./providers/dropbox/index.ts").then(async ({ completeDropboxSignIn }) => {
    const error = await completeDropboxSignIn();
    const params = new URLSearchParams({ tab: "workspace", connected: "dropbox" });
    if (error) params.set("connectError", error);
    window.location.replace(`/?${params}`);
  });
} else {
  createRoot(document.getElementById('root')!).render(<App />);
}

// Installable app + offline support (production builds only, so dev reloads stay fresh).
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((err) => console.warn("Service worker registration failed:", err));
  });
}
