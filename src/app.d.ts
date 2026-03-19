declare namespace App {
  interface Platform {
    env: {
      CODEX_STATUS: KVNamespace;
      ADMIN_API_KEY?: string;
      MONITOR_API_KEY?: string;
    };
  }
}
