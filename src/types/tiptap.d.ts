// TipTap v3.31+ ships types as .d.cts/.d.mts but omits .d.ts.
// This ambient declaration provides the types used by the project
// so TypeScript can resolve `import type { JSONContent } from "@tiptap/core"`.

declare module "@tiptap/core" {
  export type JSONContent = {
    type?: string;
    attrs?: Record<string, unknown>;
    content?: JSONContent[];
    marks?: {
      type: string;
      attrs?: Record<string, unknown>;
      [key: string]: unknown;
    }[];
    text?: string;
    [key: string]: unknown;
  };

  // Re-export other commonly used types/values as `any` so existing
  // imports don't break.  The runtime module still provides them.
  export const Extension: unknown;
  export const Mark: unknown;
  export const Node: unknown;
  export const Editor: unknown;
  export type Content = string | JSONContent | JSONContent[] | null;
}
