import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "@rstest/core";
import { collectEventDefinitions, generateEvents } from "./events";
import type { Document } from "./openapi";

const spec = {
  openapi: "3.1.0",
  info: { title: "Events", version: "test" },
  components: {
    schemas: {
      Widget: { type: "object" },
      Device: { type: "object" },
    },
  },
  webhooks: {
    "widgets.updated": {
      post: {
        operationId: "WidgetChangedWebhook",
        "x-object": { $ref: "#/components/schemas/Widget" },
        responses: { "204": { description: "Accepted" } },
      },
    },
    "devices.deleted": {
      post: {
        operationId: "DeviceDeletedWebhook",
        "x-object": { $ref: "#/components/schemas/Device" },
        responses: { "204": { description: "Accepted" } },
      },
    },
  },
} as Document;

describe("event generation", () => {
  it("uses wire names and resource types from the schema", () => {
    expect(
      collectEventDefinitions(spec).map((e) => [e.type, e.name, e.object]),
    ).toEqual([
      ["devices.deleted", "DeviceDeletedEvent", "Device"],
      ["widgets.updated", "WidgetChangedEvent", "Widget"],
    ]);
  });
  it("generates deterministic callback maps and typed factories", async () => {
    const dir = await mkdtemp(join(tmpdir(), "sumup-events-"));
    try {
      await generateEvents(spec, dir);
      const first = await readFile(join(dir, "events.ts"), "utf8");
      await generateEvents(spec, dir);
      expect(await readFile(join(dir, "events.ts"), "utf8")).toBe(first);
      expect(first).toContain('"widgets.updated": WidgetChangedEvent');
      expect(first).toContain("new DeviceDeletedEvent(payload, client)");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
  it.each(["operation", "object", "schema", "duplicate"])(
    "rejects invalid %s definitions",
    (kind) => {
      const copy = structuredClone(spec);
      const item = copy.webhooks?.["widgets.updated"];
      if (!item || "$ref" in item || !item.post)
        throw new Error("missing fixture");
      if (kind === "operation") delete item.post.operationId;
      if (kind === "object")
        Object.assign(item.post, {
          "x-object": { $ref: "external.json#/Widget" },
        });
      if (kind === "schema" && copy.components?.schemas)
        delete copy.components.schemas.Widget;
      if (kind === "duplicate" && copy.webhooks) copy.webhooks.duplicate = item;
      expect(() => collectEventDefinitions(copy)).toThrow();
    },
  );
});
