/**
 * Field-list ↔ JSON Schema for structured extraction nodes.
 *
 * Users describe what to extract as a list of named fields; the node still
 * stores (and the backend still receives) a JSON Schema string. Schemas that
 * use constructs the builder cannot show round-trip through the raw editor.
 */

export type SchemaFieldType =
  | "string"
  | "number"
  | "integer"
  | "boolean"
  | "date"
  | "string[]"
  | "number[]"
  | "object"
  | "object[]";

export type SchemaField = {
  id: string;
  name: string;
  type: SchemaFieldType;
  description?: string;
  required: boolean;
  /** Sub-fields for `object` and `object[]`. */
  fields?: SchemaField[];
};

export const SCHEMA_FIELD_TYPE_LABELS: Record<SchemaFieldType, string> = {
  string: "Text",
  number: "Number",
  integer: "Whole number",
  boolean: "Yes / no",
  date: "Date",
  "string[]": "List of text",
  "number[]": "List of numbers",
  object: "Group of fields",
  "object[]": "Table (rows of fields)",
};

export function newSchemaField(
  partial: Partial<SchemaField> = {},
): SchemaField {
  return {
    id: partial.id ?? Math.random().toString(36).slice(2, 10),
    name: partial.name ?? "",
    type: partial.type ?? "string",
    description: partial.description,
    required: partial.required ?? true,
    fields: partial.fields,
  };
}

type JsonSchema = Record<string, unknown>;

function propertyFor(field: SchemaField): JsonSchema {
  const base: JsonSchema = {};
  if (field.description?.trim()) base.description = field.description.trim();
  switch (field.type) {
    case "string":
      return { type: "string", ...base };
    case "number":
      return { type: "number", ...base };
    case "integer":
      return { type: "integer", ...base };
    case "boolean":
      return { type: "boolean", ...base };
    case "date":
      return { type: "string", format: "date", ...base };
    case "string[]":
      return { type: "array", items: { type: "string" }, ...base };
    case "number[]":
      return { type: "array", items: { type: "number" }, ...base };
    case "object":
      return { ...objectSchema(field.fields ?? []), ...base };
    case "object[]":
      return {
        type: "array",
        items: objectSchema(field.fields ?? []),
        ...base,
      };
  }
}

function objectSchema(fields: SchemaField[]): JsonSchema {
  const named = fields.filter((field) => field.name.trim());
  const properties: Record<string, JsonSchema> = {};
  for (const field of named) properties[field.name.trim()] = propertyFor(field);
  const required = named
    .filter((field) => field.required)
    .map((field) => field.name.trim());
  const schema: JsonSchema = {
    type: "object",
    properties,
    additionalProperties: false,
  };
  if (required.length) schema.required = required;
  return schema;
}

/** Serialize fields to the JSON Schema string the node stores. */
export function fieldsToSchemaString(fields: SchemaField[]): string {
  return JSON.stringify(objectSchema(fields), null, 2);
}

function typeFrom(schema: JsonSchema): SchemaFieldType | null {
  const type = schema.type;
  if (type === "string") return schema.format === "date" ? "date" : "string";
  if (type === "number") return "number";
  if (type === "integer") return "integer";
  if (type === "boolean") return "boolean";
  if (type === "object") return "object";
  if (type === "array") {
    const items = schema.items as JsonSchema | undefined;
    if (!items || typeof items !== "object") return null;
    if (items.type === "string") return "string[]";
    if (items.type === "number" || items.type === "integer") return "number[]";
    if (items.type === "object") return "object[]";
    return null;
  }
  return null;
}

function fieldsFrom(schema: JsonSchema): SchemaField[] | null {
  const properties = schema.properties;
  if (!properties || typeof properties !== "object") return null;
  const required = new Set(
    Array.isArray(schema.required) ? (schema.required as string[]) : [],
  );
  const fields: SchemaField[] = [];
  for (const [name, raw] of Object.entries(
    properties as Record<string, unknown>,
  )) {
    if (!raw || typeof raw !== "object") return null;
    const prop = raw as JsonSchema;
    const type = typeFrom(prop);
    if (!type) return null;
    let children: SchemaField[] | undefined;
    if (type === "object") {
      children = fieldsFrom(prop) ?? undefined;
      if (!children) return null;
    } else if (type === "object[]") {
      children = fieldsFrom(prop.items as JsonSchema) ?? undefined;
      if (!children) return null;
    }
    fields.push(
      newSchemaField({
        name,
        type,
        description:
          typeof prop.description === "string" ? prop.description : undefined,
        required: required.has(name),
        fields: children,
      }),
    );
  }
  return fields;
}

/**
 * Parse a stored schema into builder fields. Returns `null` when the JSON is
 * invalid or uses constructs the builder cannot represent (enums, oneOf…).
 */
export function schemaStringToFields(
  value: string | undefined | null,
): SchemaField[] | null {
  if (!value || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    const schema = parsed as JsonSchema;
    if (schema.type !== "object") return null;
    return fieldsFrom(schema);
  } catch {
    return null;
  }
}

export type SchemaPreset = {
  id: string;
  label: string;
  hint: string;
  fields: SchemaField[];
};

const f = (
  name: string,
  type: SchemaFieldType,
  description?: string,
  extra: Partial<SchemaField> = {},
) => newSchemaField({ name, type, description, required: true, ...extra });

export const SCHEMA_PRESETS: SchemaPreset[] = [
  {
    id: "invoice",
    label: "Invoice",
    hint: "Vendor, totals, line items",
    fields: [
      f("invoice_number", "string"),
      f("vendor", "string", "Company issuing the invoice"),
      f("date", "date"),
      f("currency", "string", "ISO code, e.g. USD"),
      f("total", "number", "Grand total including tax"),
      f("line_items", "object[]", undefined, {
        required: false,
        fields: [
          f("description", "string"),
          f("quantity", "number"),
          f("amount", "number"),
        ],
      }),
    ],
  },
  {
    id: "receipt",
    label: "Receipt",
    hint: "Merchant, date, total, items",
    fields: [
      f("merchant", "string"),
      f("date", "date"),
      f("total", "number"),
      f("payment_method", "string", undefined, { required: false }),
      f("items", "object[]", undefined, {
        required: false,
        fields: [f("name", "string"), f("price", "number")],
      }),
    ],
  },
  {
    id: "contact",
    label: "Contact",
    hint: "Name, email, phone, address",
    fields: [
      f("name", "string"),
      f("email", "string", undefined, { required: false }),
      f("phone", "string", undefined, { required: false }),
      f("address", "string", undefined, { required: false }),
    ],
  },
  {
    id: "table",
    label: "Table rows",
    hint: "One row per record",
    fields: [
      f("rows", "object[]", "Every row of the table", {
        fields: [f("column_1", "string"), f("column_2", "string")],
      }),
    ],
  },
  {
    id: "summary",
    label: "Summary",
    hint: "Title, summary, keywords",
    fields: [
      f("title", "string"),
      f("summary", "string", "2–3 sentences"),
      f("keywords", "string[]"),
    ],
  },
];
