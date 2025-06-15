/**
 * search Combobox
 *
 * Intercepts the search input and sends it to the backend for prioritized search.
 * Lets LiveView handle the dropdown options rendering.
 */
const SearchCombobox = {
  mounted() {
    const key = this.el.parentElement.getAttribute('key');
    console.log(`SearchCombobox mounted with key: ${key}`);
    this.currentKey = key;

    // Store instance reference for debugging
    this.el.searchComboboxInstance = this;
    this.searchTerm = '';
    this.debounceTimer = null;
    this.dropdownWasOpen = false; // Track dropdown state across updates
    this.debounceDelay = 500;
    this.currentlyHoveredOption = null; // Track currently hovered option

    // Track mouse position for hover detection
    window.mouseX = 0;
    window.mouseY = 0;
    this.boundTrackMousePosition = this.trackMousePosition.bind(this);
    document.addEventListener('mousemove', this.boundTrackMousePosition);

    // Initialize advanced keyboard navigation (no longer dependent on CountrySelector)
    console.log('SearchCombobox: Initializing with advanced keyboard navigation');

    // Get the search event name from data attribute, default to 'search_countries'
    this.searchEventName = this.el.getAttribute('data-search-event') || 'search_countries';
    console.log(`SearchCombobox: Using search event name: ${this.searchEventName}`);

    // Initialize button interaction tracking
    this.hasScrolledThisSession = false;
    this.isButtonInteraction = false;

    // Initialize keyboard navigation tracking
    this.isKeyboardNavigating = false;
    this.keyboardNavigationTimeout = null;
    this.lastKeyboardNavigationTime = 0;
    this.hoverTimeout = null;

    this.setupTriggerButton();
    this.setupSearchIntercept();
    this.setupDropdownObserver();
    this.setupFormChangeForwarding();
    this.setupOptionHandlers();
    this.setupKeyboardNavigation();
    this.setupWindowResizeHandler();
    this.setupClearButton();
    this.setupDragPrevention();
    this.setupAttributeWatcher();
    this.setupGlobalKeyboardListener();

    // Initialize the selection based on the current value
    console.log('SearchCombobox: About to initialize selection on mount');
    this.initializeSelection();
  },

  updated() {
    const key = this.el.parentElement.getAttribute('key');
    console.log(`SearchCombobox updated with key: ${key}`);
    console.log(`SearchCombobox: Tracked dropdown state was open: ${this.dropdownWasOpen}`);

    // Store whether search input was focused before update and its content
    const searchInput = this.el.querySelector('.search-combobox-search-input');
    const wasSearchFocused = searchInput && document.activeElement === searchInput;
    const hasSearchContent = searchInput && searchInput.value && searchInput.value.trim() !== '';

    // Check if the key has changed - if so, we need to completely reinitialize
    if (this.currentKey && this.currentKey !== key) {
      console.log(`SearchCombobox: Key changed from ${this.currentKey} to ${key} - performing full reinitialization`);
      this.currentKey = key;

      // Clear all state except dropdown tracking
      this.searchTerm = '';
      this.currentlyHoveredOption = null; // Clear hover tracking
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
        this.debounceTimer = null;
      }

      // Clean up existing handlers
      this.cleanupHandlers();

      // Reinitialize everything
      this.setupTriggerButton();
      this.setupSearchIntercept();
      this.setupDropdownObserver();
      this.setupFormChangeForwarding();
      this.setupOptionHandlers();
      this.setupKeyboardNavigation();
      this.setupWindowResizeHandler();
      this.setupClearButton();
      this.setupDragPrevention();
      this.setupAttributeWatcher();
      this.setupGlobalKeyboardListener();

      // Restore dropdown state if it was open
      if (this.dropdownWasOpen) {
        console.log('SearchCombobox: Restoring dropdown open state after key change');
        this.restoreDropdownState(true);
        // Recalculate height after restoration
        this.setOptimalDropdownHeight();
      }

      // Initialize selection
      setTimeout(() => {
        console.log('SearchCombobox: About to initialize selection after key change (delayed)');
        this.initializeSelection();
        // Restore focus if search was focused - prioritize search input if it has content
        if (wasSearchFocused || hasSearchContent) {
          setTimeout(() => {
            this.restoreSearchFocus();
          }, 300);
        }
      }, 10);
    } else {
      // Normal update - just refresh handlers and selection
      this.setupTriggerButton();
      this.setupSearchIntercept();
      this.setupFormChangeForwarding();
      this.setupOptionHandlers();
      this.setupKeyboardNavigation();
      this.setupWindowResizeHandler();
      this.setupClearButton();
      this.setupDragPrevention();
      this.setupAttributeWatcher();
      this.setupGlobalKeyboardListener();

      // Restore dropdown state if it was open
      if (this.dropdownWasOpen) {
        console.log('SearchCombobox: Restoring dropdown state after normal update');
        this.restoreDropdownState(true);
        // Recalculate height after restoration
        this.setOptimalDropdownHeight();
      }

      // Restore the search input value after LiveView updates
      this.restoreSearchValue();
      // Re-initialize the selection in case the value changed
      // Use a small delay to ensure DOM is fully updated
      setTimeout(() => {
        console.log('SearchCombobox: About to re-initialize selection on update (delayed)');
        this.initializeSelection();
        // Restore focus if search was focused OR if search has content (prioritize search input)
        if (wasSearchFocused || hasSearchContent) {
          setTimeout(() => {
            console.log('SearchCombobox: Restoring focus to search input (was focused or has content)');
            this.restoreSearchFocus();
          }, 300);
        }
      }, 10);
    }

    // Ensure there's always a highlighted option for navigation
    setTimeout(() => {
      this.ensureHighlightedOption();
    }, 50);
  },

  initializeSelection() {
    const selectEl = this.el.querySelector('.search-combobox-select');
    if (!selectEl) {
      console.log('search combobox: No select element found');
      return;
    }

    const currentValue = selectEl.value;
    console.log('search combobox: Initializing selection with value:', currentValue);

    if (currentValue && currentValue !== '') {
      // Try to find the option with this value
      let option = this.el.querySelector(`.combobox-option[data-combobox-value="${currentValue}"]`);

      if (!option) {
        // If not found immediately, wait progressively longer for options to render
        console.log('search combobox: Option not found immediately, waiting for options to render...');
        this.waitForOption(currentValue, 0);
      } else {
        console.log('search combobox: Found option immediately:', currentValue, 'setting as selected');
        this.setSelectedOption(option);
      }
    } else {
      console.log('search combobox: No value to select, clearing selection');
      // Clear all navigation/selection highlights if no value
      this.clearAllNavigationHighlights();
      this.updateSingleDisplay(null);
    }
  },

  waitForOption(value, attempt) {
    const maxAttempts = 5;
    const delays = [50, 100, 200, 400, 800]; // Progressive backoff

    if (attempt >= maxAttempts) {
      console.log('search combobox: Option not found after maximum attempts:', value);
      console.log('Available options:', Array.from(this.el.querySelectorAll('.combobox-option')).map(opt => ({
        value: opt.getAttribute('data-combobox-value'),
        text: opt.textContent.trim()
      })));
      return;
    }

    setTimeout(() => {
      const option = this.el.querySelector(`.combobox-option[data-combobox-value="${value}"]`);
      if (option) {
        console.log(`search combobox: Found option after attempt ${attempt + 1}:`, value, 'setting as selected');
        this.setSelectedOption(option);
      } else {
        console.log(`search combobox: Option not found on attempt ${attempt + 1}, retrying...`);
        this.waitForOption(value, attempt + 1);
      }
    }, delays[attempt]);
  },

  setSelectedOption(option) {
    // Clear previous selection attributes from all options
    this.el.querySelectorAll('.combobox-option[data-combobox-selected]')
      .forEach(opt => opt.removeAttribute('data-combobox-selected'));

    // Set the selected attribute on the current option
    if (option) {
      option.setAttribute('data-combobox-selected', '');
      console.log('setSelectedOption: set data-combobox-selected on option:', option.getAttribute('data-combobox-value'));
    }

    // Update the display
    this.updateSingleDisplay(option);
  },

  setupTriggerButton() {
    // Find the trigger button
    const triggerButton = this.el.querySelector('.search-combobox-trigger');
    if (triggerButton) {
      console.log('Found combobox trigger, setting up click and keyboard handlers');

      // Remove any existing event listeners to avoid duplicates
      if (this.boundTriggerHandler) {
        triggerButton.removeEventListener('click', this.boundTriggerHandler);
      }
      if (this.boundTriggerKeyHandler) {
        triggerButton.removeEventListener('keydown', this.boundTriggerKeyHandler);
      }

      // Ensure the trigger can receive focus and keyboard events
      if (!triggerButton.hasAttribute('tabindex')) {
        triggerButton.setAttribute('tabindex', '0');
      }

      // Set role if not already set
      if (!triggerButton.hasAttribute('role')) {
        triggerButton.setAttribute('role', 'combobox');
      }

      // Create bound handlers
      this.boundTriggerHandler = this.handleTriggerClick.bind(this);
      this.boundTriggerKeyHandler = this.handleTriggerKeydown.bind(this);

      // Add event listeners
      triggerButton.addEventListener('click', this.boundTriggerHandler);
      triggerButton.addEventListener('keydown', this.boundTriggerKeyHandler);

      // Store reference to the trigger button
      this.triggerButton = triggerButton;
    } else {
      console.log('Combobox trigger not found');
    }
  },

  setupOptionHandlers() {
    // Clean up previous individual handlers to avoid duplicates
    if (this.boundOptionClickHandlers) {
      this.boundOptionClickHandlers.forEach(({ option, handler }) => {
        option.removeEventListener('click', handler);
      });
    }
    if (this.boundOptionKeydownHandlers) {
      this.boundOptionKeydownHandlers.forEach(({ option, handler }) => {
        option.removeEventListener('keydown', handler);
      });
    }

    this.boundOptionClickHandlers = [];
    this.boundOptionKeydownHandlers = [];

    // Set up click and keydown handlers for all options (individual handlers)
    const options = this.el.querySelectorAll('.combobox-option');
    options.forEach(option => {
      const clickHandler = this.handleOptionClick.bind(this, option);
      const keydownHandler = this.handleOptionKeydown.bind(this, option);

      option.addEventListener('click', clickHandler);
      option.addEventListener('keydown', keydownHandler);

      // Make options focusable
      option.setAttribute('tabindex', '-1');

      this.boundOptionClickHandlers.push({ option, handler: clickHandler });
      this.boundOptionKeydownHandlers.push({ option, handler: keydownHandler });
    });

    // Set up hover handlers using event delegation (more resilient to DOM updates)
    this.setupHoverDelegation();

    console.log(`Set up handlers for ${options.length} search options`);
  },

  setupHoverDelegation() {
    // Clean up previous delegation handlers
    if (this.boundDelegatedHoverHandler) {
      this.el.removeEventListener('mouseover', this.boundDelegatedHoverHandler);
      this.el.removeEventListener('mouseout', this.boundDelegatedHoverHandler);
    }
    if (this.boundComboboxMouseLeaveHandler) {
      this.el.removeEventListener('mouseleave', this.boundComboboxMouseLeaveHandler);
    }

    // Set up delegated hover handler
    this.boundDelegatedHoverHandler = (event) => {
      const option = event.target.closest('.combobox-option');
      if (!option || !this.el.contains(option)) return;

      if (event.type === 'mouseover') {
        // Only trigger if we're entering this option (not a child element)
        if (event.target === option || option.contains(event.target)) {
          this.handleOptionMouseEnter(option, event);
        }
      } else if (event.type === 'mouseout') {
        // Only trigger if we're leaving this option (not moving to a child element)
        if (!option.contains(event.relatedTarget)) {
          this.handleOptionMouseLeave(option, event);
        }
      }
    };

    this.el.addEventListener('mouseover', this.boundDelegatedHoverHandler);
    this.el.addEventListener('mouseout', this.boundDelegatedHoverHandler);

    // Set up mouse leave handler for the entire combobox to reset protection
    this.boundComboboxMouseLeaveHandler = (event) => {
      // Check if mouse is leaving the entire combobox area
      if (!this.el.contains(event.relatedTarget)) {
        console.log('SearchCombobox: Mouse left entire combobox area, resetting keyboard navigation protection');
        this.lastKeyboardNavigationTime = 0;
        this.isKeyboardNavigating = false;
        this.currentlyHoveredOption = null;
        if (this.keyboardNavigationTimeout) {
          clearTimeout(this.keyboardNavigationTimeout);
          this.keyboardNavigationTimeout = null;
        }
      }
    };

    this.el.addEventListener('mouseleave', this.boundComboboxMouseLeaveHandler);

    console.log('Set up delegated hover handlers');
  },

  handleOptionClick(option, event) {
    event.preventDefault();
    const value = option.getAttribute('data-combobox-value');
    const isMultiple = this.el.getAttribute('data-multiple') === 'true';

    // Check if search input has content before making changes
    const searchInput = this.el.querySelector('.search-combobox-search-input');
    const hasSearchContent = searchInput && searchInput.value && searchInput.value.trim() !== '';

    if (isMultiple) {
      this.toggleMultipleSelection(option, value);
    } else {
      this.setSingleSelection(option, value);
      // For single selection, only close dropdown if search input is empty
      if (!hasSearchContent) {
        const dropdown = this.el.querySelector('[data-part="search-combobox-listbox"]');
        if (dropdown) {
          dropdown.setAttribute('hidden', 'true');
          this.triggerButton.setAttribute('aria-expanded', 'false');
          this.dropdownWasOpen = false; // Update state tracking
        }
      } else {
        console.log('handleOptionClick: Keeping dropdown open because search input has content');
      }
    }
  },

  handleOptionKeydown(option, event) {
    const dropdown = this.el.querySelector('[data-part="search-combobox-listbox"]');
    const isDropdownOpen = dropdown && !dropdown.hasAttribute('hidden');

    if (!isDropdownOpen) return;

    // Check if the event originated from the search input
    const searchInput = this.el.querySelector('.search-combobox-search-input');
    const isFromSearchInput = event.target === searchInput;

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      // Use advanced navigation for all search comboboxes
      event.preventDefault();
      this.navigateOptionsAdvanced(event.key === 'ArrowDown' ? 'down' : 'up');
    } else if (event.key === 'Enter') {
      event.preventDefault();
      option.click();
    } else if (event.key === ' ') {
      // Only prevent space if it's not coming from the search input
      // This allows normal typing of spaces in the search box
            if (!isFromSearchInput) {
        event.preventDefault();
        console.log('SearchCombobox: Space key pressed on option (navigation only):', option.getAttribute('data-combobox-value'));

        // Check if there's already a navigated option
        const currentNavigated = this.el.querySelector('.combobox-option[data-combobox-navigate]');

        if (!currentNavigated) {
          // No current navigation, use the hovered option or the option that received the event
          const hoveredOption = this.findHoveredOption() || option;
          this.setCurrentNavigationItem(hoveredOption);
        }
        // If there's already navigation, space key does nothing (don't interfere)
      }
      // If from search input, let the space be typed normally
        } else if (event.key === 'Tab' && !event.shiftKey) {
      // Handle Tab from option - find the next group's expand/collapse button
      const currentGroup = option.closest('.option-group');
      if (currentGroup) {
        const allGroups = Array.from(this.el.querySelectorAll('.option-group'));
        const currentGroupIndex = allGroups.indexOf(currentGroup);

        // Look for the next group
        const nextGroup = allGroups[currentGroupIndex + 1];
        if (nextGroup) {
          // Find the expand/collapse button in the next group
          const nextGroupButton = nextGroup.querySelector('button[title*="Toggle group"]');
          if (nextGroupButton) {
            event.preventDefault();
            nextGroupButton.focus();
            console.log('SearchCombobox: Tab navigated to next group button');
            return;
          }
        }
      }

      // If we can't find a next group button, check if this is the last option
      const allOptions = Array.from(this.el.querySelectorAll('.combobox-option'));
      const currentIndex = allOptions.indexOf(option);

      if (currentIndex === allOptions.length - 1) {
        // This is the last option - close dropdown and let tab go to next form element
        event.preventDefault();
        this.closeDropdown();
        // Focus will naturally move to next element after dropdown closes
        return;
      }

      // For other options, let default tab behavior continue to next focusable element
    } else if (event.key === 'Escape') {
      event.preventDefault();
      dropdown.setAttribute('hidden', 'true');
      this.triggerButton.setAttribute('aria-expanded', 'false');
      this.dropdownWasOpen = false;
      this.triggerButton.focus();
    }
  },

  handleOptionMouseEnter(option, event) {
    console.log('SearchCombobox: Mouse entered option:', option.getAttribute('data-combobox-value'));
    this.currentlyHoveredOption = option;

    // Clear any existing hover timeout
    if (this.hoverTimeout) {
      clearTimeout(this.hoverTimeout);
      this.hoverTimeout = null;
    }

        // Only set navigation state if we're not in the middle of keyboard navigation
    // This prevents hover from interfering with keyboard navigation sequences
    // Use a shorter delay (80ms) to prevent hover interference after keyboard navigation
    const timeSinceLastKeyboardNav = Date.now() - this.lastKeyboardNavigationTime;
    const isRecentKeyboardNavigation = timeSinceLastKeyboardNav < 80;

    // Get the currently navigated option to check if hover is on a different option
    const currentNavigated = this.el.querySelector('.combobox-option[data-combobox-navigate]');
    const isHoveringDifferentOption = currentNavigated && currentNavigated !== option;

    // Only prevent hover if there was recent keyboard navigation AND we're hovering a different option
    // But if enough time has passed (200ms+), always allow hover regardless
    const hasEnoughTimePassed = timeSinceLastKeyboardNav >= 200;
    const shouldPreventHover = !hasEnoughTimePassed && (this.isKeyboardNavigating || isRecentKeyboardNavigation) && isHoveringDifferentOption;

    if (!shouldPreventHover) {
      this.setCurrentNavigationItem(option);
    } else {
      console.log('SearchCombobox: Skipping hover navigation due to active or recent keyboard navigation on different option');
    }
  },

  handleOptionMouseLeave(option, event) {
    console.log('SearchCombobox: Mouse left option:', option.getAttribute('data-combobox-value'));
    // Only clear if this is the option that was being tracked
    if (this.currentlyHoveredOption === option) {
      this.currentlyHoveredOption = null;
      // Clear any pending hover timeout for this option
      if (this.hoverTimeout) {
        clearTimeout(this.hoverTimeout);
        this.hoverTimeout = null;
      }
    }

    // If mouse is leaving the combobox area entirely, reset keyboard navigation protection
    if (event.relatedTarget && !this.el.contains(event.relatedTarget)) {
      console.log('SearchCombobox: Mouse left combobox area, resetting keyboard navigation protection');
      this.lastKeyboardNavigationTime = 0;
      this.isKeyboardNavigating = false;
      if (this.keyboardNavigationTimeout) {
        clearTimeout(this.keyboardNavigationTimeout);
        this.keyboardNavigationTimeout = null;
      }
    }
  },

  toggleMultipleSelection(option, value) {
    const selectEl = this.el.querySelector('.search-combobox-select');
    if (!selectEl) return;

    // Check if this option is selected in the select element
    let selectOption = Array.from(selectEl.options).find(opt => opt.value === value);
    const isSelected = selectOption && selectOption.selected;
    if (!selectOption && !isSelected) {
      selectOption = document.createElement('option');
      selectOption.value = value;
      selectOption.textContent = value;
      selectEl.appendChild(selectOption);
    }

    if (isSelected) {
      // Remove selection from select element only
      if (selectOption) {
        selectOption.selected = false;
      }
    } else {
      // Add selection to select element only
      if (selectOption) {
        selectOption.selected = true;
      }
    }

    // Update display and trigger change event
    this.updateMultipleDisplay();
    this.triggerChange();
  },

  setSingleSelection(option, value) {
    const selectEl = this.el.querySelector('.search-combobox-select');
    if (!selectEl) {
      console.log('setSingleSelection: No select element found');
      return;
    }

    console.log('setSingleSelection called with value:', value);
    console.log('setSingleSelection: selectEl.name =', selectEl.name);

    // Check if search input has content - if so, preserve its focus
    const searchInput = this.el.querySelector('.search-combobox-search-input');
    const hasSearchContent = searchInput && searchInput.value && searchInput.value.trim() !== '';
    const wasSearchFocused = searchInput && document.activeElement === searchInput;

    // Clear previous selection attributes from all options
    this.el.querySelectorAll('.combobox-option[data-combobox-selected]')
      .forEach(opt => opt.removeAttribute('data-combobox-selected'));

    // Set the selected attribute on the current option
    if (option) {
      option.setAttribute('data-combobox-selected', '');
      console.log('setSingleSelection: set data-combobox-selected on option:', value);
    }

    // Update select element
    selectEl.value = value;
    console.log('setSingleSelection: set selectEl.value to:', selectEl.value);

    // Update display and trigger change event
    this.updateSingleDisplay(option);
    this.triggerChange();

    // If search input has content or was focused, restore focus to it
    if (hasSearchContent || wasSearchFocused) {
      setTimeout(() => {
        if (searchInput) {
          console.log('setSingleSelection: Restoring focus to search input after selection');
          searchInput.focus();
          // Position cursor at the end of the text
          if (searchInput.value) {
            searchInput.setSelectionRange(searchInput.value.length, searchInput.value.length);
          }
        }
      }, 10);
    }
  },

  updateSingleDisplay(selectedOption) {
    // With the new div-based structure, the selection content is managed by the LiveView
    // through the :selection slot, so we don't need to manipulate the display here.
    // Just ensure proper form state is maintained.
    const placeholder = this.el.querySelector('.search-combobox-placeholder');

    if (placeholder) {
      if (selectedOption) {
        placeholder.classList.add('hidden');
      } else {
        placeholder.classList.remove('hidden');
      }
    }

    // Show/hide clear button based on selection
    const clearButton = this.el.querySelector('[data-part="clear-combobox-button"]');
    if (clearButton) {
      if (selectedOption) {
        clearButton.removeAttribute('hidden');
      } else {
        clearButton.setAttribute('hidden', 'true');
      }
    }
  },

  updateMultipleDisplay() {
    const displayEl = this.el.querySelector('[data-part="select_toggle_label"]');
    const placeholder = this.el.querySelector('.search-combobox-placeholder');
    const selectEl = this.el.querySelector('.search-combobox-select');

    // Get selected options from the select element instead of DOM attributes
    const selectedValues = selectEl ? Array.from(selectEl.options).filter(opt => opt.selected).map(opt => opt.value) : [];
    const selectedOptions = selectedValues.map(value =>
      this.el.querySelector(`.combobox-option[data-combobox-value="${value}"]`)
    ).filter(Boolean);

    if (displayEl) {
      // Clear current display
      displayEl.innerHTML = '';

      if (selectedOptions.length > 0) {
        // Create pill for each selected option
        selectedOptions.forEach(option => {
          const pill = document.createElement('div');
          pill.className = 'search-combobox-pill inline-flex items-center gap-1 rounded text-sm';
          pill.innerHTML = `
            <span>${option.textContent.trim()}</span>
            <button type="button" class="remove-pill" data-value="${option.getAttribute('data-combobox-value')}">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M18 6 6 18"></path><path d="m6 6 12 12"></path>
              </svg>
            </button>
          `;

          // Add click handler for remove button
          const removeBtn = pill.querySelector('.remove-pill');
          removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const value = removeBtn.getAttribute('data-value');
            const opt = this.el.querySelector(`.combobox-option[data-combobox-value="${value}"]`);
            if (opt) {
              this.toggleMultipleSelection(opt, value);
            }
          });

          displayEl.appendChild(pill);
        });

        if (placeholder) placeholder.classList.add('hidden');
      } else {
        if (placeholder) placeholder.classList.remove('hidden');
      }
    }

    // Show/hide clear button based on selection
    const clearButton = this.el.querySelector('[data-part="clear-combobox-button"]');
    if (clearButton) {
      if (selectedOptions.length > 0) {
        clearButton.removeAttribute('hidden');
      } else {
        clearButton.setAttribute('hidden', 'true');
      }
    }
  },

  triggerChange() {
    const selectEl = this.el.querySelector('.search-combobox-select');
    if (selectEl) {
      console.log('triggerChange: dispatching change event on select with value:', selectEl.value);
      console.log('triggerChange: select element name:', selectEl.name);
      const event = new Event('change', { bubbles: true });
      selectEl.dispatchEvent(event);
      console.log('triggerChange: change event dispatched');
    } else {
      console.log('triggerChange: No select element found');
    }
  },

  handleTriggerClick(event) {
    event.preventDefault();
    event.stopPropagation();

    const dropdown = this.el.querySelector('[data-part="search-combobox-listbox"]');
    if (!dropdown) return;

    const isHidden = dropdown.hasAttribute('hidden');

    if (isHidden) {
      // Open dropdown first
      dropdown.removeAttribute('hidden');
      this.triggerButton.setAttribute('aria-expanded', 'true');
      this.dropdownWasOpen = true; // Track state

      // Send search event with empty string when dropdown opens, but only if search input is empty
      const searchInput = this.el.querySelector('.search-combobox-search-input');
      if (searchInput && (!searchInput.value || searchInput.value.trim() === '')) {
        this.searchTerm = ''; // Clear stored search term
        this.sendSearchEvent('');
      }

      // Immediately highlight the currently selected option
      const selectEl = this.el.querySelector('.search-combobox-select');
      const currentValue = selectEl ? selectEl.value : null;
      if (currentValue) {
        const selectedOption = this.el.querySelector(`.combobox-option[data-combobox-value="${currentValue}"]`);
        if (selectedOption) {
          this.setCurrentNavigationItem(selectedOption);
          console.log('SearchCombobox: Immediately highlighted selected option on open:', currentValue);
        }
      }

      // Calculate and set optimal height after opening and content is rendered
      setTimeout(() => {
        this.setOptimalDropdownHeight();
        // Ensure the selected option is visible
        this.ensureHighlightedOption();
        // Retry after a longer delay if content might still be loading
        setTimeout(() => {
          this.setOptimalDropdownHeight();
          // Ensure the selected option is visible again after height adjustment
          this.ensureHighlightedOption();
        }, 200);
      }, 50);

      // Focus search input if available
      if (searchInput) {
        setTimeout(() => searchInput.focus(), 10);
      }

      // Click-away for pointerdown, mouseup, and click
      if (!this.boundDocumentClickHandler) {
        this.boundDocumentClickHandler = this.handleDocumentClick.bind(this);
        document.addEventListener('pointerdown', this.boundDocumentClickHandler);
        document.addEventListener('mouseup',   this.boundDocumentClickHandler);
        document.addEventListener('click',     this.boundDocumentClickHandler);
      }
    } else {
      // Close dropdown
      dropdown.setAttribute('hidden', 'true');
      this.triggerButton.setAttribute('aria-expanded', 'false');
      this.dropdownWasOpen = false; // Track state
    }
  },

  handleTriggerKeydown(event) {
    const dropdown = this.el.querySelector('[data-part="search-combobox-listbox"]');
    const isDropdownOpen = dropdown && !dropdown.hasAttribute('hidden');

    // Handle keyboard events for the div trigger (since it's no longer a button)
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.handleTriggerClick(event);
    } else if (event.key === 'Escape') {
      // Close dropdown if open
      if (isDropdownOpen) {
        dropdown.setAttribute('hidden', 'true');
        this.triggerButton.setAttribute('aria-expanded', 'false');
        this.dropdownWasOpen = false;
      }
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      // Open dropdown if closed and navigate options
      event.preventDefault();
      if (!isDropdownOpen) {
        this.openDropdownAndFocusSearch();
      } else {
        // Use advanced navigation for all search comboboxes
        this.navigateOptionsAdvanced(event.key === 'ArrowDown' ? 'down' : 'up');
      }
    } else if (this.isPrintableCharacter(event.key, event) && !isDropdownOpen) {
      // If a printable character is typed and dropdown is closed, open it and start typing
      console.log(`SearchCombobox: Opening dropdown and starting typing with character: "${event.key}"`);
      event.preventDefault();
      this.openDropdownAndStartTyping(event.key);
    }
  },

  navigateOptionsAdvanced(direction) {
    const options = Array.from(this.el.querySelectorAll('.combobox-option'));
    if (options.length === 0) return;

    // Set keyboard navigation flag to prevent mouse hover interference
    this.isKeyboardNavigating = true;
    this.lastKeyboardNavigationTime = Date.now();

    // Clear the flag after a short delay to allow mouse interaction again
    clearTimeout(this.keyboardNavigationTimeout);
    this.keyboardNavigationTimeout = setTimeout(() => {
      this.isKeyboardNavigating = false;
      console.log('SearchCombobox: Keyboard navigation flag cleared');
    }, 50); // Short delay to allow faster mouse interaction after keyboard navigation

    // Clear any mouse hover state to prevent interference with keyboard navigation
    this.currentlyHoveredOption = null;

    let currentIndex = -1;
    const currentNavigated = this.el.querySelector('.combobox-option[data-combobox-navigate]');

    // Check if focus is on a button - if so, we'll handle differently
    const focusedElement = document.activeElement;
    const isButtonFocused = focusedElement && focusedElement.tagName === 'BUTTON' &&
                            this.el.contains(focusedElement);

    if (currentNavigated) {
      currentIndex = options.indexOf(currentNavigated);
    }

    console.log(`SearchCombobox: navigateOptionsAdvanced(${direction}) - currentIndex: ${currentIndex}, totalOptions: ${options.length}, isButtonFocused: ${isButtonFocused}`);
    console.log(`SearchCombobox: currentNavigated element:`, currentNavigated ? currentNavigated.getAttribute('data-combobox-value') : 'null');

    let newIndex;
    if (direction === 'down') {
      if (currentIndex === -1) {
        // No current selection, select first option
        // If a button is focused, find the first option in that button's group
        if (isButtonFocused) {
          const buttonGroup = focusedElement.closest('.option-group');
          if (buttonGroup) {
            const groupOptions = Array.from(buttonGroup.querySelectorAll('.combobox-option'));
            if (groupOptions.length > 0) {
              console.log('SearchCombobox: Moving from button to first option in group');
              this.highlightOption(groupOptions[0], false);
              return;
            }
          }
        }
        newIndex = 0;
        console.log('SearchCombobox: No current selection, going to first option (0)');
      } else if (currentIndex < options.length - 1) {
        // Move to next option
        newIndex = currentIndex + 1;
        console.log(`SearchCombobox: Moving down from ${currentIndex} to ${newIndex}`);
        console.log(`SearchCombobox: options.length = ${options.length}, currentIndex = ${currentIndex}, newIndex = ${newIndex}`);
        console.log(`SearchCombobox: Condition check: currentIndex (${currentIndex}) < options.length - 1 (${options.length - 1}) = ${currentIndex < options.length - 1}`);
      } else {
        // At last option, go to first item in first expanded group
        console.log('SearchCombobox: At last option, going to first item in first expanded group');

        // Find all groups in order
        const allGroups = Array.from(this.el.querySelectorAll('.option-group'));

        // Look for the first group with visible options
        let foundFirstGroup = false;
        for (const group of allGroups) {
          const groupOptions = Array.from(group.querySelectorAll('.combobox-option'));
          const visibleOptions = groupOptions.filter(opt =>
            !opt.hasAttribute('hidden') && opt.offsetParent !== null
          );

          if (visibleOptions.length > 0) {
            // Go to the first visible option in this group
            const firstOptionInGroup = visibleOptions[0];
            const firstOptionGlobalIndex = options.indexOf(firstOptionInGroup);
            newIndex = firstOptionGlobalIndex;
            console.log('SearchCombobox: Down arrow from last option, going to first option in first group');
            foundFirstGroup = true;
            break;
          }
        }

        // If no group found with visible options, stay at last option
        if (!foundFirstGroup) {
          console.log('SearchCombobox: No first group found, staying at last option');
          return;
        }
      }
    } else { // 'up'
      if (currentIndex === -1) {
        // No current selection, behavior depends on context
        if (isButtonFocused) {
          // If a button is focused and we're going up, go to the search input
          const searchInput = this.el.querySelector('.search-combobox-search-input');
          if (searchInput) {
            console.log('SearchCombobox: Moving from button to search input');
            searchInput.focus();
            this.clearAllNavigationHighlights();
            return;
          }
        }
        // Default behavior - go to last option
        newIndex = options.length - 1;
            } else if (currentIndex > 0) {
        // Normal previous option navigation
        newIndex = currentIndex - 1;

        // Check if we're at the first option of an expanded group for special group navigation
        const currentOption = options[currentIndex];
        const currentGroup = currentOption.closest('.option-group');

        if (currentGroup) {
          const groupOptions = Array.from(currentGroup.querySelectorAll('.combobox-option'));
          const indexInGroup = groupOptions.indexOf(currentOption);

          // If we're at the first option in the group, try to go to the previous group's last option
          if (indexInGroup === 0) {
            // Find all groups
            const allGroups = Array.from(this.el.querySelectorAll('.option-group'));
            const currentGroupIndex = allGroups.indexOf(currentGroup);

            // Look for the previous group with visible options
            let foundPreviousGroup = false;
            for (let i = currentGroupIndex - 1; i >= 0; i--) {
              const prevGroup = allGroups[i];
              const prevGroupOptions = Array.from(prevGroup.querySelectorAll('.combobox-option'));
              const visiblePrevOptions = prevGroupOptions.filter(opt =>
                !opt.hasAttribute('hidden') && opt.offsetParent !== null
              );

              if (visiblePrevOptions.length > 0) {
                // Go to the last visible option in the previous group
                const lastOptionInPrevGroup = visiblePrevOptions[visiblePrevOptions.length - 1];
                const lastOptionGlobalIndex = options.indexOf(lastOptionInPrevGroup);
                newIndex = lastOptionGlobalIndex;
                console.log('SearchCombobox: Up arrow from first in group, going to last option in previous group');
                foundPreviousGroup = true;
                break;
              }
            }

            // If no previous group found, the normal navigation (already set above) will be used
            if (!foundPreviousGroup) {
              console.log('SearchCombobox: Up arrow from first in group, no previous group found, using normal navigation');
            }
          }
        }
      } else {
        // At first option, go to last item in last expanded group
        console.log('SearchCombobox: At first option, going to last item in last expanded group');

        // Find all groups in reverse order
        const allGroups = Array.from(this.el.querySelectorAll('.option-group')).reverse();

        // Look for the last group with visible options
        let foundLastGroup = false;
        for (const group of allGroups) {
          const groupOptions = Array.from(group.querySelectorAll('.combobox-option'));
          const visibleOptions = groupOptions.filter(opt =>
            !opt.hasAttribute('hidden') && opt.offsetParent !== null
          );

          if (visibleOptions.length > 0) {
            // Go to the last visible option in this group
            const lastOptionInGroup = visibleOptions[visibleOptions.length - 1];
            const lastOptionGlobalIndex = options.indexOf(lastOptionInGroup);
            newIndex = lastOptionGlobalIndex;
            console.log('SearchCombobox: Up arrow from first option, going to last option in last group');
            foundLastGroup = true;
            break;
          }
        }

        // If no group found with visible options, stay at first option
        if (!foundLastGroup) {
          console.log('SearchCombobox: No last group found, staying at first option');
          return;
        }
      }
    }

    console.log(`SearchCombobox: About to navigate to newIndex: ${newIndex}`);
    const newOption = options[newIndex];
    console.log(`SearchCombobox: newOption found:`, newOption ? newOption.getAttribute('data-combobox-value') : 'null');
    console.log(`SearchCombobox: newOption visible:`, newOption ? (!newOption.hasAttribute('hidden') && newOption.offsetParent !== null) : 'N/A');

    if (newOption) {
      // Extra clearing before highlighting to prevent turquoise highlighting issues
      this.clearAllVisualStates();

      // Clear any mouse hover state to prevent interference with keyboard navigation
      this.currentlyHoveredOption = null;

      console.log(`SearchCombobox: About to call highlightOption for ${newOption.getAttribute('data-combobox-value')}`);
      this.highlightOption(newOption, false); // Allow scrolling for navigation
      console.log(`SearchCombobox: Navigated to option at index ${newIndex}: ${newOption.getAttribute('data-combobox-value')}`);

      // Force a DOM reflow to ensure the navigation state is properly applied
      newOption.offsetHeight;
    } else {
      console.log(`SearchCombobox: ERROR - newOption is null for index ${newIndex}`);
    }
  },

  isPrintableCharacter(key, event) {
    // Check if the key is a printable character (letters, numbers, symbols, spaces)
    // Exclude special keys like Tab, Shift, Control, etc.
    return key.length === 1 &&
      !event.ctrlKey &&
      !event.altKey &&
      !event.metaKey;
  },

  openDropdownAndFocusSearch() {
    const dropdown = this.el.querySelector('[data-part="search-combobox-listbox"]');
    const searchInput = this.el.querySelector('.search-combobox-search-input');

    if (dropdown && searchInput) {
      console.log('SearchCombobox: Opening dropdown and focusing search input');

      // Open dropdown first
      dropdown.removeAttribute('hidden');
      this.triggerButton.setAttribute('aria-expanded', 'true');
      this.dropdownWasOpen = true;

      // Send search event with empty string when dropdown opens, but only if search input is empty
      if (!searchInput.value || searchInput.value.trim() === '') {
        this.searchTerm = ''; // Clear stored search term
        this.sendSearchEvent('');
      }

      // Calculate and set optimal height after opening and content is rendered
      setTimeout(() => {
        this.setOptimalDropdownHeight();
        // Retry after a longer delay if content might still be loading
        setTimeout(() => {
          this.setOptimalDropdownHeight();
        }, 200);
      }, 50);

      // Focus search input
      setTimeout(() => searchInput.focus(), 10);

      // Click-away for pointerdown, mouseup, and click
      if (!this.boundDocumentClickHandler) {
        this.boundDocumentClickHandler = this.handleDocumentClick.bind(this);
        document.addEventListener('pointerdown', this.boundDocumentClickHandler);
        document.addEventListener('mouseup',   this.boundDocumentClickHandler);
        document.addEventListener('click',     this.boundDocumentClickHandler);
      }
    }
  },

  openDropdownAndStartTyping(character) {
    const dropdown = this.el.querySelector('[data-part="search-combobox-listbox"]');
    const searchInput = this.el.querySelector('.search-combobox-search-input');

    if (dropdown && searchInput) {
      console.log(`SearchCombobox: Opening dropdown and starting typing with: "${character}"`);

      // Open dropdown first
      dropdown.removeAttribute('hidden');
      this.triggerButton.setAttribute('aria-expanded', 'true');
      this.dropdownWasOpen = true;

      // Set the character in the search input and focus it
      searchInput.value = character;
      this.searchTerm = character;

      // Calculate and set optimal height after opening and content is rendered
      setTimeout(() => {
        this.setOptimalDropdownHeight();
        // Retry after a longer delay if content might still be loading
        setTimeout(() => {
          this.setOptimalDropdownHeight();
        }, 200);
      }, 50);

      setTimeout(() => {
        searchInput.focus();
        // Position cursor at the end
        searchInput.setSelectionRange(searchInput.value.length, searchInput.value.length);

        // Trigger the search with the new character
        this.handleSearchInput({ target: searchInput });
      }, 10);

      // Click-away for pointerdown, mouseup, and click
      if (!this.boundDocumentClickHandler) {
        this.boundDocumentClickHandler = this.handleDocumentClick.bind(this);
        document.addEventListener('pointerdown', this.boundDocumentClickHandler);
        document.addEventListener('mouseup',   this.boundDocumentClickHandler);
        document.addEventListener('click',     this.boundDocumentClickHandler);
      }
    }
  },

  handleDocumentClick(event) {
    // Don't close dropdown for non-left clicks
    if (event.button !== 0) return; // Only handle left mouse button

    // Close dropdown when clicking outside
    if (!this.el.contains(event.target)) {
      const dropdown = this.el.querySelector('[data-part="search-combobox-listbox"]');
      if (dropdown && !dropdown.hasAttribute('hidden')) {
        dropdown.setAttribute('hidden', 'true');
        this.triggerButton.setAttribute('aria-expanded', 'false');
        this.dropdownWasOpen = false; // Track state
      }
    }
  },

  setupSearchIntercept() {
    // Find the search input within the combobox
    const searchInput = this.el.querySelector('.search-combobox-search-input');

    if (searchInput) {
      console.log('Found combobox search input, setting up intercept');

      // Remove any existing event listeners to avoid duplicates
      if (this.boundSearchHandler) {
        searchInput.removeEventListener('input', this.boundSearchHandler);
      }
      if (this.boundSearchKeydownHandler) {
        searchInput.removeEventListener('keydown', this.boundSearchKeydownHandler);
      }

      // Create bound handlers
      this.boundSearchHandler = this.handleSearchInput.bind(this);
      this.boundSearchKeydownHandler = this.handleSearchKeydown.bind(this);

      // Add our custom search handlers
      searchInput.addEventListener('input', this.boundSearchHandler);
      searchInput.addEventListener('keydown', this.boundSearchKeydownHandler);

      // Store reference to the search input
      this.inputElement = searchInput;
    } else {
      console.log('Combobox search input not found yet');
    }
  },

  handleSearchKeydown(event) {
    const dropdown = this.el.querySelector('[data-part="search-combobox-listbox"]');
    const isDropdownOpen = dropdown && !dropdown.hasAttribute('hidden');

    if (!isDropdownOpen) return;

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      // Use advanced navigation for all search comboboxes
      event.preventDefault();
      this.navigateOptionsAdvanced(event.key === 'ArrowDown' ? 'down' : 'up');
    } else if (event.key === 'Enter') {
      event.preventDefault();
      this.selectNavigatedOption();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      this.closeDropdown();
    }
  },

  selectNavigatedOption() {
    const navigatedOption = this.el.querySelector('.combobox-option[data-combobox-navigate]');
    if (navigatedOption) {
      const value = navigatedOption.getAttribute('data-combobox-value');
      const isMultiple = this.el.getAttribute('data-multiple') === 'true';

      console.log('SearchCombobox: Selecting navigated option:', value);

      if (isMultiple) {
        // For multiple selection, toggle the selection and keep dropdown open
        this.toggleMultipleSelection(navigatedOption, value);
      } else {
        // For single selection, select the option and close dropdown
        this.setSingleSelection(navigatedOption, value);

        // Close the dropdown
        const dropdown = this.el.querySelector('[data-part="search-combobox-listbox"]');
        if (dropdown) {
          dropdown.setAttribute('hidden', 'true');
          this.triggerButton.setAttribute('aria-expanded', 'false');
          this.dropdownWasOpen = false;
          console.log('SearchCombobox: Closed dropdown after selection');
        }

        // Focus the trigger button
        if (this.triggerButton) {
          this.triggerButton.focus();
        }
      }
    }
  },

  selectHighlightedOptionKeepOpen() {
    const navigatedOption = this.el.querySelector('.combobox-option[data-combobox-navigate]');
    if (navigatedOption) {
      const value = navigatedOption.getAttribute('data-combobox-value');
      const isMultiple = this.el.getAttribute('data-multiple') === 'true';

      console.log('SearchCombobox: Selecting highlighted option and keeping combobox open:', value);

      if (isMultiple) {
        this.toggleMultipleSelection(navigatedOption, value);
      } else {
        // For single selection, update the selection but keep dropdown open
        this.setSingleSelectionKeepOpen(navigatedOption, value);
      }
    }
  },

  setSingleSelectionKeepOpen(option, value) {
    const selectEl = this.el.querySelector('.search-combobox-select');
    if (!selectEl) {
      console.log('setSingleSelectionKeepOpen: No select element found');
      return;
    }

    console.log('setSingleSelectionKeepOpen called with value:', value);

    // Clear all navigation highlights first
    this.clearAllNavigationHighlights();

    // Set the chosen option as highlighted/selected
    option.setAttribute('data-combobox-navigate', '');

    // Update select element value
    selectEl.value = value;
    console.log('setSingleSelectionKeepOpen: Set select value to:', value);

    // Update display and trigger change event
    this.updateSingleDisplay(option);
    this.triggerChange();

    // Keep the dropdown open - don't close it
    console.log('setSingleSelectionKeepOpen: Keeping dropdown open after selection');
  },

  setActiveSelectionKeepOpen(option) {
    const value = option.getAttribute('data-combobox-value');
    console.log('setActiveSelectionKeepOpen called with value:', value);

    // Clear all current navigation highlights
    this.clearAllNavigationHighlights();

    // Set this option as the active selection/navigation
    option.setAttribute('data-combobox-navigate', '');

    console.log('setActiveSelectionKeepOpen: Set active selection, keeping combobox open');
  },

  findHoveredOption() {
    // Try to find an option that's currently being hovered
    // We need to check for actual hover state since :hover doesn't always work reliably in all browsers
    const options = this.el.querySelectorAll('.combobox-option');

    // First check if we have a tracked hovered option
    if (this.currentlyHoveredOption && this.el.contains(this.currentlyHoveredOption)) {
      // Verify it's still a valid option
      const isStillValid = Array.from(options).includes(this.currentlyHoveredOption);
      if (isStillValid) {
        console.log('SearchCombobox: Using tracked hovered option:', this.currentlyHoveredOption.getAttribute('data-combobox-value'));
        return this.currentlyHoveredOption;
      } else {
        // Clear invalid reference
        this.currentlyHoveredOption = null;
      }
    }

    // Fallback: try to find direct hover on options
    for (const option of options) {
      if (option.matches(':hover')) {
        console.log('SearchCombobox: Found hovered option via :hover:', option.getAttribute('data-combobox-value'));
        this.currentlyHoveredOption = option;
        return option;
      }
    }

    // If no direct hover found, check if any element under the mouse is within an option
    const hoveredElement = document.elementFromPoint(
      window.mouseX || 0,
      window.mouseY || 0
    );

    if (hoveredElement) {
      // Find closest parent option
      const closestOption = hoveredElement.closest('.combobox-option');
      if (closestOption && Array.from(options).includes(closestOption)) {
        console.log('SearchCombobox: Found hovered option via elementFromPoint:', closestOption.getAttribute('data-combobox-value'));
        this.currentlyHoveredOption = closestOption;
        return closestOption;
      }
    }

    // No hovered option found
    this.currentlyHoveredOption = null;
    return null;
  },

    setCurrentNavigationItem(option) {
    // Clear all visual states first (includes navigation highlights)
    this.clearAllVisualStates();

    // Extra aggressive clearing for the specific option we're about to highlight
    // to prevent dual highlighting (turquoise + blue)
    this.clearOptionConflictingAttributes(option);

    // Set this option as the current navigation item (blue)
    option.setAttribute('data-combobox-navigate', '');

    // Make sure it's visible
    this.scrollToOption(option);

    console.log('SearchCombobox: Set current navigation item:', option.getAttribute('data-combobox-value'));
  },

  scrollPage(direction) {
    const scrollArea = this.el.querySelector('.scroll-viewport');
    if (!scrollArea) return;

    const scrollAreaHeight = scrollArea.clientHeight;
    const currentScrollTop = scrollArea.scrollTop;
    const pageSize = scrollAreaHeight * 0.8; // Scroll 80% of visible area

    let newScrollTop;
    if (direction === 'up') {
      newScrollTop = Math.max(0, currentScrollTop - pageSize);
    } else { // 'down'
      const maxScrollTop = scrollArea.scrollHeight - scrollAreaHeight;
      newScrollTop = Math.min(maxScrollTop, currentScrollTop + pageSize);
    }

    scrollArea.scrollTo({
      top: newScrollTop,
      behavior: 'smooth'
    });

    console.log(`SearchCombobox: Scrolled ${direction} by ${pageSize}px from ${currentScrollTop} to ${newScrollTop}`);
  },

  scrollPageAndUpdateHighlight(direction) {
    const scrollArea = this.el.querySelector('.scroll-viewport');
    if (!scrollArea) return;

    // Store the scroll direction for use in updateHighlightAfterScroll
    this.lastScrollDirection = direction;

    const scrollAreaHeight = scrollArea.clientHeight;
    const currentScrollTop = scrollArea.scrollTop;
    const pageSize = scrollAreaHeight * 0.8; // Scroll 80% of visible area

    let newScrollTop;
    if (direction === 'up') {
      newScrollTop = Math.max(0, currentScrollTop - pageSize);
    } else { // 'down'
      const maxScrollTop = scrollArea.scrollHeight - scrollAreaHeight;
      newScrollTop = Math.min(maxScrollTop, currentScrollTop + pageSize);
    }

    // Perform the scroll
    scrollArea.scrollTo({
      top: newScrollTop,
      behavior: 'smooth'
    });

    console.log(`SearchCombobox: Scrolled ${direction} by ${pageSize}px from ${currentScrollTop} to ${newScrollTop}`);

    // After scrolling, find the first visible option and highlight it
    // Use a timeout to wait for the smooth scroll to complete
    setTimeout(() => {
      this.updateHighlightAfterScroll();
    }, 300); // Wait for smooth scroll animation to complete
  },

    updateHighlightAfterScroll() {
    const scrollArea = this.el.querySelector('.scroll-viewport');
    if (!scrollArea) return;

    const options = Array.from(this.el.querySelectorAll('.combobox-option'));
    if (options.length === 0) return;

    // Get the currently highlighted option (before the scroll)
    const currentHighlighted = this.el.querySelector('.combobox-option[data-combobox-navigate]');
    if (!currentHighlighted) {
      // No current highlight, just highlight the first visible option
      const firstVisible = options.find(option => {
        const optionTop = option.offsetTop;
        const optionBottom = optionTop + option.offsetHeight;
        const scrollTop = scrollArea.scrollTop;
        const scrollBottom = scrollTop + scrollArea.clientHeight;
        return optionBottom > scrollTop && optionTop < scrollBottom;
      });

      if (firstVisible) {
        this.setCurrentNavigationItem(firstVisible);
        console.log('SearchCombobox: No previous highlight, selected first visible:', firstVisible.getAttribute('data-combobox-value'));
      }
      return;
    }

    // Calculate how many rows fit in one viewport
    const viewportHeight = scrollArea.clientHeight;
    const averageRowHeight = options.length > 0 ? (options[options.length - 1].offsetTop + options[options.length - 1].offsetHeight) / options.length : 40;
    const rowsPerViewport = Math.floor(viewportHeight / averageRowHeight);

    // Find the index of the currently highlighted option
    const currentIndex = options.indexOf(currentHighlighted);
    if (currentIndex === -1) return;

    // Calculate target index based on scroll direction
    // We need to determine if we scrolled up or down by checking the last scroll direction
    const scrollDirection = this.lastScrollDirection || 'down'; // Default to down if unknown

    let targetIndex;
    if (scrollDirection === 'down') {
      targetIndex = Math.min(options.length - 1, currentIndex + rowsPerViewport);
    } else {
      targetIndex = Math.max(0, currentIndex - rowsPerViewport);
    }

    const targetOption = options[targetIndex];
    if (targetOption) {
      // Set the navigation highlight
      this.setCurrentNavigationItem(targetOption);

      // Center the target option in the viewport
      const optionTop = targetOption.offsetTop;
      const optionHeight = targetOption.offsetHeight;
      const optionCenter = optionTop + (optionHeight / 2);

      // Calculate the scroll position that would center the option
      const targetScrollTop = optionCenter - (viewportHeight / 2);

      // Ensure we don't scroll beyond bounds
      const maxScrollTop = scrollArea.scrollHeight - viewportHeight;
      const finalScrollTop = Math.max(0, Math.min(targetScrollTop, maxScrollTop));

      // Only scroll if there's a meaningful difference
      if (Math.abs(finalScrollTop - scrollArea.scrollTop) > 5) {
        scrollArea.scrollTo({
          top: finalScrollTop,
          behavior: 'smooth'
        });
        console.log(`SearchCombobox: Centered target option ${targetOption.getAttribute('data-combobox-value')} in viewport (scroll: ${scrollArea.scrollTop} -> ${finalScrollTop})`);
      }

      console.log(`SearchCombobox: Moved highlight ${scrollDirection} by ${Math.abs(targetIndex - currentIndex)} rows from ${currentHighlighted.getAttribute('data-combobox-value')} to ${targetOption.getAttribute('data-combobox-value')}`);
    }
  },

  restoreSearchValue() {
    const searchInput = this.el.querySelector('.search-combobox-search-input');
    if (searchInput && this.searchTerm && searchInput.value !== this.searchTerm) {
      console.log(`Restoring search value: "${this.searchTerm}"`);
      searchInput.value = this.searchTerm;
    }
  },

  restoreSearchFocus() {
    const searchInput = this.el.querySelector('.search-combobox-search-input');
    if (searchInput) {
      console.log('Restoring focus to search input');
      // Use requestAnimationFrame to ensure DOM is fully updated
      requestAnimationFrame(() => {
        searchInput.focus();
        // Position cursor at the end of the text
        if (searchInput.value) {
          searchInput.setSelectionRange(searchInput.value.length, searchInput.value.length);
        }
      });
    }
  },

  restoreDropdownState(isOpen) {
    const dropdown = this.el.querySelector('[data-part="search-combobox-listbox"]');
    const triggerButton = this.el.querySelector('.search-combobox-trigger');

    if (dropdown && triggerButton) {
      if (isOpen) {
        console.log('SearchCombobox: Restoring dropdown to open state');
        dropdown.removeAttribute('hidden');
        triggerButton.setAttribute('aria-expanded', 'true');
      } else {
        console.log('SearchCombobox: Restoring dropdown to closed state');
        dropdown.setAttribute('hidden', 'true');
        triggerButton.setAttribute('aria-expanded', 'false');
      }
    }
  },

  handleSearchInput(event) {
    const searchTerm = event.target.value;
    console.log(`search search input: "${searchTerm}"`);

    // Store the search term
    this.searchTerm = searchTerm;

    // Clear existing debounce timer
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    // Debounce the search request (500ms delay to reduce focus loss)
    this.debounceTimer = setTimeout(() => {
      console.log(`Sending search for: "${this.searchTerm}"`);
      this.sendSearchEvent(this.searchTerm);
    }, this.debounceDelay);
  },

  sendSearchEvent(searchTerm) {
    console.log(`Sending search event with term: "${searchTerm}"`);

    // Check if there's a phx-target attribute on the search combobox
    const searchCombobox = this.el.closest('[phx-target]');
    if (searchCombobox) {
      const target = searchCombobox.getAttribute('phx-target');
      console.log(`Sending search event to target: ${target}`);
      // Send to the specific component
      this.pushEventTo(target, this.searchEventName, { value: searchTerm });
    } else {
      // Send to the parent LiveView (default behavior)
      this.pushEvent(this.searchEventName, { value: searchTerm });
    }
  },

  setupDropdownObserver() {
    // Watch for dropdown state changes to clear search term when closed
    const dropdown = this.el.querySelector('[data-part="search-combobox-listbox"]');
    if (dropdown) {
      // Use MutationObserver to watch for hidden attribute changes
      this.dropdownObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'attributes' && mutation.attributeName === 'hidden') {
            const isHidden = dropdown.hasAttribute('hidden');
            if (isHidden) {
              // Dropdown was closed, clear the stored search term
              console.log('Dropdown closed, clearing stored search term');
              this.searchTerm = '';
            }
          }
        });
      });

      this.dropdownObserver.observe(dropdown, {
        attributes: true,
        attributeFilter: ['hidden']
      });
    }
  },

  setupFormChangeForwarding() {
    // Find the select element and ensure change events are forwarded
    const selectElement = this.el.querySelector('.search-combobox-select');
    if (selectElement) {
      console.log('Found select element, setting up change forwarding');

      // Remove existing listener if any
      if (this.boundChangeHandler) {
        selectElement.removeEventListener('change', this.boundChangeHandler);
      }

      // Create bound handler
      this.boundChangeHandler = this.handleSelectChange.bind(this);

      // Add change listener
      selectElement.addEventListener('change', this.boundChangeHandler);
      this.selectElement = selectElement;
    } else {
      console.log('Select element not found yet');
    }
  },

  handleSelectChange(event) {
    console.log('search select changed:', event.target.value);
    // Let the event bubble up normally to LiveView
    // The phx-change on the search_combobox should catch this
  },

  /**
   * Test method to manually trigger height calculation (for debugging)
   */
  testHeightCalculation() {
    console.log('SearchCombobox: Manual height calculation test triggered');
    this.setOptimalDropdownHeight();
  },

  /**
   * Sets up window resize handler to recalculate dropdown height when viewport changes
   */
  setupWindowResizeHandler() {
    // Remove existing listener if any
    if (this.boundWindowResizeHandler) {
      window.removeEventListener('resize', this.boundWindowResizeHandler);
    }

    // Create bound handler
    this.boundWindowResizeHandler = () => {
      const dropdown = this.el.querySelector('[data-part="search-combobox-listbox"]');
      if (dropdown && !dropdown.hasAttribute('hidden')) {
        // Only recalculate if dropdown is open
        this.setOptimalDropdownHeight();
      }
    };

    // Add resize listener
    window.addEventListener('resize', this.boundWindowResizeHandler);
  },

  /**
   * Sets up the clear button functionality
   */
  setupClearButton() {
    const clearButton = this.el.querySelector('[data-part="clear-combobox-button"]');
    if (clearButton) {
      console.log('Found clear button, setting up click handler');

      // Remove any existing event listener to avoid duplicates
      if (this.boundClearHandler) {
        clearButton.removeEventListener('click', this.boundClearHandler);
      }

      // Create bound handler
      this.boundClearHandler = this.handleClearClick.bind(this);

      // Add event listener
      clearButton.addEventListener('click', this.boundClearHandler);

      // Store reference to the clear button
      this.clearButton = clearButton;
    } else {
      console.log('Clear button not found');
    }
  },

  /**
   * Handles clear button click
   */
  handleClearClick(event) {
    event.preventDefault();
    event.stopPropagation();

    console.log('SearchCombobox: Clear button clicked');

    const selectEl = this.el.querySelector('.search-combobox-select');
    const isMultiple = this.el.getAttribute('data-multiple') === 'true';

    if (isMultiple) {
      // Clear all multiple selections
      this.clearAllMultipleSelections();
    } else {
      // Clear single selection
      this.clearSingleSelection();
    }

    // Clear search input
    const searchInput = this.el.querySelector('.search-combobox-search-input');
    if (searchInput) {
      searchInput.value = '';
      this.searchTerm = '';
    }

    // Hide the clear button
    const clearButton = this.el.querySelector('[data-part="clear-combobox-button"]');
    if (clearButton) {
      clearButton.setAttribute('hidden', 'true');
    }

    // Trigger change event
    this.triggerChange();

    // Close dropdown if open
    const dropdown = this.el.querySelector('[data-part="search-combobox-listbox"]');
    if (dropdown && !dropdown.hasAttribute('hidden')) {
      dropdown.setAttribute('hidden', 'true');
      this.triggerButton.setAttribute('aria-expanded', 'false');
      this.dropdownWasOpen = false;
    }

    // Focus the trigger button
    if (this.triggerButton) {
      this.triggerButton.focus();
    }
  },

  /**
   * Sets up drag prevention functionality
   */
  setupDragPrevention() {
    console.log('SearchCombobox: Setting up drag prevention');

    // Prevent dragging on the entire combobox element
    this.el.setAttribute('draggable', 'false');

    // Add CSS to prevent text selection and dragging
    this.el.style.userSelect = 'none';
    this.el.style.webkitUserSelect = 'none';
    this.el.style.mozUserSelect = 'none';
    this.el.style.msUserSelect = 'none';

    // Remove existing drag prevention handlers to avoid duplicates
    if (this.boundPreventDragStart) {
      this.el.removeEventListener('dragstart', this.boundPreventDragStart);
    }
    if (this.boundPreventSelectStart) {
      this.el.removeEventListener('selectstart', this.boundPreventSelectStart);
    }
    if (this.boundPreventMouseDown) {
      this.el.removeEventListener('mousedown', this.boundPreventMouseDown);
    }

    // Create bound handlers
    this.boundPreventDragStart = this.preventDragStart.bind(this);
    this.boundPreventSelectStart = this.preventSelectStart.bind(this);
    this.boundPreventMouseDown = this.preventDragMouseDown.bind(this);

    // Add event listeners to prevent dragging
    this.el.addEventListener('dragstart', this.boundPreventDragStart);
    this.el.addEventListener('selectstart', this.boundPreventSelectStart);
    this.el.addEventListener('mousedown', this.boundPreventMouseDown);

    // Set draggable=false on all child elements that might be draggable
    const draggableElements = this.el.querySelectorAll('*');
    draggableElements.forEach(element => {
      element.setAttribute('draggable', 'false');

      // Specifically prevent dragging on options and trigger
      if (element.classList.contains('combobox-option') ||
          element.classList.contains('search-combobox-trigger') ||
          element.classList.contains('search-combobox-pill')) {
        element.style.userSelect = 'none';
        element.style.webkitUserSelect = 'none';
        element.style.mozUserSelect = 'none';
        element.style.msUserSelect = 'none';
      }
    });

    // Allow text selection only in the search input
    const searchInput = this.el.querySelector('.search-combobox-search-input');
    if (searchInput) {
      searchInput.style.userSelect = 'text';
      searchInput.style.webkitUserSelect = 'text';
      searchInput.style.mozUserSelect = 'text';
      searchInput.style.msUserSelect = 'text';
    }

    console.log('SearchCombobox: Drag prevention setup complete');
  },

  /**
   * Prevents drag start events
   */
  preventDragStart(event) {
    // Allow dragging only if it's from the search input and there's selected text
    const searchInput = this.el.querySelector('.search-combobox-search-input');
    if (event.target === searchInput && searchInput.selectionStart !== searchInput.selectionEnd) {
      return; // Allow text selection dragging in search input
    }

    event.preventDefault();
    event.stopPropagation();
    console.log('SearchCombobox: Prevented drag start');
    return false;
  },

  /**
   * Prevents text selection start events
   */
  preventSelectStart(event) {
    // Allow text selection only in the search input
    const searchInput = this.el.querySelector('.search-combobox-search-input');
    if (event.target === searchInput) {
      return; // Allow text selection in search input
    }

    event.preventDefault();
    console.log('SearchCombobox: Prevented select start');
    return false;
  },

  /**
   * Prevents drag behavior on mouse down
   */
  preventDragMouseDown(event) {
    // Check if this is a mouse down that could start a drag
    const searchInput = this.el.querySelector('.search-combobox-search-input');

    // Allow normal mouse behavior in search input
    if (event.target === searchInput) {
      return;
    }

    // For other elements, prevent drag but allow normal click behavior
    // Only prevent if this looks like a potential drag (mouse move might follow)
    const target = event.target;
    if (target.classList.contains('combobox-option') ||
        target.classList.contains('search-combobox-trigger') ||
        target.classList.contains('search-combobox-pill') ||
        target.closest('.combobox-option') ||
        target.closest('.search-combobox-trigger') ||
        target.closest('.search-combobox-pill')) {

      // Store the initial mouse position to detect drag attempts
      this.mouseDownX = event.clientX;
      this.mouseDownY = event.clientY;
      this.mouseDownTime = Date.now();

      // Add temporary mouse move listener to detect drag attempts
      if (!this.boundDetectDragAttempt) {
        this.boundDetectDragAttempt = this.detectDragAttempt.bind(this);
      }

      document.addEventListener('mousemove', this.boundDetectDragAttempt);

      // Clean up the listener after a short time or on mouse up
      const cleanup = () => {
        document.removeEventListener('mousemove', this.boundDetectDragAttempt);
        document.removeEventListener('mouseup', cleanup);
      };
      document.addEventListener('mouseup', cleanup);
    }
  },

  /**
   * Detects and prevents drag attempts
   */
  detectDragAttempt(event) {
    if (!this.mouseDownX || !this.mouseDownY) return;

    const deltaX = Math.abs(event.clientX - this.mouseDownX);
    const deltaY = Math.abs(event.clientY - this.mouseDownY);
    const deltaTime = Date.now() - this.mouseDownTime;

    // If mouse has moved significantly while button is down, it's likely a drag attempt
    if ((deltaX > 3 || deltaY > 3) && deltaTime > 50) {
      event.preventDefault();
      event.stopPropagation();
      console.log('SearchCombobox: Detected and prevented drag attempt');

      // Clean up
      document.removeEventListener('mousemove', this.boundDetectDragAttempt);
      this.mouseDownX = null;
      this.mouseDownY = null;
      this.mouseDownTime = null;
    }
  },

  /**
   * Clears all selections in multiple mode
   */
  clearAllMultipleSelections() {
    const selectEl = this.el.querySelector('.search-combobox-select');
    if (!selectEl) return;

    // Clear all selected options in the select element
    Array.from(selectEl.options).forEach(option => {
      option.selected = false;
    });

    // Update display (don't clear navigation highlights - those are separate)
    this.updateMultipleDisplay();

    console.log('SearchCombobox: Cleared all multiple selections');
  },

  /**
   * Clears single selection
   */
  clearSingleSelection() {
    const selectEl = this.el.querySelector('.search-combobox-select');
    if (!selectEl) return;

    // Clear the select element value
    selectEl.value = '';

    // Update display (don't clear navigation highlights - those are separate)
    this.updateSingleDisplay(null);

    console.log('SearchCombobox: Cleared single selection');
  },

  cleanupHandlers() {
    // Clean up all event listeners to avoid memory leaks
    if (this.boundSearchHandler && this.inputElement) {
      this.inputElement.removeEventListener('input', this.boundSearchHandler);
    }
    if (this.boundSearchKeydownHandler && this.inputElement) {
      this.inputElement.removeEventListener('keydown', this.boundSearchKeydownHandler);
    }
    if (this.boundTriggerHandler && this.triggerButton) {
      this.triggerButton.removeEventListener('click', this.boundTriggerHandler);
    }
    if (this.boundTriggerKeyHandler && this.triggerButton) {
      this.triggerButton.removeEventListener('keydown', this.boundTriggerKeyHandler);
    }
    if (this.boundDocumentClickHandler) {
      document.removeEventListener('pointerdown', this.boundDocumentClickHandler);
      document.removeEventListener('mouseup', this.boundDocumentClickHandler);
      document.removeEventListener('click', this.boundDocumentClickHandler);
    }
    if (this.boundOptionClickHandlers) {
      this.boundOptionClickHandlers.forEach(({ option, handler }) => {
        option.removeEventListener('click', handler);
      });
    }
    if (this.boundOptionKeydownHandlers) {
      this.boundOptionKeydownHandlers.forEach(({ option, handler }) => {
        option.removeEventListener('keydown', handler);
      });
    }
    // Clean up delegated hover handlers
    if (this.boundDelegatedHoverHandler) {
      this.el.removeEventListener('mouseover', this.boundDelegatedHoverHandler);
      this.el.removeEventListener('mouseout', this.boundDelegatedHoverHandler);
    }
    if (this.boundClearHandler && this.clearButton) {
      this.clearButton.removeEventListener('click', this.boundClearHandler);
    }
    if (this.boundChangeHandler && this.selectElement) {
      this.selectElement.removeEventListener('change', this.boundChangeHandler);
    }
    if (this.boundWindowResizeHandler) {
      window.removeEventListener('resize', this.boundWindowResizeHandler);
    }
    if (this.boundTrackMousePosition) {
      document.removeEventListener('mousemove', this.boundTrackMousePosition);
    }
    if (this.boundPreventDragStart) {
      this.el.removeEventListener('dragstart', this.boundPreventDragStart);
    }
    if (this.boundPreventSelectStart) {
      this.el.removeEventListener('selectstart', this.boundPreventSelectStart);
    }
    if (this.boundPreventMouseDown) {
      this.el.removeEventListener('mousedown', this.boundPreventMouseDown);
    }
    if (this.boundButtonKeyboardHandler) {
      const buttons = this.el.querySelectorAll('button[title*="Toggle group"], button[title*="sort order"]');
      buttons.forEach(button => {
        button.removeEventListener('keydown', this.boundButtonKeyboardHandler);
        button.removeEventListener('click', this.boundButtonClickHandler);
      });
    }
    if (this.boundGlobalKeydownHandler) {
      document.removeEventListener('keydown', this.boundGlobalKeydownHandler);
    }

    // Clean up observer
    if (this.dropdownObserver) {
      this.dropdownObserver.disconnect();
    }

    // Clean up any timers
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    if (this.buttonInteractionTimeout) {
      clearTimeout(this.buttonInteractionTimeout);
    }
  },

  destroyed() {
    console.log('SearchCombobox destroyed, cleaning up handlers');
    this.cleanupHandlers();

    // Clean up any other resources or references
    this.currentlyHoveredOption = null;
    this.triggerButton = null;
    this.inputElement = null;
    this.selectElement = null;
    this.clearButton = null;
    this.el.searchComboboxInstance = null;
  },

  setupKeyboardNavigation() {
    // Remove existing listeners if any
    if (this.boundSearchKeydownHandler) {
      const searchInput = this.el.querySelector('.search-combobox-search-input');
      if (searchInput) {
        searchInput.removeEventListener('keydown', this.boundSearchKeydownHandler);
      }
    }

    if (this.boundButtonKeyboardHandler) {
      const buttons = this.el.querySelectorAll('button[title*="Toggle group"], button[title*="sort order"]');
      buttons.forEach(button => {
        button.removeEventListener('keydown', this.boundButtonKeyboardHandler);
        button.removeEventListener('click', this.boundButtonClickHandler);
      });
    }

    // Set up enhanced keyboard navigation
    this.boundSearchKeydownHandler = (event) => {
      this.handleAdvancedSearchKeydown(event);
    };

    this.boundButtonKeyboardHandler = (event) => {
      this.handleButtonKeydown(event);
    };

    this.boundButtonClickHandler = (event) => {
      console.log('SearchCombobox: Button clicked, setting long-duration interaction flag');
      this.isButtonInteraction = true;
      this.buttonInteractionTime = Date.now();

      // Store the current scroll position and highlighted option to restore later
      const scrollArea = this.el.querySelector('.scroll-viewport');
      const currentHighlighted = this.el.querySelector('.combobox-option[data-combobox-navigate]');

      if (scrollArea) {
        this.preButtonScrollTop = scrollArea.scrollTop;
      }
      if (currentHighlighted) {
        this.preButtonHighlightedValue = currentHighlighted.getAttribute('data-combobox-value');
      }

      // Clear any existing timeout
      if (this.buttonInteractionTimeout) {
        clearTimeout(this.buttonInteractionTimeout);
      }

      // Keep the flag set for longer to account for LiveView update delays
      this.buttonInteractionTimeout = setTimeout(() => {
        console.log('SearchCombobox: Clearing button interaction flag after extended timeout');
        this.isButtonInteraction = false;
        this.buttonInteractionTime = null;
        this.preButtonScrollTop = null;
        this.preButtonHighlightedValue = null;
      }, 2000); // Extended to 2 seconds
    };

    const searchInput = this.el.querySelector('.search-combobox-search-input');
    if (searchInput) {
      searchInput.addEventListener('keydown', this.boundSearchKeydownHandler);
    }

    const buttons = this.el.querySelectorAll('button[title*="Toggle group"], button[title*="sort order"]');
    buttons.forEach(button => {
      button.addEventListener('click', this.boundButtonClickHandler);
      button.addEventListener('keydown', this.boundButtonKeyboardHandler);
    });

    console.log(`SearchCombobox: Set up advanced keyboard navigation on search input and ${buttons.length} control buttons`);
  },

  handleButtonKeydown(event) {
    const dropdown = this.el.querySelector('[data-part="search-combobox-listbox"]');
    const isDropdownOpen = dropdown && !dropdown.hasAttribute('hidden');

    if (!isDropdownOpen) return;

    if (event.key === ' ' || event.key === 'Enter') {
      // When a button has focus, space and enter keys behave as if the button was clicked
      event.preventDefault();
      const currentButton = event.target;
      console.log('SearchCombobox: Space/Enter key pressed on button, simulating click');

      // Store button reference for focus restoration
      const buttonSelector = this.getButtonSelector(currentButton);

      // Trigger the click event on the button
      currentButton.click();

      // Keep focus on the button after the action, with multiple attempts to handle LiveView updates
      setTimeout(() => {
        const button = this.el.querySelector(buttonSelector) || currentButton;
        if (button) {
          button.focus();
          console.log('SearchCombobox: Restored focus to button after click (first attempt)');
        }
      }, 10);

      // Second attempt after a longer delay to handle LiveView updates
      setTimeout(() => {
        const button = this.el.querySelector(buttonSelector) || currentButton;
        if (button && document.activeElement !== button) {
          button.focus();
          console.log('SearchCombobox: Restored focus to button after click (second attempt)');
        }
      }, 100);

      // Third attempt after an even longer delay
      setTimeout(() => {
        const button = this.el.querySelector(buttonSelector) || currentButton;
        if (button && document.activeElement !== button) {
          button.focus();
          console.log('SearchCombobox: Restored focus to button after click (third attempt)');
        }
      }, 300);

      return;
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      // Handle vertical arrow keys
      event.preventDefault();

      if (event.key === 'ArrowDown') {
        console.log('SearchCombobox: Arrow down from button, moving to options');
        // Find the group this button belongs to
        const buttonGroup = event.target.closest('.option-group');
        if (buttonGroup) {
          // Find the first option in this group
          const firstOptionInGroup = buttonGroup.querySelector('.combobox-option');
          if (firstOptionInGroup) {
            this.highlightOption(firstOptionInGroup, false);
            return;
          }
        }

        // Fallback to normal navigation if we couldn't find a specific target
        this.navigateOptionsAdvanced('down');
      } else { // ArrowUp
        console.log('SearchCombobox: Arrow up from button, finding previous group or search input');
        // Find the group this button belongs to
        const currentGroup = event.target.closest('.option-group');
        if (currentGroup) {
          // Get all groups in order
          const allGroups = Array.from(this.el.querySelectorAll('.option-group'));
          const currentGroupIndex = allGroups.indexOf(currentGroup);

          // Look for the previous expanded group
          for (let i = currentGroupIndex - 1; i >= 0; i--) {
            const prevGroup = allGroups[i];
            // Check if this group is expanded (has visible options)
            const options = prevGroup.querySelectorAll('.combobox-option');
            const visibleOptions = Array.from(options).filter(opt =>
              !opt.hasAttribute('hidden') &&
              opt.offsetParent !== null
            );

            if (visibleOptions.length > 0) {
              // Get the last visible option in this group
              const lastVisibleOption = visibleOptions[visibleOptions.length - 1];
              console.log('SearchCombobox: Found last option in previous expanded group');
              this.highlightOption(lastVisibleOption, false);
              return;
            }
          }

          // If we get here, no previous expanded group was found
          // Go to the search input instead
          const searchInput = this.el.querySelector('.search-combobox-search-input');
          if (searchInput) {
                      console.log('SearchCombobox: No previous expanded group, focusing search input');
          searchInput.focus();
          this.clearAllVisualStates();
            return;
          }
        }

        // Fallback to search input as a last resort
        const searchInput = this.el.querySelector('.search-combobox-search-input');
        if (searchInput) {
          searchInput.focus();
          this.clearAllVisualStates();
          return;
        }
      }
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      // Handle left and right arrow navigation between group buttons
      event.preventDefault();
      this.navigateGroupButtons(event.key === 'ArrowRight' ? 'right' : 'left');
    } else if (event.key === 'Tab' && !event.shiftKey) {
      event.preventDefault(); // Always prevent default for Tab
      // Find the current button and determine next focus target
      const currentButton = event.target;
      const buttonGroup = currentButton.closest('.option-group');

      // Check if there's a hovered option - if so, use that as reference for next group navigation
      const hoveredOption = this.findHoveredOption();
      if (hoveredOption) {
        const hoveredOptionGroup = hoveredOption.closest('.option-group');
        if (hoveredOptionGroup) {
          const allGroups = Array.from(this.el.querySelectorAll('.option-group'));
          const hoveredGroupIndex = allGroups.indexOf(hoveredOptionGroup);

          // Look for the next group after the hovered option's group
          const nextGroup = allGroups[hoveredGroupIndex + 1];
          if (nextGroup) {
            // Find the expand/collapse button in the next group
            const nextGroupButton = nextGroup.querySelector('button[title*="Toggle group"]');
            if (nextGroupButton) {
              nextGroupButton.focus();
              console.log('SearchCombobox: Tab navigated to next group button based on hovered option:', hoveredOption.getAttribute('data-combobox-value'));
              return;
            }
          }
        }
      }

      if (buttonGroup) {
        // Check if this is a sort button (last button in group)
        const groupButtons = Array.from(buttonGroup.querySelectorAll('button'));
        const isSortButton = groupButtons.indexOf(currentButton) === groupButtons.length - 1;

        if (isSortButton) {
          // From sort button, go to first option in this group
          const firstOptionInGroup = buttonGroup.querySelector('.combobox-option');
          if (firstOptionInGroup) {
            this.highlightOption(firstOptionInGroup, false);
            return;
          }
        }
      }

      // For other buttons or if no option found, manually move focus to the next focusable element
      const focusable = Array.from(this.el.querySelectorAll('button, [tabindex]:not([tabindex="-1"])'));
      const currentIndex = focusable.indexOf(currentButton);
      if (currentIndex !== -1 && currentIndex < focusable.length - 1) {
        focusable[currentIndex + 1].focus();
      }
      console.log('SearchCombobox: Letting default tab behavior handle this');
    } else if (event.key === 'Tab' && event.shiftKey) {
      event.preventDefault(); // Always prevent default for Shift+Tab
      // Handle Shift+Tab from buttons
      const currentButton = event.target;
      const buttonGroup = currentButton.closest('.option-group');

      console.log('SearchCombobox: Shift+Tab from button:', currentButton.title);

      if (buttonGroup) {
        // Check if this is the first group
        const allGroups = Array.from(this.el.querySelectorAll('.option-group'));
        const isFirstGroup = allGroups.indexOf(buttonGroup) === 0;

        console.log('SearchCombobox: Is first group:', isFirstGroup);

        if (isFirstGroup) {
          // Check if this is specifically the expand/collapse button (first button in group)
          const groupButtons = Array.from(buttonGroup.querySelectorAll('button'));
          const isExpandCollapseButton = groupButtons.indexOf(currentButton) === 0;

          console.log('SearchCombobox: Button index:', groupButtons.indexOf(currentButton), 'Is expand/collapse:', isExpandCollapseButton);

          if (isExpandCollapseButton) {
            // From first group's expand/collapse button, go to search input
            const searchInput = this.el.querySelector('.search-combobox-search-input');
            if (searchInput) {
              searchInput.focus();
              return;
            }
          }
        }
      }

      // For other buttons (including sort button), manually move focus to the previous focusable element
      const focusable = Array.from(this.el.querySelectorAll('button, [tabindex]:not([tabindex="-1"])'));
      const currentIndex = focusable.indexOf(currentButton);
      if (currentIndex > 0) {
        focusable[currentIndex - 1].focus();
      }
      console.log('SearchCombobox: Letting default Shift+Tab behavior handle this');
    }
  },

  navigateGroupButtons(direction) {
    // Get all group buttons in order: [group1_collapse, group1_sort, group2_collapse, group2_sort, ...]
    const allButtons = [];
    const groups = Array.from(this.el.querySelectorAll('.option-group'));

    groups.forEach(group => {
      const groupButtons = Array.from(group.querySelectorAll('button'));
      allButtons.push(...groupButtons);
    });

    if (allButtons.length === 0) return;

    // Find the currently focused button
    const currentButton = document.activeElement;
    const currentIndex = allButtons.indexOf(currentButton);

    if (currentIndex === -1) {
      // No button is currently focused, focus the first one
      allButtons[0].focus();
      return;
    }

    let newIndex;
    if (direction === 'right') {
      // Move to next button, wrap around to beginning if at end
      newIndex = (currentIndex + 1) % allButtons.length;
    } else { // 'left'
      // Move to previous button, wrap around to end if at beginning
      newIndex = currentIndex === 0 ? allButtons.length - 1 : currentIndex - 1;
    }

    allButtons[newIndex].focus();
    console.log(`SearchCombobox: Navigated ${direction} from button ${currentIndex} to button ${newIndex}`);
  },

  handleAdvancedSearchKeydown(event) {
    const dropdown = this.el.querySelector('[data-part="search-combobox-listbox"]');
    const isDropdownOpen = dropdown && !dropdown.hasAttribute('hidden');

    if (!isDropdownOpen) {
      // Handle keys when dropdown is closed
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        this.openDropdownAndFocusSearch();
      } else if (this.isPrintableCharacter(event.key, event)) {
        // If a printable character is typed and dropdown is closed, open it and start typing
        console.log(`SearchCombobox: Opening dropdown and starting typing with character: "${event.key}"`);
        event.preventDefault();
        this.openDropdownAndStartTyping(event.key);
      }
      return;
    }

    // Handle keys when dropdown is open
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.navigateOptionsAdvanced('down');
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.navigateOptionsAdvanced('up');
        break;
      case 'Enter':
        event.preventDefault();
        this.selectNavigatedOption();
        break;
      case 'Escape':
        event.preventDefault();
        this.closeDropdown();
        break;
      case ' ':
        // Handle space key based on mouse hover over scroll area (mouse position takes precedence)
        const searchInput = this.el.querySelector('.search-combobox-search-input');
        const isFromSearchInput = event.target === searchInput;
        const isMouseOverScrollArea = this.isMouseOverScrollArea();

        // If mouse is hovering over scroll area, handle scrolling (takes precedence over focus)
        if (isMouseOverScrollArea) {
          event.preventDefault();
          if (event.shiftKey) {
            this.scrollPageAndUpdateHighlight('up');
            console.log('SearchCombobox: Shift+Space with mouse over scroll area - scrolling up a page');
          } else {
            this.scrollPageAndUpdateHighlight('down');
            console.log('SearchCombobox: Space with mouse over scroll area - scrolling down a page');
          }
        } else if (isFromSearchInput) {
          // Mouse not over scroll area AND focus is on search input - let space be typed normally
          // Don't prevent default here
          console.log('SearchCombobox: Space with mouse not over scroll area and search input focused - typing normally');
          return;
        } else {
          // Mouse not over scroll area and focus not on search input - send space to search input
          event.preventDefault();
          if (searchInput) {
            searchInput.focus();
            // Add space to the search input
            const currentValue = searchInput.value || '';
            const newValue = currentValue + ' ';
            searchInput.value = newValue;
            this.searchTerm = newValue;

            // Position cursor at the end
            searchInput.setSelectionRange(newValue.length, newValue.length);

            // Trigger the search input handler
            this.handleSearchInput({ target: searchInput });

            console.log('SearchCombobox: Space with mouse not over scroll area and search input not focused - added space to search input');
          }
        }
        break;
      case 'Tab':
        // Handle Tab navigation - move to first group button if available
        const firstGroupButton = this.el.querySelector('button[title*="Toggle group"]');
        if (firstGroupButton && !event.shiftKey) {
          event.preventDefault();
          firstGroupButton.focus();
        }
        break;
    }
  },

  highlightOption(option, preventScroll = false) {
    if (!option) {
      console.log('SearchCombobox: highlightOption called with null option');
      return;
    }

    console.log(`SearchCombobox: highlightOption called for ${option.getAttribute('data-combobox-value')}, preventScroll: ${preventScroll}`);

    // Clear all visual states first to ensure clean slate (includes navigation highlights)
    this.clearAllVisualStates();

    // Extra aggressive clearing for the specific option we're about to highlight
    // to prevent dual highlighting (turquoise + blue)
    this.clearOptionConflictingAttributes(option);

    // Highlight the new option for keyboard navigation (blue state)
    option.setAttribute('data-combobox-navigate', '');
    console.log(`SearchCombobox: Set data-combobox-navigate attribute on ${option.getAttribute('data-combobox-value')}`);

    // Make sure the option is visible (unless prevented)
    // Ignore mouse hover position during keyboard navigation - always scroll consistently
    if (!preventScroll) {
      this.scrollToOption(option);
    }

    // Check if we're navigating from a button
    const focusedElement = document.activeElement;
    const isNavigatingFromButton = focusedElement && focusedElement.tagName === 'BUTTON' &&
                                  this.el.contains(focusedElement);

    // Check if search input has content - if so, don't steal focus
    const searchInput = this.el.querySelector('.search-combobox-search-input');
    const hasSearchContent = searchInput && searchInput.value && searchInput.value.trim() !== '';
    const isSearchFocused = searchInput && document.activeElement === searchInput;

    // Set tabindex for accessibility
    option.setAttribute('tabindex', '0');

    // Always focus the option when navigating from buttons
    if (isNavigatingFromButton) {
      option.focus();
      console.log('SearchCombobox: Highlighted and focused option from button navigation:', option.getAttribute('data-combobox-value'));
    }
    // Always focus the option during keyboard navigation to ensure keydown events are captured
    else if (this.isKeyboardNavigating) {
      option.focus();
      console.log('SearchCombobox: Highlighted and focused option during keyboard navigation:', option.getAttribute('data-combobox-value'));
    }
    // Only focus the option if search input doesn't have content and isn't focused
    else if (!hasSearchContent && !isSearchFocused) {
      option.focus();
      console.log('SearchCombobox: Highlighted and focused option:', option.getAttribute('data-combobox-value'));
    } else {
      console.log('SearchCombobox: Highlighted option without focusing (search input has content or focus):', option.getAttribute('data-combobox-value'));
    }
  },

    clearAllHighlights() {
    // Clear all visual states (comprehensive cleanup)
    this.clearAllVisualStates();
  },

    clearAllNavigationHighlights() {
    // Clear all navigation highlights and remove tabindex
    this.el.querySelectorAll('.combobox-option[data-combobox-navigate]')
      .forEach(opt => {
        opt.removeAttribute('data-combobox-navigate');
        opt.removeAttribute('tabindex');
      });

    // Note: We no longer clear data-combobox-selected here as it's used for actual selection state
  },

  /**
   * Aggressively clears all conflicting attributes from a single option to prevent dual highlighting
   */
  clearOptionConflictingAttributes(option) {
    if (!option) return;

    // Remove conflicting attributes that could cause dual highlighting
    // Note: We preserve data-combobox-selected as it's used for actual selection state
    option.removeAttribute('data-combobox-highlighted');
    option.removeAttribute('data-combobox-active');
    option.removeAttribute('data-selected');
    option.removeAttribute('aria-selected');
    option.removeAttribute('data-state');
    option.removeAttribute('data-highlighted');

    // Remove any conflicting CSS classes
    option.classList.remove('highlighted', 'selected', 'active', 'focused', 'combobox-highlighted', 'combobox-selected', 'navigation-highlighted');

    // Clear inline styles that might cause highlighting conflicts
    if (option.style.backgroundColor) option.style.backgroundColor = '';
    if (option.style.background) option.style.background = '';

    console.log('SearchCombobox: Aggressively cleared conflicting attributes from option:', option.getAttribute('data-combobox-value'));
  },

    clearAllVisualStates() {
    // Comprehensive cleanup of all visual state attributes and classes that might cause highlighting issues
    const options = this.el.querySelectorAll('.combobox-option');
    options.forEach(opt => {
      // Remove navigation and highlighting attributes (preserve data-combobox-selected for selection state)
      opt.removeAttribute('data-combobox-navigate');
      opt.removeAttribute('data-combobox-highlighted');
      opt.removeAttribute('data-combobox-active');
      opt.removeAttribute('data-selected');
      opt.removeAttribute('tabindex');

      // Additional attributes that might cause conflicts
      opt.removeAttribute('aria-selected');
      opt.removeAttribute('data-state');
      opt.removeAttribute('data-highlighted');

      // Remove any CSS classes that might cause highlighting
      opt.classList.remove('highlighted', 'selected', 'active', 'focused', 'combobox-highlighted', 'combobox-selected', 'navigation-highlighted');

      // Clear any inline styles that might be causing highlighting
      if (opt.style.backgroundColor) opt.style.backgroundColor = '';
      if (opt.style.background) opt.style.background = '';
    });

    console.log('SearchCombobox: Cleared all visual states from options (comprehensive)');

    // Force a DOM reflow to ensure changes are applied immediately
    this.el.offsetHeight;

    // Schedule an additional clearing after any potential LiveView updates
    requestAnimationFrame(() => {
      this.clearAllVisualStatesDeferred();
    });
  },

  clearAllVisualStatesDeferred() {
    // Additional deferred clearing to handle race conditions with LiveView updates
    const options = this.el.querySelectorAll('.combobox-option');
    options.forEach(opt => {
      // Focus only on the most problematic attributes (preserve data-combobox-selected)
      opt.removeAttribute('data-combobox-highlighted');

      // Clear any lingering CSS classes
      opt.classList.remove('highlighted', 'selected', 'combobox-highlighted', 'combobox-selected');
    });

    console.log('SearchCombobox: Deferred clearing completed');
  },

  closeDropdown() {
    const dropdown = this.el.querySelector('[data-part="search-combobox-listbox"]');
    const trigger = this.el.querySelector('.search-combobox-trigger');

    if (dropdown && trigger) {
      dropdown.setAttribute('hidden', 'true');
      trigger.setAttribute('aria-expanded', 'false');
      this.dropdownWasOpen = false;
      console.log('SearchCombobox: Closed dropdown via keyboard');
    }
  },

  scrollToOption(option, forceGroupLabelVisible = false) {
    const scrollArea = this.el.querySelector('.scroll-viewport');
    if (!option || !scrollArea) return;

    const optionTop = option.offsetTop;
    const optionHeight = option.offsetHeight;
    const scrollAreaHeight = scrollArea.clientHeight;
    const currentScrollTop = scrollArea.scrollTop;

    // Check if this is the first option in its group
    const optionGroup = option.closest('.option-group');
    let groupLabel = null;
    let groupLabelHeight = 0;
    let shouldShowGroupLabel = forceGroupLabelVisible;

    if (optionGroup) {
      groupLabel = optionGroup.querySelector('.group-label');
      if (groupLabel) {
        groupLabelHeight = groupLabel.offsetHeight;

        // Check if this is the first option in the group
        const groupOptions = Array.from(optionGroup.querySelectorAll('.combobox-option'));
        const isFirstInGroup = groupOptions.indexOf(option) === 0;

        if (isFirstInGroup) {
          shouldShowGroupLabel = true;
        }
      }
    }

    // Current viewport boundaries
    const viewportTop = currentScrollTop;
    const viewportBottom = currentScrollTop + scrollAreaHeight;

    // Option boundaries
    const optionBottom = optionTop + optionHeight;

    // Check if option is already fully visible
    const isFullyVisible = optionTop >= viewportTop && optionBottom <= viewportBottom;

    // If showing group label, check if both label and option are visible
    if (shouldShowGroupLabel && groupLabel) {
      const groupLabelTop = groupLabel.offsetTop;
      const isGroupLabelVisible = groupLabelTop >= viewportTop;

      if (isGroupLabelVisible && isFullyVisible) {
        // Both group label and option are visible, no scroll needed
        return;
      }

      if (!isGroupLabelVisible) {
        // Need to show group label - scroll just enough to show it
        const newScrollTop = Math.max(0, groupLabelTop - 5); // Minimal padding
        if (Math.abs(newScrollTop - currentScrollTop) > 2) {
          scrollArea.scrollTo({
            top: newScrollTop,
            behavior: 'smooth'
          });
          console.log(`SearchCombobox: Scrolled to show group label from ${currentScrollTop} to ${newScrollTop}`);
        }
        return;
      }
    }

    // Calculate scroll position for consistent behavior during keyboard navigation
    // Always position the option at the bottom of the viewport for consistent UX
    let newScrollTop = currentScrollTop;

    if (optionTop < viewportTop) {
      // Option is above viewport - scroll up to position it at the bottom of viewport
      // This ensures consistent behavior regardless of scroll direction
      newScrollTop = Math.max(0, optionBottom - scrollAreaHeight + 5); // Position option at bottom with small padding
    } else if (optionBottom > viewportBottom) {
      // Option is below viewport - scroll down to position it at the bottom of viewport
      newScrollTop = Math.max(0, optionBottom - scrollAreaHeight + 5); // Position option at bottom with small padding
    } else {
      // Option is already visible, no scroll needed
      return;
    }

    // Ensure we don't scroll beyond bounds
    const maxScrollTop = scrollArea.scrollHeight - scrollAreaHeight;
    newScrollTop = Math.max(0, Math.min(newScrollTop, maxScrollTop));

    // Only scroll if there's a meaningful change
    if (Math.abs(newScrollTop - currentScrollTop) > 1) {
      scrollArea.scrollTo({
        top: newScrollTop,
        behavior: 'smooth'
      });
      console.log(`SearchCombobox: Consistent scroll from ${currentScrollTop} to ${newScrollTop} (diff: ${newScrollTop - currentScrollTop}) for option ${option.getAttribute('data-combobox-value')} - positioned at bottom of viewport`);
    }
  },

  ensureHighlightedOption() {
    const dropdown = this.el.querySelector('[data-part="search-combobox-listbox"]');
    if (!dropdown || dropdown.hasAttribute('hidden')) return;

    // If this is during a button interaction, use the no-scroll version instead
    if (this.isButtonInteraction || (this.buttonInteractionTime && Date.now() - this.buttonInteractionTime < 3000)) {
      console.log('SearchCombobox: Using no-scroll version due to button interaction');
      this.ensureHighlightedOptionNoScroll();
      return;
    }

    // Check if there's a currently selected value
    const selectEl = this.el.querySelector('.search-combobox-select');
    const currentValue = selectEl ? selectEl.value : null;

    const currentNavigated = this.el.querySelector('.combobox-option[data-combobox-navigate]');
    if (currentNavigated) {
      // There is a navigated option - make sure it's visible by scrolling to it
      console.log('SearchCombobox: Scrolling to ensure navigated option is visible:', currentNavigated.getAttribute('data-combobox-value'));
      this.scrollToOption(currentNavigated, false);
    } else if (currentValue) {
      // No navigated option but there's a selected value - find and highlight it
      const selectedOption = this.el.querySelector(`.combobox-option[data-combobox-value="${currentValue}"]`);
      if (selectedOption) {
        this.highlightOption(selectedOption, false); // Allow scrolling to bring it into view
        console.log('SearchCombobox: Highlighted and scrolled to selected option:', currentValue);
      } else {
        // Selected option not found, highlight first option
        const firstOption = this.el.querySelector('.combobox-option');
        if (firstOption) {
          this.highlightOption(firstOption, false);
          console.log('SearchCombobox: Selected option not found, highlighted first option');
        }
      }
    } else {
      // No option is highlighted and no selection, find the first visible option and highlight it
      const firstOption = this.el.querySelector('.combobox-option');
      if (firstOption) {
        this.highlightOption(firstOption, false); // Allow scrolling
        console.log('SearchCombobox: Ensured navigated option (first):', firstOption.getAttribute('data-combobox-value'));
      }
    }
  },

  ensureHighlightedOptionNoScroll() {
    const dropdown = this.el.querySelector('[data-part="search-combobox-listbox"]');
    if (!dropdown || dropdown.hasAttribute('hidden')) return;

    // If this is after a button interaction, try to restore the previous state
    if (this.isButtonInteraction && this.preButtonHighlightedValue) {
      const previousOption = this.el.querySelector(`.combobox-option[data-combobox-value="${this.preButtonHighlightedValue}"]`);
      if (previousOption) {
        this.highlightOption(previousOption, true); // Prevent scroll
        console.log('SearchCombobox: Restored previous highlighted option after button interaction:', this.preButtonHighlightedValue);

        // Restore scroll position if available
        if (this.preButtonScrollTop !== null) {
          const scrollArea = this.el.querySelector('.scroll-viewport');
          if (scrollArea) {
            scrollArea.scrollTop = this.preButtonScrollTop;
            console.log('SearchCombobox: Restored scroll position after button interaction:', this.preButtonScrollTop);
          }
        }
        return;
      }
    }

    // Get the current value from the hidden select element
    const selectEl = this.el.querySelector('.search-combobox-select');
    if (!selectEl || !selectEl.value) {
      // No current value, just highlight first option without scrolling
      const firstOption = this.el.querySelector('.combobox-option');
      if (firstOption) {
        this.highlightOption(firstOption, true); // Prevent scroll
        console.log('SearchCombobox: Highlighted first option without scrolling');
      }
      return;
    }

    const currentValue = selectEl.value;

    // Find and highlight the option with the current value, but don't scroll
    const option = this.el.querySelector(`.combobox-option[data-combobox-value="${currentValue}"]`);
    if (option) {
      this.highlightOption(option, true); // Prevent scroll
      console.log('SearchCombobox: Highlighted selected option without scrolling:', currentValue);
    } else {
      // Fallback to first option
      const firstOption = this.el.querySelector('.combobox-option');
      if (firstOption) {
        this.highlightOption(firstOption, true); // Prevent scroll
        console.log('SearchCombobox: Option not found, highlighted first option without scrolling');
      }
    }
  },

  /**
 * Calculates and sets the optimal height for the dropdown to maintain a 50px margin at the bottom
 */
  setOptimalDropdownHeight() {
    const dropdown = this.el.querySelector('[data-part="search-combobox-listbox"]');
    const scrollArea = this.el.querySelector('.scroll-viewport');

    if (!dropdown || !scrollArea) {
      console.log('SearchCombobox: setOptimalDropdownHeight - dropdown or scrollArea not found');
      return;
    }

    // Check if dropdown is actually visible
    if (dropdown.hasAttribute('hidden')) {
      console.log('SearchCombobox: setOptimalDropdownHeight - dropdown is hidden, skipping');
      return;
    }

    // Get the dropdown's position relative to the viewport
    const dropdownRect = dropdown.getBoundingClientRect();
    const viewportHeight = window.innerHeight;

    console.log(`SearchCombobox: Height calculation - viewport: ${viewportHeight}px, dropdown top: ${dropdownRect.top}px`);

    // Calculate available space below the dropdown (accounting for 50px margin)
    const availableHeight = viewportHeight - dropdownRect.top - 50;

    // Get the current height of the dropdown content to determine if we need to limit it
    // Try multiple selectors to find the content container
    let dropdownContent = dropdown.querySelector('.px-1\\.5') ||
      dropdown.querySelector('.scroll-content') ||
      dropdown.querySelector('[data-part="search-combobox-listbox"] > div:last-child') ||
      dropdown;

    let contentHeight = dropdownContent.scrollHeight;

    // If content height is very small, it might not be rendered yet - estimate based on options
    if (contentHeight < 100) {
      const options = dropdown.querySelectorAll('.combobox-option');
      if (options.length > 0) {
        // Estimate height: ~40px per option + group headers + padding
        const estimatedHeight = (options.length * 40) + 100; // Add 100px for headers and padding
        contentHeight = Math.max(contentHeight, estimatedHeight);
        console.log(`SearchCombobox: Content height too small (${dropdownContent.scrollHeight}px), estimated ${estimatedHeight}px based on ${options.length} options`);
      }
    }

    console.log(`SearchCombobox: Available height: ${availableHeight}px, content height: ${contentHeight}px`);

    // Add space for search input and padding (approximately 60px)
    const searchInputHeight = 60;
    const maxContentHeight = Math.max(100, availableHeight - searchInputHeight);

    // Only set height if we need to constrain it
    if (contentHeight > maxContentHeight) {
      const heightInRem = maxContentHeight / 16; // Convert px to rem (assuming 16px = 1rem)
      scrollArea.style.height = `${heightInRem}rem`;
      console.log(`SearchCombobox: Set dropdown height to ${heightInRem}rem (${maxContentHeight}px) to maintain 50px bottom margin`);
    } else {
      // Reset to default if content fits
      scrollArea.style.height = '';
      console.log('SearchCombobox: Using default height as content fits within viewport');
    }
  },

  getButtonSelector(button) {
    // Create a selector to find the button after potential DOM updates
    const buttonGroup = button.closest('.option-group');
    if (!buttonGroup) return null;

    const allGroups = Array.from(this.el.querySelectorAll('.option-group'));
    const groupIndex = allGroups.indexOf(buttonGroup);

    const groupButtons = Array.from(buttonGroup.querySelectorAll('button'));
    const buttonIndex = groupButtons.indexOf(button);

    // Return a selector that can find the button by its position
    return `.option-group:nth-child(${groupIndex + 1}) button:nth-child(${buttonIndex + 1})`;
  },

  // Track mouse position for improved hover detection
  trackMousePosition(e) {
    window.mouseX = e.clientX;
    window.mouseY = e.clientY;
  },

  /**
   * Sets up a MutationObserver to watch for problematic attributes being added back
   */
  setupAttributeWatcher() {
    // Note: We no longer watch for data-combobox-selected as it's now used for legitimate selection state
    console.log('SearchCombobox: Attribute watcher setup complete (no longer watching data-combobox-selected)');
  },

  /**
   * Checks if the mouse is currently hovering over the scroll area
   */
  isMouseOverScrollArea() {
    const scrollArea = this.el.querySelector('.scroll-viewport');
    if (!scrollArea) {
      console.log('SearchCombobox: No scroll area found for mouse hover detection');
      return false;
    }

    // Use current mouse position to check if it's over the scroll area
    const mouseX = window.mouseX || 0;
    const mouseY = window.mouseY || 0;

    // Get the scroll area's bounding rectangle
    const scrollRect = scrollArea.getBoundingClientRect();

    // Check if mouse coordinates are within the scroll area bounds
    const isOverScrollArea = mouseX >= scrollRect.left &&
                            mouseX <= scrollRect.right &&
                            mouseY >= scrollRect.top &&
                            mouseY <= scrollRect.bottom;

    console.log(`SearchCombobox: Mouse position (${mouseX}, ${mouseY}) is ${isOverScrollArea ? 'over' : 'not over'} scroll area`);
    return isOverScrollArea;
  },

  setupGlobalKeyboardListener() {
    // Remove existing listener if any
    if (this.boundGlobalKeydownHandler) {
      document.removeEventListener('keydown', this.boundGlobalKeydownHandler);
    }

    // Create bound handler
    this.boundGlobalKeydownHandler = this.handleGlobalKeydown.bind(this);

    // Add event listener
    document.addEventListener('keydown', this.boundGlobalKeydownHandler);
    console.log('SearchCombobox: Set up global keyboard listener');
  },

  handleGlobalKeydown(event) {
    // Check if dropdown is open
    const dropdown = this.el.querySelector('[data-part="search-combobox-listbox"]');
    const isDropdownOpen = dropdown && !dropdown.hasAttribute('hidden');

    // Handle Enter, Escape, and Arrow keys regardless of focus state when dropdown is open
    // Don't require mouse to be over combobox for these critical navigation keys
    if (isDropdownOpen && (event.key === 'Enter' || event.key === 'Escape' || event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
      // Check if the event target is within this combobox or if no other input is focused
      const isEventFromThisCombobox = this.el.contains(event.target);
      const activeElement = document.activeElement;
      const isOtherInputFocused = activeElement &&
        !this.el.contains(activeElement) &&
        (activeElement.tagName === 'INPUT' ||
         activeElement.tagName === 'TEXTAREA' ||
         activeElement.isContentEditable);

      // Only handle if the event is from this combobox or no other input is focused
      if (isEventFromThisCombobox || !isOtherInputFocused) {
        if (event.key === 'Enter') {
          event.preventDefault();
          // Try to select the currently navigated option
          this.selectNavigatedOption();
          console.log('SearchCombobox: Global Enter key handled');
          return;
        } else if (event.key === 'Escape') {
          event.preventDefault();
          // Close the dropdown
          this.closeDropdown();
          console.log('SearchCombobox: Global Escape key handled');
          return;
        } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
          // For arrow keys, ensure the search input has focus and let the normal handler deal with it
          const searchInput = this.el.querySelector('.search-combobox-search-input');
          if (searchInput && document.activeElement !== searchInput) {
            searchInput.focus();
            console.log(`SearchCombobox: Focused search input for ${event.key} key`);
          }
          // Don't prevent default or return - let the normal keyboard handler process this
        }
      }
    }

    // Check if mouse is over this combobox for other keys
    const isMouseOverCombobox = this.isMouseOverElement(this.el);

    // Only proceed if mouse is over the combobox for non-critical keys
    if (!isMouseOverCombobox) {
      return;
    }

    // Only handle other keys if no element has focus or the focused element is not an input/textarea
    const activeElement = document.activeElement;
    const isInputFocused = activeElement &&
      (activeElement.tagName === 'INPUT' ||
       activeElement.tagName === 'TEXTAREA' ||
       activeElement.isContentEditable);

    // If an input is already focused, don't interfere with other keys
    if (isInputFocused) {
      return;
    }

    // Don't handle space key, let it be handled by the normal combobox behavior
    if (event.key === ' ') {
      return;
    }

    // Handle all printable characters, Backspace, Delete, and arrow keys
    if (this.isPrintableCharacter(event.key, event) ||
        event.key === 'Backspace' ||
        event.key === 'Delete' ||
        event.key === 'ArrowLeft' ||
        event.key === 'ArrowRight') {

      const searchInput = this.el.querySelector('.search-combobox-search-input');
      if (searchInput) {
        // Prevent the default action (like scrolling for arrow keys)
        event.preventDefault();

        // Focus the search input
        searchInput.focus();

        // For printable characters, add them to the search input
        if (this.isPrintableCharacter(event.key, event)) {
          const currentValue = searchInput.value || '';
          const newValue = currentValue + event.key;
          searchInput.value = newValue;
          this.searchTerm = newValue;

          // Position cursor at the end
          searchInput.setSelectionRange(newValue.length, newValue.length);

          // Trigger the search input handler
          this.handleSearchInput({ target: searchInput });

          console.log(`SearchCombobox: Redirected key "${event.key}" to search input`);
        }

        // For Backspace, remove the last character
        if (event.key === 'Backspace') {
          const currentValue = searchInput.value || '';
          if (currentValue.length > 0) {
            const newValue = currentValue.slice(0, -1);
            searchInput.value = newValue;
            this.searchTerm = newValue;

            // Position cursor at the end
            searchInput.setSelectionRange(newValue.length, newValue.length);

            // Trigger the search input handler
            this.handleSearchInput({ target: searchInput });

            console.log('SearchCombobox: Handled Backspace key in search input');
          }
        }

        // For Delete key, handle similar to Backspace but delete at cursor position
        // Since we're always positioning cursor at the end, it behaves like Backspace
        if (event.key === 'Delete') {
          const currentValue = searchInput.value || '';
          if (currentValue.length > 0) {
            const newValue = currentValue.slice(0, -1);
            searchInput.value = newValue;
            this.searchTerm = newValue;

            // Position cursor at the end
            searchInput.setSelectionRange(newValue.length, newValue.length);

            // Trigger the search input handler
            this.handleSearchInput({ target: searchInput });

            console.log('SearchCombobox: Handled Delete key in search input');
          }
        }

        // Open dropdown if it's not already open
        const dropdown = this.el.querySelector('[data-part="search-combobox-listbox"]');
        const isDropdownOpen = dropdown && !dropdown.hasAttribute('hidden');

        if (!isDropdownOpen) {
          this.openDropdownAndFocusSearch();
        }
      }
    }
  },

  isMouseOverElement(element) {
    if (!element) return false;

    // Get element's position and dimensions
    const rect = element.getBoundingClientRect();

    // Check if mouse coordinates are within the element
    const isOver = (
      window.mouseX >= rect.left &&
      window.mouseX <= rect.right &&
      window.mouseY >= rect.top &&
      window.mouseY <= rect.bottom
    );

    return isOver;
  },
};

// Add global test function for debugging
window.testComboboxHeight = function () {
  const comboboxElements = document.querySelectorAll('[phx-hook="SearchCombobox"]');
  console.log(`Found ${comboboxElements.length} SearchCombobox elements`);

  comboboxElements.forEach((el, index) => {
    console.log(`Testing height calculation for combobox ${index + 1}`);
    if (el.searchComboboxInstance && el.searchComboboxInstance.testHeightCalculation) {
      el.searchComboboxInstance.testHeightCalculation();
    } else {
      console.log(`Combobox ${index + 1} does not have instance or test method`);
    }
  });
};

export default SearchCombobox;
