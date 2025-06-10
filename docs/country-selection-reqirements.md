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

4. When the tab key is pressed in the search input box, the focus should move to
  the expand/collapse button in the first group.

5. When the shift-tab key is pressed in the search input box, focus should
   go to the previous item in the form.

6. When the search input is debounced, the search input should still have
 focus with the caret at the end of the text. The combobox should be 
 open and the first item in the first group should be selected and
 visible.

7. When the escape key is pressed in combobox, it shold close and the 
   selected country should no change

8. When the enter key is pressed in the combobox, the selected country should
   be updated and the combobox should close.

9. When the enter key is pressed in the combobox, the selected country should
    be updated and the combobox should close.
    
10. When a space is typed in the combobox, it should select the  
    highlighted item but the combobox should remain open

11. Down arrow from the search box should go to the first item in the first group

12. Up arrow from the first item in the first group should go to the search box 

13. Tab from the last item in the last group should go to the next
    element in the form

14. The sort and expand/collapse buttons should not scroll the area or change the selection
o


When I scroll the combobox all the way to the bottom and let go of the mouse, the combobox closes

When I press the space over a highligheted item in a combobox, the highlighted
item is not selected and instead the item after the curretnly selected
item is selected.

When I press space in the search box, it's treated like down arrow or tab

