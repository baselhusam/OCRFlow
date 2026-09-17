"use client";

import {
  Braces,
  ChevronDown,
  ChevronRight,
  GripVertical,
  Plus,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";

import { Label } from "@/components/ui/label";
import {
  fieldsToSchemaString,
  newSchemaField,
  SCHEMA_FIELD_TYPE_LABELS,
  SCHEMA_PRESETS,
  schemaStringToFields,
  type SchemaField,
  type SchemaFieldType,
} from "@/lib/canvas/json-schema-fields";
import { cn } from "@/lib/utils";

type SchemaBuilderFieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: (schema: string) => void;
  className?: string;
};

const TYPE_ORDER: SchemaFieldType[] = [
  "string",
  "number",
  "integer",
  "boolean",
  "date",
  "string[]",
  "number[]",
  "object",
  "object[]",
];

function hasChildren(type: SchemaFieldType): boolean {
  return type === "object" || type === "object[]";
}

function replaceAt<T>(list: T[], index: number, next: T): T[] {
  return list.map((entry, i) => (i === index ? next : entry));
}

function FieldRow({
  field,
  depth,
  onChange,
  onRemove,
}: {
  field: SchemaField;
  depth: number;
  onChange: (next: SchemaField) => void;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(true);
  const [showDescription, setShowDescription] = useState(
    Boolean(field.description),
  );
  const nested = hasChildren(field.type);

  return (
    <div
      className={cn(
        "rounded-md border border-border/60 bg-card",
        depth > 0 && "border-dashed bg-muted/10",
      )}
    >
      <div className="space-y-1 px-1.5 py-1.5">
        {/* Line 1: name */}
        <div className="flex items-center gap-1.5">
          {nested ? (
            <button
              type="button"
              aria-label={open ? "Collapse fields" : "Expand fields"}
              className="flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground hover:text-foreground"
              onClick={() => setOpen((v) => !v)}
            >
              {open ? (
                <ChevronDown className="size-3" />
              ) : (
                <ChevronRight className="size-3" />
              )}
            </button>
          ) : (
            <GripVertical
              className="size-3.5 shrink-0 text-muted-foreground/40"
              aria-hidden
            />
          )}
          <input
            type="text"
            value={field.name}
            placeholder="field_name"
            spellCheck={false}
            aria-label="Field name"
            onChange={(event) =>
              onChange({
                ...field,
                name: event.target.value.replace(/\s+/g, "_"),
              })
            }
            className="h-7 min-w-0 flex-1 rounded-md border border-input bg-transparent px-2 font-mono text-[11px] text-foreground outline-none placeholder:text-muted-foreground/60 focus-visible:border-ring focus-visible:ring-[2px] focus-visible:ring-ring/40"
          />
          <button
            type="button"
            aria-label="Remove field"
            onClick={onRemove}
            className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>

        {/* Line 2: type · required · hint */}
        <div className="flex items-center gap-1.5 pl-5">
          <select
            value={field.type}
            aria-label="Field type"
            onChange={(event) => {
              const type = event.target.value as SchemaFieldType;
              onChange({
                ...field,
                type,
                fields: hasChildren(type)
                  ? (field.fields ?? [newSchemaField()])
                  : undefined,
              });
            }}
            className="h-7 min-w-0 flex-1 rounded-md border border-input bg-transparent px-1.5 text-[11px] text-foreground outline-none focus-visible:border-ring"
          >
            {TYPE_ORDER.map((type) => (
              <option key={type} value={type}>
                {SCHEMA_FIELD_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
          <button
            type="button"
            role="switch"
            aria-checked={field.required}
            aria-label="Required"
            title={
              field.required
                ? "Required — click to make optional"
                : "Optional — click to require"
            }
            onClick={() => onChange({ ...field, required: !field.required })}
            className={cn(
              "h-7 shrink-0 rounded-md border px-2 text-[10px] font-medium transition-colors",
              field.required
                ? "border-[var(--pulse)]/40 bg-[var(--pulse)]/10 text-[var(--pulse)]"
                : "border-border/60 text-muted-foreground hover:text-foreground",
            )}
          >
            {field.required ? "Required" : "Optional"}
          </button>
          <button
            type="button"
            aria-label="Description"
            title="Add a hint for the model"
            onClick={() => setShowDescription((v) => !v)}
            className={cn(
              "flex size-7 shrink-0 items-center justify-center rounded-md border border-transparent text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground",
              showDescription && "border-border/60 text-foreground",
            )}
          >
            <span className="font-serif text-[13px] italic leading-none">
              i
            </span>
          </button>
        </div>
      </div>

      {showDescription && (
        <div className="px-1.5 pb-1.5">
          <input
            type="text"
            value={field.description ?? ""}
            placeholder="Hint for the model, e.g. “grand total including tax”"
            aria-label="Field description"
            onChange={(event) =>
              onChange({ ...field, description: event.target.value })
            }
            className="h-7 w-full rounded-md border border-input bg-transparent px-2 text-[11px] text-foreground outline-none placeholder:text-muted-foreground/60 focus-visible:border-ring"
          />
        </div>
      )}

      {nested && open && (
        <div className="space-y-1 border-t border-border/50 py-1.5 pr-1.5 pl-4">
          <FieldList
            fields={field.fields ?? []}
            depth={depth + 1}
            onChange={(fields) => onChange({ ...field, fields })}
          />
        </div>
      )}
    </div>
  );
}

function FieldList({
  fields,
  depth,
  onChange,
}: {
  fields: SchemaField[];
  depth: number;
  onChange: (fields: SchemaField[]) => void;
}) {
  return (
    <>
      {fields.map((field, index) => (
        <FieldRow
          key={field.id}
          field={field}
          depth={depth}
          onChange={(next) => onChange(replaceAt(fields, index, next))}
          onRemove={() => onChange(fields.filter((_, i) => i !== index))}
        />
      ))}
      <button
        type="button"
        onClick={() => onChange([...fields, newSchemaField()])}
        className="flex h-7 w-full items-center justify-center gap-1 rounded-md border border-dashed border-border/70 text-[11px] text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
      >
        <Plus className="size-3" />
        {depth > 0 ? "Add sub-field" : "Add field"}
      </button>
    </>
  );
}

/**
 * Structured-extraction schema as a list of fields instead of a JSON Schema
 * textarea. The stored value stays a JSON Schema string; "Raw JSON" is there
 * for anything the builder cannot express.
 */
export function SchemaBuilderField({
  id,
  label,
  value,
  onChange,
  className,
}: SchemaBuilderFieldProps) {
  const parsed = useMemo(() => schemaStringToFields(value), [value]);
  const [mode, setMode] = useState<"fields" | "json">(
    parsed === null ? "json" : "fields",
  );
  const [draft, setDraft] = useState<string | null>(null);
  // Fields live in local state so a freshly added (still unnamed) field is
  // visible even though it does not serialize into the schema yet. Re-sync
  // only when the stored value changes from outside (another node, JSON tab).
  const [local, setLocal] = useState<{ fields: SchemaField[]; from: string }>(
    () => ({ fields: parsed ?? [], from: value }),
  );
  const fields =
    local.from === value ? local.fields : (parsed ?? local.fields);
  const jsonText = draft ?? (value || "");
  const jsonInvalid = useMemo(() => {
    if (!jsonText.trim()) return false;
    try {
      JSON.parse(jsonText);
      return false;
    } catch {
      return true;
    }
  }, [jsonText]);

  const commitFields = (next: SchemaField[]) => {
    const serialized = fieldsToSchemaString(next);
    setLocal({ fields: next, from: serialized });
    onChange(serialized);
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between gap-2">
        <Label
          htmlFor={id}
          className="font-mono text-[10px] tracking-wide text-muted-foreground uppercase"
        >
          {label}
        </Label>
        <div className="flex gap-0.5 rounded-md border border-border/60 bg-muted/30 p-0.5">
          <button
            type="button"
            disabled={parsed === null}
            title={
              parsed === null
                ? "This schema uses features the builder can't show"
                : undefined
            }
            onClick={() => setMode("fields")}
            className={cn(
              "rounded-[5px] px-2 py-0.5 text-[10px] font-medium transition-colors disabled:opacity-40",
              mode === "fields"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Fields
          </button>
          <button
            type="button"
            onClick={() => setMode("json")}
            className={cn(
              "flex items-center gap-1 rounded-[5px] px-2 py-0.5 text-[10px] font-medium transition-colors",
              mode === "json"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Braces className="size-3" />
            JSON
          </button>
        </div>
      </div>

      {mode === "fields" ? (
        <div className="space-y-1.5">
          {fields.length === 0 && (
            <div className="rounded-md border border-dashed border-border/70 bg-muted/15 p-2.5">
              <p className="text-[11px] text-muted-foreground">
                What should the model pull out? Start from a preset or add
                fields.
              </p>
              <div className="mt-2 flex flex-wrap gap-1">
                {SCHEMA_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    title={preset.hint}
                    onClick={() =>
                      commitFields(
                        preset.fields.map((field) =>
                          newSchemaField({ ...field }),
                        ),
                      )
                    }
                    className="rounded-md border border-border/60 bg-card px-2 py-1 text-[11px] text-foreground transition-colors hover:border-[var(--pulse)]/50 hover:text-[var(--pulse)]"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          <FieldList fields={fields} depth={0} onChange={commitFields} />
        </div>
      ) : (
        <div className="space-y-1">
          <textarea
            id={id}
            rows={12}
            spellCheck={false}
            value={jsonText}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={() => {
              if (draft !== null && !jsonInvalid) {
                onChange(draft);
                setDraft(null);
              }
            }}
            className={cn(
              "w-full resize-y rounded-md border bg-transparent px-2.5 py-2 font-mono text-xs leading-relaxed text-foreground shadow-xs outline-none placeholder:text-muted-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50",
              jsonInvalid
                ? "border-destructive"
                : "border-input focus-visible:border-ring",
            )}
            placeholder='{ "type": "object", "properties": { … } }'
          />
          <p
            className={cn(
              "text-[10px]",
              jsonInvalid ? "text-destructive" : "text-muted-foreground",
            )}
          >
            {jsonInvalid
              ? "Not valid JSON — fix it to save."
              : "Saved when you leave the editor."}
          </p>
        </div>
      )}
    </div>
  );
}
