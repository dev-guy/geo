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
      this.openDropdown();
    }

    this.initializeSelection();

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
      if (this.scrollArea && this.scrollHandlerBound) {
        this.scrollArea.removeEventListener('scroll', this.scrollHandlerBound);
      }
    };
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
      this.ensureHighlight();
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

  highlight(element) {
    this.el.querySelectorAll('[data-combobox-navigate]').forEach(o => {
      o.removeAttribute('data-combobox-navigate');
      o.blur();
    });
    element.setAttribute('data-combobox-navigate', '');

    if (element.classList.contains('combobox-option')) {
      element.focus({ preventScroll: true });
    }

    this.scrollToOption(element);
  },

  scrollToOption(option) {
    if (!this.scrollArea || !option) return;

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

    if (!this.stickyHeaders.length) {
      const effectiveHeight = totalHeight;
      return {
        viewportTop: 0,
        viewportBottom: totalHeight,
        effectiveHeight: effectiveHeight,
        maxVisibleRows: this.calculateMaxVisibleRows(effectiveHeight),
      };
    }

    const scrollRect = this.scrollArea.getBoundingClientRect();
    let visibleHeadersCount = 0;

    for (let i = 0; i < this.stickyHeaders.length; i++) {
      const item = this.stickyHeaders[i];
      const group = item.group;
      
      // Check if the group is collapsed by looking for the options container div
      const optionsContainer = group.querySelector('.group-label + div');
      const isGroupCollapsed = !optionsContainer;
      
      // Skip collapsed groups when counting visible headers
      if (isGroupCollapsed) {
        continue;
      }
      
      const groupRect = group.getBoundingClientRect();
      const groupTopRelativeToScroll = groupRect.top - scrollRect.top;
      const headerStickyTop = i * this.headerHeight;

      if (groupTopRelativeToScroll <= headerStickyTop) {
        const groupBottomRelativeToScroll = groupRect.bottom - scrollRect.top;
        const headerBottomPosition = headerStickyTop + this.headerHeight;

        if (groupBottomRelativeToScroll > headerBottomPosition) {
          visibleHeadersCount++;
        }
      } else {
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

    const opt = event.target.closest('.combobox-option');
    if (!opt) return;
    this.scrollArea && this.scrollArea.focus({ preventScroll: true });
    this.highlight(opt);
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

  ensureHighlight() {
    const curr = this.el.querySelector('[data-combobox-navigate]');
    if (curr) return;

    const selected = this.el.querySelector('.combobox-option[data-combobox-selected]');
    if (selected) {
      this.highlight(selected);
      return;
    }

    const first = this.getFirstVisibleOption();
    first && this.highlight(first);
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
    if (!this.selectEl) return;

    if (this.justCleared) {
      this.updateSingleDisplay(null);
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
        this.updateSingleDisplay({value: currentValue});
      }
    } else {
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

  setupStickyHeaders() {
    if (this.scrollArea) {
      const contentWrapper = this.scrollArea.querySelector('.px-1\\.5');
      if (contentWrapper) {
        // Keep content wrapper positioned normally
        contentWrapper.style.position = 'relative';
      }
      
      // Ensure the scroll area itself is the sticky container
      this.scrollArea.style.position = 'relative';
      this.scrollArea.style.overflow = 'auto';
    }

    if (this.scrollArea) {
      void this.scrollArea.offsetHeight;
    }

    if (this.stickyHeaders.length > 0) {
      const firstHeader = this.stickyHeaders[0].header;

      firstHeader.style.setProperty('margin', '0', 'important');
      firstHeader.style.setProperty('padding', '0', 'important');
      firstHeader.style.paddingLeft = '0.75rem';
      firstHeader.style.paddingRight = '2rem';
      firstHeader.style.display = 'flex';
      firstHeader.style.alignItems = 'center';
      firstHeader.style.justifyContent = 'space-between';
      firstHeader.style.boxSizing = 'border-box';
      firstHeader.style.lineHeight = '1.5';

      firstHeader.style.borderTop = 'none';
      firstHeader.style.borderBottom = this.getBorderColor();

      void firstHeader.offsetHeight;

      const rect = firstHeader.getBoundingClientRect();
      this.headerHeight = rect.height;

      if (this.stickyHeaders.length > 1) {
        const secondHeader = this.stickyHeaders[1].header;

        void this.scrollArea.offsetHeight;

        const firstGroupBottom = this.stickyHeaders[0].group.getBoundingClientRect().bottom;
        const secondHeaderTop = secondHeader.getBoundingClientRect().top;
        this.headerGap = Math.max(0, secondHeaderTop - firstGroupBottom);
      } else {
        this.headerGap = 0;
      }
    }

    this.stickyHeaders.forEach((item, index) => {
      const header = item.header;

      // Use sticky positioning - this is the key to making headers stick properly
      header.style.position = 'sticky';
      header.style.top = '0px'; // All headers stick to the top
      header.style.left = '0';
      header.style.right = '0';
      header.style.width = '100%';
      header.style.zIndex = `${1000 - index}`;

      const dropdownBg = window.getComputedStyle(this.dropdown).backgroundColor;
      header.style.backgroundColor = dropdownBg || 'rgb(255, 255, 255)';

      // Headers should always remain visible, regardless of group state
      header.style.setProperty('visibility', 'visible', 'important');
      header.style.setProperty('display', 'flex', 'important');
      header.style.setProperty('opacity', '1', 'important');
      
      header.style.setProperty('z-index', `${1000 - index}`, 'important');

      header.style.setProperty('margin', '0', 'important');
      header.style.setProperty('padding', '0', 'important');

      header.style.paddingLeft = '0.75rem';
      header.style.paddingRight = '0.75rem';

      header.style.width = '100%';
      header.style.boxSizing = 'border-box';
      header.style.lineHeight = '1.5';

      header.style.height = `${this.headerHeight}px`;
      header.style.minHeight = `${this.headerHeight}px`;
      header.style.maxHeight = `${this.headerHeight}px`;

      header.style.borderTop = 'none';
      header.style.borderBottom = this.getBorderColor();

      if (index === 0) {
        header.setAttribute('data-first-header', 'true');
      }
    });
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

    // Handle the first header's top border
    // The first header should NEVER have a top border
    const firstHeader = this.stickyHeaders[0]?.header;
    if (firstHeader) {
      firstHeader.style.borderTop = 'none';
    }

    // With sticky positioning, we just need to manage visibility
    // The browser handles the positioning automatically
    this.stickyHeaders.forEach((item) => {
      const header = item.header;
      const group = item.group;
      
      // Headers should always remain visible, regardless of group state
      header.style.setProperty('visibility', 'visible', 'important');
      header.style.setProperty('display', 'flex', 'important');
      header.style.setProperty('opacity', '1', 'important');
    });
  },
};

export default SearchCombobox;

