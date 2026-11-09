/**
 * Plain-language help for turning reminders on, per kind of device. People
 * rarely know where the browser's settings are, so each text says where to tap.
 */
export type DeviceKind = "iphone" | "android" | "desktop";

export function deviceKind(userAgent: string): DeviceKind {
  if (/iphone|ipad|ipod/i.test(userAgent)) return "iphone";
  if (/android/i.test(userAgent)) return "android";
  return "desktop";
}

/**
 * Browsers built into other apps (WhatsApp, Instagram, Facebook, TikTok…)
 * cannot install the app or receive reminders.
 */
export function isInAppBrowser(userAgent: string): boolean {
  return /FBAN|FBAV|Instagram|WhatsApp|Line\/|TikTok|musical_ly|Snapchat|Twitter|LinkedInApp|GSA\//i.test(userAgent);
}

/** Where to allow notifications again after they were blocked. */
export function blockedHelp(kind: DeviceKind): string {
  if (kind === "iphone") {
    return "No iPhone, abra os Ajustes → Notificações → Flowy e ligue Permitir Notificações. Depois volte aqui.";
  }
  if (kind === "android") {
    return "No Android, toque e segure o ícone do Flowy → Informações do app → Notificações e ligue. No Chrome, toque no ícone à esquerda do endereço → Permissões → Notificações.";
  }
  return "No computador, clique no ícone à esquerda do endereço do site → Notificações → Permitir. Depois recarregue a página.";
}

/** What to do first when this browser cannot receive reminders yet. */
export function installHelp(kind: DeviceKind, inApp: boolean): string {
  if (inApp) {
    return "Você abriu o Flowy dentro de outro app. Toque no menu (⋯ ou ⋮) e escolha Abrir no navegador para instalar e ativar os lembretes.";
  }
  if (kind === "iphone") {
    return "No iPhone, os lembretes só chegam com o Flowy na Tela de Início: no Safari, toque em Compartilhar (quadrado com seta ↑) → Adicionar à Tela de Início, e abra pelo ícone.";
  }
  return "Este navegador não recebe notificações. Abra o Flowy no Chrome ou instale o app.";
}
