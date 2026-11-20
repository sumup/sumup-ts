import { Case } from "change-case-all";
import { iterPathConfig } from "./base";
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

export function operationMethodName(
  method: object,
  operationId: string,
): string {
  const overrides = (method as { "x-codegen"?: { method_name?: string } })[
    "x-codegen"
  ];
  return Case.camel(overrides?.method_name || operationId);
}

export function nestedMethodNames(
  spec: Document,
  tagName: string,
): Map<string, string> {
  const tag = spec.tags?.find(({ name }) => name === tagName);
  if (!tag || !resourceParents(spec).has(tagName)) return new Map();

  const suffixes = [tag.name, tag["x-displayName"] ?? tag.name].flatMap(
    (name) => {
      const words = Case.snake(name);
      return [`_${words}`, `_${words.replace(/s$/, "")}`];
    },
  );
  const originals = new Set<string>();
  const proposed = new Map<string, string>();
  const counts = new Map<string, number>();
  for (const { methodSpec, opId } of iterPathConfig(spec.paths)) {
    if (!methodSpec.tags?.includes(tagName)) continue;
    const original = operationMethodName(methodSpec, opId);
    originals.add(original);
    const snake = Case.snake(original);
    const suffix = suffixes.find(
      (tail) => snake.length > tail.length && snake.endsWith(tail),
    );
    const name = suffix ? Case.camel(snake.slice(0, -suffix.length)) : original;
    proposed.set(original, name);
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }

  for (const [original, shorter] of proposed) {
    if (originals.has(shorter) || (counts.get(shorter) ?? 0) > 1) {
      proposed.delete(original);
    }
  }
  return proposed;
}
