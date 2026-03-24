/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Empty in dev when using Vite proxy to the API; set in Docker build for production. */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
