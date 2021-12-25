import { App, MarkdownPostProcessor, Plugin, PluginSettingTab, Setting } from 'obsidian';

import {Parser} from 'src/parser';
import {Renderer} from 'src/render';

// Remember to rename these classes and interfaces!

interface ISettingsData {
	mySetting: string;
}

const DEFAULT_SETTINGS: ISettingsData = {
	mySetting: 'default'
}

export default class MyPlugin extends Plugin {
	settings: ISettingsData;
    postprocessors: Map<string, MarkdownPostProcessor> = new Map();

	async onload() {
		await this.loadSettings();

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));

		this.registerMarkdownCodeBlockProcessor("gantt", (source, element, context) => {
			const parser = new Parser();

			//try{
				parser.Parse(source);
			
				const renderer = new Renderer(parser.ganttInfo);
				//renderer.width = element.parentElement.clientWidth;
				//renderer.height = element.parentElement.clientHeight;
				renderer.width = element.ownerDocument.getElementsByClassName("view-content")[0].clientWidth*0.95;

				const graph = renderer.Render();

				element.appendChild(graph);
			//}catch(error){
			//	element.innerHTML = error;
			//}
			
		});

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}


class SampleSettingTab extends PluginSettingTab {
	plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		containerEl.createEl('h2', {text: 'Settings for my awesome plugin.'});

		new Setting(containerEl)
			.setName('Setting #1')
			.setDesc('It\'s a secret')
			.addText(text => text
				.setPlaceholder('Enter your secret')
				.setValue(this.plugin.settings.mySetting)
				.onChange(async (value) => {
					console.log('Secret: ' + value);
					this.plugin.settings.mySetting = value;
					await this.plugin.saveSettings();
				}));
	}
}
