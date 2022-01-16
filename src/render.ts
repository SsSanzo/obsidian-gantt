import {Group, GanttInfo, EventType} from "./ganttDb";
import * as Enumerable from "linq-es2015"; 
import * as d3 from 'd3';
import { DateTime } from "luxon";

export class Renderer{
    static KEYWORD_AXISTICKS = "axisticks";
    static KEYWORD_TITLE = "title";
    static KEYWORD_TODAYMARKER = "todaymarker";
    static KEYWORD_DEPENDENCIES = "dependencies";
    static KEYWORD_INPUTDATEFORMAT = "inputdateformat";
    static KEYWORD_OUTPUTDATEFORMAT = "outputdateformat";
    static KEYWORD_BUSINESSDAYS = "businessdays";

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
    groupColumnSize = 0.1;

    constructor(info: GanttInfo){
        this.ganttInfo = info;
        this.initDate();
        this.initiateNbItems();
        this.initHeight();
    }

    initDate():void{
        
        let milestoneStartDate: number;
        let milestoneEndDate: number;
        if(this.ganttInfo.milestones.length>0){
            const milestoneDates = Enumerable.AsEnumerable(this.ganttInfo.milestones).Select((milestone) => milestone.StartDate);
            milestoneStartDate = milestoneDates.Min((d:Date) => d.valueOf());
            milestoneEndDate = milestoneDates.Max((d:Date) => d.valueOf());
        }

        let taskStartDate: number;
        let taskEndDate: number;
        if(this.ganttInfo.tasks.length>0){
            taskStartDate = Enumerable.AsEnumerable(this.ganttInfo.tasks).Select((task) => task.StartDate).Min((d:Date) => d.valueOf());
            taskEndDate = Enumerable.AsEnumerable(this.ganttInfo.tasks).Select((task) => task.EndDate).Max((d:Date) => d.valueOf());
        }

        if(this.ganttInfo.tasks.length<1 && this.ganttInfo.milestones.length<1){
            this.startDate = new Date();
            this.endDate = new Date();
        }else if(this.ganttInfo.tasks.length<1 && this.ganttInfo.milestones.length>0){
            this.startDate = new Date(milestoneStartDate);
            this.endDate = new Date(milestoneEndDate);
        }else if(this.ganttInfo.tasks.length>0 && this.ganttInfo.milestones.length<1){
            this.startDate = new Date(taskStartDate);
            this.endDate = new Date(taskEndDate);
            return;
        }else{

            if(milestoneStartDate<taskStartDate)
                this.startDate = new Date(milestoneStartDate);
            else
                this.startDate = new Date(taskStartDate);
            
            if(milestoneEndDate>taskEndDate)
                this.endDate = new Date(milestoneEndDate);
            else
                this.endDate = new Date(taskEndDate);
        }
        
        if(this.startDate.valueOf() == this.endDate.valueOf()) this.endDate.setDate(this.endDate.getDate()+1);
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
        this.RenderTitle(svg);
        //Render popup details

        return svg.node();
    }

    RenderTitle(svg: d3.Selection<SVGSVGElement, undefined, null, undefined>): void{
        if(!this.ganttInfo.renderOptions.options.has(Renderer.KEYWORD_TITLE)) return;
        const title = this.ganttInfo.renderOptions.options.get(Renderer.KEYWORD_TITLE) as string;

        svg.append("text")
            .attr("class", "title")
            .attr("x", this.width/2.0)
            .attr("y", 20)
            .text(title);
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

        if(this.ganttInfo.renderOptions.options.has(Renderer.KEYWORD_OUTPUTDATEFORMAT)){
            axis_bottom.tickFormat((d) => 
                DateTime.fromJSDate(d as Date).toFormat(this.ganttInfo.renderOptions.options.get(Renderer.KEYWORD_OUTPUTDATEFORMAT) as string)
            )
        }

        svg.append("g")
            .attr('class', 'x grid')
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

        groups.forEach((t) => {
            const maxTextWidth: number = this.width*this.groupColumnSize/8;
            const name: string = t.get("name") as string;
            t.set("name", this.InsertLineBreaks(name, maxTextWidth));
        });

        const texts = svg.append("g")
                .attr("class", "group-block-label")
                .selectAll("text")
                .data(groups)
                .enter()
                    .append("text")
                    .attr("x", 5)
                    .attr("y", (g) => 5+(g.get("start") as number + 1)/(this.numberOfItems+2)*this.height);

        texts.selectAll("tspan")
            .data((g) => (g.get("name") as string).split("\\n"))
            .enter()
                .append("tspan")
                .attr("x", 5)
                .attr("dy", 15)
                .text(d => d);
    }

    RenderEvents(svg: d3.Selection<SVGSVGElement, undefined, null, undefined>):void{
        const events = this.MakeEventArrayWithDependencies();

        this.RenderTasks(svg,
            Enumerable.AsEnumerable(events).Where((e) => e.get("type") as string == "task").ToArray()
        );
        
        this.RenderMilestones(svg,
            Enumerable.AsEnumerable(events).Where((e) => e.get("type") as string == "milestone").ToArray()
        );
    }

    RenderTasks(svg: d3.Selection<SVGSVGElement, undefined, null, undefined>, tasks: Array<Map<string, unknown>>):void{
        const width = (t: Map<string, unknown>) => {
            return (this.DateToPosition(t.get("end") as Date) - this.DateToPosition(t.get("start") as Date))*this.width*(1-this.groupColumnSize);
        };

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
                .attr("width", (t) => (width(t)))
                .attr("height", this.taskHeight - 2*this.taskpadding)
                .attr("rx", 10)
                .attr("ry", 10)
                .attr("onclick", (t) => this.BuildOnclickEvent(t.get("ID") as string));
        
        tasks.forEach((t) => {
            const maxTextWidth: number = width(t)/6;
            const name: string = t.get("name") as string;
            t.set("name", this.InsertLineBreaks(name, maxTextWidth));
        });
        
        const x = (t: Map<string, unknown>) => {
            return (this.DateToPosition(t.get("end") as Date) + this.DateToPosition(t.get("start") as Date))/2.0*this.width*(1-this.groupColumnSize) + this.width*this.groupColumnSize;
        };

        const offset = (n:number) => n - 0.5*(n-1);

        const texts = svg.append("g")
                .attr("class", "tasks-labels")
                .selectAll("text")
                .data(tasks)
                .enter()
                    .append("text")
                    .attr("class", (t) => t.get("class") as string)
                    .attr("x", (t) => x(t))
                    .attr("y", (t) => (t.get("position") as number + 1 + 0.5)/(this.numberOfItems+2)*this.height + this.taskpadding - offset((t.get("name") as string).split("\\n").length)*15)
                    .attr("onclick", (t) => this.BuildOnclickEvent(t.get("ID") as string));
            
        texts.selectAll("tspan")
                .data((t) => (t.get("name") as string).split("\\n").map(d => [d, x(t)]))
                .enter()
                    .append("tspan")
                    .attr("x", d=> d[1])
                    .attr("dy", 15)
                    .text(d => d[0]);
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
                .attr("transform", (t) => "translate(" + (-this.taskHeight/2) + ", 0) rotate(45, " + (this.DateToPosition(t.get("start") as Date)*this.width*(1-this.groupColumnSize) + this.width*this.groupColumnSize + this.taskHeight/2.0 - this.taskpadding) + ", " + ((t.get("position") as number + 1)/(this.numberOfItems+2)*this.height + this.taskpadding + this.taskHeight/2.0 - this.taskpadding) + ")")
                .attr("onclick", (t) => this.BuildOnclickEvent(t.get("ID") as string));

        const x = (t: Map<string, unknown>) => {
            return this.DateToPosition(t.get("start") as Date)*this.width*(1-this.groupColumnSize) + this.width*this.groupColumnSize + this.taskHeight/2 - this.taskpadding;
        };

        const offset = (n:number) => n - 0.5*(n-1);

        const texts = svg.append("g")
                .attr("class", "milestones-labels")
                .selectAll("text")
                .data(milestones)
                .enter()
                    .append("text")
                    .attr("class", (t) => t.get("class") as string)
                    .attr("x", (t) => x(t))
                    .attr("y", (t) => (t.get("position") as number + 1 + 0.5)/(this.numberOfItems+2)*this.height + this.taskpadding - offset((t.get("name") as string).split("\\n").length)*15)
                    .attr("transform", "translate(" + (-this.taskHeight/2) + ", 0)")
                    .attr("onclick", (t) => this.BuildOnclickEvent(t.get("ID") as string));

        texts.selectAll("tspan")
                .data((t) => (t.get("name") as string).split("\\n").map(d => [d, x(t)]))
                .enter()
                    .append("tspan")
                    .attr("x", d=> d[1])
                    .attr("dy", 15)
                    .text(d => d[0]);
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
        if(!this.ganttInfo.renderOptions.options.has(Renderer.KEYWORD_DEPENDENCIES)) return;
        if((this.ganttInfo.renderOptions.options.get(Renderer.KEYWORD_DEPENDENCIES) as string).toLocaleLowerCase() != "on") return;

        const events = this.MakeEventArrayWithDependencies();
        const dependencies = this.MakeDependenciesArray(events);
        const paths = this.BuildDependencyPath(events, dependencies);

        svg.append("g")
            .attr("class", "dependencies")
            .selectAll("path")
            .data(paths)
            .enter()
                .append("path")
                .attr("d", (d) => d[0])
                .attr("class", (d) => d[1]);
    }

    DateToPosition(date: Date):number{
        return (date.valueOf()-this.startDate.valueOf())/(this.endDate.valueOf()-this.startDate.valueOf()) * this.widthScale;
    }

    MakeEventArrayWithDependencies():Array<Map<string, unknown>>{
        const tasks = Enumerable
                        .AsEnumerable(this.ganttInfo.tasks)
                        .Select((t) => new Map<string, unknown>([
                            ["name", t.Title], 
                            ["class", t.Class], 
                            ["progress", t.Progress],
                            ["ID", t.ID], 
                            ["start", t.StartDate],
                            ["end", t.EndDate],
                            ["type", "task"],
                            ["dependsOn", t.Dependencies],
                            ["group_index", this.ganttInfo.groups.indexOf(t.Group)]
                        ]));
        const milestones = Enumerable.AsEnumerable(this.ganttInfo.milestones)
                        .Select((m) => new Map<string, unknown>([
                            ["name", m.Title], 
                            ["class", m.Class], 
                            ["progress", m.Progress],
                            ["ID", m.ID], 
                            ["start", m.StartDate],
                            ["type", "milestone"],
                            ["dependsOn", m.Dependencies],
                            ["group_index", this.ganttInfo.groups.indexOf(m.Group)]
                        ]));
        const events = tasks.Concat(milestones)
                        .OrderBy((e) => (e.get("start") as Date).valueOf()*(e.get("group_index") as number + 1))
                        .ToArray();  

        for (let i = 0; i < events.length; i++) {
            const event = events[i];
            event.set("position", i);
        }

        return events;
    }

    MakeDependenciesArray(events: Array<Map<string, unknown>>):Array<Array<string>>{
        const dependencies = new Array<Array<string>>();
        events.forEach(event => {
            const dependants = event.get("dependsOn") as Array<string>;
            if(Array.isArray(dependants) && dependants != null)
                dependants.forEach(from => {
                    from = from.trim();
                    if(from.length>0 && Enumerable.AsEnumerable(events).Any((e) => (e.get("ID") as string) == from))
                        dependencies.push([from.trim(), event.get("ID") as string]);
                    else
                        throw new Error("Error: Task Not Found '" + from + "' on '" + event.get("ID") as string + "'");
                });
        });

        return dependencies;
    }

    BuildDependencyPath(events: Array<Map<string, unknown>>, dependencies: Array<Array<string>>):Array<Array<string>>{
        const paths: Array<Array<string>> = [];
        const eventsEnumerable = Enumerable.AsEnumerable(events);
        dependencies.forEach(dependency => {
            const from = eventsEnumerable.First((e) => (e.get("ID") as string) == dependency[0]);
            const to = eventsEnumerable.First((e) => (e.get("ID") as string) == dependency[1]);

            const toDate = this.DateToPosition(to.get("start") as Date);
            const fromStartDate = this.DateToPosition(from.get("start") as Date);
            let fromEndDate = 0;
            if((from.get("type") as string) == "task"){
                fromEndDate = this.DateToPosition(from.get("end") as Date);
            }else{
                fromEndDate = fromStartDate;
            }

            let path = "";
            if(toDate <= fromStartDate){
                //Snake curve
                //Should not be possible - leave for later
            }else{
                //straight curve
                const startingPoint = new Point(0, 0);
                const beforeTurnPoint = new Point(0, 0);
                const afterTurnPoint = new Point(0, 0);
                const endingPoint = new Point(0, 0);

                const offset = (from.get("position") as number)*2/100;

                if((from.get("position") as number) < (to.get("position") as number)){
                    startingPoint.y = (from.get("position") as number + 1)/(this.numberOfItems+2)*this.height + this.taskHeight - this.taskpadding;
                }else{
                    startingPoint.y = (from.get("position") as number + 1)/(this.numberOfItems+2)*this.height + this.taskpadding;
                }
                
                if(toDate>=fromEndDate){
                    startingPoint.x = fromStartDate*this.width*(1-this.groupColumnSize) + this.width*this.groupColumnSize + (fromEndDate - fromStartDate)*this.width*(1-this.groupColumnSize)*(0.75 + offset);
                }else{
                    startingPoint.x = fromStartDate*this.width*(1-this.groupColumnSize) + this.width*this.groupColumnSize + (toDate - fromStartDate)*this.width*(1-this.groupColumnSize)*(0.75 + offset);
                }

                endingPoint.x =  toDate*this.width*(1-this.groupColumnSize) + this.width*this.groupColumnSize;
                endingPoint.y = (to.get("position") as number + 1)/(this.numberOfItems+2)*this.height + this.taskHeight/2.0;

                if((to.get("type") as string) == "milestone"){
                    endingPoint.x -= this.taskHeight*0.65;
                }

                beforeTurnPoint.x = startingPoint.x;
                if((from.get("position") as number) < (to.get("position") as number)){
                    beforeTurnPoint.y = endingPoint.y - this.taskHeight/2.0 - this.taskpadding;
                }else{
                    beforeTurnPoint.y = endingPoint.y + this.taskHeight/2.0 + this.taskpadding;
                }

                afterTurnPoint.x = Math.min(startingPoint.x + this.taskHeight, endingPoint.x);
                afterTurnPoint.y = endingPoint.y;

                const controlBeforeTurnPoint = new Point(beforeTurnPoint.x, afterTurnPoint.y);
                const controlAfterTurnPoint = controlBeforeTurnPoint.Add(0, 0);
                
                path =  "M" + startingPoint + " " +
                        "L" + beforeTurnPoint + " " +
                        "C" + controlBeforeTurnPoint + " " + controlAfterTurnPoint + " " + afterTurnPoint + " " +
                        "L" + endingPoint;
                
                paths.push([path, from.get("class") as string + " path"]);

                const arrowHead =   "M" + endingPoint + " " +
                                    "L" + endingPoint.Add(-10,5) + " " +
                                    "L" + endingPoint.Add(-10,-5) + " " +
                                    "Z";
                
                paths.push([arrowHead, from.get("class") as string + " arrow-head"]);
            }
        });

        return paths;
    }

    BuildOnclickEvent(eventId: string):string{
        const event = Enumerable.AsEnumerable(this.ganttInfo.events).FirstOrDefault((e) => e.TaskId==eventId);
        if(event == null) return "none;"
        if(event.TaskId == null || event.TaskId=="") return "none;"

        const urlRegEx = new RegExp("(http(s)?:\\/\\/.)?(www\\.)?[-a-zA-Z0-9@:%._\\+~#=]{2,256}\\.[a-z]{2,6}\\b([-a-zA-Z0-9@:%_\\+.~#?&//=]*)");
        const obsidianRegexp = new RegExp("obsidian:\\/\\/open?\\b([-a-zA-Z0-9()!@:%_\\+.~#?&\\/\\/=]*)");
        if((!urlRegEx.test(event.URL)) && (!obsidianRegexp.test(event.URL))) throw new Error("Error generating event. The URL is incorrect '" + event.URL + "'");
        if(event.Type == EventType.GoTo) return "document.location=\"" + event.URL + "\"";

        if(event.Type == EventType.Popup) return "alert(\"Popup not supported yet.\")";

        throw new Error("Event Type '" + event.Type + "' Not yet supported.");
    }

    InsertLineBreaks(name:string, maxTextWidth: number): string{
        const lines: number = Math.ceil(name.length/maxTextWidth);
        const nameParts: Array<string> = [];
        for (let i = 0; i < lines; i++) {
            const namePart = name.substring(i*maxTextWidth, (i+1)*maxTextWidth);
            const index = namePart.lastIndexOf(" ");
            
            if(i+1==lines){
                nameParts.push(namePart);
            }else if(index==-1){
                nameParts.push(namePart + "\\n");
            }else{
                nameParts.push(
                    namePart.substring(0,index) + 
                    "\\n" +
                    namePart.substring(index+1,namePart.length)
                )
            }
        }
        return nameParts.join("");
    }
}

class Point{
    public x: number;
    public y: number;

    constructor(x:number, y:number){
        this.x=x;
        this.y=y;
    }

    public Add(x: number, y:number):Point{
        return new Point(this.x+x, this.y+y);
    }

    public toString = (): string => this.x.toFixed(0) + " " + this.y.toFixed(0);
}