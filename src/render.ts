import {Group, GanttInfo} from "./ganttDb";
import * as Enumerable from "linq-es2015"; 
import * as d3 from 'd3';

export class Renderer{
    static KEYWORD_AXISTICKS = "axisticks";
    static KEYWORD_TITLE = "title";
    static KEYWORD_TODAYMARKER = "todaymarker";

    ganttInfo: GanttInfo;
    startDate: Date;
    endDate: Date;
    height = 350;
    width = 800;
    numberOfItems:number;
    taskHeight = 50;
    heightPadding = 100;
    taskpadding = 5;
    widthScale = 0.95;
    groupColumnSize = 0.2;

    constructor(info: GanttInfo){
        this.ganttInfo = info;
        this.initDate();
        this.initiateNbItems();
        this.initHeight();
    }

    initDate():void{
        const milestoneDates = Enumerable.AsEnumerable(this.ganttInfo.milestones).Select((milestone) => milestone.StartDate);
        const milestoneStartDate = milestoneDates.Min((d:Date) => d.valueOf());
        const milestoneEndDate = milestoneDates.Max((d:Date) => d.valueOf());

        const taskStartDate = Enumerable.AsEnumerable(this.ganttInfo.tasks).Select((task) => task.StartDate).Min((d:Date) => d.valueOf())
        const taskEndDate = Enumerable.AsEnumerable(this.ganttInfo.tasks).Select((task) => task.EndDate).Max((d:Date) => d.valueOf());

        if(milestoneStartDate<taskStartDate)
            this.startDate = new Date(milestoneStartDate);
        else
            this.startDate = new Date(taskStartDate);
        
        if(milestoneEndDate>taskEndDate)
            this.endDate = new Date(milestoneEndDate);
        else
            this.endDate = new Date(taskEndDate);
    }

    initiateNbItems():void{
        this.numberOfItems = this.ganttInfo.milestones.length + this.ganttInfo.tasks.length;
    }

    initHeight():void{
        this.height = this.numberOfItems*this.taskHeight+this.heightPadding;
    }

    Render():Node{
        const svg = d3.create("svg")
            .attr("viewbox", [0,0,this.width, this.height])
            .attr("width", this.width)
            .attr("height", this.height);

        this.RenderGrid(svg);
        this.RenderGroupBlocks(svg);
        this.RenderTodayMarker(svg);
        this.RenderEvents(svg);
        this.RenderDependencies(svg);
        //Render Title
        //Render popup details

        return svg.node();
    }

    RenderGrid(svg: d3.Selection<SVGSVGElement, undefined, null, undefined>): void{

        let bottom_ticks = 6;
        if(this.ganttInfo.renderOptions.options.has(Renderer.KEYWORD_AXISTICKS)){
            try{
                bottom_ticks = new Number(this.ganttInfo.renderOptions.options.get(Renderer.KEYWORD_AXISTICKS) as string).valueOf();
            }catch(error){
                throw new Error("Error converting " + Renderer.KEYWORD_AXISTICKS + " to number: " + error + "(" + this.ganttInfo.renderOptions.options.get(Renderer.KEYWORD_AXISTICKS) as string + ")");
            }
        }
        const bottom_scale = d3.scaleTime().domain([this.startDate, this.endDate]).range([this.width*this.groupColumnSize, this.width * this.widthScale]);
        const axis_bottom = d3.axisBottom(bottom_scale).ticks(bottom_ticks);

        svg.append("g")
            .attr('class', 'x axis-grid')
            .attr('transform', 'translate(0,' + (this.height*0.95) + ')')
            .call(axis_bottom
                .tickSize(-this.height)
            );
    }

    RenderGroupBlocks(svg: d3.Selection<SVGSVGElement, undefined, null, undefined>):void{
        const groups = Enumerable.AsEnumerable(this.ganttInfo.groups).Select((group:Group) => new Map<string, unknown>([["name", group.Title]])).ToArray();
        groups.forEach(group => {
            let count = Enumerable.AsEnumerable(this.ganttInfo.milestones).Count((m) => m.Group.Title == (group.get("name") as string));
            count += Enumerable.AsEnumerable(this.ganttInfo.tasks).Count((t) => t.Group.Title == (group.get("name") as string));
            group.set("count", count);
        });

        let position = 0;
        for (let i = 0; i < groups.length; i++) {
            const group = groups[i];
            group.set("start", position);
            position += group.get("count") as number;
            group.set("end", position);
            group.set("class", i%2==0?"even":"odd");
        }

        svg.append("g")
            .attr("class", "group-block")
            .selectAll("rect")
            .data(groups)
            .enter()
                .append("rect")
                    .attr("x", 0)
                    .attr("y", (g) => (g.get("start") as number + 1)/(this.numberOfItems+2)*this.height)
                    .attr("height", (g) => (g.get("count") as number)/(this.numberOfItems+2)*this.height)
                    .attr("width", this.width)
                    .attr("class", (g) => g.get("class") as string);
        
        svg.append("g")
            .attr("class", "group-block-label")
            .selectAll("text")
            .data(groups)
            .enter()
                .append("text")
                .attr("x", 5)
                .attr("y", (g) => 5+(g.get("start") as number + 1)/(this.numberOfItems+2)*this.height)
                .attr("dy", "1.2em")
                .text((g) => g.get("name") as string);
    }

    RenderEvents(svg: d3.Selection<SVGSVGElement, undefined, null, undefined>):void{
        const tasks = Enumerable
                        .AsEnumerable(this.ganttInfo.tasks)
                        .Select((t) => new Map<string, unknown>([
                            ["name", t.Title], 
                            ["class", t.Class], 
                            ["progress", t.Progress],
                            ["start", t.StartDate],
                            ["end", t.EndDate],
                            ["type", "task"],
                            ["group_index", this.ganttInfo.groups.indexOf(t.Group)]
                        ]));
        const milestones = Enumerable.AsEnumerable(this.ganttInfo.milestones)
                        .Select((m) => new Map<string, unknown>([
                            ["name", m.Title], 
                            ["class", m.Class], 
                            ["progress", m.Progress],
                            ["start", m.StartDate],
                            ["type", "milestone"],
                            ["group_index", this.ganttInfo.groups.indexOf(m.Group)]
                        ]));
        const events = tasks.Concat(milestones)
                        .OrderBy((e) => (e.get("start") as Date).valueOf()*(e.get("group_index") as number + 1))
                        .ToArray();

        for (let i = 0; i < events.length; i++) {
            const event = events[i];
            event.set("position", i);
        }

        this.RenderTasks(svg,
            Enumerable.AsEnumerable(events).Where((e) => e.get("type") as string == "task").ToArray()
        );
        
        this.RenderMilestones(svg,
            Enumerable.AsEnumerable(events).Where((e) => e.get("type") as string == "milestone").ToArray()
        );
    }

    RenderTasks(svg: d3.Selection<SVGSVGElement, undefined, null, undefined>, tasks: Array<Map<string, unknown>>):void{
        svg.append("g")
            .attr("class", "tasks")
            .selectAll("rect")
            .data(tasks)
            .enter()
                .append("rect")
                .attr("class", (t) => t.get("class") as string)
                .attr("data-progress", (t) => t.get("progress") as string)
                .attr("x", (t) => this.DateToPosition(t.get("start") as Date)*this.width*(1-this.groupColumnSize) + this.width*this.groupColumnSize)
                .attr("y", (t) => (t.get("position") as number + 1)/(this.numberOfItems+2)*this.height + this.taskpadding)
                .attr("width", (t) => (this.DateToPosition(t.get("end") as Date) - this.DateToPosition(t.get("start") as Date))*this.width*(1-this.groupColumnSize))
                .attr("height", this.taskHeight - 2*this.taskpadding)
                .attr("rx", 10)
                .attr("ry", 10);
        
        svg.append("g")
            .attr("class", "tasks-labels")
            .selectAll("text")
            .data(tasks)
            .enter()
                .append("text")
                .attr("class", (t) => t.get("class") as string)
                .text((t) => t.get("name") as string)
                .attr("x", (t) => (this.DateToPosition(t.get("end") as Date) + this.DateToPosition(t.get("start") as Date))/2.0*this.width*(1-this.groupColumnSize) + this.width*this.groupColumnSize)
                .attr("y", (t) => (t.get("position") as number + 1 + 0.5)/(this.numberOfItems+2)*this.height + this.taskpadding);

    }

    RenderMilestones(svg: d3.Selection<SVGSVGElement, undefined, null, undefined>, milestones: Array<Map<string, unknown>>):void{
        svg.append("g")
            .attr("class", "milestones")
            .selectAll("rect")
            .data(milestones)
            .enter()
                .append("rect")
                .attr("class", (t) => t.get("class") as string)
                .attr("data-progress", (t) => t.get("progress") as string)
                .attr("x", (t) => this.DateToPosition(t.get("start") as Date)*this.width*(1-this.groupColumnSize) + this.width*this.groupColumnSize)
                .attr("y", (t) => (t.get("position") as number + 1)/(this.numberOfItems+2)*this.height + this.taskpadding)
                .attr("width", this.taskHeight - 2*this.taskpadding)
                .attr("height", this.taskHeight - 2*this.taskpadding)
                .attr("transform", (t) => "translate(" + (-this.taskHeight/2) + ", 0) rotate(45, " + (this.DateToPosition(t.get("start") as Date)*this.width*(1-this.groupColumnSize) + this.width*this.groupColumnSize + this.taskHeight/2.0 - this.taskpadding) + ", " + ((t.get("position") as number + 1)/(this.numberOfItems+2)*this.height + this.taskpadding + this.taskHeight/2.0 - this.taskpadding) + ")");
        
        svg.append("g")
            .attr("class", "milestones-labels")
            .selectAll("text")
            .data(milestones)
            .enter()
                .append("text")
                .attr("class", (t) => t.get("class") as string)
                .text((t) => t.get("name") as string)
                .attr("x", (t) => this.DateToPosition(t.get("start") as Date)*this.width*(1-this.groupColumnSize) + this.width*this.groupColumnSize + this.taskHeight/2 - this.taskpadding)
                .attr("y", (t) => (t.get("position") as number + 1 + 0.5)/(this.numberOfItems+2)*this.height + this.taskpadding)
                .attr("transform", "translate(" + (-this.taskHeight/2) + ", 0)");
    }

    RenderTodayMarker(svg: d3.Selection<SVGSVGElement, undefined, null, undefined>):void{
        if(!this.ganttInfo.renderOptions.options.has(Renderer.KEYWORD_TODAYMARKER)) return;
        if((this.ganttInfo.renderOptions.options.get(Renderer.KEYWORD_TODAYMARKER) as string).toLocaleLowerCase() != "on") return;

        const today = new Date();

        svg.append("g")
            .attr("class", "today-marker")
            .append("line")
                .attr("x1", this.DateToPosition(today)*this.width*(1-this.groupColumnSize) + this.width*this.groupColumnSize)
                .attr("y1", 0)
                .attr("x2", this.DateToPosition(today)*this.width*(1-this.groupColumnSize) + this.width*this.groupColumnSize)
                .attr("y2", this.height);
    }

    RenderDependencies(svg: d3.Selection<SVGSVGElement, undefined, null, undefined>):void{

    }

    DateToPosition(date: Date):number{
        return (date.valueOf()-this.startDate.valueOf())/(this.endDate.valueOf()-this.startDate.valueOf()) * this.widthScale;
    }
}