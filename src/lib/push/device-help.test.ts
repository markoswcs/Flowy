import { describe, expect, it } from "vitest";

import { blockedHelp, deviceKind, installHelp, isInAppBrowser } from "./device-help";

const IPHONE_SAFARI =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.7 Mobile/15E148 Safari/604.1";
const IPHONE_INSTAGRAM =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 350.0.0.0";
const ANDROID_WHATSAPP =
  "Mozilla/5.0 (Linux; Android 14; SM-A546E) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36 WhatsApp/2.24";
const ANDROID_CHROME =
  "Mozilla/5.0 (Linux; Android 14; SM-A546E) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36";
const WINDOWS_CHROME =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";

describe("device help", () => {
  it("tells the kind of device", () => {
    expect(deviceKind(IPHONE_SAFARI)).toBe("iphone");
    expect(deviceKind(ANDROID_CHROME)).toBe("android");
    expect(deviceKind(WINDOWS_CHROME)).toBe("desktop");
  });

  it("spots browsers inside other apps", () => {
    expect(isInAppBrowser(IPHONE_INSTAGRAM)).toBe(true);
    expect(isInAppBrowser(ANDROID_WHATSAPP)).toBe(true);
    expect(isInAppBrowser(IPHONE_SAFARI)).toBe(false);
    expect(isInAppBrowser(ANDROID_CHROME)).toBe(false);
  });

  it("says where to unblock notifications on each device", () => {
    expect(blockedHelp("iphone")).toContain("Ajustes → Notificações → Flowy");
    expect(blockedHelp("android")).toContain("Informações do app");
    expect(blockedHelp("desktop")).toContain("Permitir");
  });

  it("asks to leave other apps first, then explains the iPhone home screen", () => {
    expect(installHelp("iphone", true)).toContain("Abrir no navegador");
    expect(installHelp("iphone", false)).toContain("Adicionar à Tela de Início");
  });
});
