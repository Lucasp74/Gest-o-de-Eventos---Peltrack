/**
 * Metadados do app desktop para a página de download (/dashboard/app-desktop).
 * O binário é hospedado no GitHub Releases do projeto.
 *
 * AO PUBLICAR UMA NOVA VERSÃO:
 *  1) gere o instalador (`npm run tauri build` no peltrack_desktop);
 *  2) crie um release no GitHub com a tag abaixo e suba o .exe;
 *  3) atualize `version`, `downloadUrl` e `sizeLabel` aqui e faça o deploy.
 */
export const desktopApp = {
  version: "0.1.0",
  os: "Windows 10/11 (64-bit)",
  sizeLabel: "~4,5 MB",
  downloadUrl:
    "https://github.com/Lucasp74/Gest-o-de-Eventos---Peltrack/releases/download/desktop-v0.1.0/Peltrack_0.1.0_x64-setup.exe",
} as const;
