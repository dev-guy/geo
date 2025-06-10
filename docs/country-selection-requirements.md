1. Typing a letter when an item is selected in the combobox should append that character
to the search input box and focus should be in the input box. 

2. When up arrow is pressed when the selected item is at the top of the
   view, the view should scroll up only one row and the row above the current
   row should be selected. The currently selected row should be the
   top row in the viewport. This should happen without any extraneous
   scrolling eg the viewport should **not** scroll down extra lines and
   the scroll back up

3. When the down arrow is pressed when the selected item is at the bottom of the
   view, the view should scroll up only one row and the row below the current
  row should be selected. The currenltly selected row should still be  
  the bottom row in the viewport.

5. When the shift-tab key is pressed in the search input box, focus should
   go to the previous item in the form.

6. When the search input is debounced, the search input should still have
 focus with the caret at the end of the text. The combobox should be 
 open and the first item in the first group should be selected and
 visible.

7. When the escape key is pressed in combobox, it shold close and the 
   selected country should no change

8. When the enter key is pressed in the combobox, the selected country is
   updated and the combobox closes.

10. When a space is typed in the combobox, it selects the  
    highlighted item and the combobox should remain open

11. Down arrow from the search box should go to the first item in the first group

12. Up arrow from the first item in the first group should go to the search box 

13. Tab from the last item in the last group should go to the next
    element in the form

14. The sort and expand/collapse buttons should not scroll the area or change the selection
 
15. searching for "united states" displays the united states

16. Tab order from search box: 
a) expand/collapse button, first group
b) sort button, first group
c) first item in first group
d) expand/collapse button, second group
e) sort button, second group
f) first item in second group

17. When the combobox is opened, the "selected item" for is highlighted,
selected, and visible
