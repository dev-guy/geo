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
    this.searchTerm = '';
    this.debounceTimer = null;
    this.dropdownWasOpen = false; // Track dropdown state across updates

    // Get the search event name from data attribute, default to 'search_countries'
    this.searchEventName = this.el.getAttribute('data-search-event') || 'search_countries';
    console.log(`SearchCombobox: Using search event name: ${this.searchEventName}`);

    this.setupTriggerButton();
    this.setupSearchIntercept();
    this.setupDropdownObserver();
    this.setupFormChangeForwarding();
    this.setupOptionHandlers();
    // Initialize the selection based on the current value
    console.log('SearchCombobox: About to initialize selection on mount');
    this.initializeSelection();
  },

  updated() {
    const key = this.el.parentElement.getAttribute('key');
    console.log(`SearchCombobox updated with key: ${key}`);
    console.log(`SearchCombobox: Tracked dropdown state was open: ${this.dropdownWasOpen}`);

    // Check if the key has changed - if so, we need to completely reinitialize
    if (this.currentKey && this.currentKey !== key) {
      console.log(`SearchCombobox: Key changed from ${this.currentKey} to ${key} - performing full reinitialization`);
      this.currentKey = key;

      // Clear all state except dropdown tracking
      this.searchTerm = '';
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

      // Restore dropdown state if it was open
      if (this.dropdownWasOpen) {
        console.log('SearchCombobox: Restoring dropdown open state after key change');
        this.restoreDropdownState(true);
      }

      // Initialize selection
      setTimeout(() => {
        console.log('SearchCombobox: About to initialize selection after key change (delayed)');
        this.initializeSelection();
      }, 10);
    } else {
      // Normal update - just refresh handlers and selection
      this.setupTriggerButton();
      this.setupSearchIntercept();
      this.setupFormChangeForwarding();
      this.setupOptionHandlers();

      // Restore dropdown state if it was open
      if (this.dropdownWasOpen) {
        console.log('SearchCombobox: Restoring dropdown open state after normal update');
        this.restoreDropdownState(true);
      }

      // Restore the search input value after LiveView updates
      this.restoreSearchValue();
      // Re-initialize the selection in case the value changed
      // Use a small delay to ensure DOM is fully updated
      setTimeout(() => {
        console.log('SearchCombobox: About to re-initialize selection on update (delayed)');
        this.initializeSelection();
      }, 10);
    }
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
      let option = this.el.querySelector(`.search-combobox-option[data-combobox-value="${currentValue}"]`);

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
      // Clear all selections if no value
      this.el.querySelectorAll('.search-combobox-option[data-combobox-selected]')
        .forEach(opt => opt.removeAttribute('data-combobox-selected'));
      this.updateSingleDisplay(null);
    }
  },

  waitForOption(value, attempt) {
    const maxAttempts = 5;
    const delays = [50, 100, 200, 400, 800]; // Progressive backoff

    if (attempt >= maxAttempts) {
      console.log('search combobox: Option not found after maximum attempts:', value);
      console.log('Available options:', Array.from(this.el.querySelectorAll('.search-combobox-option')).map(opt => ({
        value: opt.getAttribute('data-combobox-value'),
        text: opt.textContent.trim()
      })));
      return;
    }

    setTimeout(() => {
      const option = this.el.querySelector(`.search-combobox-option[data-combobox-value="${value}"]`);
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
    // Clear all selections first
    this.el.querySelectorAll('.search-combobox-option[data-combobox-selected]')
      .forEach(opt => opt.removeAttribute('data-combobox-selected'));

    // Set this option as selected
    option.setAttribute('data-combobox-selected', '');

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
    // Clean up previous handlers to avoid duplicates
    if (this.boundOptionClickHandlers) {
      this.boundOptionClickHandlers.forEach(({ option, handler }) => {
        option.removeEventListener('click', handler);
      });
    }

    this.boundOptionClickHandlers = [];

    // Set up click handlers for all options
    const options = this.el.querySelectorAll('.search-combobox-option');
    options.forEach(option => {
      const handler = this.handleOptionClick.bind(this, option);
      option.addEventListener('click', handler);
      this.boundOptionClickHandlers.push({ option, handler });
    });

    console.log(`Set up handlers for ${options.length} search options`);
  },

  handleOptionClick(option, event) {
    event.preventDefault();
    const value = option.getAttribute('data-combobox-value');
    const isMultiple = this.el.getAttribute('data-multiple') === 'true';

    if (isMultiple) {
      this.toggleMultipleSelection(option, value);
    } else {
      this.setSingleSelection(option, value);
      // Close dropdown after single selection
      const dropdown = this.el.querySelector('[data-part="search-combobox-listbox"]');
      if (dropdown) {
        dropdown.setAttribute('hidden', 'true');
        this.triggerButton.setAttribute('aria-expanded', 'false');
      }
    }
  },

  toggleMultipleSelection(option, value) {
    const selectEl = this.el.querySelector('.search-combobox-select');
    if (!selectEl) return;

    const isSelected = option.hasAttribute('data-combobox-selected');

    // Find or create option in select
    let selectOption = Array.from(selectEl.options).find(opt => opt.value === value);
    if (!selectOption && !isSelected) {
      selectOption = document.createElement('option');
      selectOption.value = value;
      selectOption.textContent = value;
      selectEl.appendChild(selectOption);
    }

    if (isSelected) {
      // Remove selection
      option.removeAttribute('data-combobox-selected');
      if (selectOption) {
        selectOption.selected = false;
      }
    } else {
      // Add selection
      option.setAttribute('data-combobox-selected', '');
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

    // Remove selection from all options
    this.el.querySelectorAll('.search-combobox-option[data-combobox-selected]')
      .forEach(opt => opt.removeAttribute('data-combobox-selected'));

    // Set selection on chosen option
    option.setAttribute('data-combobox-selected', '');

    // Update select element
    selectEl.value = value;
    console.log('setSingleSelection: set selectEl.value to:', selectEl.value);

    // Update display and trigger change event
    this.updateSingleDisplay(option);
    this.triggerChange();
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
  },

  updateMultipleDisplay() {
    const displayEl = this.el.querySelector('[data-part="select_toggle_label"]');
    const placeholder = this.el.querySelector('.search-combobox-placeholder');
    const selectedOptions = this.el.querySelectorAll('.search-combobox-option[data-combobox-selected]');

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
            const opt = this.el.querySelector(`.search-combobox-option[data-combobox-value="${value}"]`);
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
      // Open dropdown
      dropdown.removeAttribute('hidden');
      this.triggerButton.setAttribute('aria-expanded', 'true');
      this.dropdownWasOpen = true; // Track state

      // Focus search input if available
      const searchInput = this.el.querySelector('.search-combobox-search-input');
      if (searchInput) {
        setTimeout(() => searchInput.focus(), 10);
      }

      // Add document click listener to close when clicking outside
      if (!this.boundDocumentClickHandler) {
        this.boundDocumentClickHandler = this.handleDocumentClick.bind(this);
        document.addEventListener('click', this.boundDocumentClickHandler);
      }
    } else {
      // Close dropdown
      dropdown.setAttribute('hidden', 'true');
      this.triggerButton.setAttribute('aria-expanded', 'false');
      this.dropdownWasOpen = false; // Track state
    }
  },

  handleTriggerKeydown(event) {
    // Handle keyboard events for the div trigger (since it's no longer a button)
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.handleTriggerClick(event);
    } else if (event.key === 'Escape') {
      // Close dropdown if open
      const dropdown = this.el.querySelector('[data-part="search-combobox-listbox"]');
      if (dropdown && !dropdown.hasAttribute('hidden')) {
        dropdown.setAttribute('hidden', 'true');
        this.triggerButton.setAttribute('aria-expanded', 'false');
        this.dropdownWasOpen = false;
      }
    }
  },

  handleDocumentClick(event) {
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

      // Create bound handler
      this.boundSearchHandler = this.handleSearchInput.bind(this);

      // Add our custom search handler
      searchInput.addEventListener('input', this.boundSearchHandler);

      // Store reference to the search input
      this.inputElement = searchInput;
    } else {
      console.log('Combobox search input not found yet');
    }
  },

  restoreSearchValue() {
    const searchInput = this.el.querySelector('.search-combobox-search-input');
    if (searchInput && this.searchTerm && searchInput.value !== this.searchTerm) {
      console.log(`Restoring search value: "${this.searchTerm}"`);
      searchInput.value = this.searchTerm;
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

    // Debounce the search request (300ms delay for better responsiveness)
    this.debounceTimer = setTimeout(() => {
      console.log(`Sending search for: "${this.searchTerm}"`);

      // Check if there's a phx-target attribute on the search combobox
      const searchCombobox = this.el.closest('[phx-target]');
      if (searchCombobox) {
        const target = searchCombobox.getAttribute('phx-target');
        console.log(`Sending search event to target: ${target}`);
        // Send to the specific component
        this.pushEventTo(target, this.searchEventName, { value: this.searchTerm });
      } else {
        // Send to the parent LiveView (default behavior)
        this.pushEvent(this.searchEventName, { value: this.searchTerm });
      }
    }, 300);
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

  cleanupHandlers() {
    console.log('SearchCombobox: Cleaning up handlers');
    if (this.boundSearchHandler && this.inputElement) {
      this.inputElement.removeEventListener('input', this.boundSearchHandler);
    }
    if (this.boundTriggerHandler && this.triggerButton) {
      this.triggerButton.removeEventListener('click', this.boundTriggerHandler);
    }
    if (this.boundTriggerKeyHandler && this.triggerButton) {
      this.triggerButton.removeEventListener('keydown', this.boundTriggerKeyHandler);
    }
    if (this.boundDocumentClickHandler) {
      document.removeEventListener('click', this.boundDocumentClickHandler);
    }
    if (this.boundChangeHandler && this.selectElement) {
      this.selectElement.removeEventListener('change', this.boundChangeHandler);
    }
    if (this.boundOptionClickHandlers) {
      this.boundOptionClickHandlers.forEach(({ option, handler }) => {
        option.removeEventListener('click', handler);
      });
    }
    if (this.dropdownObserver) {
      this.dropdownObserver.disconnect();
    }
  },

  destroyed() {
    const key = this.el.parentElement ? this.el.parentElement.getAttribute('key') : 'unknown';
    console.log(`SearchCombobox destroyed with key: ${key}`);
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.cleanupHandlers();
  }
};

export default SearchCombobox;
