import { describe, expect, it } from "vitest";

import { urlBase64ToUint8Array } from "@/lib/push/vapid";

describe("urlBase64ToUint8Array", () => {
  it("decodes base64url without padding", () => {
    // "Flowy" -> Rmxvd3k (base64url, no padding)
    expect(Array.from(urlBase64ToUint8Array("Rmxvd3k"))).toEqual([70, 108, 111, 119, 121]);
  });

  it("maps the url-safe alphabet back to standard base64", () => {
    // 0xfb 0xff -> "-_8" in base64url ("+/8=" in base64)
    expect(Array.from(urlBase64ToUint8Array("-_8"))).toEqual([0xfb, 0xff]);
  });
});
