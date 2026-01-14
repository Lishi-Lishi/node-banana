"use client";

import { useState, useEffect, useCallback } from "react";
import { ProviderType, ModelInputDef } from "@/types";
import { ModelParameter } from "@/lib/providers/types";
import { useWorkflowStore } from "@/store/workflowStore";

interface ModelParametersProps {
  modelId: string;
  provider: ProviderType;
  parameters: Record<string, unknown>;
  onParametersChange: (parameters: Record<string, unknown>) => void;
  onExpandChange?: (expanded: boolean, parameterCount: number) => void;
  onInputsLoaded?: (inputs: ModelInputDef[]) => void;
}

/**
 * Collapsible parameter inputs for external provider models.
 * Fetches schema from /api/models/{modelId}?provider={provider}
 * and renders appropriate inputs based on parameter types.
 */
export function ModelParameters({
  modelId,
  provider,
  parameters,
  onParametersChange,
  onExpandChange,
  onInputsLoaded,
}: ModelParametersProps) {
  const [schema, setSchema] = useState<ModelParameter[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);
  const providerSettings = useWorkflowStore((state) => state.providerSettings);

  // Fetch schema when modelId changes
  useEffect(() => {
    if (!modelId || provider === "gemini") {
      setSchema([]);
      onInputsLoaded?.([]);
      return;
    }

    const fetchSchema = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const headers: HeadersInit = {};
        if (providerSettings.providers.replicate?.apiKey) {
          headers["X-Replicate-Key"] = providerSettings.providers.replicate.apiKey;
        }
        if (providerSettings.providers.fal?.apiKey) {
          headers["X-Fal-Key"] = providerSettings.providers.fal.apiKey;
        }

        const encodedModelId = encodeURIComponent(modelId);
        const response = await fetch(
          `/api/models/${encodedModelId}?provider=${provider}`,
          { headers }
        );

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || `Failed to fetch schema: ${response.status}`);
        }

        const data = await response.json();
        const params = data.parameters || [];
        setSchema(params);

        // Pass inputs to parent for dynamic handle rendering
        if (data.inputs && onInputsLoaded) {
          onInputsLoaded(data.inputs);
        }
      } catch (err) {
        console.error("Failed to fetch model schema:", err);
        setError(err instanceof Error ? err.message : "Failed to fetch schema");
        setSchema([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSchema();
  }, [modelId, provider, providerSettings, onInputsLoaded]);

  // Notify parent to resize node when schema loads and panel is expanded
  useEffect(() => {
    if (isExpanded && schema.length > 0 && onExpandChange) {
      onExpandChange(true, schema.length);
    }
  }, [schema, isExpanded, onExpandChange]);

  const handleParameterChange = useCallback(
    (name: string, value: unknown) => {
      // Create new parameters object with updated value
      const newParams = { ...parameters };

      // If value is empty/undefined, remove the parameter
      if (value === "" || value === undefined || value === null) {
        delete newParams[name];
      } else {
        newParams[name] = value;
      }

      onParametersChange(newParams);
    },
    [parameters, onParametersChange]
  );

  // Don't render anything for Gemini or if no model selected
  if (provider === "gemini" || !modelId) {
    return null;
  }

  // Don't render if no schema available and not loading
  if (!isLoading && schema.length === 0 && !error) {
    return null;
  }

  return (
    <div className="shrink-0">
      {/* Collapsible header */}
      <button
        onClick={() => {
          const newExpanded = !isExpanded;
          setIsExpanded(newExpanded);
          onExpandChange?.(newExpanded, schema.length);
        }}
        className="w-full flex items-center justify-between text-[10px] text-neutral-400 hover:text-neutral-300 transition-colors py-0.5"
      >
        <span className="flex items-center gap-1">
          <svg
            className={`w-2.5 h-2.5 transition-transform ${isExpanded ? "rotate-90" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
          Parameters
          {Object.keys(parameters).length > 0 && (
            <span className="text-neutral-500">({Object.keys(parameters).length})</span>
          )}
        </span>
        {isLoading && (
          <svg className="w-2.5 h-2.5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="3"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
      </button>

      {/* Parameter inputs (when expanded) */}
      {isExpanded && (
        <div className="mt-1 space-y-1.5">
          {error ? (
            <span className="text-[9px] text-red-400">{error}</span>
          ) : isLoading ? (
            <span className="text-[9px] text-neutral-500">Loading parameters...</span>
          ) : schema.length === 0 ? (
            <span className="text-[9px] text-neutral-500">No parameters available</span>
          ) : (
            schema.map((param) => (
              <ParameterInput
                key={param.name}
                param={param}
                value={parameters[param.name]}
                onChange={(value) => handleParameterChange(param.name, value)}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

interface ParameterInputProps {
  param: ModelParameter;
  value: unknown;
  onChange: (value: unknown) => void;
}

/**
 * Individual parameter input based on type
 */
function ParameterInput({ param, value, onChange }: ParameterInputProps) {
  const displayName = param.name
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  // Determine input type and render accordingly
  if (param.enum && param.enum.length > 0) {
    // Enum: render as select
    return (
      <div className="flex flex-col gap-0.5">
        <label
          className="text-[9px] text-neutral-400"
          title={param.description || undefined}
        >
          {displayName}
        </label>
        <select
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value || undefined)}
          className="w-full text-[9px] py-0.5 px-1 border border-neutral-700 rounded bg-neutral-900/50 focus:outline-none focus:ring-1 focus:ring-neutral-600 text-neutral-300"
        >
          <option value="">Default</option>
          {param.enum.map((opt) => (
            <option key={String(opt)} value={String(opt)}>
              {String(opt)}
            </option>
          ))}
        </select>
      </div>
    );
  }

  if (param.type === "boolean") {
    // Use schema default when value not explicitly set
    const effectiveValue = value !== undefined ? Boolean(value) : Boolean(param.default);

    // Boolean: render as checkbox
    return (
      <label
        className="flex items-center gap-1.5 text-[9px] text-neutral-400 cursor-pointer"
        title={param.description || undefined}
      >
        <input
          type="checkbox"
          checked={effectiveValue}
          onChange={(e) => onChange(e.target.checked)}
          className="w-2.5 h-2.5 rounded border-neutral-700 bg-neutral-900/50 text-neutral-600 focus:ring-1 focus:ring-neutral-600 focus:ring-offset-0"
        />
        <span>{displayName}</span>
      </label>
    );
  }

  if (param.type === "number" || param.type === "integer") {
    // Number: render as number input with validation
    const numValue = value !== undefined ? Number(value) : "";
    const hasMin = param.minimum !== undefined;
    const hasMax = param.maximum !== undefined;

    // Validate current value against constraints
    let validationError: string | null = null;
    if (value !== undefined && value !== "" && !isNaN(Number(value))) {
      const num = Number(value);
      if (hasMin && num < param.minimum!) {
        validationError = `Min: ${param.minimum}`;
      } else if (hasMax && num > param.maximum!) {
        validationError = `Max: ${param.maximum}`;
      } else if (param.type === "integer" && !Number.isInteger(num)) {
        validationError = "Must be integer";
      }
    }

    return (
      <div className="flex flex-col gap-0.5">
        <label
          className="text-[9px] text-neutral-400 flex items-center gap-1"
          title={param.description || undefined}
        >
          {displayName}
          {hasMin && hasMax && (
            <span className="text-neutral-500">
              ({param.minimum}-{param.maximum})
            </span>
          )}
        </label>
        <input
          type="number"
          value={numValue}
          min={param.minimum}
          max={param.maximum}
          step={param.type === "integer" ? 1 : 0.1}
          onChange={(e) => {
            const val = e.target.value;
            if (val === "") {
              onChange(undefined);
            } else {
              const num = param.type === "integer" ? parseInt(val, 10) : parseFloat(val);
              onChange(isNaN(num) ? undefined : num);
            }
          }}
          placeholder={param.default !== undefined ? `Default: ${param.default}` : undefined}
          className={`w-full text-[9px] py-0.5 px-1 border rounded bg-neutral-900/50 focus:outline-none focus:ring-1 text-neutral-300 placeholder:text-neutral-600 ${
            validationError
              ? "border-red-500 focus:ring-red-500"
              : "border-neutral-700 focus:ring-neutral-600"
          }`}
        />
        {validationError && (
          <span className="text-[8px] text-red-400">{validationError}</span>
        )}
      </div>
    );
  }

  // Skip array type for now (complex)
  if (param.type === "array") {
    return null;
  }

  // Default: string input
  return (
    <div className="flex flex-col gap-0.5">
      <label
        className="text-[9px] text-neutral-400"
        title={param.description || undefined}
      >
        {displayName}
      </label>
      <input
        type="text"
        value={(value as string) ?? ""}
        onChange={(e) => onChange(e.target.value || undefined)}
        placeholder={param.default !== undefined ? `Default: ${param.default}` : undefined}
        className="w-full text-[9px] py-0.5 px-1 border border-neutral-700 rounded bg-neutral-900/50 focus:outline-none focus:ring-1 focus:ring-neutral-600 text-neutral-300 placeholder:text-neutral-600"
      />
    </div>
  );
}
