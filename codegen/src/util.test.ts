/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, you can obtain one at https://mozilla.org/MPL/2.0/.
 *
 * Copyright Oxide Computer Company
 */

import { expect, test } from "@rstest/core";
import {
  docComment,
  extractDoc,
  pathToTemplateStr,
  topologicalSort,
} from "./util";

test("pathToTemplateStr", () => {
  expect(
    pathToTemplateStr("/projects/{project_name}/disks/{disk_name}"),
  ).toEqual(`\`/projects/\${projectName}/disks/\${diskName}\``);
});

test("topologicalSort", () => {
  expect(
    topologicalSort([
      ["a", ["b", "c"]],
      ["b", ["c"]],
      ["c", undefined],
      ["d", []],
    ]),
  ).toEqual(["c", "b", "a", "d"]);
});

test("extractDoc does not include @readonly for readOnly fields", () => {
  expect(
    extractDoc({
      type: "string",
      description: "Read-only identifier",
      readOnly: true,
    }),
  ).not.toContain("@readonly");
});

test("extractDoc includes numeric bounds, zero defaults, and allOf constraints", () => {
  expect(
    extractDoc({
      description: "Amount",
      minimum: 0,
      maximum: 100,
      exclusiveMinimum: -1,
      exclusiveMaximum: 101,
      multipleOf: 0.01,
      default: 0,
      allOf: [{ minimum: 5 }],
    }),
  ).toBe(
    "Amount\n\nDefault: 0\n\nMin: 0\n\nExclusive min: -1\n\nMax: 100\n\nExclusive max: 101\n\nMultiple of: 0.01\n\nMin: 5",
  );
});

test("extractDoc includes string, array, and object metadata", () => {
  expect(
    extractDoc({
      type: "object",
      minProperties: 0,
      maxProperties: 3,
    }),
  ).toBe("Min properties: 0\n\nMax properties: 3");
  expect(
    extractDoc({
      type: "string",
      writeOnly: true,
      format: "password",
      minLength: 0,
      maxLength: 20,
      pattern: "^[a-z]+$",
      default: "abc",
    }),
  ).toBe(
    'Write only\n\nFormat: password\n\nDefault: "abc"\n\nMin length: 0\n\nMax length: 20\n\nPattern: ^[a-z]+$',
  );
  expect(
    extractDoc({
      type: "array",
      items: { type: "string" },
      minItems: 0,
      maxItems: 5,
      uniqueItems: true,
    }),
  ).toBe("Unique items only\n\nMin items: 0\n\nMax items: 5");
  expect(extractDoc({ default: false })).toBe("Default: false");
  expect(extractDoc({ default: null })).toBe("Default: null");
  expect(extractDoc({ default: { enabled: true } })).toBe(
    'Default: {"enabled":true}',
  );
  expect(extractDoc({})).toBe("");
});

test("docComment escapes comment terminators in patterns and defaults", () => {
  expect(docComment(extractDoc({ pattern: "a*/b" }))).toBe(
    "/**\n * Pattern: a*\\/b\n */",
  );
});
