import { flatten } from "@/features/mindmap/model";
import type { MapDoc, Topic } from "@/features/mindmap/types";

export function toPlainText(doc: MapDoc): string {
  return flatten(doc)
    .map((t) => t.text.trim())
    .filter((t) => t !== "")
    .join(" · ");
}

function oneLine(text: string): string {
  return text.replace(/\s*\n\s*/g, " ").trim();
}

function writeTopic(t: Topic, depth: number, lines: string[]) {
  const pad = "  ".repeat(depth);
  const box = t.done === undefined ? "" : t.done ? "[x] " : "[ ] ";
  lines.push(`${pad}- ${box}${oneLine(t.text)}`);
  if (t.note) {
    for (const line of t.note.split(/\r?\n/)) lines.push(`${pad}  > ${line}`);
  }
  t.children.forEach((c) => writeTopic(c, depth + 1, lines));
}

export function toMarkdown(doc: MapDoc): string {
  const lines: string[] = [];
  writeTopic(doc.root, 0, lines);
  doc.floating.forEach((f) => writeTopic(f, 0, lines));
  return lines.join("\n") + "\n";
}

const MARKER = /^(?:[-*+]|\d+[.)])(?:\s+|$)/;
const CHECKBOX = /^\[([ xX])\]\s+/;

export function fromOutline(text: string): Topic[] {
  const result: Topic[] = [];
  const stack: { indent: number; topic: Topic }[] = [];
  let last: Topic | null = null;

  for (const line of text.split(/\r?\n/)) {
    if (line.trim() === "") continue;
    const lead = /^[ \t]*/.exec(line)?.[0] ?? "";
    const indent = lead.replace(/\t/g, "    ").length;
    let body = line.slice(lead.length).trimEnd();

    if (body.startsWith(">") && last) {
      const quoted = body.replace(/^>\s?/, "");
      last.note = last.note ? `${last.note}\n${quoted}` : quoted;
      continue;
    }

    body = body.replace(MARKER, "");
    let done: boolean | undefined;
    const box = CHECKBOX.exec(body);
    if (box) {
      done = box[1] !== " ";
      body = body.slice(box[0].length);
    }

    const topic: Topic = {
      id: crypto.randomUUID(),
      text: body.trim(),
      children: [],
    };
    if (done !== undefined) topic.done = done;

    while (stack.length > 0 && (stack[stack.length - 1]?.indent ?? 0) >= indent)
      stack.pop();
    const parent = stack[stack.length - 1]?.topic;
    if (parent) parent.children.push(topic);
    else result.push(topic);
    stack.push({ indent, topic });
    last = topic;
  }
  return result;
}
