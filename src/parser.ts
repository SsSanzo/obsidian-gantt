import * as Enumerable from "linq-es2015"; 
import {Task, Group, Milestone, GanttInfo, Event, EventType} from "./ganttDb";

export class Parser{

    ganttInfo: GanttInfo;
    static KEYWORD_OPTION = "option ";
    static KEYWORD_GROUP = "group ";
    static KEYWORD_TASK = "task ";
    static KEYWORD_MILESTONE = "milestone ";
    static KEYWORD_ONCLICK = "click ";
    static KEYWORD_COMMENT = "%%";
    static KEYWORD_AFTER = " after ";
    static KEYWORD_DURATION_WEEK = "W";
    static KEYWORD_DURATION_DAY = "D";
    static KEYWORD_DURATION_MONTH = "M";
    static KEYWORD_DURATION_YEAR = "Y";
    static KEYWORD_DURATION_HOUR = "H";
    static KEYWORD_DURATION_MINUTE = "m";
    static KEYWORD_DURATION_SECOND = "S";

    constructor(){
        this.ganttInfo = new GanttInfo();
    }

    Parse(text:string):GanttInfo{
        if(text == null) return this.ganttInfo;

        const lines = text.split("\n");
        let current_group: Group;

        lines.forEach(line => {

            if(line.toLocaleLowerCase().startsWith(Parser.KEYWORD_OPTION)){
                this.ParseOption(line.substring(Parser.KEYWORD_OPTION.length).trim());

            }else if(line.toLocaleLowerCase().startsWith(Parser.KEYWORD_ONCLICK)){
                this.ParseClick(line.substring(Parser.KEYWORD_ONCLICK.length).trim());

            }else if(line.toLocaleLowerCase().startsWith(Parser.KEYWORD_GROUP)){
                current_group = this.ParseGroup(line.substring(Parser.KEYWORD_GROUP.length).trim());

            }else if(line.toLocaleLowerCase().startsWith(Parser.KEYWORD_TASK)){
                this.ParseTask(line.substring(Parser.KEYWORD_TASK.length).trim(), current_group);

            }
            else if(line.toLocaleLowerCase().startsWith(Parser.KEYWORD_MILESTONE)){
                this.ParseMilestone(line.substring(Parser.KEYWORD_MILESTONE.length).trim(), current_group);

            }else if(line.startsWith(Parser.KEYWORD_COMMENT) || line.length<1){
                null;
            }else{
                throw new Error(
                    "Syntax Error... Expecting the line to start with a keyword (" + 
                    [
                        Parser.KEYWORD_COMMENT, 
                        Parser.KEYWORD_GROUP, 
                        Parser.KEYWORD_MILESTONE, 
                        Parser.KEYWORD_OPTION, 
                        Parser.KEYWORD_TASK
                    ].join(", ") + 
                    ")"
                );
            }
        });
        return this.ganttInfo;
    }

    ParseOption(line:string):void{
        const elements = Enumerable.AsEnumerable(line.split(" ")).Where((e:string) => e.length>0).ToArray();
        if(elements.length<2) return;
        const key = elements[0].toLocaleLowerCase();
        const value = elements.slice(1).join(" ");
        this.ganttInfo.renderOptions.options.set(key, value);
    }

    ParseClick(line:string):void{
        //taskId, type[goto| popup], url
        const elements = Enumerable.AsEnumerable(line.split(",")).Where((e:string) => e.length>0).ToArray();
        if(elements.length!=3) return;
        const event = new Event();
        event.TaskId = elements[0].trim();
        event.URL = elements[2].trim();
        if(!this.IDExists(event.TaskId)) throw new Error("Error on line '" + line + "'. Cannot find task or milestone '" + event.TaskId + "'");
        
        switch (elements[1].trim().toLowerCase()) {
            case EventType.GoTo:
                event.Type = EventType.GoTo
                break;
            
            case EventType.Popup:
                event.Type = EventType.Popup
                break;

            default:
                throw new Error("Error on line '" + line + "'. Event Type '" + elements[1].trim().toLowerCase() + "' not recognized. Please use another event type (" + [EventType.Popup, EventType.GoTo].join(", ") + ")");
        }
        this.ganttInfo.events.push(event);
    }

    ParseGroup(line:string):Group{
        const group = new Group();
        group.Title = line.trim();
        this.ganttInfo.groups.push(group);
        return group;
    }

    ParseTask(line:string, group:Group):void{
        //title, id, class, start date, end date, dependency, progress
        const task = new Task();
        task.Group = group;

        const elements = line.split(",");
        if(elements.length < 5 || elements.length > 7) throw new Error("Syntax Error on '" + line + "', Milestone should have 5 to 7 arguments separated by a comma.");
        if(this.IDExists(elements[1].trim())) throw new Error("DuplicateKeys on '" + line + "'. The element ID '" + elements[1].trim() + "' already exists.");
        
        task.Title = elements[0].trim();
        task.ID = elements[1].trim();
        task.Class = elements[2].trim();
        task.StartDate = this.ParseDate(elements[3].trim());
        task.EndDate = this.TryParseDuration(elements[4].trim(), task.StartDate);
        if(elements.length>5) task.Dependencies = Enumerable.asEnumerable(elements[5].trim().split(" ")).Where((e:string) => e.length>0).ToArray();
        if(elements.length>6) task.Progress = Number(elements[6].replace(" ", "").replace("%", ""))/100;

        this.ganttInfo.tasks.push(task);
    }

    ParseMilestone(line:string, group:Group):void{
        //title, id, class, date, dependency, progress
        const milestone = new Milestone();
        milestone.Group = group;
        
        const elements = line.split(",");
        if(elements.length < 4 || elements.length > 6) throw new Error("Syntax Error on '" + line + "', Milestone should have 4 to 6 arguments separated by a comma.");
        if(this.IDExists(elements[1].trim())) throw new Error("DuplicateKeys on '" + line + "'. The element ID '" + elements[1].trim() + "' already exists.");

        milestone.Title = elements[0].trim();
        milestone.ID = elements[1].trim();
        milestone.Class = elements[2].trim();
        milestone.StartDate = this.ParseDate(elements[3].trim());
        if(elements.length>4) milestone.Dependencies = Enumerable.asEnumerable(elements[4].trim().split(" ")).Where((e:string) => e.length>0).ToArray();
        if(elements.length>5) milestone.Progress = Number(elements[4].replace(" ", "").replace("%", ""))/100;
        this.ganttInfo.milestones.push(milestone);
    }

    ParseDate(date_str:string): Date{
        if(!date_str.contains(Parser.KEYWORD_AFTER) && !date_str.startsWith(Parser.KEYWORD_AFTER.trim())) return new Date(date_str);

        let elements:Array<string>;
        if(date_str.startsWith(Parser.KEYWORD_AFTER.trim())){
            elements = ["", date_str.substring(Parser.KEYWORD_AFTER.length-1)];
        }else{
            elements = date_str.split(Parser.KEYWORD_AFTER);
        }
        
        if(elements.length != 2) throw new Error("Syntax error on '" + date_str + "'. Syntax should be '1d" + Parser.KEYWORD_AFTER + "taskId' where 1d is an example of a duration (number+unit of time)");
        
        elements[0] = elements[0].trim();
        elements[1] = elements[1].trim();
        if(elements[0].length<1) elements[0] = "0" + Parser.KEYWORD_DURATION_DAY;
        
        const previousTask = Enumerable.AsEnumerable(this.ganttInfo.tasks).FirstOrDefault((task:Task) => task.ID == elements[1]);
        const previousMilestone = Enumerable.AsEnumerable(this.ganttInfo.milestones).FirstOrDefault((task:Milestone) => task.ID == elements[1]);
        
        if(previousMilestone== null && previousTask == null) throw new Error("ElementNotFound on '" + date_str + "'. Element '" + elements[1] + "' not defined as a task or milestone");
        
        let previousDate: Date;
        if(previousTask!= null) previousDate = previousTask.EndDate;
        else previousDate = previousMilestone.StartDate;
        
        return this.ParseDuration(elements[0], previousDate);
    }

    ParseDuration(duration:string, from:Date): Date{
        const keywordList = [
            Parser.KEYWORD_DURATION_WEEK, 
            Parser.KEYWORD_DURATION_DAY,
            Parser.KEYWORD_DURATION_HOUR,
            Parser.KEYWORD_DURATION_MINUTE,
            Parser.KEYWORD_DURATION_MONTH,
            Parser.KEYWORD_DURATION_SECOND,
            Parser.KEYWORD_DURATION_YEAR
        ];
        if(!Enumerable.AsEnumerable(keywordList).Any((keyword) => duration.contains(keyword))) throw new Error("UnknownUnit in '" + duration + "'. The unit should be one of the following: " + keywordList.join(", "));
        
        const keyword = duration.substring(duration.length-1);
        const amount = new Number(duration.substring(0, duration.length-1)).valueOf();
        if(Number.isNaN(amount)) throw new Error("Syntax Error on '" + amount + "'.It should be a number.");

        const date: Date = new Date(from.valueOf());
        switch (keyword) {
            case Parser.KEYWORD_DURATION_DAY:
                date.setDate(date.getDate() + amount);
                break;
            
            case Parser.KEYWORD_DURATION_HOUR:
                date.setHours(date.getHours() + amount);
                break;
            
            case Parser.KEYWORD_DURATION_MINUTE:
                date.setMinutes(date.getMinutes() + amount);
                break;
            
            case Parser.KEYWORD_DURATION_MONTH:
                date.setMonth(date.getMonth() + amount);
                break;
            
            case Parser.KEYWORD_DURATION_SECOND:
                date.setSeconds(date.getSeconds() + amount);
                break;

            case Parser.KEYWORD_DURATION_WEEK:
                date.setDate(date.getDate() + amount*7);
                break;
            
            case Parser.KEYWORD_DURATION_YEAR:
                date.setMonth(date.getMonth() + amount*12);
                break;

            default:
                break;
        }

        return date;
    }

    TryParseDuration(duration: string, from: Date): Date{
        let date: Date;
        try {
            date = this.ParseDuration(duration, from);
        } catch (error) {
            date = new Date(duration);
        }
        return date;
    }

    IDExists(ID:string): boolean{
        return Enumerable.AsEnumerable(this.ganttInfo.milestones).Any((milestone) => milestone.ID==ID) ||
                Enumerable.AsEnumerable(this.ganttInfo.tasks).Any((task) => task.ID==ID);
    }
}