# Changelog

All notable changes to Node Banana will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

## [1.1.3] - 2026-03-22

### Fixed

- Clamp expand height to minHeight and resolve text through switch nodes
- Move ImageInputNode handles after visual content to prevent z-order clipping
- Add z-index to handles so they paint above positioned node content
- Move overflow-clip from contentClassName to inner visual wrappers to prevent handle clipping
- Move panel height correction from loadWorkflow into BaseNode render
- Prevent node height accumulation with inline parameters on reload
- Update WelcomeModal test to match bg-black/60 backdrop class
- Resolve prompt variables through router nodes for PromptConstructor
- Use overflow-visible on non-fullBleed nodes to prevent handle clipping

### Other

- Replace ArrayNode auto-route icon with Lucide split icon

## [1.1.2] - 2026-03-12

### Added

- Adaptive image resolution scaling — swaps full-res images for JPEG thumbnails when nodes are small on screen

### Fixed

- Router/switch passthrough losing data when multiple types (text + image) flow through the same router to one target
- SplitGrid node Split button permanently disabled — sourceImage now updates reactively when an edge is connected
- Node connection handles clipped at edges — removed paint containment that acted like overflow hidden
- Thumbnail cache key collisions causing wrong images on nodes
- Pending thumbnail map not cleaned up on rejection, causing stale entries
- Pointer-events on node images/content blocking pan and drag interactions
- Hover state updates firing during node drag, causing unnecessary re-renders
- Hover events not blocked during mouse-down drag
- backdrop-blur-sm causing poor rendering performance on Windows

## [1.1.1] - 2026-03-12

### Fixed

- Ensure auto-routed prompts retain correct individual item text
- Add rounded corners to ImageInput image and InlineParameterPanel settings

### Other

- Increase ArrayNode top padding to match side padding
- Add top padding and max-width to ArrayNode top fields
- Update ArrayNode layout to match new design language

## [1.1.0] - 2026-03-12

### Added

- **Router, Switch & ConditionalSwitch Nodes** - Three new flow-control node types with toggle UI, rule editing, dynamic handles, and dimming integration
- **Gemini Veo Video Generation** - Veo 3.1 video models with full parameter support and error handling
- **Anthropic Claude LLM Provider** - Claude models available in LLM node alongside Gemini and OpenAI
- **Floating Node Headers** - Headers rendered via ViewportPortal with drag-to-move, hover controls, and Browse button
- **ControlPanel** - Centralized parameter editing panel with node-type routing and Run/Apply buttons
- **Full-Bleed Node Layouts** - All major nodes converted to edge-to-edge content with overlay controls
- **Inline Parameters** - Toggle to show model parameters directly on nodes with reactive sync
- **Video Autoplay** - useVideoAutoplay hook integrated into all 5 video node types
- **Inline Variable Highlights** - PromptConstructor highlights template variables inline
- **Minimap Navigation** - Click-to-navigate and scroll-to-zoom on minimap
- **Node Dimming System** - CSS-based visual dimming for disabled Switch/ConditionalSwitch paths
- **Unsaved Changes Warning** - Browser warns before closing tab with unsaved workflow
- **All Nodes Menu** - Floating action bar with All Nodes dropdown and All Models button
- **Provider Filter Icons** - ModelSearchDialog filters by available providers

### Fixed

- Ease curve outputDuration passthrough through parent-child connections
- Canvas hover state suppressed during panning to prevent re-render cascading
- Node click-to-select failures caused by d3-drag dead zone
- Aspect-fit resize after manual resize aligns with React Flow dimension priority
- Settings panel seamless selection ring, background matching, and z-index layering
- ConditionalSwitch stale input, handle alignment, and text routing
- Veo negative prompt connectable as text handle, error handling, image validation
- API headers scoped to active provider, temperature falsy bug fixed
- Image flicker on settings toggle, presets popup dismiss, modal overlay click-through
- Node paste height compounding, group label anchoring, file input backdrop issues
- Handle visibility on full-bleed and OutputNode, clipped handle resolution
- FloatingNodeHeader width tracking, right-alignment, and Windows drag interception
- Smart cascade made type-aware so text inputs don't rescue dimmed image paths
- RouterNode auto-resize, handle colors, and placeholder styling

### Changed

- EaseCurveNode, SplitGridNode, Generate3DControls, GenerateVideoControls refactored to full-bleed patterns
- ConditionalSwitch execution logic deduplicated with shared evaluateRule utility
- ModelParameters collapsible toggle removed

### Performance

- Selective Zustand subscriptions replace bare useWorkflowStore() calls
- RAF-debounced setHoveredNodeId and BaseNode ResizeObserver
- Edge rendering optimized for large canvases
- FloatingNodeHeader, InlineParameterPanel, ModelParameters wrapped in React.memo
- useShallow for WorkflowCanvas store subscription
- Narrow selectors for ControlPanel and GroupControlsOverlay

### Tests

- Removed redundant and brittle component tests (-1,958 lines)
- Updated assertions for full-bleed nodes, floating action bar, and Gemini video

### Other

- Added MIT license
- Handle diameter increased from 10px to 14px
- Settings redesigned with pill tabs, segmented controls, and toggles
- Multi-layer box-shadow for smooth settings panel shadow

## [1.0.0] - Initial Release

### Added

- Visual node editor with drag-and-drop canvas
- Image Input node for loading images
- Prompt node for text input
- Annotation node with full-screen drawing tools (rectangles, circles, arrows, freehand, text)
- NanoBanana node for AI image generation using Gemini
- LLM Generate node for text generation (Gemini and OpenAI)
- Output node for displaying results
- Workflow save/load as JSON files
- Connection validation (image-to-image, text-to-text)
- Multi-image input support for generation nodes
