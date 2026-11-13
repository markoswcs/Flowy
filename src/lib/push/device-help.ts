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
  return "Este navegador não recebe lembretes com o site fechado. Abra o Flowy no Chrome ou no Edge e ative por lá. " + TAB_FALLBACK;
}

/** The browser could not reach its push service (Chrome/Edge: "push service error"). */
export function isPushServiceError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const { name, message } = error as { name?: unknown; message?: unknown };
  return name === "AbortError" || (typeof message === "string" && /push service/i.test(message));
}

/** Which desktop browser this is, for help that names the right menu. */
export function browserName(userAgent: string, brave: boolean): string | null {
  if (brave) return "Brave";
  if (/Ddg\//.test(userAgent)) return "DuckDuckGo";
  if (/Vivaldi/.test(userAgent)) return "Vivaldi";
  if (/OPR\//.test(userAgent)) return "Opera";
  if (/Edg\//.test(userAgent)) return "Edge";
  if (/Firefox\//.test(userAgent)) return "Firefox";
  if (/Chrome\//.test(userAgent)) return "Chrome";
  if (/Safari\//.test(userAgent)) return "Safari";
  return null;
}

/** Said whenever push cannot work here: Flowy still reminds while it is open. */
export const TAB_FALLBACK =
  "Enquanto isso, deixe o Flowy aberto numa aba: os avisos aparecem na hora, com som.";

/** What to do when the browser cannot reach its push service. */
export function pushServiceHelp(userAgent: string, brave: boolean): string {
  const name = browserName(userAgent, brave);
  if (name === "Brave") {
    return `O Brave bloqueia os lembretes por padrão. Abra brave://settings/privacy, ligue “Usar serviços do Google para mensagens push”, reinicie o Brave e tente de novo. ${TAB_FALLBACK}`;
  }
  if (name === "Vivaldi" || name === "DuckDuckGo") {
    return `O ${name} não recebe lembretes com o site fechado. Para receber sempre, abra o Flowy no Chrome ou no Edge e ative por lá. ${TAB_FALLBACK}`;
  }
  if (name === "Firefox") {
    return `O Firefox não recebe lembretes em janela privada. Abra numa janela normal e tente de novo. ${TAB_FALLBACK}`;
  }
  if (!name || /Electron|Claude\//i.test(userAgent)) {
    return `Este navegador não tem serviço de lembretes. Abra o Flowy no Chrome ou no Edge e ative por lá. ${TAB_FALLBACK}`;
  }
  return `O navegador não conseguiu falar com o serviço de lembretes. Confira a internet, desligue VPN ou bloqueador de anúncios e tente de novo. ${TAB_FALLBACK}`;
}
