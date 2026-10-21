import type { ProviderAccount, StoredFile, WorkspaceProvider } from "../types.ts";

// Dropbox (files only) via OAuth 2 PKCE with a full-page redirect (a sign-in popup can lose its
// link back to the app after visiting another site). Requires a Dropbox app with redirect URI
// <app origin>/auth/dropbox and the account_info.read, files.metadata.read,
// files.content.read and files.content.write scopes.
const PROVIDER_ID = "dropbox";
const APP_KEY = import.meta.env.VITE_DROPBOX_APP_KEY as string | undefined;
export const DROPBOX_REDIRECT_PATH = "/auth/dropbox";
const FOLDER = "/Broker Buddy";

// The token lives in sessionStorage so it survives the sign-in redirect; it is cleared when the
// tab closes, and only short-lived ("online") tokens are requested.
const TOKEN_KEY = "broker-buddy.dropbox.token";
const ACCOUNT_KEY = "broker-buddy.dropbox.account";
const PENDING_KEY = "broker-buddy.dropbox.pending";

const session = {
  get(key: string) {
    try {
      return sessionStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key: string, value: string | null) {
    try {
      if (value === null) sessionStorage.removeItem(key);
      else sessionStorage.setItem(key, value);
    } catch {
      // Storage unavailable; the connection then lasts only until the page reloads.
    }
  },
};

let accessToken: string | null = session.get(TOKEN_KEY);
let currentAccount: ProviderAccount | null = JSON.parse(session.get(ACCOUNT_KEY) || "null");
const listeners = new Set<(account: ProviderAccount | null) => void>();

function setAccount(account: ProviderAccount | null) {
  currentAccount = account;
  session.set(ACCOUNT_KEY, account ? JSON.stringify(account) : null);
  listeners.forEach((cb) => cb(account));
}

const redirectUri = () => `${window.location.origin}${DROPBOX_REDIRECT_PATH}`;

function base64Url(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function api<T>(path: string, body: unknown): Promise<T> {
  if (!accessToken) throw new Error("Dropbox not connected. Connect your Dropbox account first.");
  const res = await fetch(`https://api.dropboxapi.com/2${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    if (res.status === 401) {
      // Short-lived token expired: sign in again.
      accessToken = null;
      session.set(TOKEN_KEY, null);
      setAccount(null);
    }
    const text = await res.text();
    throw new Error(`Dropbox error (${res.status}): ${text.slice(0, 200)}`);
  }
  return res.json();
}

// Dropbox-API-Arg must be ASCII; escape everything else as \uXXXX.
const asciiJson = (value: unknown) =>
  JSON.stringify(value).replace(/[^\x00-\x7f]/g, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, "0")}`);

const folderLink = (pathDisplay: string) =>
  `https://www.dropbox.com/home${encodeURI(pathDisplay.slice(0, pathDisplay.lastIndexOf("/")) || "/")}`;

const toStoredFile = (m: any): StoredFile => ({
  id: m.id,
  name: m.name,
  mimeType: m[".tag"] === "folder" ? "folder" : "file",
  link: m.path_display ? folderLink(m.path_display) : undefined,
  modifiedTime: m.server_modified,
  size: m.size !== undefined ? String(m.size) : undefined,
  providerId: PROVIDER_ID,
});

export const dropboxProvider: WorkspaceProvider = {
  id: PROVIDER_ID,
  displayName: "Dropbox",
  kinds: ["files"],
  labels: { files: "Dropbox" },
  isConfigured: Boolean(APP_KEY),
  setupHint: "Needs VITE_DROPBOX_APP_KEY (Dropbox app)",

  async connect() {
    if (!APP_KEY) throw new Error("Dropbox isn't set up for this app yet. Add VITE_DROPBOX_APP_KEY to the environment.");
    const verifier = base64Url(crypto.getRandomValues(new Uint8Array(32)));
    const challenge = base64Url(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier))));
    const state = base64Url(crypto.getRandomValues(new Uint8Array(16)));
    session.set(PENDING_KEY, JSON.stringify({ verifier, state }));
    const url = new URL("https://www.dropbox.com/oauth2/authorize");
    url.search = new URLSearchParams({
      client_id: APP_KEY,
      response_type: "code",
      code_challenge: challenge,
      code_challenge_method: "S256",
      redirect_uri: redirectUri(),
      token_access_type: "online",
      state,
    }).toString();
    window.location.assign(url.toString());
    // The page navigates to Dropbox; completeDropboxSignIn() finishes when it comes back.
    return new Promise<ProviderAccount>(() => {});
  },

  async disconnect() {
    if (accessToken) {
      await fetch("https://api.dropboxapi.com/2/auth/token/revoke", {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
      }).catch(() => {});
    }
    accessToken = null;
    session.set(TOKEN_KEY, null);
    setAccount(null);
  },

  onAccountChange(callback) {
    listeners.add(callback);
    callback(currentAccount);
    return () => {
      listeners.delete(callback);
    };
  },

  files: {
    async uploadNote(filename, content) {
      if (!accessToken) throw new Error("Dropbox not connected. Connect your Dropbox account first.");
      const name = filename.endsWith(".md") ? filename : `${filename}.md`;
      const res = await fetch("https://content.dropboxapi.com/2/files/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/octet-stream",
          "Dropbox-API-Arg": asciiJson({ path: `${FOLDER}/${name}`, mode: "add", autorename: true }),
        },
        body: new TextEncoder().encode(content),
      });
      if (!res.ok) throw new Error(`Dropbox upload error (${res.status})`);
      const meta = await res.json();
      return { file: toStoredFile(meta), link: folderLink(meta.path_display) };
    },
    async listFiles(query = "", max = 12) {
      if (query.trim()) {
        const data = await api<any>("/files/search_v2", { query, options: { max_results: max } });
        return (data.matches || []).map((m: any) => toStoredFile(m.metadata.metadata));
      }
      try {
        const data = await api<any>("/files/list_folder", { path: FOLDER });
        return (data.entries || []).slice(0, max).map(toStoredFile);
      } catch {
        // The Broker Buddy folder doesn't exist until the first upload; show the root instead.
        const data = await api<any>("/files/list_folder", { path: "" });
        return (data.entries || []).slice(0, max).map(toStoredFile);
      }
    },
  },
};

// Runs on <origin>/auth/dropbox after Dropbox redirects back: exchanges the code for a token and
// loads the account. Returns an error message, or null on success.
export async function completeDropboxSignIn(): Promise<string | null> {
  const params = new URLSearchParams(window.location.search);
  const pending = JSON.parse(session.get(PENDING_KEY) || "null") as { verifier: string; state: string } | null;
  session.set(PENDING_KEY, null);
  if (params.get("error")) return params.get("error_description") || params.get("error");
  if (!APP_KEY || !pending || params.get("state") !== pending.state) {
    return "Dropbox sign-in could not be verified. Please try again.";
  }

  try {
    const tokenRes = await fetch("https://api.dropboxapi.com/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code: params.get("code") || "",
        client_id: APP_KEY,
        code_verifier: pending.verifier,
        redirect_uri: redirectUri(),
      }),
    });
    if (!tokenRes.ok) return `Dropbox sign-in failed (${tokenRes.status})`;
    accessToken = (await tokenRes.json()).access_token;
    session.set(TOKEN_KEY, accessToken);

    const me = await api<any>("/users/get_current_account", null);
    setAccount({
      id: me.account_id,
      name: me.name?.display_name || me.email,
      email: me.email,
      photoUrl: me.profile_photo_url,
      providerId: PROVIDER_ID,
    });
    return null;
  } catch (err: any) {
    return err?.message || String(err);
  }
}
