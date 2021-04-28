## Intro 2 CompetenceX 4.1.

### 2019-02-21 Jim

# Basic Info of CompetenceX

## • Author: JinHengyu

## • Browser: Chromium-based(Chrome, Opera, Safari) or Firefox

## • Theme&GUI: Material Design

# Dialog

```
First enter ur username & password in
the login-dialog them submit, u may
skip login in 24 hours.
```

```
U may click ‘Tab’ to navigate between
Buttons and Inputs & Controls (which
applies to all dialogs & menus).
```

```
click blank space around the dialog or
‘CANCEL’ button or ‘ESC’ key to
return, same as all dialogs.
```

# Main GUI

```
We have top-app-bar(top),
side-bar(right), drawer(hidden in the
left), and the main grid(center)
```

```
The main grid is similar to Excel, we
can drag & drop, expand & collapse,
filter & sort, group & aggregate,
export 2 csv/xlsx, etc.
```

```
It’s easy but powerful.
```

# Basic concepts in table head

- Person: every people/user clustered by ‘role’
- Role: a attribute containing a group of people
- Skill: every skill/competence object clustered by ‘type’
- Type: a attribute containing a group of skills
- Role Target: a number between a role and a skill
- My Target/Actual Score: a number between a person and a skill
- Actions, Action Status, Action Detail, Comment: a string between a

### people and a skill(like my-target/actual-score)

- Attention, u should be very careful in adding Roles or Types or it may confusing others!

# Side bar

```
The side bar provide some short-cut operations like filtering by
Columns or filtering by Rows, search by keywords, choose the
algorithm for aggregation, ...
```

# Drawer

```
The drawer on the left is even more simple. To toggle the open-close
Status, click the button on the top-left of the screen.
```

```
In the drawer, we have few buttons. We can login/out, set ur account,
add person/role/skill, read wiki.pdf, or send feedback to my email.
buttons in the ‘Admin’ section is used only by we admins, ignore them.
```

```
I’ll talk about ‘Account Setting’ later.
```

# Account Setting

```
In the dialog of Account Setting, multi-selection of
‘_roleList’ and ‘_typeList’ is very important
because this 2 fields determine your permission
range(or visible people and skills), so choose the
needed roles and types(as I said before, they r
group of people and skills) respectively, then hit
‘OK’ : )
```

```
Any questions contact us.
```

# Context Menu & focused object

```
The context menu can be triggered by right
clicking on any position in the grid
```

```
But the position of menu influences the focused
object:
Focused object:
Every time, there is a focused people, a focused
role and a focused skill. Each time a row is right-
clicked, the focused objects may change.
Focus object is designed to decide which object to
CURD by each operation.
```

# CURD

## • We can edit data with both embeded(in the grid) or popup

## editor(in the dialog)

## • Tips:

### The embeded editor can be triggered by RETURN or number&char keys

### or double-clicking the cell

### RETURN key to complete editing

### ESC key to cancel the editor

### TAB key to navigate between Inputs

## • Any questions about CURD contact us

# Chart

```
After editing the grid, we can
view the radar-chart between
the guy or his/her role and
skill or skill-type with
dimensions from actual-score
to role-target.
```
