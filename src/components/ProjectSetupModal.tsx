"use client";

import { useState, useEffect } from "react";
import { generateWorkflowId, useWorkflowStore } from "@/store/workflowStore";
import { ProviderType, ProviderSettings } from "@/types";
import { EnvStatusResponse } from "@/app/api/env-status/route";

interface ProjectSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: string, name: string, directoryPath: string) => void;
  mode: "new" | "settings";
}

export function ProjectSetupModal({
  isOpen,
  onClose,
  onSave,
  mode,
}: ProjectSetupModalProps) {
  const {
    workflowName,
    saveDirectoryPath,
    useExternalImageStorage,
    setUseExternalImageStorage,
    providerSettings,
    updateProviderApiKey,
    toggleProvider,
  } = useWorkflowStore();

  // Tab state
  const [activeTab, setActiveTab] = useState<"project" | "providers">("project");

  // Project tab state
  const [name, setName] = useState("");
  const [directoryPath, setDirectoryPath] = useState("");
  const [externalStorage, setExternalStorage] = useState(true);
  const [isValidating, setIsValidating] = useState(false);
  const [isBrowsing, setIsBrowsing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Provider tab state
  const [localProviders, setLocalProviders] = useState<ProviderSettings>(providerSettings);
  const [showApiKey, setShowApiKey] = useState<Record<ProviderType, boolean>>({
    gemini: false,
    openai: false,
    replicate: false,
    fal: false,
  });
  const [overrideActive, setOverrideActive] = useState<Record<ProviderType, boolean>>({
    gemini: false,
    openai: false,
    replicate: false,
    fal: false,
  });
  const [envStatus, setEnvStatus] = useState<EnvStatusResponse | null>(null);

  // Pre-fill when opening in settings mode
  useEffect(() => {
    if (isOpen) {
      // Reset to project tab when opening
      if (mode === "new") {
        setActiveTab("project");
      }

      if (mode === "settings") {
        setName(workflowName || "");
        setDirectoryPath(saveDirectoryPath || "");
        setExternalStorage(useExternalImageStorage);
      } else if (mode === "new") {
        setName("");
        setDirectoryPath("");
        setExternalStorage(true);
      }

      // Sync local providers state
      setLocalProviders(providerSettings);
      setShowApiKey({ gemini: false, openai: false, replicate: false, fal: false });
      // Initialize override as active if user already has a key set
      setOverrideActive({
        gemini: !!providerSettings.providers.gemini?.apiKey,
        openai: !!providerSettings.providers.openai?.apiKey,
        replicate: !!providerSettings.providers.replicate?.apiKey,
        fal: !!providerSettings.providers.fal?.apiKey,
      });
      setError(null);

      // Fetch env status
      fetch("/api/env-status")
        .then((res) => res.json())
        .then((data: EnvStatusResponse) => setEnvStatus(data))
        .catch(() => setEnvStatus(null));
    }
  }, [isOpen, mode, workflowName, saveDirectoryPath, useExternalImageStorage, providerSettings]);

  const handleBrowse = async () => {
    setIsBrowsing(true);
    setError(null);

    try {
      const response = await fetch("/api/browse-directory");
      const result = await response.json();

      if (!result.success) {
        setError(result.error || "Failed to open directory picker");
        return;
      }

      if (result.cancelled) {
        return;
      }

      if (result.path) {
        setDirectoryPath(result.path);
      }
    } catch (err) {
      setError(
        `Failed to open directory picker: ${err instanceof Error ? err.message : "Unknown error"}`
      );
    } finally {
      setIsBrowsing(false);
    }
  };

  const handleSaveProject = async () => {
    if (!name.trim()) {
      setError("Project name is required");
      return;
    }

    if (!directoryPath.trim()) {
      setError("Project directory is required");
      return;
    }

    setIsValidating(true);
    setError(null);

    try {
      // Validate project directory exists
      const response = await fetch(
        `/api/workflow?path=${encodeURIComponent(directoryPath.trim())}`
      );
      const result = await response.json();

      if (!result.exists) {
        setError("Project directory does not exist");
        setIsValidating(false);
        return;
      }

      if (!result.isDirectory) {
        setError("Project path is not a directory");
        setIsValidating(false);
        return;
      }

      const id = mode === "new" ? generateWorkflowId() : useWorkflowStore.getState().workflowId || generateWorkflowId();
      // Update external storage setting
      setUseExternalImageStorage(externalStorage);
      onSave(id, name.trim(), directoryPath.trim());
      setIsValidating(false);
    } catch (err) {
      setError(
        `Failed to validate directory: ${err instanceof Error ? err.message : "Unknown error"}`
      );
      setIsValidating(false);
    }
  };

  const handleSaveProviders = () => {
    // Save each provider's settings
    const providerIds: ProviderType[] = ["gemini", "openai", "replicate", "fal"];
    for (const providerId of providerIds) {
      const local = localProviders.providers[providerId];
      const current = providerSettings.providers[providerId];

      if (!local || !current) continue;

      // Update enabled state if changed
      if (local.enabled !== current.enabled) {
        toggleProvider(providerId, local.enabled);
      }

      // Update API key if changed
      if (local.apiKey !== current.apiKey) {
        updateProviderApiKey(providerId, local.apiKey);
      }
    }
    onClose();
  };

  const handleSave = () => {
    if (activeTab === "project") {
      handleSaveProject();
    } else {
      handleSaveProviders();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isValidating && !isBrowsing) {
      handleSave();
    }
    if (e.key === "Escape") {
      onClose();
    }
  };

  const updateLocalProvider = (
    providerId: ProviderType,
    updates: { enabled?: boolean; apiKey?: string | null }
  ) => {
    setLocalProviders((prev) => ({
      providers: {
        ...prev.providers,
        [providerId]: {
          ...prev.providers[providerId],
          ...updates,
        },
      },
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50">
      <div
        className="bg-neutral-800 rounded-lg p-6 w-[480px] border border-neutral-700 shadow-xl"
        onKeyDown={handleKeyDown}
      >
        <h2 className="text-lg font-semibold text-neutral-100 mb-4">
          {mode === "new" ? "New Project" : "Project Settings"}
        </h2>

        {/* Tab Bar */}
        <div className="flex gap-4 border-b border-neutral-700 mb-4">
          <button
            onClick={() => setActiveTab("project")}
            className={`pb-2 text-sm ${activeTab === "project" ? "text-neutral-100 border-b-2 border-white" : "text-neutral-400"}`}
          >
            Project
          </button>
          <button
            onClick={() => setActiveTab("providers")}
            className={`pb-2 text-sm ${activeTab === "providers" ? "text-neutral-100 border-b-2 border-white" : "text-neutral-400"}`}
          >
            Providers
          </button>
        </div>

        {/* Project Tab Content */}
        {activeTab === "project" && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-neutral-400 mb-1">
                Project Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="my-project"
                autoFocus
                className="w-full px-3 py-2 bg-neutral-900 border border-neutral-600 rounded text-neutral-100 text-sm focus:outline-none focus:border-neutral-500"
              />
            </div>

            <div>
              <label className="block text-sm text-neutral-400 mb-1">
                Project Directory
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={directoryPath}
                  onChange={(e) => setDirectoryPath(e.target.value)}
                  placeholder="/Users/username/projects/my-project"
                  className="flex-1 px-3 py-2 bg-neutral-900 border border-neutral-600 rounded text-neutral-100 text-sm focus:outline-none focus:border-neutral-500"
                />
                <button
                  type="button"
                  onClick={handleBrowse}
                  disabled={isBrowsing}
                  className="px-3 py-2 bg-neutral-700 hover:bg-neutral-600 disabled:bg-neutral-700 disabled:opacity-50 text-neutral-200 text-sm rounded transition-colors"
                >
                  {isBrowsing ? "..." : "Browse"}
                </button>
              </div>
              <p className="text-xs text-neutral-500 mt-1">
                Workflow files and images will be saved here. Subfolders for inputs and generations will be auto-created.
              </p>
            </div>

            <div className="pt-2 border-t border-neutral-700">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!externalStorage}
                  onChange={(e) => setExternalStorage(!e.target.checked)}
                  className="w-4 h-4 rounded border-neutral-600 bg-neutral-900 text-blue-500 focus:ring-blue-500 focus:ring-offset-neutral-800"
                />
                <div>
                  <span className="text-sm text-neutral-200">Embed images as base64</span>
                  <p className="text-xs text-neutral-500">
                    Embeds all images in workflow, larger workflow files. Can hit memory limits on very large workflows.
                  </p>
                </div>
              </label>
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}
          </div>
        )}

        {/* Providers Tab Content */}
        {activeTab === "providers" && (
          <div className="space-y-3">
            {/* Gemini Provider */}
            <div className="p-3 bg-neutral-900 rounded-lg border border-neutral-700">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-neutral-100">Google Gemini</span>
                {envStatus?.gemini && !overrideActive.gemini ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-green-400">Configured via .env</span>
                    <button
                      type="button"
                      onClick={() => setOverrideActive((prev) => ({ ...prev, gemini: true }))}
                      className="px-2 py-1 text-xs text-neutral-400 hover:text-neutral-200 transition-colors"
                    >
                      Override
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <input
                      type={showApiKey.gemini ? "text" : "password"}
                      value={localProviders.providers.gemini?.apiKey || ""}
                      onChange={(e) => updateLocalProvider("gemini", { apiKey: e.target.value || null })}
                      placeholder="AIza..."
                      className="w-48 px-2 py-1 bg-neutral-800 border border-neutral-600 rounded text-neutral-100 text-xs focus:outline-none focus:border-neutral-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey((prev) => ({ ...prev, gemini: !prev.gemini }))}
                      className="text-xs text-neutral-400 hover:text-neutral-200"
                    >
                      {showApiKey.gemini ? "Hide" : "Show"}
                    </button>
                    {envStatus?.gemini && (
                      <button
                        type="button"
                        onClick={() => {
                          setOverrideActive((prev) => ({ ...prev, gemini: false }));
                          updateLocalProvider("gemini", { apiKey: null });
                        }}
                        className="text-xs text-neutral-500 hover:text-neutral-300"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* OpenAI Provider */}
            <div className="p-3 bg-neutral-900 rounded-lg border border-neutral-700">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-neutral-100">OpenAI</span>
                {envStatus?.openai && !overrideActive.openai ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-green-400">Configured via .env</span>
                    <button
                      type="button"
                      onClick={() => setOverrideActive((prev) => ({ ...prev, openai: true }))}
                      className="px-2 py-1 text-xs text-neutral-400 hover:text-neutral-200 transition-colors"
                    >
                      Override
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <input
                      type={showApiKey.openai ? "text" : "password"}
                      value={localProviders.providers.openai?.apiKey || ""}
                      onChange={(e) => updateLocalProvider("openai", { apiKey: e.target.value || null })}
                      placeholder="sk-..."
                      className="w-48 px-2 py-1 bg-neutral-800 border border-neutral-600 rounded text-neutral-100 text-xs focus:outline-none focus:border-neutral-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey((prev) => ({ ...prev, openai: !prev.openai }))}
                      className="text-xs text-neutral-400 hover:text-neutral-200"
                    >
                      {showApiKey.openai ? "Hide" : "Show"}
                    </button>
                    {envStatus?.openai && (
                      <button
                        type="button"
                        onClick={() => {
                          setOverrideActive((prev) => ({ ...prev, openai: false }));
                          updateLocalProvider("openai", { apiKey: null });
                        }}
                        className="text-xs text-neutral-500 hover:text-neutral-300"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Replicate Provider */}
            <div className="p-3 bg-neutral-900 rounded-lg border border-neutral-700">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-neutral-100">Replicate</span>
                {envStatus?.replicate && !overrideActive.replicate ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-green-400">Configured via .env</span>
                    <button
                      type="button"
                      onClick={() => setOverrideActive((prev) => ({ ...prev, replicate: true }))}
                      className="px-2 py-1 text-xs text-neutral-400 hover:text-neutral-200 transition-colors"
                    >
                      Override
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <input
                      type={showApiKey.replicate ? "text" : "password"}
                      value={localProviders.providers.replicate?.apiKey || ""}
                      onChange={(e) => updateLocalProvider("replicate", { apiKey: e.target.value || null })}
                      placeholder="r8_..."
                      className="w-48 px-2 py-1 bg-neutral-800 border border-neutral-600 rounded text-neutral-100 text-xs focus:outline-none focus:border-neutral-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey((prev) => ({ ...prev, replicate: !prev.replicate }))}
                      className="text-xs text-neutral-400 hover:text-neutral-200"
                    >
                      {showApiKey.replicate ? "Hide" : "Show"}
                    </button>
                    {envStatus?.replicate && (
                      <button
                        type="button"
                        onClick={() => {
                          setOverrideActive((prev) => ({ ...prev, replicate: false }));
                          updateLocalProvider("replicate", { apiKey: null });
                        }}
                        className="text-xs text-neutral-500 hover:text-neutral-300"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* fal.ai Provider */}
            <div className="p-3 bg-neutral-900 rounded-lg border border-neutral-700">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-neutral-100">fal.ai</span>
                {envStatus?.fal && !overrideActive.fal ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-green-400">Configured via .env</span>
                    <button
                      type="button"
                      onClick={() => setOverrideActive((prev) => ({ ...prev, fal: true }))}
                      className="px-2 py-1 text-xs text-neutral-400 hover:text-neutral-200 transition-colors"
                    >
                      Override
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <input
                      type={showApiKey.fal ? "text" : "password"}
                      value={localProviders.providers.fal?.apiKey || ""}
                      onChange={(e) => updateLocalProvider("fal", { apiKey: e.target.value || null })}
                      placeholder="..."
                      className="w-48 px-2 py-1 bg-neutral-800 border border-neutral-600 rounded text-neutral-100 text-xs focus:outline-none focus:border-neutral-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey((prev) => ({ ...prev, fal: !prev.fal }))}
                      className="text-xs text-neutral-400 hover:text-neutral-200"
                    >
                      {showApiKey.fal ? "Hide" : "Show"}
                    </button>
                    {envStatus?.fal && (
                      <button
                        type="button"
                        onClick={() => {
                          setOverrideActive((prev) => ({ ...prev, fal: false }));
                          updateLocalProvider("fal", { apiKey: null });
                        }}
                        className="text-xs text-neutral-500 hover:text-neutral-300"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            <p className="text-xs text-neutral-500 mt-2">
              Add API keys via <code className="px-1 py-0.5 bg-neutral-800 rounded">.env.local</code> for better security. Keys added here override .env and are stored in your browser.
            </p>
          </div>
        )}

        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-neutral-400 hover:text-neutral-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={activeTab === "project" && (isValidating || isBrowsing)}
            className="px-4 py-2 text-sm bg-white text-neutral-900 rounded hover:bg-neutral-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {activeTab === "project"
              ? (isValidating ? "Validating..." : mode === "new" ? "Create" : "Save")
              : "Save"
            }
          </button>
        </div>
      </div>
    </div>
  );
}
