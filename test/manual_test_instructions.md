# Manual Testing Instructions for Combobox Fixes

## Testing Issue #29 - Header Disappearing on Scroll

1. Start the Phoenix server: `mix phx.server`
2. Navigate to the application (http://localhost:4000)
3. Open the country combobox
4. Ensure there are multiple groups visible (e.g., countries grouped by continent)
5. **Critical**: Use the mouse wheel to scroll down slowly
6. **Expected Result**: 
   - The FIRST group's header should ALWAYS remain visible at the top as a sticky header
   - It should NOT disappear when you start scrolling
7. Continue scrolling until the first group's content is completely scrolled out of view
8. **Expected Result**: The first header should smoothly transition out (push up) as the second group's header takes its place

## Testing Issue #30 - Large Gap Between Search and First Header

1. Open the country combobox
2. **Expected Result**: There should be NO large gap between the search input and the first header
3. The first header should appear immediately below the search input with normal spacing
4. If there's a collapse button for groups, try collapsing the first group
5. **Expected Result**: The second header should move up naturally without leaving gaps

## Additional Regression Tests

1. **First Header Behavior**:
   - The first header must stick to the top when scrolling begins
   - It should only disappear when its entire group is scrolled out

2. **No Padding/Gap Issues**:
   - Check that there's no extra padding at the top of the content
   - Headers should not create artificial gaps when sticking

3. **Collapsed Groups**:
   - When a group is collapsed, its header should hide
   - The next visible group should take its sticky position without gaps

## Visual Indicators of Success

- ✅ NO gap between search input and first header
- ✅ NO vertical lines ABOVE headers - only horizontal lines BELOW headers
- ✅ First header sticks immediately when scrolling starts
- ✅ First header scrolls away naturally with its content when the entire group is scrolled out
- ✅ Headers transition smoothly when groups overlap (push-up effect)
- ✅ No artificial padding or gaps in the content area
- ✅ Collapsed groups properly hide their headers
- ✅ CSS sticky positioning works naturally without manual visibility interference