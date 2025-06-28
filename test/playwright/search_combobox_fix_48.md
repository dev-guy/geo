# Fix for Issue #48: Sort and Collapse Buttons Clear Search Input

## Problem Description
When using the search combobox component with grouped options, clicking the sort or collapse buttons would clear the search input. This was frustrating for users who had already typed a search query and wanted to manipulate the groups while maintaining their search.

## Root Cause
The issue occurred because:
1. When sort/collapse buttons are clicked, they trigger Phoenix events that update the component state
2. The component's `updated()` lifecycle hook is called during re-render
3. The `init()` function was resetting `this.searchTerm` to an empty string
4. Although the code attempted to restore the search value, the search term had already been cleared

## Solution
The fix involved two changes to `assets/vendor/search_combobox.js`:

### 1. Preserve search term in `updated()` function
```javascript
updated() {
  const dropdownEl = this.el.querySelector('[data-part="search-combobox-listbox"]');
  const wasOpen = dropdownEl && !dropdownEl.hasAttribute('hidden');
  
  // Preserve the current search value BEFORE init() resets it
  const currentSearchValue = this.searchInput ? this.searchInput.value : '';
  const wasSearching = this.searchTerm && this.searchTerm.length > 0;
  const preservedSearchTerm = this.searchTerm || '';

  this.init();

  // Restore the search term after init()
  if (currentSearchValue || preservedSearchTerm) {
    this.searchTerm = currentSearchValue || preservedSearchTerm;
    if (this.searchInput) {
      this.searchInput.value = this.searchTerm;
    }
  }

  if (this.dropdownShouldBeOpen || wasSearching) {
    this.openDropdown();
  }

  this.initializeSelection();

  if (wasOpen || wasSearching) {
    setTimeout(() => this.initializeStickyHeaders(), 0);
  }
}
```

### 2. Conditional reset in `init()` function
```javascript
init() {
  // ... other initialization code ...

  // Only reset searchTerm if it doesn't exist (i.e., on initial mount)
  if (this.searchTerm === undefined) {
    this.searchTerm = '';
  }
  
  // ... rest of init code ...
}
```

## Testing the Fix

### Manual Testing Steps:
1. Navigate to a page with the search combobox component that has grouped options
2. Open the dropdown
3. Type a search query (e.g., "united")
4. Click the sort button on any group
5. Verify that the search input retains "united"
6. Click the collapse/expand button on any group  
7. Verify that the search input still retains "united"

### Expected Behavior:
- The search input value should persist when clicking sort buttons
- The search input value should persist when clicking collapse/expand buttons
- The filtered results should remain filtered based on the search term
- The dropdown should remain open if it was open before clicking the buttons

## Related Files
- `assets/vendor/search_combobox.js` - JavaScript hook implementation
- `lib/geo_web/components/search_combobox.ex` - Elixir component definition

## Issue Link
https://github.com/dev-guy/geo/issues/48