// Tipagem mínima do widget Cloudflare Turnstile carregado via <Script>.
interface Window {
  turnstile?: {
    reset: (widgetId?: string) => void;
  };
}
