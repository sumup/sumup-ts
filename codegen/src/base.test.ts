import { expect, test } from "vitest";
import { queryParameterName } from "./base";

test("removes a bracket suffix from repeated query parameter names", () => {
  expect(
    queryParameterName({
      in: "query",
      name: "statuses[]",
      schema: { type: "array", items: { type: "string" } },
    }),
  ).toBe("statuses");
});

test("preserves bracket suffixes on non-array query parameter names", () => {
  expect(
    queryParameterName({
      in: "query",
      name: "filter[]",
      schema: { type: "string" },
    }),
  ).toBe("filter[]");
});

test("preserves array query parameter names without a bracket suffix", () => {
  expect(
    queryParameterName({
      in: "query",
      name: "include",
      schema: { type: "array", items: { type: "string" } },
    }),
  ).toBe("include");
});

test("normalizes array query parameters with a 3.1 type union", () => {
  expect(
    queryParameterName({
      in: "query",
      name: "statuses[]",
      schema: {
        type: ["array", "null"],
        items: { type: "string" },
      },
    }),
  ).toBe("statuses");
});
