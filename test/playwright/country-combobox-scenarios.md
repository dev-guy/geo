
# Scenarios

1. open combobox
2. tab
3. down arrow
4. highlight Albania
5. press space

Expected: Albania in the second group is highlighted

---

1. open combobox
2. tab
3. down arrow
4. hover over Armenia
5. space
6. hover over Argentina
7. space
8. down arrow

Result: Armenia is highlighted

---

1. open combobox
2. down arrow 10 times
3. up arrow 11 times

Expected: The row at the top of the viewport should be highlighted
Actual: There are additional rows above the highlighted row

---

add a test and fix the implementaton for the following

1. open combobox
2. hover over afghanistan
3. scroll the combobox one page
4. tab
5. tab

Expected: the sort button in the first group has focus
Actual: the expand/collapse button for the second group has focus

---

add a test and fix the implementaton for the following

1. open combobox
2. down arrow
3. tab
4. tab
5. tab
6. tab
7. tab

Expected: the sort button in the second group has focus

---

1. open combobox
2. hover over Afghanistan
3. down arrow three times

Expected: the fourth row is highlighted and it's not at the top of the viewport

---

When I highlight the item at the bottom of the scroll area and press the up arrow, the highlighted item is one row above the bottom row of the scroll area. 

When I highlight the item at the top of the scroll area and press the down arrow, the highlighted item is one row below the top row of the scroll area. 

Requirement:

The scroll area should not scroll unless the highlighged item is at the top of the scroll area and the up arrow is pressed. The scroll area should only scroll if the highlighted item is at the bottom of the scroll area and the down arrow is pressed.
