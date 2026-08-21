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
  version: "0.3.5",
  os: "Windows 10/11 (64-bit)",
  sizeLabel: "~5,2 MB",
  downloadUrl:
    "https://github.com/Lucasp74/Gest-o-de-Eventos---Peltrack/releases/download/desktop-v0.3.5/Peltrack_0.3.5_x64-setup.exe",
} as const;
