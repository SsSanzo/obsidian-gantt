![[main.svg]]

# Usage

The gantt plugin generates a SVG image of a gantt chart complete with tasks, milestones, and dependencies for usage in any project. The gantt is generate by parsing the text in a code markup with the **gantt** language. Each line represent a separate *option*, *group*, *task*, *milestone*, or *event*.


```ad-example
\```gantt
Option Title My Gantt Chart!

Group This is a Group
Task task 1, t1, , 01-01-2022, 2M
Task task 2, t2, done, after t1, 1M
\```
```

![[usage.svg]]
```ad-note
The keywords are **not** case-sensitive.
```
## Options
All options need to start with an **option** keyword. 

### Title
Displays the specified title at the top of the chart
**Default value**: empty
```ad-note
title: Format
**option** **title** Text with spaces
```

### Today Marker
Display a vertical line on the time axis representing today.
**Default value**: Off
```ad-note
title: Format
**option** **todaymarker** On
```

### Axis Ticks
Changes 
**Default value**: 6
```ad-note
title: Format
**option** **axisticks** number
```
### Dependencies
Displays the dependencies
**Default value**: Off
```ad-note
title: Format
**option** **dependencies** On
```
## Groups
This is optional.
You can organize your tasks by group. All tasks and milestones defined after this group will be part of it until another group is defined.

```ad-note
title: Format
**group** text as title of the group
```
##### Example
```ad-example
\```gantt
Option Title My Gantt Chart!

Group This is a Group
Task task 1, t1, , 01-01-2022, 2M
Task task 2, t2, , after t1, 1M

Group This is another \nGroup
Task task 3, t3, , after t1, 2W
Milestone important \nmilestone, m1, , after t3
\```
```

![[group.svg]]

```ad-important
If the title of a **group**, **task** or **milestone** appear too long, you can inster a line break using the symbol **\n** as used on the example above.
```
## Tasks

### Definition
A task something to do or complete within a specified timeframe. As such a task has a Start Date, an End Date, a Title, and a Completion status. In addition, a task may have dependencies, and a progress. 
When defining a task, each parameter must be separated by a comma following the format below.

The class can be a user-defined CSS class. By default, 4 class are defined, representing different task completion status: 
- pending
- in-progress
- done
- critical

```ad-note
title: Format
**Task** title, identified, class, start date, end date, dependencies (optional), progress (optional)
```
##### Example
```ad-example
\```gantt
option dependencies On

Group Harry's Tasks
Task My Task,                          t1,           done, 01-01-2022, 2M

Group Karine's Tasks
Task My Other Task #3342,                t2, in-progress,        after t1, 06-30-2022
Task Task With Dependency,  d3,         critical, 2W after t1, 5W, t1
Task Task With Progress      ,  tp1,    pending , 01-01-2022, 3M,      ,0% 

\```
```

![[task.svg]]
### Timing
Start date and end date may be either absolute, relative or a duratin.

|               | Start Date | End Date |
| ------------- | ---------- | -------- |
| Absolute Date | Yes        | Yes      |
| Relative Date | Yes        | No       |
| Duration      | No         | Yes      |


#### Absolute Date
The system automatically recognizes the date format automatically. These formats are [IETF-compliant RFC 2822 timestamps](https://datatracker.ietf.org/doc/html/rfc2822#page-14), and also strings in a [version of ISO8601](https://www.ecma-international.org/ecma-262/11.0/#sec-date.parse).

#### Relative Date
A relative date is calculated on the fly using a delay after the end date of a **previously defined task or milestone**. The delay is optional. If the delay is not specified, the system assumes a delay of *0D*. The delay format follows the same rules as the duration below.
```ad-note
title: Format
Duration **after** taskIdentified
or
**after** taskIdentified
```

```ad-example
2W after t1
or
after t2
```
#### Duration

A duration is a number followed by the symbol of unit with no space. The units are defined as follows:

| Symbol | Unit   |
| ------ | ------ |
| Y      | Year   |
| M      | Month  |
| W      | Week   |
| D      | Day    | 
| H      | Hour   |
| m      | minute |
| S      | Second |

### Dependencies
Define to wich task or milestone this depends on. The tasks or milestones are identified by their identifier. If multiple are specified, they must be separated by a space.
The dependency inherit the class (i.e. color and style) from the originating task or milestone.
```ad-example
Task Analyze Spreadsheet, AS18, , 2W after AS11, 5W, **AS05 milestone4**
```
```ad-note
Don't forget to enable Dependencies to display them. Otherwise they will not appear.
```
```ad-warning
If the task depends on another task defined in the future, the link will not be displayed
```
### Progress
The progress is simply a percentage number. As of now, the progress is purely informative. It is planned to make it visual.


## Milestones
A Milestone is similar to a task but do not have an end date. The milestone follows the same concepts as the task.
```ad-note
title: Format
**Milestone** title, identifier, class, start date, dependencies (optional), progress (optional)
```

## Events
Events allow interactions with the tasks. As of now, only 1 interaction is available: Go To. Events can be added to either tasks or milestones. An event is defined by the  identifier of the triggering task or milestone, the type of the event and some argument depending on the type of the event.

```ad-note
title: Format
**click** taskId, EventType, arg

```
### Go To
Navigate to another page within obsidian. The URL is obtained with a **right click on the note** from the obsidian file explorer, and use the command **Copy obsidian URL**.
```ad-note
title: Format
**click** taskIdentified, **goto**, URL

```
### Popup
```ad-warning
Not yet supported
```


## Styling

### Predefined classes
| Class       | Color    |
| ----------- | -------- |
| pending     | <span style='font-weight:bold;color:#2378a0'>\#2378a0</span> |
| in-progress | <span style='font-weight:bold;color:#ff9200'>\#ff9200</span> |
| done        | <span style='font-weight:bold;color:#2da023'>\#2da023</span> |
| critical    |<span style='font-weight:bold;color:#a02323'> \#a02323</span> |

### Custom classes
To create a custom class, simply create a CSS snippet, create a class, and use-it directly in the gantt markdown.

```css
.block-language-gantt .tasks rect.in-progress,
.block-language-gantt .milestones rect.in-progress,
.block-language-gantt .dependencies path.arrow-head.in-progress {
	fill: #ff9200;
}

.block-language-gantt .dependencies path.in-progress {
	stroke: #ff9200;
}
```

### Custom Style
To customize the gantt, simply create a CSS snippet with your custom rules. You can use the following classes:
All classes are under the master class **block-language-gantt**

| Class                               | Description                                                                                         |
| ----------------------------------- | --------------------------------------------------------------------------------------------------- |
| ```grid```                          | The background grid for scale                                                                       |
| ```.group-block```                  | A group of task or milestones                                                                       |
| ```.group-block rect.even```        | The even number of groups                                                                           |
| ```.group-block rect.odd```         | The odd number of groups                                                                            |
| ```.group-block-label text```       | The label of a group                                                                                |
| ```.tasks rect```                   | A task                                                                                              |
| ```.tasks-labels text```            | A task label (carries the same custom class as the task)                                            |
| ```.milestones rect```              | A milestone                                                                                         |
| ```.milestones-labels text```       | A milestone label (carries the same custom class as the task)                                       |
| ```.today-marker line```            | Today's marker                                                                                      |
| ```.dependencies path```            | The path of a dependency (carries the same custom class as the originating class or milestone)      |
| ```.dependencies path.arrow-head``` | The arrowhead of a dependency (carries the same custom class as the originating class or milestone) |
| ```text.title```                    | The chart title                                                                                     |
# Limitations
- The Go To Event only allows navigation to other obsidian pages. External URLs are not allowed for security reasons.