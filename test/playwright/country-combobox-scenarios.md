
# Scenarios

1. open combobox
2. tab
3. down arrow
4. highlight Albania
5. press space

Expected: albania (in the second group) is highlighted

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
