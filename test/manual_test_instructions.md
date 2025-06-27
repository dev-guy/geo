# Manual Testing Instructions for Combobox Fixes

## Testing Issue #29 - Header Disappearing on Scroll

1. Start the Phoenix server: `mix phx.server`
2. Navigate to the application
3. Open the country combobox
4. Ensure there are multiple groups visible (e.g., countries grouped by continent)
5. Use the mouse wheel to scroll down slowly
6. **Expected Result**: The first group's header should remain visible at the top as a sticky header
7. Continue scrolling until the first group is completely scrolled out of view
8. **Expected Result**: The first header should smoothly transition out as the second group's header takes its place

## Testing Issue #30 - Large Gap Under Headers

1. Open the country combobox
2. If there's a collapse button for the first group, click it to collapse the group
3. **Expected Result**: There should be NO large gap between the second header and its first country
4. The content should flow naturally without unnecessary white space
5. Try collapsing multiple groups
6. **Expected Result**: The visible content should adjust smoothly without gaps

## Additional Tests

1. **Keyboard Navigation**: 
   - Use arrow keys to navigate through options
   - Ensure navigation works correctly with collapsed groups

2. **Search Functionality**:
   - Type in the search box
   - Ensure filtering works correctly with sticky headers

3. **Multiple Collapse/Expand**:
   - Rapidly collapse and expand groups
   - Ensure headers and padding adjust correctly each time

## Visual Indicators of Success

- ✅ Headers stick to the top when their group has visible content
- ✅ Headers disappear when their entire group is scrolled out of view
- ✅ No large gaps appear when groups are collapsed
- ✅ Smooth transitions when headers overlap during scrolling
- ✅ Content fills the available space efficiently