# Combobox Keyboard and Focus Behavior

	1.	Typing Characters
	•	Typing a letter when an item is selected should append the character to the search input and move focus to the input.
	2.	Arrow Key Navigation
	•	Down Arrow from Search Box: Moves focus to the first item in the first group.
	•	Up Arrow from Search Box: Moves to the last item in the last group.
	•	Up Arrow from First Item in a group while a combobox item has focus: Goes to the last item of the previous group
	•	Up Arrow from First Item in the first group: Moves focus back to the search input.
	•	Up Arrow at Top of View while a combobox item has focus: Scrolls up one row; the row above becomes selected and remains at the top of the viewport.
	•	Down Arrow at Bottom of View while a combobox item has focus: Scrolls down one row; the row below becomes selected and remains at the bottom of the viewport.
	•	Down Arrow from last row of the last group: Goes to the search input.
	•	Down Arrow from Group Buttons: Selects the first row in the next uncollapsed group, if there is one, and it is selected. If there is no next uncollapsed group, goes to the search input.
	•	Up Arrow from Group Buttons: Selects the last row in the previous uncollapsed group, if there is one, and it is selected. If there is no previous uncollapsed group, goes to the search input
	•	Left and right Arrow from a group button goes to the other group button 
	3.	Tab and Shift-Tab Navigation
	•	From Search Input:
a) Press tab: Go to Expand/Collapse button in the first group
b) Press tab: Go to Sort button in the group
c) Press tab: If the group is collapsed, process as if at step d; otherwise, Go to the first item in the group
d) Press tab: Go to the Expand/Collapse button in the next group
e) Repeat from b
	•	Shift-Tab from Search Input: Moves to the previous element in the form.
	•	Shift-Tab from First Group’s Expand/Collapse: Moves to the search input.
	•	Shift-Tab from Sort button: Moves to the expand/collapse button in the same group
	•	Shift-Tab from Expand/Collapse: Moves to the last item in the previous uncollapsed group, or to the search input
	•	Tab from Last Item in Last Group: Moves to the next element in the form.
	4.	Enter and Space Keys
	•	When a button has focus, the space and enter keys behave as if the button was clicked
	•	Otherwise
    - Enter: Updates the selected country and closes the combobox.
    and the button should keep focus
	  -	Space: Items in the combobox can be highlighted for two reasons: 1) hovering 2) the "current" row that is changed via the up/down arrow keys. There is a checkmark next to the selected items - in the multiple selection case, multiple items can have checkmarks next to them. When hovering over an item and the spacebar is pressed, the hovered item becomes the "current" row such that pressing the down arrow key will change the "current" row to the next row. If there is no hovered item when the spacebar is pressed, the space should be added to the search input depending on where the caret is located, with the exception that the search input self-truncates leading and trailing spaces. For example, hover over Belgium and press space. Then press the down arrow. Belize should then be the "current" item, highlighted in light purple.
	5.	Escape Key
	•	Closes the combobox without changing the selected country.

⸻

Search and Input Behavior
	6.	Search Input Debouncing
	•	After debounce, input should remain focused with caret at the end, the combobox open, and the first item in the first group selected and visible.
	7.	Search Result Display
	•	Searching for “united states” displays the country “United States” in the combobox, once in each group

⸻

Visual and Selection Behavior
	8.	On Open
	•	The previously selected item should be highlighted, selected, and visible.
	9.	Interaction with Buttons
	•	Expand/Collapse and Sort buttons should not scroll the area or change selection.
	10.	Mouse Scroll Behavior

	•	Scrolling to the bottom and releasing the mouse should leave the combobox open.
