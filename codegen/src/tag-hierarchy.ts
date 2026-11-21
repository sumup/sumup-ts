import { Case } from "change-case-all";
import type { Document } from "./openapi";

type ResourceParent = { tag: string; accessor: string };
export type ResourceParents = ReadonlyMap<string, ResourceParent>;

export function resourceParents(spec: Document): ResourceParents {
  const tags = new Map(spec.tags?.map((tag) => [tag.name, tag]));
  const parents = new Map<string, ResourceParent>();

  function setParent(child: string, parentName: string) {
    const tag = tags.get(child);
    if (
      child === parentName ||
      !tag ||
      !tags.has(parentName) ||
      parents.has(child)
    ) {
      return;
    }
    for (
      let ancestor: string | undefined = parentName;
      ancestor;
      ancestor = parents.get(ancestor)?.tag
    ) {
      if (ancestor === child) {
        throw new Error(`Tag hierarchy contains a cycle at ${child}`);
      }
    }
    parents.set(child, {
      tag: parentName,
      accessor: Case.camel(tag["x-displayName"] || child),
    });
  }

  for (const tag of tags.values()) {
    if (tag.parent) setParent(tag.name, tag.parent);
  }
  for (const group of spec["x-tagGroups"] ?? []) {
    for (const tag of group.tags) setParent(tag, group.name);
  }
  return parents;
}

export function resourcePath(parents: ResourceParents, tag: string): string {
  const parent = parents.get(tag);
  return parent
    ? `${resourcePath(parents, parent.tag)}.${parent.accessor}`
    : Case.camel(tag);
}
