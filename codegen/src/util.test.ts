/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, you can obtain one at https://mozilla.org/MPL/2.0/.
 *
 * Copyright Oxide Computer Company
 */

import { expect, test } from "vitest";
import { extractDoc, pathToTemplateStr, topologicalSort } from "./util";

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
