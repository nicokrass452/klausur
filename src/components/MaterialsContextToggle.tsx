import { FileText } from "lucide-react";
import type { MaterialContextMeta } from "../services/aiService";

interface MaterialsContextToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  /** Optional label override (defaults to the German string). */
  label?: string;
  /** Material context metadata from the last AI call, to show a usage badge. */
  materialContext?: MaterialContextMeta;
}

/**
 * Toggle that opts the current AI action into retrieving the user's uploaded
 * material chunks. Shows a badge when the last call actually used material
 * context so the user can verify the coach consulted their notes/PDFs.
 */
export function MaterialsContextToggle({
  checked,
  onChange,
  disabled,
  label = "Hochgeladene Materialien nutzen",
  materialContext
}: MaterialsContextToggleProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <label className={`inline-flex items-center gap-2 text-sm font-medium ${disabled ? "cursor-not-allowed text-slate-400" : "cursor-pointer text-slate-700 dark:text-slate-200"}`}>
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(event) => onChange(event.target.checked)}
          className="size-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500 dark:border-slate-600 dark:bg-slate-900"
        />
        <FileText size={15} aria-hidden="true" />
        {label}
      </label>
      {materialContext?.used ? (
        <span
          className="inline-flex items-center gap-1 rounded-full bg-teal-100 px-2 py-1 text-xs font-semibold text-teal-700 dark:bg-teal-500/15 dark:text-teal-300"
          role="status"
          aria-live="polite"
        >
          {materialContext.chunkCount} {materialContext.chunkCount === 1 ? "Chunk" : "Chunks"} aus deinen Materialien
          {materialContext.examScoped ? " (diese Klausur)" : ""}
        </span>
      ) : null}
    </div>
  );
}
