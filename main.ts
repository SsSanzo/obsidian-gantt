import {MarkdownPostProcessor, Plugin} from 'obsidian';

import {Parser} from 'src/parser';
import {Renderer} from 'src/render';

// Remember to rename these classes and interfaces!

export default class MyPlugin extends Plugin {
    postprocessors: Map<string, MarkdownPostProcessor> = new Map();

	async onload() {

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
}
