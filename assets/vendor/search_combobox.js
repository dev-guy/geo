/**
 * Search Combobox
 *
 * Intercepts the search input and sends it to the backend for prioritized search.
 * Lets LiveView handle the dropdown options rendering.
 *
 * This work was derived from Mishka Chelekom Combobox version 0.0.5 in 2025.
 * https://mishka.tools/
 */
const SearchCombobox = {
  mounted() {
    this.dropdownShouldBeOpen = false; // Track dropdown state persistently
    this.init();
    this.initializeSelection();
    // Enable phx-click event handling
    // Let phx-click buttons work naturally without interference
  },

  updated() {
    // Preserve dropdown state across updates
    const dropdownEl = this.el.querySelector('[data-part="search-combobox-listbox"]');
    const wasOpen = dropdownEl && !dropdownEl.hasAttribute('hidden');
    const currentSearchValue = this.searchInput ? this.searchInput.value : '';
    const wasSearching = this.searchTerm && this.searchTerm.length > 0;

    this.init();

    // Restore dropdown state and selection after LiveView update
    // Use persistent state instead of checking DOM
    if (this.dropdownShouldBeOpen || wasSearching) {
      this.openDropdown();
    }

    // Restore search input value if it was cleared by LiveView update
    if (this.searchInput && currentSearchValue) {
      this.searchInput.value = currentSearchValue;
      this.searchTerm = currentSearchValue;
    }

    this.initializeSelection();
    // Re-enable phx-click handlers after update
    // Let phx-click buttons work naturally without interference

    // Reinitialize sticky headers if dropdown is open
    if (wasOpen || wasSearching) {
      setTimeout(() => this.initializeStickyHeaders(), 0);
    }
  },

  init() {
    // Clean up previous listeners
    if (this._cleanup) this._cleanup();

    // Cache key elements
    this.trigger = this.el.querySelector('.combobox-trigger');
    this.searchInput = this.el.querySelector('.combobox-search-input');
    this.dropdown = this.el.querySelector('[data-part="search-combobox-listbox"]');
    this.scrollArea = this.el.querySelector('.scroll-viewport');
    this.selectEl = this.el.querySelector('.combobox-select');
    this.clearButton = this.el.querySelector('[data-part="clear-combobox-button"]');

    // State
    this.searchTerm = '';
    this.debounceDelay = 500;
    this.debounceTimer = null;
    this.searchEventName = this.el.getAttribute('data-search-event') || 'search_countries';
    this.isMultiple = this.el.getAttribute('data-multiple') === 'true';

    // Track if we just cleared the value to handle race condition with LiveView updates
    if (this.justCleared === undefined) {
      this.justCleared = false;
    }

    // Keyboard navigation state
    this.isKeyboardNavigating = false;
    this.lastMouseX = 0;
    this.lastMouseY = 0;

    // Sticky headers state
    this.stickyHeaders = [];
    this.scrollHandlerBound = null;
    this.headerHeight = 0; // Will be calculated dynamically
    this.rowHeight = 0; // Will be calculated from first option

    // Make scroll area focusable
    if (this.scrollArea) {
      this.scrollArea.setAttribute('tabindex', '0');
    }

    // Setup button handlers
    this.setupClearButton();

    // Bind handlers
    this.boundToggle = event => this.toggleDropdown(event);
    this.boundSearchInput = event => this.onSearchInput(event);
    this.boundSearchKeydown = event => this.onSearchKeydown(event);
    this.boundOptionClick = event => this.onOptionClick(event);
    this.boundOptionHover = event => this.onOptionMouseEnter(event);
    this.boundGlobalKeydown = event => this.onGlobalKeydown(event);
    this.boundDocumentClick = event => this.onDocumentClick(event);
    this.boundMouseMove = event => this.onMouseMove(event);
    this.boundWheel = event => this.onWheel(event);

    // Attach event listeners
    this.trigger?.addEventListener('click', this.boundToggle);
    this.searchInput?.addEventListener('input', this.boundSearchInput);
    this.searchInput?.addEventListener('keydown', this.boundSearchKeydown);
    this.dropdown?.addEventListener('click', this.boundOptionClick, true); // Use capture phase
    this.dropdown?.addEventListener('mouseover', this.boundOptionHover);
    this.scrollArea?.addEventListener('wheel', this.boundWheel, { passive: false });
    document.addEventListener('keydown', this.boundGlobalKeydown);
    document.addEventListener('click', this.boundDocumentClick);
    document.addEventListener('mousemove', this.boundMouseMove);

    // Save cleanup
    this._cleanup = () => {
      this.trigger?.removeEventListener('click', this.boundToggle);
      this.searchInput?.removeEventListener('input', this.boundSearchInput);
      this.searchInput?.removeEventListener('keydown', this.boundSearchKeydown);
      this.dropdown?.removeEventListener('click', this.boundOptionClick, true); // Remove from capture phase
      this.dropdown?.removeEventListener('mouseover', this.boundOptionHover);
      this.scrollArea?.removeEventListener('wheel', this.boundWheel);
      document.removeEventListener('keydown', this.boundGlobalKeydown);
      document.removeEventListener('click', this.boundDocumentClick);
      document.removeEventListener('mousemove', this.boundMouseMove);
      // Clean up clear button handler
      if (this.clearButton && this.boundClearClick) {
        this.clearButton.removeEventListener('click', this.boundClearClick);
      }
      // Clean up scroll handler
      if (this.scrollArea && this.scrollHandlerBound) {
        this.scrollArea.removeEventListener('scroll', this.scrollHandlerBound);
      }
    };
  },

  toggleDropdown(event) {
    // Don't toggle if this was a header button click
    if (event._isHeaderButtonClick) {
      return;
    }

    // Don't toggle if clicking on a phx-click button or the clear button
    const clickedButton = event.target.closest('button');
    if (clickedButton && (clickedButton.hasAttribute('phx-click') || clickedButton === this.clearButton)) {
      return;
    }

    // Don't toggle if clicking inside the dropdown itself
    if (this.dropdown && this.dropdown.contains(event.target)) {
      return;
    }

    event.preventDefault();
    if (this.dropdown.hasAttribute('hidden')) {
      this.openDropdown();
    } else {
      this.closeDropdown();
    }
  },

  openDropdown() {
    this.dropdownShouldBeOpen = true; // Mark that dropdown should be open
    this.dropdown.removeAttribute('hidden');
    this.trigger.setAttribute('aria-expanded', 'true');
    this.adjustHeight();
    this.ensureHighlight();

    // Initialize mouse position to prevent unwanted hover events
    this.lastMouseX = 0;
    this.lastMouseY = 0;
    this.isKeyboardNavigating = false;

    // Move focus to combobox scroll area so ctrl+arrow is captured
    if (this.scrollArea) {
      this.scrollArea.focus({ preventScroll: true });
    } else {
      this.searchInput.focus({ preventScroll: true });
    }

    // Initialize sticky headers
    this.initializeStickyHeaders();

    // Trigger initial scroll handler to set correct header visibility
    if (this.handleScroll) {
      setTimeout(() => this.handleScroll(), 0);
    }
  },

  closeDropdown() {
    this.dropdownShouldBeOpen = false; // Mark that dropdown should be closed
    this.dropdown.setAttribute('hidden', 'true');
    this.trigger.setAttribute('aria-expanded', 'false');
  },

  onSearchInput(event) {
    const value = event.target.value;
    this.searchTerm = value;

    // Ensure dropdown is open when typing
    if (this.dropdown.hasAttribute('hidden')) {
      this.openDropdown();
    }

    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      // Check if there's a target specified
      const target = this.el.getAttribute('phx-target');
      if (target) {
        this.pushEventTo(target, this.searchEventName, { value });
      } else {
        this.pushEvent(this.searchEventName, { value });
      }
    }, this.debounceDelay);
  },

  onSearchKeydown(event) {
    const { key, shiftKey } = event;
    if (key === 'ArrowDown' || key === 'ArrowUp') {
      event.preventDefault();
      this.navigateOptions(key === 'ArrowDown' ? 'down' : 'up');
    } else if (key === 'Enter') {
      event.preventDefault();
      this.selectCurrent();
    } else if (key === 'Escape') {
      event.preventDefault();
      this.closeDropdown();
    } else if (key === ' ' || (shiftKey && key === ' ')) {
      event.preventDefault();
      if (this.isOverScroll(event)) {
        this.pageScroll(shiftKey ? 'up' : 'down');
      } else {
        const newVal = this.searchInput.value + ' ';
        this.searchInput.value = newVal;
        this.onSearchInput({ target: this.searchInput });
      }
    }
  },

  onGlobalKeydown(event) {
    const isDropdownHidden = this.dropdown.hasAttribute('hidden');
    const isComboboxFocused = this.el.contains(document.activeElement);

    // If dropdown is closed but combobox is focused, handle arrow keys to open dropdown
    if (isDropdownHidden && isComboboxFocused && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
      event.preventDefault();
      this.openDropdown();
      return;
    }

    // If dropdown is closed and combobox is not focused, ignore other keys
    if (isDropdownHidden) return;

    const printable = event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey;
    if (printable || ['Backspace', 'Delete'].includes(event.key)) {
      event.preventDefault();
      this.searchInput.focus();
      if (printable) {
        this.searchInput.value += event.key;
      } else {
        this.searchInput.value = this.searchInput.value.slice(0, -1);
      }
      this.onSearchInput({ target: this.searchInput });
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      this.navigateOptions(event.key === 'ArrowDown' ? 'down' : 'up');
    } else if (event.key === 'Enter') {
      event.preventDefault();
      this.selectCurrent();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      this.closeDropdown();
    }
  },

  navigateOptions(direction) {
    this.isKeyboardNavigating = true;

    // Get all navigable elements (options and group headers)
    // Note: We ignore visibility:hidden because that's only used for scroll positioning,
    // not for actual availability of options
    const visibleOpts = Array.from(this.el.querySelectorAll('.combobox-option, .group-label')).filter(el => {
      const style = window.getComputedStyle(el);
      return style.display !== 'none';
    });

    if (!visibleOpts.length) return;

    // Disable hover effects for all options until there's a new hover event
    const allOpts = Array.from(this.el.querySelectorAll('.combobox-option'));
    allOpts.forEach(opt => opt.classList.add('no-hover'));

    let current = this.el.querySelector('[data-combobox-navigate]');
    let idx = current ? visibleOpts.indexOf(current) : -1;

    // If no current option is highlighted
    if (idx === -1) {
      if (direction === 'down') {
        // Down arrow: start from the first element (header or option)
        this.highlight(visibleOpts[0]);
      } else {
        // Up arrow: start from the last element (header or option)
        this.highlight(visibleOpts[visibleOpts.length - 1]);
      }
      return;
    }

    // Calculate next index WITH wrapping
    let next = direction === 'down'
      ? visibleOpts[(idx + 1) % visibleOpts.length]
      : visibleOpts[(idx - 1 + visibleOpts.length) % visibleOpts.length];
    this.highlight(next);
  },

  highlight(element) {
    // Remove navigation attribute from all elements to clear any previous highlighting
    this.el.querySelectorAll('[data-combobox-navigate]').forEach(o => {
      o.removeAttribute('data-combobox-navigate');
      // Force removal of any hover states that might persist
      o.blur();
    });
    element.setAttribute('data-combobox-navigate', '');

    // Only focus if it's an option (headers aren't focusable)
    if (element.classList.contains('combobox-option')) {
      element.focus({ preventScroll: true });
    }

    // Custom scroll behavior to account for sticky headers
    this.scrollToOption(element);
  },

  scrollToOption(option) {
    if (!this.scrollArea || !option) return;

    // Check if this is a sticky header
    const isHeader = option.classList.contains('group-label');
    if (isHeader) {
      // For sticky headers, we need to scroll to their parent group instead
      const group = option.closest('.option-group');
      if (group) {
        // Find the first option in this group
        const firstOption = group.querySelector('.combobox-option');
        if (firstOption) {
          // Scroll to show the first option of the group
          option = firstOption;
        } else {
          // If no options in group, just scroll to top
          this.scrollArea.scrollTop = 0;
          return;
        }
      }
    }

    // Get viewport information
    const { viewportTop, viewportBottom } = this.getEffectiveViewport();
    const scrollRect = this.scrollArea.getBoundingClientRect();
    const optionRect = option.getBoundingClientRect();

    // Calculate option position relative to scroll area
    const optionTop = optionRect.top - scrollRect.top;
    const optionBottom = optionRect.bottom - scrollRect.top;

    const padding = 8;

    // If option is above the visible area (hidden by sticky headers)
    if (optionTop < viewportTop + padding) {
      // Calculate how much to scroll up to show the option below sticky headers
      const scrollUpAmount = (viewportTop + padding) - optionTop;
      const oldScrollTop = this.scrollArea.scrollTop;
      const newScrollTop = Math.max(0, oldScrollTop - scrollUpAmount);
      this.scrollArea.scrollTop = newScrollTop;
    }
    // If option is below the visible area
    else if (optionBottom > viewportBottom - padding) {
      // Calculate how much to scroll down to show the option at the bottom
      const scrollDownAmount = optionBottom - (viewportBottom - padding);
      const maxScrollTop = this.scrollArea.scrollHeight - this.scrollArea.clientHeight;
      const oldScrollTop = this.scrollArea.scrollTop;
      const newScrollTop = Math.min(maxScrollTop, oldScrollTop + scrollDownAmount);
      this.scrollArea.scrollTop = newScrollTop;
    }
  },

  getEffectiveViewport() {
    if (!this.scrollArea) {
      return {
        viewportTop: 0,
        viewportBottom: 0,
        effectiveHeight: 0,
        maxVisibleRows: 0,
      };
    }

    const totalHeight = this.scrollArea.clientHeight;

    if (!this.stickyHeaders.length) {
      const effectiveHeight = totalHeight;
      return {
        viewportTop: 0,
        viewportBottom: totalHeight,
        effectiveHeight: effectiveHeight,
        maxVisibleRows: this.calculateMaxVisibleRows(effectiveHeight),
      };
    }

    // Calculate how much space is taken up by currently visible sticky headers
    const scrollRect = this.scrollArea.getBoundingClientRect();
    let visibleHeadersCount = 0;

    // Count headers that are currently sticky (visible at the top)
    for (let i = 0; i < this.stickyHeaders.length; i++) {
      const item = this.stickyHeaders[i];
      const group = item.group;
      const groupRect = group.getBoundingClientRect();
      const groupTopRelativeToScroll = groupRect.top - scrollRect.top;

      // A header becomes sticky when its group reaches the position where
      // previous headers are already stacked
      const headerStickyPosition = i * this.headerHeight;

      if (groupTopRelativeToScroll <= headerStickyPosition) {
        visibleHeadersCount++;
      } else {
        // If this header isn't sticky yet, no later headers will be either
        break;
      }
    }

    const stickyHeadersSpace = visibleHeadersCount * this.headerHeight;
    const effectiveHeight = totalHeight - stickyHeadersSpace;

    return {
      viewportTop: stickyHeadersSpace,
      viewportBottom: totalHeight,
      effectiveHeight: effectiveHeight,
      maxVisibleRows: this.calculateMaxVisibleRows(effectiveHeight),
    };
  },

  calculateMaxVisibleRows(effectiveHeight) {
    // Get row height from the first option if not calculated yet
    if (this.rowHeight === 0) {
      this.rowHeight = this.getRowHeight();
    }

    if (this.rowHeight === 0) {
      return 0; // No options available yet
    }

    // Calculate how many complete rows can fit
    return Math.floor(effectiveHeight / this.rowHeight);
  },

  getRowHeight() {
    // Find the first option to measure its height
    const firstOption = this.el.querySelector('.combobox-option');
    if (!firstOption) {
      return 0;
    }

    // Get the computed height including margins
    const rect = firstOption.getBoundingClientRect();
    const styles = window.getComputedStyle(firstOption);
    const marginTop = parseFloat(styles.marginTop) || 0;
    const marginBottom = parseFloat(styles.marginBottom) || 0;

    return rect.height + marginTop + marginBottom;
  },

  selectCurrent() {
    const curr = this.el.querySelector('[data-combobox-navigate]');
    // Only click if it's an option (not a header)
    if (curr && curr.classList.contains('combobox-option')) {
      curr.click();
    }
  },

  onOptionMouseEnter(event) {
    // Only respond to hover if we're not in keyboard navigation mode
    // or if the mouse has actually moved since keyboard navigation
    if (this.isKeyboardNavigating) {
      const currentX = event.clientX;
      const currentY = event.clientY;
      const mouseMoved = Math.abs(currentX - this.lastMouseX) > 2 || Math.abs(currentY - this.lastMouseY) > 2;

      if (!mouseMoved) {
        return; // Ignore hover events during keyboard navigation
      }

      // Mouse moved, exit keyboard navigation mode and re-enable hover
      this.isKeyboardNavigating = false;
      // Remove no-hover class from all options to re-enable hover effects
      const opts = Array.from(this.el.querySelectorAll('.combobox-option'));
      opts.forEach(opt => opt.classList.remove('no-hover'));
    }

    const opt = event.target.closest('.combobox-option');
    if (!opt) return;
    this.scrollArea && this.scrollArea.focus({ preventScroll: true });
    this.highlight(opt);
  },

  onMouseMove(event) {
    // If mouse moves significantly, exit keyboard navigation mode
    if (this.isKeyboardNavigating) {
      const mouseMoved = Math.abs(event.clientX - this.lastMouseX) > 5 || Math.abs(event.clientY - this.lastMouseY) > 5;
      if (mouseMoved) {
        this.isKeyboardNavigating = false;
        // Re-enable hover effects when mouse moves significantly
        const opts = Array.from(this.el.querySelectorAll('.combobox-option'));
        opts.forEach(opt => opt.classList.remove('no-hover'));
      }
    }

    // Track mouse position for hover detection
    this.lastMouseX = event.clientX;
    this.lastMouseY = event.clientY;
  },

  onWheel(event) {
    if (!this.scrollArea) return;

    const { deltaY } = event;
    const { scrollTop, scrollHeight, clientHeight } = this.scrollArea;
    const maxScrollTop = scrollHeight - clientHeight;

    // Check if we're at the scroll boundaries
    const isAtTop = scrollTop <= 0;
    const isAtBottom = scrollTop >= maxScrollTop;

    // Prevent event bubbling if we're trying to scroll beyond boundaries
    if ((deltaY < 0 && isAtTop) || (deltaY > 0 && isAtBottom)) {
      event.preventDefault();
      event.stopPropagation();
    }
  },

  pageScroll(direction) {
    // Calculate effective scrollable height accounting for sticky headers
    const { maxVisibleRows } = this.getEffectiveViewport();

    // Scroll by 80% of visible rows, but at least 3 rows
    const rowsToScroll = Math.max(3, Math.floor(maxVisibleRows * 0.8));
    const rowHeight = this.rowHeight || this.getRowHeight();
    const delta = rowsToScroll * rowHeight;

    this.scrollArea.scrollBy({ top: direction === 'down' ? delta : -delta, behavior: 'smooth' });
  },

  adjustHeight() {
    const rect = this.dropdown.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const spaceBelow = viewportHeight - rect.top;

    // Calculate actual heights of fixed elements in dropdown
    const fixedElementsHeight = this.calculateFixedElementsHeight();

    // Ensure a reasonable max height that allows for scrolling
    // Cap at 300px or available space, whichever is smaller
    const availableHeight = spaceBelow - fixedElementsHeight;
    const maxHeight = Math.max(100, Math.min(300, availableHeight));
    this.scrollArea.style.maxHeight = `${maxHeight}px`;
    this.scrollArea.style.height = `${maxHeight}px`;

    // Remove height constraints from content container to allow scrolling
    // and remove overflow styles to let the outer scroll area handle scrolling
    const contentContainer = this.scrollArea.firstElementChild;
    if (contentContainer) {
      contentContainer.style.maxHeight = 'none';
      contentContainer.style.overflow = 'visible';
      contentContainer.style.overflowY = 'visible';
    }
  },

  calculateFixedElementsHeight() {
    // TODO memoize
    // Get the actual computed styles and dimensions of fixed elements
    const dropdownStyles = window.getComputedStyle(this.dropdown);
    const dropdownPaddingTop = parseFloat(dropdownStyles.paddingTop) || 0;
    const dropdownPaddingBottom = parseFloat(dropdownStyles.paddingBottom) || 0;

    // Find the search input container (mt-1 mb-2 mx-1.5)
    const searchContainer = this.dropdown.querySelector('.mt-1.mb-2');
    let searchContainerHeight = 0;
    if (searchContainer) {
      const containerStyles = window.getComputedStyle(searchContainer);
      const marginTop = parseFloat(containerStyles.marginTop) || 0;
      const marginBottom = parseFloat(containerStyles.marginBottom) || 0;
      const containerHeight = searchContainer.offsetHeight || 0;
      searchContainerHeight = marginTop + marginBottom + containerHeight;
    }

    // Add some bottom margin from viewport for visual breathing room
    const viewportMargin = 20;

    return dropdownPaddingTop + dropdownPaddingBottom + searchContainerHeight + viewportMargin;
  },

  isOverScroll(event) {
    const r = this.scrollArea.getBoundingClientRect();
    return event.clientX >= r.left && event.clientX <= r.right && event.clientY >= r.top && event.clientY <= r.bottom;
  },

  ensureHighlight() {
    const curr = this.el.querySelector('[data-combobox-navigate]');
    if (curr) return;

    // First try to highlight the selected option
    const selected = this.el.querySelector('.combobox-option[data-combobox-selected]');
    if (selected) {
      this.highlight(selected);
      return;
    }

    // Highlight the first visible option
    const first = this.getFirstVisibleOption();
    first && this.highlight(first);
  },

  getFirstVisibleOption() {
    // Get all visible navigable elements (options and headers)
    const elements = Array.from(this.el.querySelectorAll('.combobox-option, .group-label')).filter(el => {
      const style = window.getComputedStyle(el);
      return style.display !== 'none';
    });

    if (!elements.length) return null;

    // If no sticky headers, just return the first visible element
    if (!this.stickyHeaders.length) {
      return elements[0];
    }

    // Find the first element that would be visible (not hidden behind sticky headers)
    const { viewportTop } = this.getEffectiveViewport();
    const scrollRect = this.scrollArea.getBoundingClientRect();

    for (const element of elements) {
      const elementRect = element.getBoundingClientRect();

      // If element's bottom edge is below the sticky headers, it's visible
      if (elementRect.bottom - scrollRect.top > viewportTop) {
        return element;
      }
    }

    // Fallback to first visible element if none are found
    return elements[0];
  },

  onOptionClick(event) {
    // Check if this is a header button click - mark it to prevent dropdown closing
    const headerButton = event.target.closest('button[data-is-header-button="true"]');
    if (headerButton) {
      // Mark the event so other handlers know not to close the dropdown
      event._isHeaderButtonClick = true;
      // Let the event continue to LiveView
      return;
    }

    // First check if this is a LiveView button - don't interfere with those
    const button = event.target.closest('button[phx-click]');
    if (button) {
      // Don't process this as an option click - let it bubble to LiveView
      // The key is to not call event.preventDefault() for these buttons
      return;
    }

    // Check if click is on a group header - don't close dropdown
    const groupHeader = event.target.closest('.group-label');
    if (groupHeader) {
      // Don't process header clicks as option selections
      return;
    }

    // Handle option clicks
    const option = event.target.closest('.combobox-option');
    if (option && !option.hasAttribute('disabled')) {
      event.preventDefault();
      const value = option.getAttribute('data-combobox-value');
      this.selectOption(option, value);
    }
  },

  onDocumentClick(event) {
    // Don't close if clicking any button inside the combobox (including phx-click buttons)
    if (this.el.contains(event.target) && event.target.closest('button')) {
      return;
    }

    // Close dropdown when clicking outside the combobox
    if (!this.el.contains(event.target)) {
      this.closeDropdown();
    }
  },

  selectOption(option, value) {
    if (this.isMultiple) {
      this.toggleMultipleSelection(option, value);
    } else {
      this.setSingleSelection(option, value);
      // Close dropdown after single selection
      this.closeDropdown();
    }
  },

  setSingleSelection(option, value) {
    // Update visual selection
    this.el.querySelectorAll('.combobox-option[data-combobox-selected]')
      .forEach(opt => opt.removeAttribute('data-combobox-selected'));
    option?.setAttribute('data-combobox-selected', '');

    // Update form value
    if (this.selectEl) {
      this.selectEl.value = value;
      // Dispatch both change and input events to ensure LiveView updates
      this.selectEl.dispatchEvent(new Event('change', { bubbles: true }));
      this.selectEl.dispatchEvent(new Event('input', { bubbles: true }));
    }

    // Update display
    this.updateSingleDisplay(option);

    // Clear search term after selection and refresh dropdown content
    if (this.searchInput) {
      this.searchInput.value = '';
      this.searchTerm = '';
      // Trigger search event with empty value to show all options
      this.onSearchInput({ target: this.searchInput });
    }
  },

  toggleMultipleSelection(_option, value) {
    const selectOption = Array.from(this.selectEl.options).find(opt => opt.value === value);
    const isSelected = selectOption?.selected;

    if (isSelected) {
      selectOption.selected = false;
    } else {
      if (!selectOption) {
        const newOption = document.createElement('option');
        newOption.value = value;
        newOption.textContent = value;
        this.selectEl.appendChild(newOption);
        newOption.selected = true;
      } else {
        selectOption.selected = true;
      }
    }

    this.updateMultipleDisplay();
    // Dispatch both change and input events to ensure LiveView updates
    this.selectEl.dispatchEvent(new Event('change', { bubbles: true }));
    this.selectEl.dispatchEvent(new Event('input', { bubbles: true }));
  },

  initializeSelection() {
    if (!this.selectEl) return;

    // If we just cleared, ignore the stale value and keep the button hidden
    if (this.justCleared) {
      this.updateSingleDisplay(null);
      // Reset the flag after the first update cycle
      this.justCleared = false;
      return;
    }

    const currentValue = this.selectEl.value;

    if (currentValue && currentValue !== '') {
      const option = this.el.querySelector(`.combobox-option[data-combobox-value="${currentValue}"]`);
      if (option) {
        option.setAttribute('data-combobox-selected', '');
        this.updateSingleDisplay(option);
      } else {
        // Value exists but option not found in current view, still show clear button
        this.updateSingleDisplay({value: currentValue}); // Pass a pseudo-option to show clear button
      }
    } else {
      // No value selected, ensure display reflects this
      this.updateSingleDisplay(null);
    }
  },

  updateSingleDisplay(selectedOption) {
    const placeholder = this.el.querySelector('.combobox-placeholder');
    const clearButton = this.el.querySelector('[data-part="clear-combobox-button"]');

    if (placeholder) {
      placeholder.classList.toggle('hidden', !!selectedOption);
    }

    if (clearButton) {
      // When selectedOption is null/undefined, we want to hide the clear button
      // When selectedOption exists, we want to show the clear button
      if (selectedOption) {
        clearButton.removeAttribute('hidden');
      } else {
        clearButton.setAttribute('hidden', 'true');
      }
    }
  },

  updateMultipleDisplay() {
    // Multiple display is handled by LiveView
  },

  triggerChange() {
    // Trigger form change event for LiveView
    const form = this.selectEl?.form;
    if (form) {
      form.dispatchEvent(new Event('change', { bubbles: true }));
    }
  },

  setupClearButton() {
    if (!this.clearButton) return;

    // Remove existing handler to avoid duplicates
    if (this.boundClearClick) {
      this.clearButton.removeEventListener('click', this.boundClearClick);
    }

    this.boundClearClick = (event) => this.handleClearClick(event);
    this.clearButton.addEventListener('click', this.boundClearClick);
  },

  handleClearClick(event) {
    event.preventDefault();
    event.stopPropagation();

    // Set flag to handle race condition with LiveView updates
    this.justCleared = true;

    // Clear the selection
    if (this.selectEl) {
      this.selectEl.value = '';
      // Dispatch both change and input events to ensure LiveView updates
      this.selectEl.dispatchEvent(new Event('change', { bubbles: true }));
      this.selectEl.dispatchEvent(new Event('input', { bubbles: true }));
    }

    // Clear search input
    if (this.searchInput) {
      this.searchInput.value = '';
      this.searchTerm = '';
    }

    // Remove visual selection
    this.el.querySelectorAll('.combobox-option[data-combobox-selected]')
      .forEach(opt => opt.removeAttribute('data-combobox-selected'));

    // Update display immediately
    this.updateSingleDisplay(null);

    // Focus search input but don't open dropdown
    this.searchInput?.focus({ preventScroll: true });

    // Don't trigger search input event - this would open the dropdown
    // The clear action should just clear the selection without opening the dropdown
  },

  enablePhxClickHandlers() {
    // Ensure all phx-click buttons in the dropdown work by stopping propagation
    // This prevents the dropdown from closing when clicking these buttons
    const phxButtons = this.el.querySelectorAll('button[phx-click]');
    phxButtons.forEach(button => {
      // Skip clear button as it has its own handler
      if (button === this.clearButton) return;

      // Remove any existing handler to avoid duplicates
      if (button._phxClickHandler) {
        button.removeEventListener('click', button._phxClickHandler);
      }

      // Add handler that ensures the event reaches LiveView
      button._phxClickHandler = () => {
        // Stop the event from bubbling to parent handlers that might close the dropdown
        // Don't stop propagation - LiveView needs the event to bubble up
        // But don't prevent default - let LiveView handle the phx-click
      };

      button.addEventListener('click', button._phxClickHandler);
    });
  },

  initializeStickyHeaders() {
    if (!this.scrollArea) return;

    // Find all group headers within the dropdown
    const groups = this.dropdown.querySelectorAll('.option-group');
    this.stickyHeaders = [];

    groups.forEach((group, index) => {
      const header = group.querySelector('.group-label');
      if (header) {
        this.stickyHeaders.push({
          group: group,
          header: header,
          originalTop: 0,
          index: index,
        });
      }
    });

    // Set up scroll handler if we have headers
    if (this.stickyHeaders.length > 0) {
      this.setupStickyHeaders();

      // Bind scroll handler
      this.scrollHandlerBound = () => this.handleScroll();
      this.scrollArea.addEventListener('scroll', this.scrollHandlerBound);
    }
  },

  setupStickyHeaders() {
    // Style the scroll container to allow sticky positioning
    if (this.scrollArea) {
      // Get the wrapper that contains the actual content
      const contentWrapper = this.scrollArea.querySelector('.px-1\\.5');
      if (contentWrapper) {
        contentWrapper.style.position = 'relative';
      }
    }

    // Calculate header height from the first header if available
    if (this.stickyHeaders.length > 0) {
      const firstHeader = this.stickyHeaders[0].header;
      // Apply basic styles first to get accurate measurements
      firstHeader.style.marginTop = '0';
      firstHeader.style.marginBottom = '0';
      firstHeader.style.paddingLeft = '0.75rem';
      firstHeader.style.paddingRight = '0.75rem';

      // Force a layout to get accurate height
      firstHeader.getBoundingClientRect();
      this.headerHeight = firstHeader.offsetHeight;
    }

    // Initialize each header
    this.stickyHeaders.forEach((item, index) => {
      const header = item.header;

      // Add necessary styles to header
      header.style.position = 'sticky';
      header.style.top = `${index * this.headerHeight}px`; // Stack headers directly with no gap
      header.style.zIndex = `${1000 - index}`; // Earlier headers have higher z-index
      // Use the dropdown's background color
      const dropdownBg = window.getComputedStyle(this.dropdown).backgroundColor;
      header.style.backgroundColor = dropdownBg || 'rgb(255, 255, 255)';
      header.style.transition = 'opacity 0.2s ease-in-out';

      // Ensure headers start visible
      header.style.opacity = '1';
      header.style.visibility = 'visible';
      header.style.display = 'flex';

      // Remove all margins and ensure no gaps
      header.style.setProperty('margin-top', '0', 'important');
      header.style.setProperty('margin-bottom', '0', 'important');
      header.style.marginLeft = '0';
      header.style.marginRight = '0';

      // Remove any padding that could create gaps
      header.style.setProperty('padding-top', '0', 'important');
      header.style.setProperty('padding-bottom', '0', 'important');

      // Set inner padding for content
      header.style.paddingLeft = '0.75rem';
      header.style.paddingRight = '0.75rem'; // Match left padding for better balance

      // Ensure full width and proper sizing
      header.style.width = '100%';
      header.style.boxSizing = 'border-box';

      // Fix flex layout to prevent wrapping
      header.style.flexWrap = 'nowrap';
      header.style.alignItems = 'center';
      header.style.justifyContent = 'space-between';

      // Ensure consistent height
      header.style.height = `${this.headerHeight}px`;
      header.style.minHeight = `${this.headerHeight}px`;
      header.style.maxHeight = `${this.headerHeight}px`;

      // Add borders for better visibility
      header.style.borderTop = this.getBorderColor();
      header.style.borderBottom = this.getBorderColor();

      // Store original position and calculated height
      const rect = item.group.getBoundingClientRect();
      const scrollRect = this.scrollArea.getBoundingClientRect();
      item.originalTop = rect.top - scrollRect.top;
      item.height = this.headerHeight;
    });
  },

  getBackgroundColor() {
    // Use the dropdown's actual background color which already responds to dark mode
    if (this.dropdown) {
      const dropdownBg = window.getComputedStyle(this.dropdown).backgroundColor;
      return dropdownBg || 'rgb(255, 255, 255)';
    }
    // Fallback if dropdown is not available
    return 'rgb(255, 255, 255)';
  },

  getBorderColor() {
    // Use the dropdown's actual border color which already responds to dark mode
    if (this.dropdown) {
      const dropdownBorder = window.getComputedStyle(this.dropdown).borderColor;
      return `1px solid ${dropdownBorder || 'rgb(229, 231, 235)'}`;
    }
    // Fallback if dropdown is not available
    return '1px solid rgb(229, 231, 235)';
  },

  handleScroll() {
    if (!this.scrollArea || this.stickyHeaders.length === 0) return;

    const scrollRect = this.scrollArea.getBoundingClientRect();
    const scrollTop = this.scrollArea.scrollTop;

    // Handle each sticky header
    this.stickyHeaders.forEach((item, index) => {
      const group = item.group;
      const header = item.header;

      // Get the original position of this header's group
      const groupRect = group.getBoundingClientRect();
      const groupTop = groupRect.top - scrollRect.top + scrollTop;

      // Calculate how far the header is from its original position
      const distanceFromOrigin = scrollTop - groupTop;

      // If the header is too far from its origin (more than 5000px),
      // it won't render properly with sticky positioning
      if (distanceFromOrigin > 5000 && groupTop < scrollTop) {
        // Switch to absolute positioning
        header.style.position = 'absolute';
        header.style.top = `${scrollTop + (index * this.headerHeight)}px`;
      } else {
        // Use normal sticky positioning
        header.style.position = 'sticky';
        header.style.top = `${index * this.headerHeight}px`;
      }

      // Calculate where this header is positioned
      const headerStickyTop = index * this.headerHeight;

      // Ensure group items don't scroll above their sticky header
      const groupItems = group.querySelectorAll('.combobox-option');
      groupItems.forEach(item => {
        const itemRect = item.getBoundingClientRect();
        const itemTop = itemRect.top - scrollRect.top;

        // Hide items that would appear above their group's sticky header
        const shouldHide = itemTop < headerStickyTop + this.headerHeight;
        item.style.visibility = shouldHide ? 'hidden' : 'visible';
      });
    });
  },
};

export default SearchCombobox;
