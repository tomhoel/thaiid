/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Clerk publishable key. Safe to ship in the bundle. */
  readonly VITE_CLERK_PUBLISHABLE_KEY: string;
  /** Optional: only set for local development against the Gemini API directly. */
  readonly VITE_GEMINI_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/** Injected by Vite's `define` from package.json. */
declare const __APP_VERSION__: string;
