import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { OpenAPIV3_1 } from "openapi-types";
import { describe, expect, it } from "vitest";
import spec from "../../openapi.json";
import { collectEventDefinitions, generateEvents } from "./events";

describe("event generation", () => {
  it("uses wire names and resource types from the schema", () => {
    expect(
      collectEventDefinitions(spec as unknown as OpenAPIV3_1.Document).map(
        (e) => [e.type, e.name, e.object],
      ),
    ).toEqual([
      ["members.created", "MemberCreatedEvent", "Member"],
      ["members.deleted", "MemberDeletedEvent", "Member"],
      ["members.updated", "MemberUpdatedEvent", "Member"],
      ["readers.created", "ReaderCreatedEvent", "Reader"],
      ["readers.deleted", "ReaderDeletedEvent", "Reader"],
    ]);
  });
  it("generates deterministic callback maps and typed factories", async () => {
    const dir = await mkdtemp(join(tmpdir(), "sumup-events-"));
    try {
      await generateEvents(spec as unknown as OpenAPIV3_1.Document, dir);
      const first = await readFile(join(dir, "events.ts"), "utf8");
      await generateEvents(spec as unknown as OpenAPIV3_1.Document, dir);
      expect(await readFile(join(dir, "events.ts"), "utf8")).toBe(first);
      expect(first).toContain('"members.updated": MemberUpdatedEvent');
      expect(first).toContain("new ReaderDeletedEvent(payload, client)");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
  it.each(["operation", "object", "schema", "duplicate"])(
    "rejects invalid %s definitions",
    (kind) => {
      const copy = structuredClone(spec) as unknown as OpenAPIV3_1.Document;
      const item = copy.webhooks?.["members.updated"];
      if (!item || "$ref" in item || !item.post)
        throw new Error("missing fixture");
      if (kind === "operation") delete item.post.operationId;
      if (kind === "object")
        Object.assign(item.post, {
          "x-object": { $ref: "external.json#/Member" },
        });
      if (kind === "schema" && copy.components?.schemas)
        delete copy.components.schemas.Member;
      if (kind === "duplicate" && copy.webhooks) copy.webhooks.duplicate = item;
      expect(() => collectEventDefinitions(copy)).toThrow();
    },
  );
});
