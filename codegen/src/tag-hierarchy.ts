import { Case } from "change-case-all";
import type { Document, ResourceTag } from "./openapi";

export function childAccessor(tag: ResourceTag): string {
  return Case.camel(tag["x-displayName"] || tag.name);
}

export function resourceParents(spec: Document): Map<string, ResourceTag> {
  const tags = new Map(spec.tags?.map((tag) => [tag.name, tag]));
  const parents = new Map<string, ResourceTag>();

  function setParent(child: string, parentName: string) {
    const parent = tags.get(parentName);
    if (
      child === parentName ||
      !tags.has(child) ||
      !parent ||
      parents.has(child)
    ) {
      return;
    }
    for (
      let ancestor: ResourceTag | undefined = parent;
      ancestor;
      ancestor = parents.get(ancestor.name)
    ) {
      if (ancestor.name === child) {
        throw new Error(`Tag hierarchy contains a cycle at ${child}`);
      }
    }
    parents.set(child, parent);
  }

  for (const tag of tags.values()) {
    if (tag.parent) setParent(tag.name, tag.parent);
  }
  for (const group of spec["x-tagGroups"] ?? []) {
    for (const tag of group.tags) setParent(tag, group.name);
  }
  return parents;
}

export function resourcePath(spec: Document, tagName: string): string {
  const parents = resourceParents(spec);
  const tags = spec.tags ?? [];
  const path: string[] = [];
  let name = tagName;
  for (let parent = parents.get(name); parent; parent = parents.get(name)) {
    const tag = tags.find((candidate) => candidate.name === name);
    path.unshift(tag ? childAccessor(tag) : Case.camel(name));
    name = parent.name;
  }
  path.unshift(Case.camel(name));
  return path.join(".");
}
