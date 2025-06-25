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
    
    // Keyboard navigation state
    this.isKeyboardNavigating = false;
    this.lastMouseX = 0;
    this.lastMouseY = 0;
    
    // Sticky headers state
    this.stickyHeaders = [];
    this.scrollHandlerBound = null;

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

    // Attach event listeners
    this.trigger?.addEventListener('click', this.boundToggle);
    this.searchInput?.addEventListener('input', this.boundSearchInput);
    this.searchInput?.addEventListener('keydown', this.boundSearchKeydown);
    this.dropdown?.addEventListener('click', this.boundOptionClick, true); // Use capture phase
    this.dropdown?.addEventListener('mouseover', this.boundOptionHover);
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
      this.scrollArea.focus();
    } else {
      this.searchInput.focus();
    }
    
    // Initialize sticky headers
    this.initializeStickyHeaders();
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
    
    // Disable hover effects for all options until there's a new hover event
    const opts = Array.from(this.el.querySelectorAll('.combobox-option'));
    if (!opts.length) return;
    
    opts.forEach(opt => opt.classList.add('no-hover'));
    
    let current = this.el.querySelector('[data-combobox-navigate]');
    let idx = current ? opts.indexOf(current) : -1;
    let next = direction === 'down'
      ? opts[(idx + 1) % opts.length]
      : opts[(idx - 1 + opts.length) % opts.length];
    this.highlight(next);
  },

  highlight(option) {
    // Remove navigation attribute from all options to clear any previous highlighting
    this.el.querySelectorAll('[data-combobox-navigate]').forEach(o => {
      o.removeAttribute('data-combobox-navigate');
      // Force removal of any hover states that might persist
      o.blur();
    });
    option.setAttribute('data-combobox-navigate', '');
    option.focus();
    option.scrollIntoView({ block: 'nearest' });
  },

  selectCurrent() {
    const curr = this.el.querySelector('[data-combobox-navigate]');
    curr && curr.click();
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
    this.scrollArea && this.scrollArea.focus();
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

  pageScroll(direction) {
    const delta = this.scrollArea.clientHeight * 0.8;
    this.scrollArea.scrollBy({ top: direction === 'down' ? delta : -delta, behavior: 'smooth' });
  },

  adjustHeight() {
    const rect = this.dropdown.getBoundingClientRect();
    this.scrollArea.style.maxHeight = `${window.innerHeight - rect.top - 50}px`;
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
    
    // If no selected option, highlight the first one
    const first = this.el.querySelector('.combobox-option');
    first && this.highlight(first);
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
      // Don't close dropdown - keep it open for continued interaction
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

  toggleMultipleSelection(option, value) {
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
    
    const currentValue = this.selectEl.value;
    if (currentValue && currentValue !== '') {
      const option = this.el.querySelector(`.combobox-option[data-combobox-value="${currentValue}"]`);
      if (option) {
        option.setAttribute('data-combobox-selected', '');
        this.updateSingleDisplay(option);
      }
    }
  },

  updateSingleDisplay(selectedOption) {
    const placeholder = this.el.querySelector('.combobox-placeholder');
    const clearButton = this.el.querySelector('[data-part="clear-combobox-button"]');
    
    if (placeholder) {
      placeholder.classList.toggle('hidden', !!selectedOption);
    }
    
    if (clearButton) {
      clearButton.toggleAttribute('hidden', !selectedOption);
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
    
    // Update display
    this.updateSingleDisplay(null);
    
    // Focus search input
    this.searchInput?.focus();
    
    // Trigger search input event to show all options (this uses the proper event handling)
    if (this.searchInput) {
      this.onSearchInput({ target: this.searchInput });
    }
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
      button._phxClickHandler = (e) => {
        // Stop the event from bubbling to parent handlers that might close the dropdown
        // Don't stop propagation - LiveView needs the event to bubble up
        // But don't prevent default - let LiveView handle the phx-click
      };
      
      button.addEventListener('click', button._phxClickHandler);
    });
  },

  initializeStickyHeaders() {
    if (!this.scrollArea) return;
    
    // Find all group headers
    const groups = this.el.querySelectorAll('.option-group');
    this.stickyHeaders = [];
    
    groups.forEach((group, index) => {
      const header = group.querySelector('.group-label');
      if (header) {
        this.stickyHeaders.push({
          group: group,
          header: header,
          originalTop: 0,
          index: index
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
    
    // Initialize each header
    this.stickyHeaders.forEach((item, index) => {
      const header = item.header;
      
      // Add necessary styles to header
      header.style.position = 'sticky';
      header.style.top = index === 0 ? '0px' : `${index * 40}px`; // First header at 0, others stack 40px apart
      header.style.zIndex = `${1000 - index}`; // Earlier headers have higher z-index
      header.style.backgroundColor = this.getBackgroundColor();
      header.style.borderBottom = this.getBorderColor();
      header.style.transition = 'opacity 0.2s ease-in-out';
      header.style.paddingLeft = getComputedStyle(header).paddingLeft || '0px';
      header.style.paddingRight = getComputedStyle(header).paddingRight || '0px';
      header.style.marginLeft = '-0.375rem'; // Compensate for px-1.5 padding
      header.style.marginRight = '-0.375rem';
      header.style.paddingLeft = '0.75rem'; // Add back padding
      header.style.paddingRight = '0.75rem';
      
      // Store original position
      const rect = item.group.getBoundingClientRect();
      const scrollRect = this.scrollArea.getBoundingClientRect();
      item.originalTop = rect.top - scrollRect.top;
    });
  },

  getBackgroundColor() {
    // Check if dark mode is active by looking at the dropdown's background
    const dropdownBg = window.getComputedStyle(this.dropdown).backgroundColor;
    const isDark = dropdownBg.includes('31, 41, 55') || dropdownBg.includes('#1f2937');
    return isDark ? '#1f2937' : 'white';
  },

  getBorderColor() {
    // Check if dark mode is active by looking at the dropdown's background
    const dropdownBg = window.getComputedStyle(this.dropdown).backgroundColor;
    const isDark = dropdownBg.includes('31, 41, 55') || dropdownBg.includes('#1f2937');
    return isDark ? '1px solid #374151' : '1px solid #e5e7eb';
  },

  handleScroll() {
    if (!this.scrollArea || this.stickyHeaders.length === 0) return;
    
    const scrollTop = this.scrollArea.scrollTop;
    const scrollRect = this.scrollArea.getBoundingClientRect();
    
    this.stickyHeaders.forEach((item, index) => {
      const header = item.header;
      const group = item.group;
      
      // Get group boundaries
      const groupRect = group.getBoundingClientRect();
      const groupTop = groupRect.top - scrollRect.top;
      const groupBottom = groupRect.bottom - scrollRect.top;
      
      // Calculate sticky position based on index
      const stickyTop = index * 40;
      
      // First header should always be visible when its group has any visible content
      if (index === 0) {
        // First header is always sticky at the top
        header.style.position = 'sticky';
        header.style.top = '0px';
        header.style.opacity = '1';
        header.style.pointerEvents = 'auto';
        
        // Hide first header when second group header becomes sticky OR when first group scrolls past
        const secondGroupStickyTop = 40;
        let shouldHideFirstHeader = groupBottom <= 40; // Original condition
        
        // Also check if second group header is sticky
        if (this.stickyHeaders.length > 1 && this.stickyHeaders[1]) {
          const secondGroup = this.stickyHeaders[1].group;
          const secondGroupRect = secondGroup.getBoundingClientRect();
          const secondGroupTop = secondGroupRect.top - scrollRect.top;
          const isSecondGroupHeaderSticky = secondGroupTop <= secondGroupStickyTop;
          
          if (isSecondGroupHeaderSticky) {
            shouldHideFirstHeader = true;
          }
        }
        
        if (shouldHideFirstHeader) {
          header.style.opacity = '0';
          header.style.pointerEvents = 'none';
        }
      } else {
        // Other headers behave normally
        if (groupTop <= stickyTop && groupBottom > stickyTop + 40) {
          // Header should be sticky at its designated position
          header.style.position = 'sticky';
          header.style.top = `${stickyTop}px`;
          header.style.opacity = '1';
          header.style.pointerEvents = 'auto';
        } else if (groupTop > stickyTop) {
          // Group hasn't reached sticky position yet
          header.style.position = 'relative';
          header.style.top = '0';
          header.style.opacity = '1';
          header.style.pointerEvents = 'auto';
        } else if (groupBottom <= stickyTop + 40) {
          // Group has scrolled past, hide header
          header.style.position = 'sticky';
          header.style.top = `${stickyTop}px`;
          header.style.opacity = '0';
          header.style.pointerEvents = 'none';
        }
      }
    });
  },
};

export default SearchCombobox;
