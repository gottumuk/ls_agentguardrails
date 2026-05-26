/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly MODE: string
  readonly VITE_API_ENDPOINT?: string
  readonly VITE_WS_ENDPOINT?: string
  readonly VITE_API_KEY?: string
  readonly VITE_AWS_REGION?: string
  readonly VITE_IDENTITY_POOL_ID?: string
  readonly VITE_NEPTUNE_ENDPOINT?: string
  readonly VITE_APPROVAL_STATE_MACHINE_ARN?: string
  readonly VITE_WEBSOCKET_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
