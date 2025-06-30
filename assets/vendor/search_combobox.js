/**
 * Search Combobox
 *
 * Intercepts the search input and sends it to the backend.
 * Implements sticky group headers.
 * Implements expand/collapse and sorting.
 *
 * This work was derived from Mishka Chelekom Combobox version 0.0.5 in 2025.
 * See https://mishka.tools for any copyright notices.
 */
const SearchCombobox = {
  mounted() {
    this.dropdownShouldBeOpen = false;
    this.init();
    this.initializeSelection();
  },

  updated() {
    const dropdownEl = this.el.querySelector('[data-part="search-combobox-listbox"]');
    const wasOpen = dropdownEl && !dropdownEl.hasAttribute('hidden');

    // Preserve the current search value BEFORE init() resets it
    const currentSearchValue = this.searchInput ? this.searchInput.value : '';
    const wasSearching = this.searchTerm && this.searchTerm.length > 0;
    const preservedSearchTerm = this.searchTerm || '';

    const wasDropdownShouldBeOpen = this.dropdownShouldBeOpen;

    this.init();

    // Restore the search term after init()
    if (currentSearchValue || preservedSearchTerm) {
      this.searchTerm = currentSearchValue || preservedSearchTerm;
      if (this.searchInput) {
        this.searchInput.value = this.searchTerm;
      }
    }

    if (wasDropdownShouldBeOpen || wasOpen || wasSearching) {
      this.dropdownShouldBeOpen = false;
      this.isReopeningAfterUpdate = true;
      this.openDropdown();
    }

    // Delay initialization to ensure LiveView updates are complete
    setTimeout(() => {
      this.initializeSelection();
    }, 0);

    if (wasOpen || wasSearching) {
      setTimeout(() => this.initializeStickyHeaders(), 0);
    }
  },

  init() {
    if (this._cleanup) this._cleanup();

    this.trigger = this.el.querySelector('.combobox-trigger');
    this.searchInput = this.el.querySelector('.combobox-search-input');
    this.dropdown = this.el.querySelector('[data-part="search-combobox-listbox"]');
    this.scrollArea = this.el.querySelector('.scroll-viewport');
    this.selectEl = this.el.querySelector('.combobox-select');
    this.clearButton = this.el.querySelector('[data-part="clear-combobox-button"]');
    this.searchClearButton = this.el.querySelector('[data-part="clear-search-button"]');
    
    if (this.dropdown) {
      this.dropdown.searchCombobox = this;
    }

    // Only reset searchTerm if it doesn't exist (i.e., on initial mount)
    if (this.searchTerm === undefined) {
      this.searchTerm = '';
    }

    this.debounceDelay = 500;
    this.debounceTimer = null;
    this.searchEventName = this.el.getAttribute('data-search-event') || 'search_countries';
    this.isMultiple = this.el.getAttribute('data-multiple') === 'true';

    if (this.justCleared === undefined) {
      this.justCleared = false;
    }

    if (this.groupHighlightInProgress === undefined) {
      this.groupHighlightInProgress = false;
    }

    if (this.mouseHoverInProgress === undefined) {
      this.mouseHoverInProgress = false;
    }

    this.isKeyboardNavigating = false;
    this.lastMouseX = 0;
    this.lastMouseY = 0;

    this.stickyHeaders = [];
    this.scrollHandlerBound = null;
    this.headerHeight = 0;
    this.rowHeight = 0;

    if (this.scrollArea) {
      this.scrollArea.setAttribute('tabindex', '0');
    }

    this.setupClearButton();
    this.setupSearchClearButton();
    this.setupGroupEventListeners();

    this.boundToggle = event => this.toggleDropdown(event);
    this.boundSearchInput = event => this.onSearchInput(event);
    this.boundSearchKeydown = event => this.onSearchKeydown(event);
    this.boundOptionClick = event => this.onOptionClick(event);
    this.boundOptionHover = event => this.onOptionMouseEnter(event);
    this.boundGlobalKeydown = event => this.onGlobalKeydown(event);
    this.boundDocumentClick = event => this.onDocumentClick(event);
    this.boundMouseMove = event => this.onMouseMove(event);
    this.boundWheel = event => this.onWheel(event);

    this.trigger?.addEventListener('click', this.boundToggle);
    this.searchInput?.addEventListener('input', this.boundSearchInput);
    this.searchInput?.addEventListener('keydown', this.boundSearchKeydown);
    this.dropdown?.addEventListener('click', this.boundOptionClick, true);
    this.dropdown?.addEventListener('mouseover', this.boundOptionHover);
    this.scrollArea?.addEventListener('wheel', this.boundWheel, { passive: false });
    document.addEventListener('keydown', this.boundGlobalKeydown);
    document.addEventListener('click', this.boundDocumentClick);
    document.addEventListener('mousemove', this.boundMouseMove);

    this._cleanup = () => {
      this.trigger?.removeEventListener('click', this.boundToggle);
      this.searchInput?.removeEventListener('input', this.boundSearchInput);
      this.searchInput?.removeEventListener('keydown', this.boundSearchKeydown);
      this.dropdown?.removeEventListener('click', this.boundOptionClick, true);
      this.dropdown?.removeEventListener('mouseover', this.boundOptionHover);
      this.scrollArea?.removeEventListener('wheel', this.boundWheel);
      document.removeEventListener('keydown', this.boundGlobalKeydown);
      document.removeEventListener('click', this.boundDocumentClick);
      document.removeEventListener('mousemove', this.boundMouseMove);
      if (this.clearButton && this.boundClearClick) {
        this.clearButton.removeEventListener('click', this.boundClearClick);
      }
      if (this.searchClearButton && this.boundSearchClearClick) {
        this.searchClearButton.removeEventListener('click', this.boundSearchClearClick);
      }
      if (this.scrollArea && this.scrollHandlerBound) {
        this.scrollArea.removeEventListener('scroll', this.scrollHandlerBound);
      }
      if (this.groupHighlightTimeout) {
        clearTimeout(this.groupHighlightTimeout);
        this.groupHighlightTimeout = null;
      }
      this.cleanupGroupEventListeners();
    };
  },

  setupGroupEventListeners() {
    // These will be called by Phoenix LiveView events
    // No setup needed here since Phoenix handles the event binding
  },

  cleanupGroupEventListeners() {
    // No cleanup needed since Phoenix handles the event lifecycle
  },

  // Phoenix LiveView event handlers - these are called directly by Phoenix LiveView
  'group-collapsed'(payload) {
    this.handleGroupCollapsed(payload.group_name);
  },

  'group-expanded'(payload) {
    this.handleGroupExpanded(payload.group_name);
  },

  'group-sorted'(payload) {
    this.handleGroupSorted(payload.group_name, payload.is_collapsed);
  },

  handleGroupSorted(groupName, isCollapsed) {
    // After sorting, if group is not collapsed, highlight first item
    if (!isCollapsed) {
      this.scheduleGroupHighlight(() => {
        this.highlightFirstItemInGroup(groupName);
      });
    }
  },

  handleGroupCollapsed(collapsedGroupName) {
    this.scheduleGroupHighlight(() => {
      // Find the first uncollapsed group below the collapsed one
      const groups = this.getAllGroups();
      const collapsedGroupIndex = groups.findIndex(group => group.name === collapsedGroupName);
      
      if (collapsedGroupIndex === -1) return;
      
      // Look for the first uncollapsed group after the collapsed one
      for (let i = collapsedGroupIndex + 1; i < groups.length; i++) {
        const group = groups[i];
        if (!this.isGroupCollapsed(group.name)) {
          this.highlightFirstItemInGroup(group.name);
          return;
        }
      }
      
      // If no uncollapsed group found after, do nothing (as specified)
    });
  },

  handleGroupExpanded(expandedGroupName) {
    this.scheduleGroupHighlight(() => {
      // Highlight the first item
      this.highlightFirstItemInGroup(expandedGroupName);
    });
  },

  scheduleGroupHighlight(highlightFn) {
    // Cancel any pending group highlight to prevent race conditions
    if (this.groupHighlightTimeout) {
      clearTimeout(this.groupHighlightTimeout);
    }
    
    // Set flag to prevent mouse hover interference
    this.groupHighlightInProgress = true;
    
    this.groupHighlightTimeout = setTimeout(() => {
      highlightFn();
      this.groupHighlightTimeout = null;
      
      // Keep the flag for a short time to prevent immediate mouse interference
      setTimeout(() => {
        this.groupHighlightInProgress = false;
      }, 100);
    }, 20); // Reduced delay for better responsiveness
  },

  getAllGroups() {
    const groupElements = Array.from(this.el.querySelectorAll('.option-group'));
    return groupElements.map(groupEl => {
      // Find the span that contains the group name (sibling to the button)
      const labelEl = groupEl.querySelector('.group-label .flex.items-center.gap-2 span');
      const name = labelEl ? labelEl.textContent.trim() : '';
      return { element: groupEl, name };
    }).filter(group => group.name);
  },

  getGroupByName(groupName) {
    const groups = this.getAllGroups();
    const group = groups.find(g => g.name === groupName);
    return group ? group.element : null;
  },

  isGroupCollapsed(groupName) {
    const groups = this.getAllGroups();
    const group = groups.find(g => g.name === groupName);
    if (!group) return false;
    
    // A group is collapsed if it doesn't have an options container after the header
    const optionsContainer = group.element.querySelector('.group-label + div');
    return !optionsContainer;
  },

  highlightFirstItemInGroup(groupName) {
    const groups = this.getAllGroups();
    const group = groups.find(g => g.name === groupName);
    if (!group) {
      return;
    }
    
    // Find the first option in this group
    const firstOption = group.element.querySelector('.combobox-option');
    if (firstOption) {
      this.highlight(firstOption, true); // true = should scroll
    }
  },

  toggleDropdown(event) {
    if (event._isHeaderButtonClick) {
      return;
    }

    const clickedButton = event.target.closest('button');
    if (clickedButton && (clickedButton.hasAttribute('phx-click') || clickedButton === this.clearButton)) {
      return;
    }

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
    if (this.dropdownShouldBeOpen) {
      return;
    }

    this.dropdownShouldBeOpen = true;
    this.dropdown.removeAttribute('hidden');
    this.trigger.setAttribute('aria-expanded', 'true');
    this.adjustHeight();

    this.lastMouseX = 0;
    this.lastMouseY = 0;
    this.isKeyboardNavigating = false;

    if (this.scrollArea) {
      this.scrollArea.focus({ preventScroll: true });
    } else {
      this.searchInput.focus({ preventScroll: true });
    }

    this.initializeStickyHeaders();

    if (this.highlightTimeout) {
      clearTimeout(this.highlightTimeout);
    }

    this.highlightTimeout = setTimeout(() => {
      const shouldScroll = !this.isReopeningAfterUpdate;
      this.ensureHighlight(shouldScroll);
      this.isReopeningAfterUpdate = false; // Reset the flag
      if (this.handleScroll) {
        this.handleScroll();
      }
      this.highlightTimeout = null;
    }, 0);
  },

  closeDropdown() {
    this.dropdownShouldBeOpen = false;
    this.dropdown.setAttribute('hidden', 'true');
    this.trigger.setAttribute('aria-expanded', 'false');

    if (this.highlightTimeout) {
      clearTimeout(this.highlightTimeout);
      this.highlightTimeout = null;
    }
  },

  onSearchInput(event) {
    const value = event.target.value;
    this.searchTerm = value;

    // Update search clear button visibility
    this.updateSearchClearButtonVisibility();

    if (this.dropdown.hasAttribute('hidden')) {
      this.openDropdown();
    }

    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
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

    if (isDropdownHidden && isComboboxFocused && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
      event.preventDefault();
      this.openDropdown();
      return;
    }

    if (isDropdownHidden) return;

    const printable = event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey;
    if (printable || ['Backspace', 'Delete'].includes(event.key)) {
      // Check if the search input is already focused - if so, let the browser handle it naturally
      if (document.activeElement === this.searchInput) {
        // Don't prevent default - let the browser handle text selection and deletion naturally
        return;
      }
      
      event.preventDefault();
      this.searchInput.focus();
      if (printable) {
        this.searchInput.value += event.key;
        this.onSearchInput({ target: this.searchInput });
      } else {
        // For backspace/delete when focusing from elsewhere, remove last character
        this.searchInput.value = this.searchInput.value.slice(0, -1);
        this.onSearchInput({ target: this.searchInput });
      }
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

    // Get all visible options, excluding those in collapsed groups
    const visibleOpts = Array.from(this.el.querySelectorAll('.combobox-option')).filter(el => {
      const style = window.getComputedStyle(el);
      if (style.display === 'none') return false;
      
      // Check if this option is in a collapsed group
      const group = el.closest('.option-group');
      if (group) {
        const optionsContainer = group.querySelector('.group-label + div');
        const isGroupCollapsed = !optionsContainer;
        if (isGroupCollapsed) return false;
      }
      
      return true;
    });

    if (!visibleOpts.length) return;

    const allOpts = Array.from(this.el.querySelectorAll('.combobox-option'));
    allOpts.forEach(opt => opt.classList.add('no-hover'));

    let current = this.el.querySelector('[data-combobox-navigate]');
    let idx = current ? visibleOpts.indexOf(current) : -1;

    if (idx === -1) {
      if (direction === 'down') {
        this.highlight(visibleOpts[0]);
      } else {
        this.highlight(visibleOpts[visibleOpts.length - 1]);
      }
      return;
    }

    let next = direction === 'down'
      ? visibleOpts[(idx + 1) % visibleOpts.length]
      : visibleOpts[(idx - 1 + visibleOpts.length) % visibleOpts.length];
    
    this.highlight(next);
  },

  highlight(element, shouldScroll = true) {
    this.el.querySelectorAll('[data-combobox-navigate]').forEach(o => {
      o.removeAttribute('data-combobox-navigate');
      o.blur();
    });
    element.setAttribute('data-combobox-navigate', '');

    if (element.classList.contains('combobox-option')) {
      element.focus({ preventScroll: true });
    }

    // Don't scroll during mouse hover to prevent unwanted scrolling
    if (shouldScroll && !this.mouseHoverInProgress) {
      this.scrollToOption(element);
    }
  },

  highlightWithoutFocus(element) {
    // Highlight element without focusing or scrolling - used for mouse hover
    this.el.querySelectorAll('[data-combobox-navigate]').forEach(o => {
      o.removeAttribute('data-combobox-navigate');
    });
    element.setAttribute('data-combobox-navigate', '');
    // Don't call focus() or scrollToOption() to prevent unwanted scrolling
  },

  scrollToOption(option) {
    if (!this.scrollArea || !option) return;

    // Don't scroll during mouse hover to prevent unwanted scrolling
    if (this.mouseHoverInProgress) {
      return;
    }

    const isHeader = option.classList.contains('group-label');
    if (isHeader) {
      const group = option.closest('.option-group');
      if (group) {
        const firstOption = group.querySelector('.combobox-option');
        if (firstOption) {
          option = firstOption;
        } else {
          this.scrollArea.scrollTop = 0;
          return;
        }
      }
    }

    const { viewportTop, viewportBottom } = this.getEffectiveViewport();
    const scrollRect = this.scrollArea.getBoundingClientRect();
    const optionRect = option.getBoundingClientRect();

    const optionTop = optionRect.top - scrollRect.top;
    const optionBottom = optionRect.bottom - scrollRect.top;

    const padding = 8;

    if (optionTop < viewportTop + padding) {
      const scrollUpAmount = (viewportTop + padding) - optionTop;
      const oldScrollTop = this.scrollArea.scrollTop;
      const newScrollTop = Math.max(0, oldScrollTop - scrollUpAmount);
      this.scrollArea.scrollTop = newScrollTop;
    }
    else if (optionBottom > viewportBottom - padding) {
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

    // Check if we have any sticky headers
    const currentStickyHeader = this.stickyHeaders.find(item => {
      const header = item.header;
      const computedStyle = window.getComputedStyle(header);
      return computedStyle.position === 'sticky';
    });

    if (!currentStickyHeader) {
      // No sticky header
      return {
        viewportTop: 0,
        viewportBottom: totalHeight,
        effectiveHeight: totalHeight,
        maxVisibleRows: this.calculateMaxVisibleRows(totalHeight),
      };
    }

    // We have a sticky header, so account for its space
    const stickyHeaderSpace = this.headerHeight || 0;
    const effectiveHeight = totalHeight - stickyHeaderSpace;

    return {
      viewportTop: stickyHeaderSpace,
      viewportBottom: totalHeight,
      effectiveHeight: effectiveHeight,
      maxVisibleRows: this.calculateMaxVisibleRows(effectiveHeight),
    };
  },

  calculateMaxVisibleRows(effectiveHeight) {
    if (this.rowHeight === 0) {
      this.rowHeight = this.getRowHeight();
    }

    if (this.rowHeight === 0) {
      return 0;
    }

    return Math.floor(effectiveHeight / this.rowHeight);
  },

  getRowHeight() {
    const firstOption = this.el.querySelector('.combobox-option');
    if (!firstOption) {
      return 0;
    }

    const rect = firstOption.getBoundingClientRect();
    const styles = window.getComputedStyle(firstOption);
    const marginTop = parseFloat(styles.marginTop) || 0;
    const marginBottom = parseFloat(styles.marginBottom) || 0;

    return rect.height + marginTop + marginBottom;
  },

  selectCurrent() {
    const curr = this.el.querySelector('[data-combobox-navigate]');
    if (curr && curr.classList.contains('combobox-option')) {
      curr.click();
    }
  },

  onOptionMouseEnter(event) {
    // Don't interfere with group operations
    if (this.groupHighlightInProgress) {
      return;
    }

    if (this.isKeyboardNavigating) {
      const currentX = event.clientX;
      const currentY = event.clientY;
      const mouseMoved = Math.abs(currentX - this.lastMouseX) > 2 || Math.abs(currentY - this.lastMouseY) > 2;

      if (!mouseMoved) {
        return;
      }

      this.isKeyboardNavigating = false;
      const opts = Array.from(this.el.querySelectorAll('.combobox-option'));
      opts.forEach(opt => opt.classList.remove('no-hover'));
    }

    // Check for both options and group headers
    const opt = event.target.closest('.combobox-option');
    const groupHeader = event.target.closest('.group-label');
    
    if (opt) {
      // Set flag to prevent any scrolling during mouse hover
      this.mouseHoverInProgress = true;
      // Only highlight without scrolling or focusing on mouse hover
      this.highlightWithoutFocus(opt);
      // Clear flag after a short delay
      setTimeout(() => {
        this.mouseHoverInProgress = false;
      }, 50);
    } else if (groupHeader) {
      // Set flag to prevent any scrolling during mouse hover
      this.mouseHoverInProgress = true;
      // Only highlight without scrolling or focusing on mouse hover
      this.highlightWithoutFocus(groupHeader);
      // Clear flag after a short delay
      setTimeout(() => {
        this.mouseHoverInProgress = false;
      }, 50);
    }
  },

  onMouseMove(event) {
    if (this.isKeyboardNavigating) {
      const mouseMoved = Math.abs(event.clientX - this.lastMouseX) > 5 || Math.abs(event.clientY - this.lastMouseY) > 5;
      if (mouseMoved) {
        this.isKeyboardNavigating = false;
        const opts = Array.from(this.el.querySelectorAll('.combobox-option'));
        opts.forEach(opt => opt.classList.remove('no-hover'));
      }
    }

    this.lastMouseX = event.clientX;
    this.lastMouseY = event.clientY;
  },

  onWheel(event) {
    if (!this.scrollArea) return;

    const { deltaY } = event;
    const { scrollTop, scrollHeight, clientHeight } = this.scrollArea;
    const maxScrollTop = scrollHeight - clientHeight;

    const isAtTop = scrollTop <= 0;
    const isAtBottom = scrollTop >= maxScrollTop;

    if ((deltaY < 0 && isAtTop) || (deltaY > 0 && isAtBottom)) {
      event.preventDefault();
      event.stopPropagation();
    }
  },

  pageScroll(direction) {
    const { maxVisibleRows } = this.getEffectiveViewport();

    const rowsToScroll = Math.max(3, Math.floor(maxVisibleRows * 0.8));
    const rowHeight = this.rowHeight || this.getRowHeight();
    const delta = rowsToScroll * rowHeight;

    this.scrollArea.scrollBy({ top: direction === 'down' ? delta : -delta, behavior: 'smooth' });
  },

  adjustHeight() {
    const triggerRect = this.trigger.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportMargin = 10;

    const spaceAbove = triggerRect.top - viewportMargin;
    const spaceBelow = viewportHeight - triggerRect.bottom - viewportMargin;

    const fixedElementsHeight = this.calculateFixedElementsHeight();

    const useAbove = spaceAbove > spaceBelow;
    const availableSpace = useAbove ? spaceAbove : spaceBelow;

    const maxScrollHeight = Math.max(100, availableSpace - fixedElementsHeight - 5);

    if (useAbove) {
      this.dropdown.classList.remove('top-full', 'mt-2');
      this.dropdown.classList.add('bottom-full', 'mb-2');
      this.dropdown.style.transform = 'translateY(0)';
    } else {
      this.dropdown.classList.remove('bottom-full', 'mb-2');
      this.dropdown.classList.add('top-full', 'mt-2');
      this.dropdown.style.transform = 'translateY(0)';
    }

    this.scrollArea.style.maxHeight = `${maxScrollHeight}px`;
    this.scrollArea.style.height = `${maxScrollHeight}px`;

    const contentContainer = this.scrollArea.firstElementChild;
    if (contentContainer) {
      contentContainer.style.maxHeight = 'none';
      contentContainer.style.overflow = 'visible';
      contentContainer.style.overflowY = 'visible';
    }
  },

  calculateFixedElementsHeight() {
    const dropdownStyles = window.getComputedStyle(this.dropdown);
    const dropdownPaddingTop = parseFloat(dropdownStyles.paddingTop) || 0;
    const dropdownPaddingBottom = parseFloat(dropdownStyles.paddingBottom) || 0;

    const searchContainer = this.dropdown.querySelector('.mt-1.mb-2');
    let searchContainerHeight = 0;
    if (searchContainer) {
      const containerStyles = window.getComputedStyle(searchContainer);
      const marginTop = parseFloat(containerStyles.marginTop) || 0;
      const marginBottom = parseFloat(containerStyles.marginBottom) || 0;
      const containerHeight = searchContainer.offsetHeight || 0;
      searchContainerHeight = marginTop + marginBottom + containerHeight;
    }

    const internalPadding = 8;

    return dropdownPaddingTop + dropdownPaddingBottom + searchContainerHeight + internalPadding;
  },

  isOverScroll(event) {
    const r = this.scrollArea.getBoundingClientRect();
    return event.clientX >= r.left && event.clientX <= r.right && event.clientY >= r.top && event.clientY <= r.bottom;
  },

  ensureHighlight(shouldScroll = true) {
    // Don't interfere with group operations
    if (this.groupHighlightInProgress) {
      return;
    }

    // Always prioritize the selected option first
    const selected = this.findSelectedOptionInFirstVisibleGroup();
    if (selected) {
      this.highlight(selected, shouldScroll);
      return;
    }

    const curr = this.el.querySelector('[data-combobox-navigate]');
    
    // If a group header is currently highlighted, try to highlight the first option in that group
    if (curr && curr.classList.contains('group-label')) {
      const group = curr.closest('.option-group');
      if (group) {
        const firstOption = group.querySelector('.combobox-option');
        if (firstOption) {
          this.highlight(firstOption, shouldScroll);
          return;
        }
      }
    }
    
    // If there's already a valid highlighted option, don't change it unless it's not visible
    if (curr && curr.classList.contains('combobox-option')) {
      // Check if the currently highlighted option is still visible (not in a collapsed group)
      const group = curr.closest('.option-group');
      if (group) {
        const optionsContainer = group.querySelector('.group-label + div');
        const isGroupCollapsed = !optionsContainer;
        if (!isGroupCollapsed) {
          // The currently highlighted option is still valid and visible, keep it
          return;
        }
      } else {
        // Option is not in a group, so it's valid
        return;
      }
    }

    const first = this.getFirstVisibleOption();
    if (first) {
      this.highlight(first, shouldScroll);
    }
  },

  findSelectedOptionInFirstVisibleGroup() {
    // Get all selected options
    const selectedOptions = Array.from(this.el.querySelectorAll('.combobox-option[data-combobox-selected]'));
    if (!selectedOptions.length) return null;

    // If there's only one selected option, return it
    if (selectedOptions.length === 1) return selectedOptions[0];

    // Multiple selected options found - prioritize the one in the first visible group
    const visibleGroups = Array.from(this.el.querySelectorAll('.option-group')).filter(group => {
      const optionsContainer = group.querySelector('.group-label + div');
      return optionsContainer; // Group is not collapsed
    });

    // Find the selected option in the first visible group
    for (const group of visibleGroups) {
      const selectedInGroup = group.querySelector('.combobox-option[data-combobox-selected]');
      if (selectedInGroup) {
        return selectedInGroup;
      }
    }

    // Fallback to the first selected option if none found in visible groups
    return selectedOptions[0];
  },

  getFirstVisibleOption() {
    // Get all elements (options and headers) that are displayed
    const elements = Array.from(this.el.querySelectorAll('.combobox-option, .group-label')).filter(el => {
      const style = window.getComputedStyle(el);
      if (style.display === 'none') return false;
      
      // For options, check if they're in a collapsed group
      if (el.classList.contains('combobox-option')) {
        const group = el.closest('.option-group');
        if (group) {
          const optionsContainer = group.querySelector('.group-label + div');
          const isGroupCollapsed = !optionsContainer;
          if (isGroupCollapsed) return false;
        }
      }
      
      return true;
    });

    if (!elements.length) return null;

    // Find the first visible option (not header)
    const firstOption = elements.find(el => el.classList.contains('combobox-option'));
    if (!firstOption) return null;

    if (!this.stickyHeaders.length) {
      return firstOption;
    }

    const { viewportTop } = this.getEffectiveViewport();
    const scrollRect = this.scrollArea.getBoundingClientRect();

    // Find the first option that's visible below the sticky headers
    for (const element of elements) {
      if (!element.classList.contains('combobox-option')) continue;
      
      const elementRect = element.getBoundingClientRect();

      if (elementRect.bottom - scrollRect.top > viewportTop + 1) {
        return element;
      }
    }

    return firstOption;
  },

  onOptionClick(event) {
    const headerButton = event.target.closest('button[data-is-header-button="true"]');
    if (headerButton) {
      event._isHeaderButtonClick = true;
      return;
    }

    const button = event.target.closest('button[phx-click]');
    if (button) {
      return;
    }

    const groupHeader = event.target.closest('.group-label');
    if (groupHeader) {
      return;
    }

    const option = event.target.closest('.combobox-option');
    if (option && !option.hasAttribute('disabled')) {
      event.preventDefault();
      const value = option.getAttribute('data-combobox-value');
      this.selectOption(option, value);
    }
  },

  onDocumentClick(event) {
    if (this.el.contains(event.target) && event.target.closest('button')) {
      return;
    }

    if (!this.el.contains(event.target)) {
      this.closeDropdown();
    }
  },

  selectOption(option, value) {
    if (this.isMultiple) {
      this.toggleMultipleSelection(option, value);
    } else {
      this.setSingleSelection(option, value);
      this.closeDropdown();
    }
  },

  setSingleSelection(option, value) {
    this.el.querySelectorAll('.combobox-option[data-combobox-selected]')
      .forEach(opt => opt.removeAttribute('data-combobox-selected'));
    option?.setAttribute('data-combobox-selected', '');

    if (this.selectEl) {
      this.selectEl.value = value;
      
      this.selectEl.dispatchEvent(new window.Event('change', { bubbles: true }));
      this.selectEl.dispatchEvent(new window.Event('input', { bubbles: true }));
    }

    this.updateSingleDisplay(option);

    if (this.searchInput) {
      this.searchInput.value = '';
      this.searchTerm = '';
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
    this.selectEl.dispatchEvent(new window.Event('change', { bubbles: true }));
    this.selectEl.dispatchEvent(new window.Event('input', { bubbles: true }));
  },

  initializeSelection() {
    const selectEl = this.selectEl;
    if (!selectEl) {
      return;
    }

    // Check if user has made a selection by looking at the last clicked option
    const justCleared = selectEl.hasAttribute('data-just-cleared');
    
    let currentValue = selectEl.value;
    
    // Clear the just-cleared flag
    selectEl.removeAttribute('data-just-cleared');

    // Look for wrapper with data-current-value (for server-side rendering)
    const wrapper = this.el.closest('[data-current-value]');
    if (wrapper) {
      const serverValue = wrapper.getAttribute('data-current-value');
      if (serverValue && serverValue !== currentValue) {
        selectEl.value = serverValue;
        currentValue = serverValue;
      }
    }

    // Find and mark the selected option
    const options = this.el.querySelectorAll('[data-combobox-value]');
    let selectedOption = null;
    const matchingOptions = [];

    options.forEach(option => {
      option.removeAttribute('data-combobox-selected');
      if (option.getAttribute('data-combobox-value') === currentValue) {
        matchingOptions.push(option);
      }
    });

    if (matchingOptions.length > 0) {
      // If multiple options match (same value in different groups), prioritize the first visible group
      if (matchingOptions.length === 1) {
        selectedOption = matchingOptions[0];
      } else {
        // Find the option in the first visible group
        const visibleGroups = Array.from(this.el.querySelectorAll('.option-group')).filter(group => {
          const optionsContainer = group.querySelector('.group-label + div');
          return optionsContainer; // Group is not collapsed
        });

        for (const group of visibleGroups) {
          const optionInGroup = matchingOptions.find(option => group.contains(option));
          if (optionInGroup) {
            selectedOption = optionInGroup;
            break;
          }
        }

        // Fallback to the first matching option if none found in visible groups
        if (!selectedOption) {
          selectedOption = matchingOptions[0];
        }
      }

      selectedOption.setAttribute('data-combobox-selected', 'true');
      
      // Update the display to show the correct selection
      this.updateSingleDisplay(selectedOption);
    }
  },

  updateSingleDisplay(selectedOption) {
    const placeholder = this.el.querySelector('.combobox-placeholder');
    const clearButton = this.el.querySelector('[data-part="clear-combobox-button"]');

    if (placeholder) {
      placeholder.classList.toggle('hidden', !!selectedOption);
    }

    if (clearButton) {
      if (selectedOption) {
        clearButton.removeAttribute('hidden');
      } else {
        clearButton.setAttribute('hidden', 'true');
      }
    }
  },

  updateMultipleDisplay() {
  },

  triggerChange() {
    const form = this.selectEl?.form;
    if (form) {
      form.dispatchEvent(new window.Event('change', { bubbles: true }));
    }
  },

  setupClearButton() {
    if (!this.clearButton) return;

    if (this.boundClearClick) {
      this.clearButton.removeEventListener('click', this.boundClearClick);
    }

    this.boundClearClick = (event) => this.handleClearClick(event);
    this.clearButton.addEventListener('click', this.boundClearClick);
  },

  handleClearClick(event) {
    event.preventDefault();
    event.stopPropagation();

    this.justCleared = true;

    if (this.selectEl) {
      this.selectEl.value = '';
      this.selectEl.dispatchEvent(new window.Event('change', { bubbles: true }));
      this.selectEl.dispatchEvent(new window.Event('input', { bubbles: true }));
    }

    if (this.searchInput) {
      this.searchInput.value = '';
      this.searchTerm = '';
    }

    this.el.querySelectorAll('.combobox-option[data-combobox-selected]')
      .forEach(opt => opt.removeAttribute('data-combobox-selected'));

    this.updateSingleDisplay(null);

    this.searchInput?.focus({ preventScroll: true });
  },

  setupSearchClearButton() {
    if (!this.searchClearButton) return;

    if (this.boundSearchClearClick) {
      this.searchClearButton.removeEventListener('click', this.boundSearchClearClick);
    }

    this.boundSearchClearClick = (event) => this.handleSearchClearClick(event);
    this.searchClearButton.addEventListener('click', this.boundSearchClearClick);
  },

  handleSearchClearClick(event) {
    event.preventDefault();
    event.stopPropagation();

    if (this.searchInput) {
      this.searchInput.value = '';
      this.searchTerm = '';
      
      // Hide the clear button
      this.updateSearchClearButtonVisibility();
      
      // Trigger search to show all options again
      this.onSearchInput({ target: this.searchInput });
      
      // Focus back on the search input
      this.searchInput.focus({ preventScroll: true });
    }
  },

  updateSearchClearButtonVisibility() {
    if (!this.searchClearButton) return;
    
    const hasSearchText = this.searchInput && this.searchInput.value.trim().length > 0;
    
    if (hasSearchText) {
      this.searchClearButton.classList.remove('hidden');
    } else {
      this.searchClearButton.classList.add('hidden');
    }
  },

  enablePhxClickHandlers() {
    const phxButtons = this.el.querySelectorAll('button[phx-click]');
    phxButtons.forEach(button => {
      if (button === this.clearButton) return;

      if (button._phxClickHandler) {
        button.removeEventListener('click', button._phxClickHandler);
      }

      button._phxClickHandler = () => {
      };

      button.addEventListener('click', button._phxClickHandler);
    });
  },

  initializeStickyHeaders() {
    if (!this.scrollArea) return;

    const groups = this.dropdown.querySelectorAll('.option-group');
    this.stickyHeaders = [];

    groups.forEach((group, index) => {
      const header = group.querySelector('.group-label');
      if (header) {
        group.style.setProperty('margin', '0', 'important');
        group.style.setProperty('padding', '0', 'important');

        const firstOption = header.nextElementSibling;
        if (firstOption && firstOption.classList.contains('combobox-option')) {
          firstOption.style.setProperty('margin-top', '0', 'important');
        }

        const optionsContainer = group.querySelector('.group-label ~ *');
        if (optionsContainer && !optionsContainer.classList.contains('combobox-option')) {
          optionsContainer.style.setProperty('margin-top', '0', 'important');
          optionsContainer.style.setProperty('padding-top', '0', 'important');
          const firstInnerOption = optionsContainer.querySelector('.combobox-option');
          if (firstInnerOption) {
            firstInnerOption.style.setProperty('margin-top', '0', 'important');
          }
        }

        this.stickyHeaders.push({
          group: group,
          header: header,
          originalTop: 0,
          index: index,
        });
      }
    });

    const contentWrapper = this.scrollArea.querySelector('.px-1\\.5');
    if (contentWrapper) {
      contentWrapper.style.setProperty('gap', '0', 'important');
      contentWrapper.style.setProperty('row-gap', '0', 'important');
      contentWrapper.style.setProperty('column-gap', '0', 'important');
      
      // Keep content wrapper positioned so we can move headers out of it
      contentWrapper.style.setProperty('position', 'relative', 'important');
    }

    // Make sure the scroll area is the sticky container
    this.scrollArea.style.setProperty('position', 'relative', 'important');
    this.scrollArea.style.setProperty('overflow', 'auto', 'important');

    if (this.stickyHeaders.length > 0) {
      this.setupStickyHeaders();

      this.scrollHandlerBound = () => this.handleScroll();
      this.scrollArea.addEventListener('scroll', this.scrollHandlerBound);
    }
  },

  getFirstUncollapedGroup() {
    return this.stickyHeaders.find(item => {
      const group = item.group;
      const optionsContainer = group.querySelector('.group-label ~ div');
      return !!optionsContainer; // Group is uncollapsed if options container exists
    });
  },

  setupStickyHeaders() {
    if (this.scrollArea) {
      const contentWrapper = this.scrollArea.querySelector('.px-1\\.5');
      if (contentWrapper) {
        contentWrapper.style.position = 'relative';
      }
      
      this.scrollArea.style.position = 'relative';
      this.scrollArea.style.overflow = 'auto';
    }

    if (this.scrollArea) {
      void this.scrollArea.offsetHeight;
    }

    // Setup all headers for potential sticky behavior
    this.stickyHeaders.forEach(item => {
      const header = item.header;
      
      // Setup basic header styles
      header.style.setProperty('margin', '0', 'important');
      header.style.display = 'flex';
      header.style.alignItems = 'center';
      header.style.justifyContent = 'space-between';
      header.style.boxSizing = 'border-box';
      header.style.lineHeight = '1.5';
      
      // Calculate header height if not already done
      if (this.headerHeight === 0) {
        void header.offsetHeight;
        const rect = header.getBoundingClientRect();
        this.headerHeight = rect.height;
      }
    });

    // Initialize the first sticky header by triggering handleScroll
    this.handleScroll();
  },

  getBackgroundColor() {
    if (this.dropdown) {
      const dropdownBg = window.getComputedStyle(this.dropdown).backgroundColor;
      return dropdownBg || 'rgb(255, 255, 255)';
    }
    return 'rgb(255, 255, 255)';
  },

  getBorderColor() {
    if (this.dropdown) {
      const dropdownBorder = window.getComputedStyle(this.dropdown).borderColor;
      return `1px solid ${dropdownBorder || 'rgb(229, 231, 235)'}`;
    }
    return '1px solid rgb(229, 231, 235)';
  },

  handleScroll() {
    if (!this.scrollArea || this.stickyHeaders.length === 0) return;

    // Find which group should have the sticky header based on scroll position
    const scrollTop = this.scrollArea.scrollTop;
    const scrollAreaRect = this.scrollArea.getBoundingClientRect();
    
    let currentStickyGroup = null;
    
    // Find the group that should be sticky based on what's currently visible
    for (let i = 0; i < this.stickyHeaders.length; i++) {
      const item = this.stickyHeaders[i];
      const group = item.group;
      
      // Skip collapsed groups
      const optionsContainer = group.querySelector('.group-label ~ div');
      if (!optionsContainer) continue;
      
      const groupRect = group.getBoundingClientRect();
      const groupTop = groupRect.top - scrollAreaRect.top + scrollTop;
      const groupBottom = groupTop + groupRect.height;
      
      // If this group contains the current scroll position, or if we're past all groups, use the last visible group
      if (scrollTop >= groupTop && scrollTop < groupBottom) {
        currentStickyGroup = item;
        break;
      } else if (scrollTop >= groupTop && i === this.stickyHeaders.length - 1) {
        // If we're past the last group, keep it sticky
        currentStickyGroup = item;
        break;
      } else if (i === 0 && scrollTop < groupTop) {
        // If we're before the first group, use the first group
        currentStickyGroup = item;
        break;
      }
    }
    
    // If no group found by position, find the first uncollapsed group as fallback
    if (!currentStickyGroup) {
      currentStickyGroup = this.getFirstUncollapedGroup();
    }
    
    if (!currentStickyGroup) return;

    // Update which header is sticky
    this.stickyHeaders.forEach(item => {
      const header = item.header;
      if (item === currentStickyGroup) {
        // Make this header sticky
        header.style.position = 'sticky';
        header.style.top = '0px';
        header.style.left = '0';
        header.style.right = '0';
        header.style.width = '100%';
        header.style.zIndex = '1000';
        header.style.backgroundColor = this.getBackgroundColor();
        header.style.borderTop = 'none';
        header.style.borderBottom = this.getBorderColor();
        header.style.setProperty('visibility', 'visible', 'important');
        header.style.setProperty('display', 'flex', 'important');
        header.style.setProperty('opacity', '1', 'important');
        
        // Ensure consistent height
        if (this.headerHeight > 0) {
          header.style.height = `${this.headerHeight}px`;
          header.style.minHeight = `${this.headerHeight}px`;
          header.style.maxHeight = `${this.headerHeight}px`;
        }
      } else {
        // Remove sticky positioning from other headers
        header.style.position = 'static';
        header.style.zIndex = 'auto';
        header.style.top = 'auto';
        header.style.left = 'auto';
        header.style.right = 'auto';
        header.style.width = 'auto';
        header.style.backgroundColor = '';
        header.style.borderTop = '';
        header.style.borderBottom = '';
        header.style.height = '';
        header.style.minHeight = '';
        header.style.maxHeight = '';
      }
    });
  },
};

export default SearchCombobox;

