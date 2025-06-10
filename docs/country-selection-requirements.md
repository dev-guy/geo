Combobox Keyboard and Focus Behavior
	1.	Typing Characters
	•	Typing a letter when an item is selected should append the character to the search input and move focus to the input.
	2.	Arrow Key Navigation
	•	Down Arrow from Search Box: Moves focus to the first item in the first group.
	•	Up Arrow from First Item: Moves focus back to the search input.
	•	Up Arrow at Top of View: Scrolls up one row; the row above becomes selected and remains at the top of the viewport.
	•	Down Arrow at Bottom of View: Scrolls down one row; the row below becomes selected and remains at the bottom of the viewport.
	•	Down Arrow from Group Buttons: Selects the first row in the group.
	•	Up Arrow from Group Buttons: Selects the first row in the previous group, or the search input if at the first group.
	3.	Tab and Shift-Tab Navigation
	•	Tab from Search Input:
a) Expand/Collapse button (first group)
b) Sort button (first group)
c) First item in first group
d) Expand/Collapse button (second group)
e) Sort button (second group)
f) First item in second group
	•	Shift-Tab from Search Input: Moves to the previous element in the form.
	•	Shift-Tab from First Group’s Expand/Collapse: Moves to the search input.
	•	Tab from Last Item in Last Group: Moves to the next element in the form.
	4.	Enter and Space Keys
	•	Enter: Updates the selected country and closes the combobox.
	•	Space: Selects the highlighted item and keeps the combobox open.
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
