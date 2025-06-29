## Down arrow

1. open combobox
2. hover over Afghanistan
3. down arrow three times

Expected: the fourth row is highlighted and it's not at the top of the viewport

## Up arrow

When I highlight the item at the bottom of the scroll area and press the up arrow, the highlighted item is one row above the bottom row of the scroll area. 

When I highlight the item at the top of the scroll area and press the down arrow, the highlighted item is one row below the top row of the scroll area. 

Requirement:

The scroll area should not scroll unless the highlighted item is at the top of the scroll area and the up arrow is pressed. The scroll area should only scroll if the highlighted item is at the bottom of the scroll area and the down arrow is pressed.

## Sticky Headers

### Visual Indicators of Success

- ✅ NO vertical lines ABOVE headers - only horizontal lines BELOW headers
- ✅ First header sticks immediately when scrolling starts
- ✅ Headers transition smoothly (push-up effect)
- ✅ No artificial padding or gaps in the content area
- ✅ The scrollbar starts at the top of the combobox regardless of the number of sticky headers 

### Test 1

1. Open the combobox 
2. Use the mouse wheel to scroll down
3. **Expected Result**: 
   - The FIRST group's header should ALWAYS remain visible at the top as a sticky header
   - It should NOT disappear when you start scrolling
4. Continue scrolling until the first group's content is completely scrolled out of view
5. **Expected Result**: The first header should always be visible and appear above the second header 

### Test 2

Repeat the above test but click drag the scrollbar down instead

### Test 3

Repeat the above test but use the down arrow key instead

### Test 4

1. open combobox
2. collapse the first header
3. up arrow 10 times

actual: Zimbabwe is highlighted , which is correct

bug: The header for the first group is overwritten by country names. If you press up arrow more times you will see different country names.
