export class Group{
    Title: string;
}

export class Milestone{
    StartDate: Date;
    Title: string;
    ID: string;
    Dependencies: Array<string>;
    Class: string;
    Progress: number;
    Group: Group;
}

export class Task extends Milestone{
    EndDate: Date;
}

export class RenderOptions{
    options: Map<string, unknown> = new Map();
}

export class GanttInfo{
    renderOptions: RenderOptions = new RenderOptions();
    groups: Array<Group> = [];
    tasks: Array<Task> = [];
    milestones: Array<Milestone> = [];
    events: Array<Event> = [];
}

export enum EventType{
    Popup = "popup",
    GoTo = "goto"
}

export class Event{
    TaskId: string;
    Type: EventType;
    URL: string;
}