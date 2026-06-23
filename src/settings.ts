import { type App, Notice, PluginSettingTab, Setting } from "obsidian";
import type GraphBannerPlugin from "./main.ts";

export interface Settings {
  ignore: string[];
  timeToRemoveLeaf: number;
  bannerHeight: number;
  graphDepth: number;
  nodeSize: number;
  graphScale: number;
  lineSize: number;
}

export const DEFAULT_SETTINGS: Settings = {
  ignore: [],
  timeToRemoveLeaf: 100,
  bannerHeight: 300,
  graphDepth: -1,
  nodeSize: 1,
  graphScale: 1,
  lineSize: 1,
};

export class SettingTab extends PluginSettingTab {
  plugin: GraphBannerPlugin;

  constructor(app: App, plugin: GraphBannerPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display() {
    const { containerEl } = this;

    containerEl.empty();

    new Setting(containerEl)
      .setName("Banner height")
      .setDesc(
        "Height of the graph banner in pixels. Adjust to see more or less of the surrounding graph.",
      )
      .addSlider((slider) =>
        slider
          .setLimits(100, 600, 10)
          .setValue(this.plugin.settings.bannerHeight)
          .setDynamicTooltip()
          .onChange(async (value) => {
            this.plugin.settings.bannerHeight = value;
            await this.plugin.saveData(this.plugin.settings);
            this.plugin.updateAllGraphViews();
          })
      );

    new Setting(containerEl)
      .setName("Graph depth")
      .setDesc(
        "How many hops/link-steps from the current note to show. Higher values reveal more of the surrounding graph.",
      )
      .addDropdown((dropdown) =>
        dropdown
          .addOption("-1", "Default (Obsidian default)")
          .addOption("0", "Current note only (0 hops)")
          .addOption("1", "1 hop")
          .addOption("2", "2 hops")
          .addOption("3", "3 hops")
          .addOption("5", "5 hops")
          .setValue(String(this.plugin.settings.graphDepth))
          .onChange(async (value) => {
            this.plugin.settings.graphDepth = Number(value);
            await this.plugin.saveData(this.plugin.settings);
            this.plugin.updateAllGraphViews();
          })
      );

    new Setting(containerEl)
      .setName("Node size")
      .setDesc(
        "Scale factor for graph nodes and labels. Larger values make text more readable. (0.5 – 2.0)",
      )
      .addSlider((slider) =>
        slider
          .setLimits(0.5, 2.0, 0.1)
          .setValue(this.plugin.settings.nodeSize)
          .setDynamicTooltip()
          .onChange(async (value) => {
            this.plugin.settings.nodeSize = value;
            await this.plugin.saveData(this.plugin.settings);
            this.plugin.updateAllGraphViews();
          })
      );

    new Setting(containerEl)
      .setName("Graph scale (zoom)")
      .setDesc(
        "Initial zoom level of the graph. Zoom out (<1) to see more nodes, zoom in (>1) for close-up. (0.5 – 2.0)",
      )
      .addSlider((slider) =>
        slider
          .setLimits(0.5, 2.0, 0.1)
          .setValue(this.plugin.settings.graphScale)
          .setDynamicTooltip()
          .onChange(async (value) => {
            this.plugin.settings.graphScale = value;
            await this.plugin.saveData(this.plugin.settings);
            this.plugin.updateAllGraphViews();
          })
      );

    new Setting(containerEl)
      .setName("Edge thickness")
      .setDesc(
        "Scale factor for graph edges/lines. (0.5 – 2.0)",
      )
      .addSlider((slider) =>
        slider
          .setLimits(0.5, 2.0, 0.1)
          .setValue(this.plugin.settings.lineSize)
          .setDynamicTooltip()
          .onChange(async (value) => {
            this.plugin.settings.lineSize = value;
            await this.plugin.saveData(this.plugin.settings);
            this.plugin.updateAllGraphViews();
          })
      );

    new Setting(containerEl)
      .setName("Ignored path pattern")
      .setDesc(
        "Manage notes which do not display the graph banner. This pattern follows .gitignore spec.",
      )
      .addTextArea((textArea) =>
        textArea
          .setPlaceholder(
            "ignored-path.md\n/ignored-dir\n!/ignored-dir/not-ignored-path.md",
          )
          .setValue(this.plugin.settings.ignore.join("\n"))
          .onChange(async (value) => {
            this.plugin.settings.ignore = value.split("\n");
            await this.plugin.saveData(this.plugin.settings);
          })
      );

    new Setting(containerEl)
      .setName("Advanced: Time [ms] to remove the graph leaf for the banner")
      .setDesc(
        "This plugin temporarily create a local graph leaf to display in the banner of the notes.\n" +
          'If you want to do something when the local graph opened, for example by using the "Sync Graph Settings" plugin, set this time settings.\n' +
          "If set to 0ms, the leaf is immediately erased.\n" +
          "To reflect this setting, please reload the app.",
      )
      .addText((text) =>
        text
          .setPlaceholder("100")
          .setValue(String(this.plugin.settings.timeToRemoveLeaf))
          .onChange(async (value) => {
            const time = Number(value);
            if (value === "" || Number.isNaN(time) || time < 0) {
              new Notice("Please specify a valid number.");
            }
            this.plugin.settings.timeToRemoveLeaf = time;
            await this.plugin.saveData(this.plugin.settings);
          })
      );
  }
}
