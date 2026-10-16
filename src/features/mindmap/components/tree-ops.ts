import {
  createTopic,
  findParent,
  findTopic,
  moveTopic,
} from "@/features/mindmap/model";
import type { MapDoc, Topic } from "@/features/mindmap/types";

/** Deep copy with fresh ids (copy/paste, duplicate). */
export function cloneWithNewIds(topic: Topic): Topic {
  const copy: Topic & { x?: number; y?: number } = {
    ...topic,
    id: createTopic().id,
    children: topic.children.map(cloneWithNewIds),
  };
  delete copy.x;
  delete copy.y;
  return copy;
}

/**
 * Inserts a ready-made subtree under `parentId`. The model has no direct
 * "insert subtree" operation, so the topic is added as a floating topic and
 * then moved with `moveTopic`, which strips the floating position.
 */
export function insertSubtree(
  doc: MapDoc,
  parentId: string,
  topic: Topic,
  index: number,
): MapDoc {
  const staged: MapDoc = {
    ...doc,
    floating: [...doc.floating, { ...topic, x: 0, y: 0 }],
  };
  const moved = moveTopic(staged, topic.id, parentId, index);
  return moved === staged ? doc : moved;
}

export function insertSubtrees(
  doc: MapDoc,
  parentId: string,
  topics: Topic[],
): MapDoc {
  const parent = findTopic(doc, parentId);
  if (!parent) return doc;
  let next = doc;
  topics.forEach((topic, offset) => {
    next = insertSubtree(
      next,
      parentId,
      topic,
      parent.children.length + offset,
    );
  });
  return next;
}

/** Duplicates a topic right after itself; returns the copy's id. */
export function duplicateTopic(
  doc: MapDoc,
  id: string,
): { doc: MapDoc; id: string } | null {
  const topic = findTopic(doc, id);
  const parent = findParent(doc, id);
  if (!topic || !parent) return null;
  const copy = cloneWithNewIds(topic);
  const index = parent.children.findIndex((child) => child.id === id) + 1;
  return { doc: insertSubtree(doc, parent.id, copy, index), id: copy.id };
}

export function subtreeDoc(doc: MapDoc, topic: Topic): MapDoc {
  return { ...doc, root: topic, floating: [], relations: [] };
}

/** Ids of floating topics and their descendants (drawn one level deeper). */
export function floatingTopicIds(doc: MapDoc): Set<string> {
  const ids = new Set<string>();
  const walk = (topic: Topic) => {
    ids.add(topic.id);
    topic.children.forEach(walk);
  };
  doc.floating.forEach(walk);
  return ids;
}
