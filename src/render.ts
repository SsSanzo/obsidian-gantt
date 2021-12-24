import {Task, Group, Milestone, GanttInfo} from "./ganttDb";
import * as Enumerable from "linq-es2015"; 
import * as d3 from 'd3';

export class Renderer{
    ganttInfo: GanttInfo;
    startDate: Date;
    endDate: Date;
    height: number;
    width: number;

    constructor(info: GanttInfo){
        this.ganttInfo = info;
        this.initDate();
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

    Render():Node{
        const svg = d3.create("svg");



        return svg.node();
    }
}