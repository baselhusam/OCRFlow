import { describe, expect, it } from "vitest";

import {
  fieldsToSchemaString,
  newSchemaField,
  SCHEMA_PRESETS,
  schemaStringToFields,
} from "@/lib/canvas/json-schema-fields";

describe("json-schema-fields", () => {
  it("serializes fields to a strict object schema", () => {
    const schema = JSON.parse(
      fieldsToSchemaString([
        newSchemaField({
          name: "total",
          type: "number",
          required: true,
          description: "Grand total",
        }),
        newSchemaField({ name: "date", type: "date", required: false }),
        newSchemaField({ name: "tags", type: "string[]", required: false }),
        newSchemaField({
          name: "items",
          type: "object[]",
          required: true,
          fields: [
            newSchemaField({ name: "name", type: "string", required: true }),
          ],
        }),
        newSchemaField({ name: "", type: "string", required: true }), // unnamed → dropped
      ]),
    );
    expect(schema).toEqual({
      type: "object",
      additionalProperties: false,
      required: ["total", "items"],
      properties: {
        total: { type: "number", description: "Grand total" },
        date: { type: "string", format: "date" },
        tags: { type: "array", items: { type: "string" } },
        items: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["name"],
            properties: { name: { type: "string" } },
          },
        },
      },
    });
  });

  it("round-trips every preset", () => {
    for (const preset of SCHEMA_PRESETS) {
      const text = fieldsToSchemaString(preset.fields);
      const back = schemaStringToFields(text);
      expect(back, preset.id).not.toBeNull();
      expect(fieldsToSchemaString(back!)).toBe(text);
    }
  });

  it("refuses schemas the builder cannot show", () => {
    expect(schemaStringToFields("not json")).toBeNull();
    expect(
      schemaStringToFields(
        JSON.stringify({
          type: "object",
          properties: { kind: { enum: ["a", "b"] } },
        }),
      ),
    ).toBeNull();
    expect(schemaStringToFields(JSON.stringify({ type: "array" }))).toBeNull();
    expect(schemaStringToFields("")).toEqual([]);
  });
});
