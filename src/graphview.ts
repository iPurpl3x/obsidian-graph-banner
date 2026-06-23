import { App, MarkdownView, WorkspaceLeaf } from "obsidian";
import GraphBannerPlugin from "./main.ts";

export class GraphView {
  static nodeClass = "graph-banner-content";
  static overlayNodeClass = "graph-banner-overlay";

  leaf: WorkspaceLeaf;
  node: HTMLElement;
  plugin: GraphBannerPlugin;

  setupLeafPromise: Promise<void>;

  public constructor(app: App, plugin: GraphBannerPlugin) {
    this.plugin = plugin;
    this.leaf = app.workspace.getLeaf("tab");
    this.setupLeafPromise = this.setupLeaf(plugin.settings.timeToRemoveLeaf);

    const node = this.leaf.view.containerEl.find(".view-content");
    this.node = node;
    this.setupNode();
  }

  private async setupLeaf(timeToRemoveLeaf: number) {
    await this.leaf.setViewState({
      type: "localgraph",
    });

    // HACK: Don't detach(). Remove only child DOM manually.
    // @ts-ignore WorkspaceTabs.removeChild is private method
    const removeChild = () => this.leaf.parent.removeChild(this.leaf);
    timeToRemoveLeaf > 0
      ? setTimeout(removeChild, timeToRemoveLeaf)
      : removeChild();
  }

  setupNode() {
    this.node.addClass(GraphView.nodeClass);
    this.node.find(".graph-controls")?.toggleClass("is-close", true);

    const overlay = document.createElement("div");
    overlay.addClass(GraphView.overlayNodeClass);
    this.node.insertBefore(overlay, this.node.querySelector("canvas"));
    overlay.addEventListener("pointerup", () => {
      if (this.isActive()) return;

      this.setActive(true);

      const abortController = new AbortController();
      document.addEventListener("pointerdown", (e) => {
        if (!this.isActive()) return;
        if (e.target && this.node.contains(e.target as Node)) return;

        this.setActive(false);
        abortController.abort();
      }, { signal: abortController.signal });
    });

    this.applySettings();
  }

  applySettings() {
    // Apply banner height from settings
    this.node.style.setProperty(
      "--banner-height",
      `${this.plugin.settings.bannerHeight}px`,
    );

    // Try to push graph settings to the leaf's internal view
    this.applyGraphSettings();
  }

  private async applyGraphSettings() {
    await this.setupLeafPromise;

    const view = this.leaf.view as any;
    if (!view) return;

    const s = this.plugin.settings;

    // Build the settings object matching Obsidian's graph.json format
    const config = {
      nodeSizeMultiplier: s.nodeSize,
      scale: s.graphScale,
      lineSizeMultiplier: s.lineSize,
      linkDistance: s.linkDistance,
      repelStrength: s.repelStrength,
      centerStrength: s.centerStrength,
    };

    // Strategy 1: pass via setViewState state object (full reload)
    if (view.getState) {
      const state = view.getState() || {};
      Object.assign(state, config);
      view.setState(state);
    }

    // Strategy 2: set on view directly
    Object.assign(view, config);

    // Strategy 3: look for renderer/graph/data props on view
    for (const key of Object.keys(view)) {
      const val = view[key];
      if (val && typeof val === "object" && !Array.isArray(val)) {
        Object.assign(val, config);
      }
    }

    // Strategy 4: try re-setting the view state entirely
    if (view.getState) {
      const currentState = view.getState() || {};
      // Ensure 'file' is preserved
      this.leaf.setViewState({
        type: "localgraph",
        state: { ...currentState, ...config },
      });
    }
  }

  isActive() {
    return this.node.dataset["interactive"] === "true";
  }

  setActive(active: boolean) {
    this.node.dataset["interactive"] = active.toString();
  }

  async placeTo(view: MarkdownView) {
    await this.setupLeafPromise;

    const s = this.plugin.settings;

    const state: Record<string, unknown> = {
      file: view.file!.path,
      nodeSizeMultiplier: s.nodeSize,
      scale: s.graphScale,
      lineSizeMultiplier: s.lineSize,
      linkDistance: s.linkDistance,
      repelStrength: s.repelStrength,
      centerStrength: s.centerStrength,
    };

    // Only pass graph depth if user explicitly set a value >= 0
    if (s.graphDepth >= 0) {
      state.options = { localJumps: s.graphDepth };
    }

    await this.leaf.setViewState({
      type: "localgraph",
      state,
    });

    this.leaf.setGroup(view.file!.path);

    this.applySettings();

    const mode = view.getMode();
    const modeContainer = view.containerEl.find(`.markdown-${mode}-view`);
    if (this.isDescendantOf(modeContainer)) {
      return;
    }

    const noteHeader = modeContainer.find(".inline-title");
    const parent = noteHeader.parentElement;
    if (!parent) throw "Failed to get note header";

    parent.insertAfter(this.node, noteHeader);
  }

  isDescendantOf(parent: Node) {
    return parent.contains(this.node);
  }

  setVisibility(show: boolean) {
    this.node.toggleClass("hidden", !show);
  }

  detach() {
    this.leaf.detach();
    this.node.removeClass(GraphView.nodeClass);
  }
}
