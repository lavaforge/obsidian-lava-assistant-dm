import {
    App,
    Setting,
    Plugin,
    PluginSettingTab,
    WorkspaceLeaf,
    Editor,
    MarkdownView,
} from 'obsidian';
import { ExampleView, VIEW_TYPE_EXAMPLE } from './controlView';

interface LavaDmPluginSettings {
    apiKey: string;
}

const DEFAULT_SETTINGS: LavaDmPluginSettings = {
    apiKey: '',
};

export default class LavaDmPlugin extends Plugin {
    private settings: LavaDmPluginSettings;
    public currentTranscription = '';

    public get apiKey() {
        return this.settings.apiKey;
    }

    async onload() {
        await this.loadSettings();

        this.addSettingTab(new LavaDmSettingTab(this.app, this));

        this.registerView(
            VIEW_TYPE_EXAMPLE,
            (leaf) => new ExampleView(leaf, this),
        );

        this.addRibbonIcon('dice', 'Activate view', () => {
            this.activateView();
        });

        this.addCommand({
            id: 'insert-transcription',
            name: 'Insert transcription',
            editorCallback: (editor: Editor, view: MarkdownView) => {
                editor.replaceRange(
                    this.currentTranscription,
                    editor.getCursor(),
                );
            },
        });
    }

    async activateView() {
        const { workspace } = this.app;

        let leaf: WorkspaceLeaf | null = null;
        const leaves = workspace.getLeavesOfType(VIEW_TYPE_EXAMPLE);

        if (leaves.length > 0) {
            // A leaf with our view already exists, use that
            leaf = leaves[0];
        } else {
            // Our view could not be found in the workspace, create a new leaf
            // in the right sidebar for it
            leaf = workspace.getRightLeaf(false);
            await leaf.setViewState({ type: VIEW_TYPE_EXAMPLE, active: true });
        }

        // "Reveal" the leaf in case it is in a collapsed sidebar
        workspace.revealLeaf(leaf);
    }

    onunload() {}

    async loadSettings() {
        this.settings = {
            ...DEFAULT_SETTINGS,
            ...(await this.loadData()),
        };
    }

    async saveSettings(data: LavaDmPluginSettings) {
        this.settings = data;
        await this.saveData(this.settings);
    }
}

class LavaDmSettingTab extends PluginSettingTab {
    plugin: LavaDmPlugin;

    constructor(app: App, plugin: LavaDmPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;

        containerEl.empty();

        new Setting(containerEl)
            .setName('API Key')
            .setDesc('API key for OpenAI API')
            .addText((text) =>
                text.setValue(this.plugin.apiKey).onChange(async (value) => {
                    await this.plugin.saveSettings({
                        apiKey: value,
                    });
                }),
            );
    }
}
