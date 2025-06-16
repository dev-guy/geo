defmodule GeoWeb.Components.SearchCombobox do
  @moduledoc """
  The `GeoWeb.Components.SearchCombobox` is a Phoenix LiveView component module for creating customizable search combobox elements.

  This module provides components to display search combobox/select inputs with various styles, colors,
  sizes, and configurations. The main component, `search_combobox/1`, acts as a container for select options,
  and allows users to search, filter and select items from a dropdown list with
  group-based collapse and sort functionality

  The search combobox component supports features like:
  - Search filtering of options (always enabled)
  - Single and multiple selection modes
  - Custom option rendering
  - Keyboard navigation
  - Accessibility support
  - Dynamic group collapsing and sorting

  This work was derived from Mishka Chelekom Combobox version 0.0.5 in 2025.
  https://mishka.tools/
  """

  use Phoenix.Component
  use Gettext, backend: GeoWeb.Gettext
  import GeoWeb.Components.ScrollArea, only: [scroll_area: 1]
  import Phoenix.LiveView.Utils, only: [random_id: 0]
  import GeoWeb.Components.Icon, only: [icon: 1]

  @doc """
  The `search_combobox` component is a customizable select/dropdown element with advanced features
  such as searchable options, multiple selection, and grouped items.

  It supports various customization options including:
  - Searchable options with filter functionality (always enabled)
  - Single or multiple selection modes
  - Option grouping with labels
  - Custom styling with color themes and variants
  - Accessibility features with ARIA attributes
  - Responsive dropdown with scrollable area
  - Form field integration
  - Custom placeholders and descriptions
  - Start section slots for icons or additional content
  - Dynamic group collapsing and sorting


   ## Example usage:
    <.search_combobox
      options={@options}
      placeholder="Select an option"
      on_change="handle_selection"
    />
    # Single selection with options
    <.search_combobox placeholder="Select an item">
      <:option value="Item 1">First Item</:option>
      <:option value="Item 2">Second Item</:option>
      <:option value="Item 3">Third Item</:option>
    </.search_combobox>

    # With grouped options
    <.search_combobox placeholder="Select a fruit">
      <:option group="Citrus" value="orange">Orange</:option>
      <:option group="Citrus" value="lemon">Lemon</:option>
      <:option group="Berries" value="strawberry">Strawberry</:option>
      <:option group="Berries" value="blueberry">Blueberry</:option>
    </.search_combobox>

    # With disabled options
    <.search_combobox placeholder="Select an option">
      <:option value="available">Available Option</:option>
      <:option value="disabled" disabled>Disabled Option</:option>
      <:option value="another">Another Option</:option>
    </.search_combobox>

    # Multiple selection with custom rendering
    <.search_combobox multiple placeholder="Select fruits">
      <:option value="apple">
        <div class="flex items-center gap-2">
          <span>🍎</span>
          <span>Apple</span>
        </div>
      </:option>
      <:option value="banana">
        <div class="flex items-center gap-2">
          <span>🍌</span>
          <span>Banana</span>
        </div>
      </:option>
    </.search_combobox>

    # Group-based collapse and sort
    group_states = %{
      "Fruits" => %{collapsed: false, sort_icon: "hero-chevron-up"},
      "Vegetables" => %{collapsed: true, sort_icon: "hero-chevron-down"},
      "Grains" => %{collapsed: false, sort_icon: "hero-chevron-up"}
    }

    <.search_combobox
      enable_group_sorting={true}
      group_states={group_states}
      toggle_group_sort_event="toggle_group_sort"
      toggle_group_collapse_event="toggle_group_collapse">
      <:option group="Fruits" value="apple">Apple</:option>
      <:option group="Fruits" value="banana">Banana</:option>
      <:option group="Vegetables" value="carrot">Carrot</:option>
      <:option group="Grains" value="rice">Rice</:option>
    </.search_combobox>

    # Event Handlers
    def handle_event("toggle_group_sort", %{"group" => group_name}, socket) do
      current_icon = get_in(socket.assigns.group_states, [group_name, :sort_icon])
      new_icon = if current_icon == "hero-chevron-up", do: "hero-chevron-down", else: "hero-chevron-up"

      new_group_states = put_in(socket.assigns.group_states, [group_name, :sort_icon], new_icon)
      {:noreply, assign(socket, :group_states, new_group_states)}
    end

    def handle_event("toggle_group_collapse", %{"group" => group_name}, socket) do
      current_collapsed = get_in(socket.assigns.group_states, [group_name, :collapsed])
      new_group_states = put_in(socket.assigns.group_states, [group_name, :collapsed], !current_collapsed)

      {:noreply, assign(socket, :group_states, new_group_states)}
    end
  ```
  """

  @doc type: :component
  attr :id, :any, default: nil, doc: "A unique identifier is used to manage state and interaction"
  attr :key, :any, default: nil, doc: "A unique key for optimizing re-renders in LiveView"
  attr :name, :any, doc: "Name of input"
  attr :label, :string, default: nil
  attr :value, :any, doc: "Value of input"
  attr :field, Phoenix.HTML.FormField, doc: "a form field struct retrieved from the form"

  attr :options, :list, doc: "the options to pass to Phoenix.HTML.Form.options_for_select/2"
  attr :errors, :list, default: [], doc: "List of error messages to be displayed"

  attr :class, :string, default: nil, doc: "Custom CSS class for additional styling"
  attr :placeholder, :string, default: nil, doc: "Placeholder of field"
  attr :description_class, :string, default: "text-[12px]", doc: "Custom classes for description"
  attr :label_class, :string, default: nil, doc: "Custom CSS class for the label styling"
  attr :field_wrapper_class, :string, default: nil, doc: "Custom CSS class field wrapper"
  attr :option_group_class, :string, default: nil, doc: "Custom CSS class option group"

  attr :description_wrapper_class, :string,
    default: nil,
    doc: "Custom classes for description wrapper"

  attr :search_placeholder, :string,
    default: "Search..",
    doc: "Placeholder text for the search input"

  attr :color, :string, default: "natural", doc: "Determines color theme"
  attr :variant, :string, default: "base", doc: "Determines variant theme"
  attr :border, :string, default: "extra_small", doc: "Determines border style"
  attr :rounded, :string, default: "medium", doc: "Radius size"
  attr :space, :string, default: "extra_small", doc: "Radius size"
  attr :padding, :string, default: "small", doc: "Padding size"
  attr :height, :string, default: "h-fit max-h-40", doc: "Dropdown height"
  attr :description, :string, default: nil, doc: "Determines a short description"
  attr :multiple, :boolean, default: false, doc: "Multiple selections in the combobox"
  attr :search_event, :string, default: nil, doc: "Phoenix event to trigger when searching"

  # New attributes for dynamic group management
  attr :enable_group_sorting, :boolean, default: false, doc: "Enable sorting controls for groups"
  attr :sort_groups, :boolean, default: true, doc: "Whether to sort groups alphabetically (true) or preserve original order (false)"
  attr :group_states, :map, default: %{}, doc: "Map of group names to their state (collapsed: boolean, sort_icon: string)"
  attr :toggle_group_sort_event, :string, default: "toggle_group_sort", doc: "Event name for toggling group sort order"
  attr :toggle_group_collapse_event, :string, default: "toggle_group_collapse", doc: "Event name for toggling group collapse state"
  attr :group_event_target, :any, default: nil, doc: "Target for group events (phx-target)"

  slot :start_section, required: false, doc: "Renders heex content in start of an element" do
    attr :class, :string, doc: "Custom CSS class for additional styling"
    attr :icon, :string, doc: "Icon displayed alongside of an item"
  end

  slot :selection, required: false, doc: "Custom content to display when an item is selected" do
    attr :class, :string, doc: "Custom CSS class for additional styling"
  end

  attr :size, :string,
    default: "small",
    doc:
      "Determines the overall size of the elements, including padding, font size, and other items"

  slot :option, required: false do
    attr :value, :string, required: true, doc: "Value of the select option"
    attr :class, :string, doc: "Value of the select option"
    attr :group, :string, required: false, doc: "Group name for the option"
    attr :disabled, :boolean, required: false, doc: "Specifies if this option is disabled"
  end

  attr :rest, :global,
    include: ~w(accept autocomplete capture cols disabled form list max maxlength min minlength
                multiple pattern placeholder readonly required rows size step),
    doc:
      "Global attributes can define defaults which are merged with attributes provided by the caller"

  def search_combobox(%{field: %Phoenix.HTML.FormField{} = field} = assigns) do
    errors = if Phoenix.Component.used_input?(field), do: field.errors, else: []

    assigns
    |> assign(field: nil, id: assigns.id || field.id)
    |> assign(:errors, Enum.map(errors, &translate_error(&1)))
    |> assign_new(:name, fn -> if assigns.multiple, do: field.name <> "[]", else: field.name end)
    |> assign_new(:value, fn -> field.value end)
    |> search_combobox()
  end

  def search_combobox(%{multiple: true} = assigns) do
    assigns =
      assigns
      |> assign_new(:id, fn -> "search-combobox-#{random_id()}" end)
      |> assign_new(:options, fn -> [] end)
      |> assign_new(:option, fn -> [] end)
      |> assign_new(:value, fn -> Map.get(assigns, :value, []) end)

    ~H"""
    <div key={@key} class={[
      "leading-5",
      border_class(@border, @variant),
      color_variant(@variant, @color),
      rounded_size(@rounded),
      padding_size(@padding),
      size_class(@size),
      space_class(@space)
    ]}>
      <div :if={@label || @description} class={["search-combobox-label-wrapper", @description_wrapper_class]}>
        <.label :if={@label} for={@id} class={@label_class}>{@label}</.label>
        <div :if={@description} class={@description_class}>
          {@description}
        </div>
      </div>

      <div phx-hook="SearchCombobox" data-multiple={@multiple} data-search-event={@search_event} id={"#{@id}-search-combobox"}>
        <input type="hidden" name={@name} />
        <select id={@id} name={@name} class="search-combobox-select hidden" {@rest}>
          <option value=""></option>

          <%= if Enum.empty?(@option) do %>
            {Phoenix.HTML.Form.options_for_select(@options, encode_current_value(@value))}
          <% else %>
            <optgroup
              :for={{group_label, grouped_options} <- Enum.group_by(@option, & &1[:group])}
              :if={!is_nil(group_label)}
              label={group_label}
            >
              {Phoenix.HTML.Form.options_for_select(
                Enum.map(grouped_options, &create_option_tuple/1),
                encode_current_value(@value)
              )}
            </optgroup>

            {!Enum.any?(@option, &Map.has_key?(&1, :group)) &&
              Phoenix.HTML.Form.options_for_select(
                Enum.map(@option, &create_option_tuple/1),
                encode_current_value(@value)
              )}
          <% end %>
        </select>

        <div id={"#{@id}-search-combobox-wrapper"} data-current-value={@value || ""} class="relative">
          <div
            class="search-combobox-trigger w-full text-start py-1 flex items-center justify-between cursor-pointer border rounded-md hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            role="combobox"
            aria-haspopup="listbox"
            aria-expanded="false"
            aria-controls={"#{@id}-search-combobox-listbox"}
            aria-labelledby={"#{@id}-label #{@id}-button"}
            tabindex="0"
          >
            <div class="flex-1 flex items-center gap-2">
              <div
                :if={@start_section != []}
                class={[
                  "shrink-0",
                  @start_section[:class]
                ]}
              >
                {render_slot(@start_section)}
              </div>

              <div :if={@selection != []} class={[@selection[:class]]}>
                {render_slot(@selection)}
              </div>

              <div :if={@selection == [] && @placeholder} class="search-combobox-placeholder select-none">
                {@placeholder}
              </div>

              <div
                data-part="select_toggle_label"
                class={[
                  "selected_value flex flex-wrap items-center gap-2 [&_.search-combobox-pill]:py-0.5",
                  "[&_.search-combobox-pill]:px-1 [&_.search-combobox-pill]:leading-4"
                ]}
              >
              </div>
            </div>

            <div class="flex items-center gap-1">
              <div class="shrink-0" data-part="clear-combobox-button" role="button" hidden>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  class="size-3.5 opacity-60"
                >
                  <path d="M18 6 6 18" /><path d="m6 6 12 12" />
                </svg>
              </div>

              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="shrink-0 search-combobox-icon"
              >
                <path d="m7 15 5 5 5-5" /><path d="m7 9 5-5 5 5" />
              </svg>
            </div>
          </div>

          <div
            id={"#{@id}-search-combobox-listbox"}
            role="listbox"
            data-part="search-combobox-listbox"
            aria-multiselectable={@multiple}
            class="search-combobox-dropdown z-50 absolute w-full px-[3px] py-2 transition-all ease-out duration-[250ms] top-full mt-2"
            hidden
          >
            <div class="mt-1 mb-2 mx-1.5">
              <input
                type="text"
                role="searchbox"
                aria-controls={"#{@id}-search-combobox-listbox"}
                aria-autocomplete="list"
                aria-activedescendant=""
                aria-label={@search_placeholder}
                class="search-combobox-search-input appearance-none bg-transparent px-2 py-1 w-full focus:outline-none rounded-md"
                data-part="search"
                placeholder={@search_placeholder}
              />
            </div>

            <.scroll_area
              id={"search-combobox-wrapper-#{@id}"}
              padding="none"
              height={@height}
              scrollbar_width="w-[4px]"
            >
              <div class="px-1.5">
                <%= if @enable_group_sorting && Enum.any?(@option, &Map.has_key?(&1, :group)) do %>
                  <!-- Dynamic Groups with Sorting and Collapsing -->
                  <%= for {group_label, grouped_options} <- (if @sort_groups, do: Enum.group_by(@option, & &1[:group]), else: group_by_preserving_order(@option, & &1[:group])) do %>
                    <%= if !is_nil(group_label) do %>
                      <div class={["option-group", if(group_label != (if @sort_groups, do: Enum.group_by(@option, & &1[:group]), else: group_by_preserving_order(@option, & &1[:group])) |> List.first() |> elem(0), do: "mt-4"), @option_group_class]}>
                        <div class="group-label font-semibold my-2 flex items-center justify-between">
                          <div class="flex items-center gap-2">
                            <button
                              type="button"
                              phx-click={@toggle_group_collapse_event}
                              phx-value-group={group_label}
                              phx-target={@group_event_target}
                              class="flex items-center text-sm opacity-80 hover:opacity-100 transition-opacity p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                              title="Toggle group visibility"
                            >
                              <%= if get_in(@group_states, [group_label, :collapsed]) do %>
                                <.icon name="hero-chevron-right" class="h-4 w-4" />
                              <% else %>
                                <.icon name="hero-chevron-down" class="h-4 w-4" />
                              <% end %>
                            </button>
                            <span>{group_label}</span>
                          </div>
                          <%= if get_in(@group_states, [group_label, :sort_icon]) do %>
                            <button
                              type="button"
                              phx-click={@toggle_group_sort_event}
                              phx-value-group={group_label}
                              phx-target={@group_event_target}
                              class="flex items-center text-sm opacity-80 hover:opacity-100 transition-opacity p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                              title={"Toggle #{group_label} sort order"}
                            >
                              <span class="mr-1">Sort</span>
                              <.icon name={get_in(@group_states, [group_label, :sort_icon])} class="h-4 w-4" />
                            </button>
                          <% end %>
                        </div>

                        <div :if={!get_in(@group_states, [group_label, :collapsed])} class="transition-all duration-200 ease-in-out">
                          <.option
                            :for={option <- grouped_options}
                            value={option[:value]}
                            disabled={option[:disabled]}
                            class={option[:class]}
                          >
                            {render_slot(option)}
                          </.option>
                        </div>
                      </div>
                    <% end %>
                  <% end %>
                <% else %>
                  <!-- Regular ungrouped or non-sortable display -->
                  <.option :for={{label, value} <- @options} :if={@options} value={value}>
                    {label}
                  </.option>

                  <div
                    :for={{group_label, grouped_options} <- (if @sort_groups, do: Enum.group_by(@option, & &1[:group]), else: group_by_preserving_order(@option, & &1[:group]))}
                    :if={!is_nil(group_label)}
                    class={["option-group", @option_group_class]}
                  >
                    <div class="group-label font-semibold my-2">{group_label}</div>

                    <div>
                      <.option
                        :for={option <- grouped_options}
                        value={option[:value]}
                        disabled={option[:disabled]}
                        class={option[:class]}
                      >
                        {render_slot(option)}
                      </.option>
                    </div>
                  </div>

                  <.option
                    :for={option <- Enum.filter(@option, &is_nil(&1[:group]))}
                    value={option[:value]}
                    disabled={option[:disabled]}
                    class={option[:class]}
                  >
                    {render_slot(option)}
                  </.option>
                <% end %>

                <div class="no-results text-center hidden">
                  {gettext("Nothing found!")}
                </div>
              </div>
            </.scroll_area>
          </div>
        </div>
      </div>

      <.error :for={msg <- @errors}>{msg}</.error>
    </div>
    """
  end

  def search_combobox(assigns) do
    assigns =
      assigns
      |> assign_new(:id, fn -> "search-combobox-#{random_id()}" end)
      |> assign_new(:options, fn -> [] end)
      |> assign_new(:option, fn -> [] end)
      |> assign_new(:value, fn -> Map.get(assigns, :value) end)

    ~H"""
    <div key={@key} class={[
      "leading-5",
      border_class(@border, @variant),
      color_variant(@variant, @color),
      rounded_size(@rounded),
      padding_size(@padding),
      size_class(@size),
      space_class(@space)
    ]}>
      <div :if={@label || @description} class={["search-combobox-label-wrapper", @description_wrapper_class]}>
        <.label :if={@label} for={@id} class={@label_class}>{@label}</.label>
        <div :if={@description} class={@description_class}>
          {@description}
        </div>
      </div>

      <div phx-hook="SearchCombobox" data-multiple={@multiple} data-search-event={@search_event} id={"#{@id}-search-combobox"}>
        <input type="hidden" name={@name} />
        <select id={@id} name={@name} class="search-combobox-select hidden" {@rest}>
          <option value=""></option>

          <%= if Enum.empty?(@option) do %>
            {Phoenix.HTML.Form.options_for_select(@options, encode_current_value(@value))}
          <% else %>
            <optgroup
              :for={{group_label, grouped_options} <- Enum.group_by(@option, & &1[:group])}
              :if={!is_nil(group_label)}
              label={group_label}
            >
              {Phoenix.HTML.Form.options_for_select(
                Enum.map(grouped_options, &create_option_tuple/1),
                encode_current_value(@value)
              )}
            </optgroup>

            {!Enum.any?(@option, &Map.has_key?(&1, :group)) &&
              Phoenix.HTML.Form.options_for_select(
                Enum.map(@option, fn %{value: v} -> {v, v} end),
                @value
              )}
          <% end %>
        </select>

        <div id={"#{@id}-search-combobox-wrapper"} data-current-value={@value || ""} class="relative">
          <div
            class="search-combobox-trigger w-full text-start py-1 flex items-center justify-between cursor-pointer border rounded-md hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            role="combobox"
            aria-haspopup="listbox"
            aria-expanded="false"
            aria-controls={"#{@id}-search-combobox-listbox"}
            aria-labelledby={"#{@id}-label #{@id}-button"}
            tabindex="0"
          >
            <div id={"#{@id}-select_toggle_label"} class="flex-1 flex items-center gap-2">
              <div
                :if={@start_section != []}
                class={[
                  "shrink-0",
                  @start_section[:class]
                ]}
              >
                {render_slot(@start_section)}
              </div>

              <div :if={@selection != []} class={[@selection[:class]]}>
                {render_slot(@selection)}
              </div>

              <div :if={@selection == [] && @placeholder} class="search-combobox-placeholder select-none">
                {@placeholder}
              </div>

              <div data-part="select_toggle_label" class="selected-value"></div>
            </div>

            <div class="flex items-center gap-1">
              <div class="shrink-0" data-part="clear-combobox-button" role="button" hidden>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  class="size-3.5 opacity-60"
                >
                  <path d="M18 6 6 18" /><path d="m6 6 12 12" />
                </svg>
              </div>

              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="shrink-0 search-combobox-icon"
              >
                <path d="m7 15 5 5 5-5" /><path d="m7 9 5-5 5 5" />
              </svg>
            </div>
          </div>

          <div
            id={"#{@id}-search-combobox-listbox"}
            role="listbox"
            data-part="search-combobox-listbox"
            aria-multiselectable={@multiple}
            class="search-combobox-dropdown z-50 absolute w-full px-[3px] py-2 transition-all ease-out duration-[250ms] top-full mt-2"
            hidden
          >
            <div class="mt-1 mb-2 mx-1.5">
              <input
                type="text"
                role="searchbox"
                aria-controls={"#{@id}-search-combobox-listbox"}
                aria-autocomplete="list"
                aria-activedescendant=""
                aria-label={@search_placeholder}
                class="search-combobox-search-input appearance-none bg-transparent px-2 py-1 w-full focus:outline-none rounded-md"
                data-part="search"
                placeholder={@search_placeholder}
              />
            </div>

            <.scroll_area
              id={"search-combobox-wrapper-#{@id}"}
              padding="none"
              height={@height}
              scrollbar_width="w-[4px]"
            >
              <div class="px-1.5">
                <%= if @enable_group_sorting && Enum.any?(@option, &Map.has_key?(&1, :group)) do %>
                  <!-- Dynamic Groups with Sorting and Collapsing -->
                  <%= for {group_label, grouped_options} <- (if @sort_groups, do: Enum.group_by(@option, & &1[:group]), else: group_by_preserving_order(@option, & &1[:group])) do %>
                    <%= if !is_nil(group_label) do %>
                      <div class={["option-group", if(group_label != (if @sort_groups, do: Enum.group_by(@option, & &1[:group]), else: group_by_preserving_order(@option, & &1[:group])) |> List.first() |> elem(0), do: "mt-4"), @option_group_class]}>
                        <div class="group-label font-semibold my-2 flex items-center justify-between">
                          <div class="flex items-center gap-2">
                            <button
                              type="button"
                              phx-click={@toggle_group_collapse_event}
                              phx-value-group={group_label}
                              phx-target={@group_event_target}
                              class="flex items-center text-sm opacity-80 hover:opacity-100 transition-opacity p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                              title="Toggle group visibility"
                            >
                              <%= if get_in(@group_states, [group_label, :collapsed]) do %>
                                <.icon name="hero-chevron-right" class="h-4 w-4" />
                              <% else %>
                                <.icon name="hero-chevron-down" class="h-4 w-4" />
                              <% end %>
                            </button>
                            <span>{group_label}</span>
                          </div>
                          <%= if get_in(@group_states, [group_label, :sort_icon]) do %>
                            <button
                              type="button"
                              phx-click={@toggle_group_sort_event}
                              phx-value-group={group_label}
                              phx-target={@group_event_target}
                              class="flex items-center text-sm opacity-80 hover:opacity-100 transition-opacity p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                              title={"Toggle #{group_label} sort order"}
                            >
                              <span class="mr-1">Sort</span>
                              <.icon name={get_in(@group_states, [group_label, :sort_icon])} class="h-4 w-4" />
                            </button>
                          <% end %>
                        </div>

                        <div :if={!get_in(@group_states, [group_label, :collapsed])} class="transition-all duration-200 ease-in-out">
                          <.option
                            :for={option <- grouped_options}
                            value={option[:value]}
                            disabled={option[:disabled]}
                            class={option[:class]}
                          >
                            {render_slot(option)}
                          </.option>
                        </div>
                      </div>
                    <% end %>
                  <% end %>
                <% else %>
                  <!-- Regular ungrouped or non-sortable display -->
                  <.option :for={{label, value} <- @options} :if={@options} value={value}>
                    {label}
                  </.option>

                  <div
                    :for={{group_label, grouped_options} <- (if @sort_groups, do: Enum.group_by(@option, & &1[:group]), else: group_by_preserving_order(@option, & &1[:group]))}
                    :if={!is_nil(group_label)}
                    class={["option-group", @option_group_class]}
                  >
                    <div class="group-label font-semibold my-2">{group_label}</div>

                    <div>
                      <.option
                        :for={option <- grouped_options}
                        value={option[:value]}
                        disabled={option[:disabled]}
                        class={option[:class]}
                      >
                        {render_slot(option)}
                      </.option>
                    </div>
                  </div>

                  <.option
                    :for={option <- Enum.filter(@option, &is_nil(&1[:group]))}
                    value={option[:value]}
                    disabled={option[:disabled]}
                    class={option[:class]}
                  >
                    {render_slot(option)}
                  </.option>
                <% end %>

                <div class="no-results text-center hidden">
                  {gettext("Nothing found!")}
                </div>
              </div>
            </.scroll_area>
          </div>
        </div>
      </div>

      <.error :for={msg <- @errors}>{msg}</.error>
    </div>
    """
  end

  @doc type: :component
  attr :value, :string, required: true, doc: "Specifies the form which is associated with"
  attr :disabled, :boolean, default: false, doc: "Inner block that renders HEEx content"
  attr :class, :string, default: nil, doc: "Custom class"
  slot :inner_block, required: false, doc: "Inner block that renders HEEx content"

  defp option(assigns) do
    assigns = assign(assigns, :encoded_value, encode_value(assigns.value))

    ~H"""
    <div
      role="option"
      class={[
        "combobox-option cursor-pointer rounded flex justify-between items-center",
        "[&[data-combobox-navigate]]:bg-blue-500 [&[data-combobox-navigate]]:text-white",
        @class
      ]}
      data-combobox-value={@encoded_value}
    >
      {render_slot(@inner_block)}
      <svg
        class="hidden shrink-0 w-3.5 h-3.5 search-combobox-icon"
        fill="none"
        viewBox="0 0 24 24"
      >
        <path
          stroke="currentColor"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M20 6 9 17l-5-5"
        >
        </path>
      </svg>
    </div>
    """
  end

  attr :id, :string, default: nil, doc: "Unique identifire"
  attr :for, :string, default: nil, doc: "Specifies the form which is associated with"
  attr :class, :any, default: nil, doc: "Custom CSS class for additional styling"
  slot :inner_block, required: true, doc: "Inner block that renders HEEx content"

  defp label(assigns) do
    ~H"""
    <label for={@for} class={["leading-5 font-semibold", @class]} id={@id}>
      {render_slot(@inner_block)}
    </label>
    """
  end

  attr :icon, :string, default: nil, doc: "Icon displayed alongside of an item"
  slot :inner_block, required: true, doc: "Inner block that renders HEEx content"

  defp error(assigns) do
    ~H"""
    <p class="mt-3 flex items-center gap-3 text-[14px] text-rose-700">
      <.icon :if={!is_nil(@icon)} name={@icon} class="shrink-0" /> {render_slot(@inner_block)}
    </p>
    """
  end

  defp size_class("extra_small") do
    [
      "[&_.search-combobox-trigger]:min-h-7 [&_.search-combobox-icon]:size-3 text-[12px]",
      "[&_.search-combobox-search-input]:h-6 [&_.search-combobox-search-input]:text-[12px]"
    ]
  end

  defp size_class("small") do
    [
      "[&_.search-combobox-trigger]:min-h-8 [&_.search-combobox-icon]:size-3.5 text-[13px]",
      "[&_.search-combobox-search-input]:h-7 [&_.search-combobox-search-input]:text-[13px]"
    ]
  end

  defp size_class("medium") do
    [
      "[&_.search-combobox-trigger]:min-h-9 [&_.search-combobox-icon]:size-4 text-[14px]",
      "[&_.search-combobox-search-input]:h-8 [&_.search-combobox-search-input]:text-[14px]"
    ]
  end

  defp size_class("large") do
    [
      "[&_.search-combobox-trigger]:min-h-10 [&_.search-combobox-icon]:size-[18px] text-[15px]",
      "[&_.search-combobox-search-input]:h-9 [&_.search-combobox-search-input]:text-[15px]"
    ]
  end

  defp size_class("extra_large") do
    [
      "[&_.search-combobox-trigger]:min-h-11 [&_.search-combobox-icon]:size-5 text-[16px]",
      "[&_.search-combobox-search-input]:h-10 [&_.search-combobox-search-input]:text-[16px]"
    ]
  end

  defp size_class(params) when is_binary(params), do: params

  defp rounded_size("extra_small") do
    [
      "[&_.search-combobox-trigger]:rounded-sm [&_.search-combobox-dropdown]:rounded-sm",
      "[&_.search-combobox-pill]:rounded-[0.0625rem] [&_.search-combobox-search-input]:rounded-sm"
    ]
  end

  defp rounded_size("small") do
    [
      "[&_.search-combobox-trigger]:rounded [&_.search-combobox-dropdown]:rounded",
      "[&_.search-combobox-pill]:rounded-[0.13rem] [&_.search-combobox-search-input]:rounded"
    ]
  end

  defp rounded_size("medium") do
    [
      "[&_.search-combobox-trigger]:rounded-md [&_.search-combobox-dropdown]:rounded-md",
      "[&_.search-combobox-pill]:rounded-[0.19rem] [&_.search-combobox-search-input]:rounded-md"
    ]
  end

  defp rounded_size("large") do
    [
      "[&_.search-combobox-trigger]:rounded-lg [&_.search-combobox-dropdown]:rounded-lg",
      "[&_.search-combobox-pill]:rounded-[0.3rem] [&_.search-combobox-search-input]:rounded-lg"
    ]
  end

  defp rounded_size("extra_large") do
    [
      "[&_.search-combobox-trigger]:rounded-xl [&_.search-combobox-dropdown]:rounded-xl",
      "[&_.search-combobox-pill]:rounded-[0.313rem] [&_.search-combobox-search-input]:rounded-xl"
    ]
  end

  defp rounded_size("full") do
    [
      "[&_.search-combobox-trigger]:rounded-full [&_.search-combobox-dropdown]:rounded-full",
      "[&_.search-combobox-pill]:rounded-full [&_.search-combobox-search-input]:rounded-full"
    ]
  end

  defp rounded_size("none"), do: nil

  defp rounded_size(params) when is_binary(params), do: params

  defp border_class(_, variant) when variant in ["default"],
    do: nil

  defp border_class("none", _), do: nil

  defp border_class("extra_small", _),
    do: "[&_.search-combobox-trigger]:border [&_.search-combobox-dropdown]:border"

  defp border_class("small", _),
    do: "[&_.search-combobox-trigger]:border-2 [&_.search-combobox-dropdown]:border-2"

  defp border_class("medium", _),
    do: "[&_.search-combobox-trigger]:border-[3px] [&_.search-combobox-dropdown]:border-[3px]"

  defp border_class("large", _),
    do: "[&_.search-combobox-trigger]:border-4 [&_.search-combobox-dropdown]:border-4"

  defp border_class("extra_large", _),
    do: "[&_.search-combobox-trigger]:border-[5px] [&_.search-combobox-dropdown]:border-[5px]"

  defp border_class(params, _) when is_binary(params), do: params

  defp padding_size("extra_small") do
    ["[&_.search-combobox-trigger]:px-2 [&_.combobox-option]:px-2", "[&_.combobox-option]:py-0.5"]
  end

  defp padding_size("small") do
    ["[&_.search-combobox-trigger]:px-3 [&_.combobox-option]:px-3", "[&_.combobox-option]:py-1"]
  end

  defp padding_size("medium") do
    ["[&_.search-combobox-trigger]:px-4 [&_.combobox-option]:px-4", "[&_.combobox-option]:py-1.5"]
  end

  defp padding_size("large") do
    ["[&_.search-combobox-trigger]:px-5 [&_.combobox-option]:px-5", "[&_.combobox-option]:py-2"]
  end

  defp padding_size("extra_large") do
    ["[&_.search-combobox-trigger]:px-6 [&_.combobox-option]:px-6", "[&_.combobox-option]:py-2.5"]
  end

  defp padding_size(params) when is_binary(params), do: params

  defp space_class("extra_small"), do: "space-y-2 [&_.search-combobox-label-wrapper]:space-y-1"
  defp space_class("small"), do: "space-y-3 [&_.search-combobox-label-wrapper]:space-y-2"
  defp space_class("medium"), do: "space-y-4 [&_.search-combobox-label-wrapper]:space-y-3"
  defp space_class("large"), do: "space-y-5 [&_.search-combobox-label-wrapper]:space-y-4"
  defp space_class("extra_large"), do: "space-y-6 [&_.search-combobox-label-wrapper]:space-y-5"
  defp space_class("none"), do: nil
  defp space_class(params) when is_binary(params), do: params

  defp color_variant("base", _) do
    [
      "[&_.search-combobox-trigger]:bg-white text-[#09090b] [&_.search-combobox-trigger]:border-[#e4e4e7] [&_.search-combobox-trigger]:shadow-sm",
      "dark:[&_.search-combobox-trigger]:bg-[#18181B] dark:text-[#FAFAFA] dark:[&_.search-combobox-trigger]:border-[#27272a]",
      "[&_.search-combobox-dropdown]:bg-white [&_.search-combobox-dropdown]:border-[#e4e4e7]",
      "dark:[&_.search-combobox-dropdown]:bg-[#18181B] dark:[&_.search-combobox-dropdown]:border-[#27272a]",

      "[&_.search-combobox-search-input]:border-[#e4e4e7] dark:[&_.search-combobox-search-input]:border-[#27272a]",
      "[&_.search-combobox-pill]:text-[#09090b] [&_.search-combobox-pill]:bg-[#e4e4e7]",
      "[&_.search-combobox-dropdown]:shadow",
      "[&_.search-combobox-sort-icon]:text-gray-600 dark:[&_.search-combobox-sort-icon]:text-gray-300"
    ]
  end

  defp color_variant("default", "natural") do
    [
      "[&_.search-combobox-trigger]:bg-[#4B4B4B] text-white dark:[&_.search-combobox-trigger]:bg-[#DDDDDD] dark:text-black",
      "[&_.search-combobox-dropdown]:bg-[#4B4B4B] dark:[&_.search-combobox-dropdown]:bg-[#E8E8E8]",
      "hover:[&_.combobox-option]:bg-[#282828] dark:hover:[&_.combobox-option]:bg-[#E8E8E8]",
      "[&_.search-combobox-search-input]:border-white dark:[&_.search-combobox-search-input]:border-black",
      "[&_.search-combobox-search-input]:text-white dark:[&_.search-combobox-search-input]:text-black",
      "[&_.search-combobox-search-input]:placeholder-white dark:[&_.search-combobox-search-input]:placeholder-black",
      "[&_.search-combobox-pill]:bg-[#282828] dark:[&_.search-combobox-pill]:bg-[#E8E8E8]",
      "[&_.search-combobox-sort-icon]:text-white dark:[&_.search-combobox-sort-icon]:text-black"
    ]
  end

  defp color_variant("default", "primary") do
    [
      "[&_.search-combobox-trigger]:bg-[#007F8C] text-white dark:[&_.search-combobox-trigger]:bg-[#01B8CA] dark:text-black",
      "[&_.search-combobox-dropdown]:bg-[#007F8C] dark:[&_.search-combobox-dropdown]:bg-[#01B8CA]",
      "hover:[&_.combobox-option]:bg-[#016974] dark:hover:[&_.combobox-option]:bg-[#77D5E3]",
      "[&_.search-combobox-search-input]:border-white dark:[&_.search-combobox-search-input]:border-black",
      "[&_.search-combobox-search-input]:text-white dark:[&_.search-combobox-search-input]:text-black",
      "[&_.search-combobox-search-input]:placeholder-white dark:[&_.search-combobox-search-input]:placeholder-black",
      "[&_.search-combobox-pill]:bg-[#016974] dark:[&_.search-combobox-pill]:bg-[#77D5E3]"
    ]
  end

  defp color_variant("default", "secondary") do
    [
      "[&_.search-combobox-trigger]:bg-[#266EF1] text-white dark:[&_.search-combobox-trigger]:bg-[#6DAAFB] dark:text-black",
      "[&_.search-combobox-dropdown]:bg-[#266EF1] dark:[&_.search-combobox-dropdown]:bg-[#6DAAFB]",
      "hover:[&_.combobox-option]:bg-[#175BCC] dark:hover:[&_.combobox-option]:bg-[#A9C9FF]",
      "[&_.search-combobox-search-input]:border-white dark:[&_.search-combobox-search-input]:border-black",
      "[&_.search-combobox-search-input]:text-white dark:[&_.search-combobox-search-input]:text-black",
      "[&_.search-combobox-search-input]:placeholder-white dark:[&_.search-combobox-search-input]:placeholder-black",
      "[&_.search-combobox-pill]:bg-[#175BCC] dark:[&_.search-combobox-pill]:bg-[#A9C9FF]"
    ]
  end

  defp color_variant("default", "success") do
    [
      "[&_.search-combobox-trigger]:bg-[#0E8345] text-white dark:[&_.search-combobox-trigger]:bg-[#06C167] dark:text-black",
      "[&_.search-combobox-dropdown]:bg-[#0E8345] dark:[&_.search-combobox-dropdown]:bg-[#06C167]",
      "hover:[&_.combobox-option]:bg-[#166C3B] dark:hover:[&_.combobox-option]:bg-[#7FD99A]",
      "[&_.search-combobox-search-input]:border-white dark:[&_.search-combobox-search-input]:border-black",
      "[&_.search-combobox-search-input]:text-white dark:[&_.search-combobox-search-input]:text-black",
      "[&_.search-combobox-search-input]:placeholder-white dark:[&_.search-combobox-search-input]:placeholder-black",
      "[&_.search-combobox-pill]:bg-[#166C3B] dark:[&_.search-combobox-pill]:bg-[#7FD99A]"
    ]
  end

  defp color_variant("default", "warning") do
    [
      "[&_.search-combobox-trigger]:bg-[#CA8D01] text-white dark:[&_.search-combobox-trigger]:bg-[#FDC034] dark:text-black",
      "[&_.search-combobox-dropdown]:bg-[#CA8D01] dark:[&_.search-combobox-dropdown]:bg-[#FDC034]",
      "hover:[&_.combobox-option]:bg-[#976A01] dark:hover:[&_.combobox-option]:bg-[#FDD067]",
      "[&_.search-combobox-search-input]:border-white dark:[&_.search-combobox-search-input]:border-black",
      "[&_.search-combobox-search-input]:text-white dark:[&_.search-combobox-search-input]:text-black",
      "[&_.search-combobox-search-input]:placeholder-white dark:[&_.search-combobox-search-input]:placeholder-black",
      "[&_.search-combobox-pill]:bg-[#976A01] dark:[&_.search-combobox-pill]:bg-[#FDD067]"
    ]
  end

  defp color_variant("default", "danger") do
    [
      "[&_.search-combobox-trigger]:bg-[#DE1135] text-white dark:[&_.search-combobox-trigger]:bg-[#FC7F79] dark:text-black",
      "[&_.search-combobox-dropdown]:bg-[#DE1135] dark:[&_.search-combobox-dropdown]:bg-[#FC7F79]",
      "hover:[&_.combobox-option]:bg-[#BB032A] dark:hover:[&_.combobox-option]:bg-[#FFB2AB]",
      "[&_.search-combobox-search-input]:border-white dark:[&_.search-combobox-search-input]:border-black",
      "[&_.search-combobox-search-input]:text-white dark:[&_.search-combobox-search-input]:text-black",
      "[&_.search-combobox-search-input]:placeholder-white dark:[&_.search-combobox-search-input]:placeholder-black",
      "[&_.search-combobox-pill]:bg-[#BB032A] dark:[&_.search-combobox-pill]:bg-[#FFB2AB]"
    ]
  end

  defp color_variant("default", "info") do
    [
      "[&_.search-combobox-trigger]:bg-[#0B84BA] text-white dark:[&_.search-combobox-trigger]:bg-[#3EB7ED] dark:text-black",
      "[&_.search-combobox-dropdown]:bg-[#0B84BA] dark:[&_.search-combobox-dropdown]:bg-[#3EB7ED]",
      "hover:[&_.combobox-option]:bg-[#08638C] dark:hover:[&_.combobox-option]:bg-[#6EC9F2]",
      "[&_.search-combobox-search-input]:border-white dark:[&_.search-combobox-search-input]:border-black",
      "[&_.search-combobox-search-input]:text-white dark:[&_.search-combobox-search-input]:text-black",
      "[&_.search-combobox-search-input]:placeholder-white dark:[&_.search-combobox-search-input]:placeholder-black",
      "[&_.search-combobox-pill]:bg-[#08638C] dark:[&_.search-combobox-pill]:bg-[#6EC9F2]"
    ]
  end

  defp color_variant("default", "misc") do
    [
      "[&_.search-combobox-trigger]:bg-[#8750C5] text-white dark:[&_.search-combobox-trigger]:bg-[#BA83F9] dark:text-black",
      "[&_.search-combobox-dropdown]:bg-[#8750C5] dark:[&_.search-combobox-dropdown]:bg-[#BA83F9]",
      "hover:[&_.combobox-option]:bg-[#653C94] dark:hover:[&_.combobox-option]:bg-[#CBA2FA]",
      "[&_.search-combobox-search-input]:border-white dark:[&_.search-combobox-search-input]:border-black",
      "[&_.search-combobox-search-input]:text-white dark:[&_.search-combobox-search-input]:text-black",
      "[&_.search-combobox-search-input]:placeholder-white dark:[&_.search-combobox-search-input]:placeholder-black",
      "[&_.search-combobox-pill]:bg-[#653C94] dark:[&_.search-combobox-pill]:bg-[#CBA2FA]"
    ]
  end

  defp color_variant("default", "dawn") do
    [
      "[&_.search-combobox-trigger]:bg-[#A86438] text-white dark:[&_.search-combobox-trigger]:bg-[#DB976B] dark:text-black",
      "[&_.search-combobox-dropdown]:bg-[#A86438] dark:[&_.search-combobox-dropdown]:bg-[#DB976B]",
      "hover:[&_.combobox-option]:bg-[#7E4B2A] dark:hover:[&_.combobox-option]:bg-[#E4B190]",
      "[&_.search-combobox-search-input]:border-white dark:[&_.search-combobox-search-input]:border-black",
      "[&_.search-combobox-search-input]:text-white dark:[&_.search-combobox-search-input]:text-black",
      "[&_.search-combobox-search-input]:placeholder-white dark:[&_.search-combobox-search-input]:placeholder-black",
      "[&_.search-combobox-pill]:bg-[#7E4B2A] dark:[&_.search-combobox-pill]:bg-[#E4B190]"
    ]
  end

  defp color_variant("default", "silver") do
    [
      "[&_.search-combobox-trigger]:bg-[#868686] text-white dark:[&_.search-combobox-trigger]:bg-[#A6A6A6] dark:text-black",
      "[&_.search-combobox-dropdown]:bg-[#868686] dark:[&_.search-combobox-dropdown]:bg-[#A6A6A6]",
      "hover:[&_.combobox-option]:bg-[#727272] dark:hover:[&_.combobox-option]:bg-[#BBBBBB]",
      "[&_.search-combobox-search-input]:border-white dark:[&_.search-combobox-search-input]:border-black",
      "[&_.search-combobox-search-input]:text-white dark:[&_.search-combobox-search-input]:text-black",
      "[&_.search-combobox-search-input]:placeholder-white dark:[&_.search-combobox-search-input]:placeholder-black",
      "[&_.search-combobox-pill]:bg-[#727272] dark:[&_.search-combobox-pill]:bg-[#BBBBBB]"
    ]
  end

  defp color_variant("bordered", "natural") do
    [
      "[&_.search-combobox-trigger]:text-gray-700 [&_.search-combobox-trigger]:border-gray-700 [&_.search-combobox-trigger]:bg-gray-50",
      "dark:[&_.search-combobox-trigger]:text-gray-300 dark:[&_.search-combobox-trigger]:border-gray-300 dark:[&_.search-combobox-trigger]:bg-gray-800",
      "[&_.search-combobox-dropdown]:text-gray-700 [&_.search-combobox-dropdown]:border-gray-700 [&_.search-combobox-dropdown]:bg-gray-50",
      "dark:[&_.search-combobox-dropdown]:text-gray-300 dark:[&_.search-combobox-dropdown]:border-gray-300 dark:[&_.search-combobox-dropdown]:bg-gray-800",

      "[&_.search-combobox-search-input]:border-gray-700 dark:[&_.search-combobox-search-input]:border-gray-300",
      "[&_.search-combobox-search-input]:text-gray-700 dark:[&_.search-combobox-search-input]:text-gray-300",
      "[&_.search-combobox-pill]:text-gray-700 [&_.search-combobox-pill]:bg-gray-100",
      "[&_.search-combobox-dropdown]:shadow",
      "[&_.search-combobox-sort-icon]:text-gray-700 dark:[&_.search-combobox-sort-icon]:text-gray-300"
    ]
  end

  defp color_variant("bordered", "primary") do
    [
      "[&_.search-combobox-trigger]:text-teal-700 [&_.search-combobox-trigger]:border-teal-700 [&_.search-combobox-trigger]:bg-teal-50",
      "dark:[&_.search-combobox-trigger]:text-teal-300 dark:[&_.search-combobox-trigger]:border-teal-300 dark:[&_.search-combobox-trigger]:bg-teal-950",
      "[&_.search-combobox-dropdown]:text-teal-700 [&_.search-combobox-dropdown]:border-teal-700 [&_.search-combobox-dropdown]:bg-teal-50",
      "dark:[&_.search-combobox-dropdown]:text-teal-300 dark:[&_.search-combobox-dropdown]:border-teal-300 dark:[&_.search-combobox-dropdown]:bg-teal-950",

      "[&_.search-combobox-search-input]:border-teal-700 dark:[&_.search-combobox-search-input]:border-teal-300",
      "[&_.search-combobox-search-input]:text-teal-700 dark:[&_.search-combobox-search-input]:text-teal-300",
      "[&_.search-combobox-pill]:text-teal-700 [&_.search-combobox-pill]:bg-teal-100",
      "[&_.search-combobox-dropdown]:shadow",
      "[&_.search-combobox-sort-icon]:text-teal-700 dark:[&_.search-combobox-sort-icon]:text-teal-300"
    ]
  end

  defp color_variant("bordered", "secondary") do
    [
      "[&_.search-combobox-trigger]:text-blue-700 [&_.search-combobox-trigger]:border-blue-700 [&_.search-combobox-trigger]:bg-blue-50",
      "dark:[&_.search-combobox-trigger]:text-blue-300 dark:[&_.search-combobox-trigger]:border-blue-300 dark:[&_.search-combobox-trigger]:bg-blue-950",
      "[&_.search-combobox-dropdown]:text-blue-700 [&_.search-combobox-dropdown]:border-blue-700 [&_.search-combobox-dropdown]:bg-blue-50",
      "dark:[&_.search-combobox-dropdown]:text-blue-300 dark:[&_.search-combobox-dropdown]:border-blue-300 dark:[&_.search-combobox-dropdown]:bg-blue-950",

      "[&_.search-combobox-search-input]:border-blue-700 dark:[&_.search-combobox-search-input]:border-blue-300",
      "[&_.search-combobox-search-input]:text-blue-700 dark:[&_.search-combobox-search-input]:text-blue-300",
      "[&_.search-combobox-pill]:text-blue-700 [&_.search-combobox-pill]:bg-blue-100",
      "[&_.search-combobox-dropdown]:shadow",
      "[&_.search-combobox-sort-icon]:text-blue-700 dark:[&_.search-combobox-sort-icon]:text-blue-300"
    ]
  end

  defp color_variant("bordered", "success") do
    [
      "[&_.search-combobox-trigger]:text-green-700 [&_.search-combobox-trigger]:border-green-700 [&_.search-combobox-trigger]:bg-green-50",
      "dark:[&_.search-combobox-trigger]:text-green-300 dark:[&_.search-combobox-trigger]:border-green-300 dark:[&_.search-combobox-trigger]:bg-green-950",
      "[&_.search-combobox-dropdown]:text-green-700 [&_.search-combobox-dropdown]:border-green-700 [&_.search-combobox-dropdown]:bg-green-50",
      "dark:[&_.search-combobox-dropdown]:text-green-300 dark:[&_.search-combobox-dropdown]:border-green-300 dark:[&_.search-combobox-dropdown]:bg-green-950",

      "[&_.search-combobox-search-input]:border-green-700 dark:[&_.search-combobox-search-input]:border-green-300",
      "[&_.search-combobox-search-input]:text-green-700 dark:[&_.search-combobox-search-input]:text-green-300",
      "[&_.search-combobox-pill]:text-green-700 [&_.search-combobox-pill]:bg-green-100",
      "[&_.search-combobox-dropdown]:shadow",
      "[&_.search-combobox-sort-icon]:text-green-700 dark:[&_.search-combobox-sort-icon]:text-green-300"
    ]
  end

  defp color_variant("bordered", "danger") do
    [
      "[&_.search-combobox-trigger]:text-red-700 [&_.search-combobox-trigger]:border-red-700 [&_.search-combobox-trigger]:bg-red-50",
      "dark:[&_.search-combobox-trigger]:text-red-300 dark:[&_.search-combobox-trigger]:border-red-300 dark:[&_.search-combobox-trigger]:bg-red-950",
      "[&_.search-combobox-dropdown]:text-red-700 [&_.search-combobox-dropdown]:border-red-700 [&_.search-combobox-dropdown]:bg-red-50",
      "dark:[&_.search-combobox-dropdown]:text-red-300 dark:[&_.search-combobox-dropdown]:border-red-300 dark:[&_.search-combobox-dropdown]:bg-red-950",

      "[&_.search-combobox-search-input]:border-red-700 dark:[&_.search-combobox-search-input]:border-red-300",
      "[&_.search-combobox-search-input]:text-red-700 dark:[&_.search-combobox-search-input]:text-red-300",
      "[&_.search-combobox-pill]:text-red-700 [&_.search-combobox-pill]:bg-red-100",
      "[&_.search-combobox-dropdown]:shadow",
      "[&_.search-combobox-sort-icon]:text-red-700 dark:[&_.search-combobox-sort-icon]:text-red-300"
    ]
  end

  defp color_variant("bordered", "info") do
    [
      "[&_.search-combobox-trigger]:text-[#0B84BA] [&_.search-combobox-trigger]:border-[#0B84BA] [&_.search-combobox-trigger]:bg-[#E7F6FD]",
      "dark:[&_.search-combobox-trigger]:text-[#6EC9F2] dark:[&_.search-combobox-trigger]:border-[#6EC9F2] dark:[&_.search-combobox-trigger]:bg-[#03212F]",
      "[&_.search-combobox-dropdown]:text-[#0B84BA] [&_.search-combobox-dropdown]:border-[#0B84BA] [&_.search-combobox-dropdown]:bg-[#E7F6FD]",
      "dark:[&_.search-combobox-dropdown]:text-[#6EC9F2] dark:[&_.search-combobox-dropdown]:border-[#6EC9F2] dark:[&_.search-combobox-dropdown]:bg-[#03212F]",

      "[&_.search-combobox-search-input]:border-[#0B84BA] dark:[&_.search-combobox-search-input]:border-[#6EC9F2]",
      "[&_.search-combobox-search-input]:text-[#0B84BA] dark:[&_.search-combobox-search-input]:text-[#6EC9F2]",
      "[&_.search-combobox-pill]:text-[#0B84BA] [&_.search-combobox-pill]:bg-[#B8E6F7]",
      "[&_.search-combobox-dropdown]:shadow",
      "[&_.search-combobox-sort-icon]:text-[#0B84BA] dark:[&_.search-combobox-sort-icon]:text-[#6EC9F2]"
    ]
  end

  defp color_variant("bordered", "misc") do
    [
      "[&_.search-combobox-trigger]:text-[#653C94] [&_.search-combobox-trigger]:border-[#653C94] [&_.search-combobox-trigger]:bg-[#F6F0FE]",
      "dark:[&_.search-combobox-trigger]:text-[#CBA2FA] dark:[&_.search-combobox-trigger]:border-[#CBA2FA] dark:[&_.search-combobox-trigger]:bg-[#221431]",
      "[&_.search-combobox-dropdown]:text-[#653C94] [&_.search-combobox-dropdown]:border-[#653C94] [&_.search-combobox-dropdown]:bg-[#F6F0FE]",
      "dark:[&_.search-combobox-dropdown]:text-[#CBA2FA] dark:[&_.search-combobox-dropdown]:border-[#CBA2FA] dark:[&_.search-combobox-dropdown]:bg-[#221431]",

      "[&_.search-combobox-search-input]:border-[#653C94] dark:[&_.search-combobox-search-input]:border-[#CBA2FA]",
      "[&_.search-combobox-search-input]:text-[#653C94] dark:[&_.search-combobox-search-input]:text-[#CBA2FA]",
      "[&_.search-combobox-pill]:text-[#653C94] [&_.search-combobox-pill]:bg-[#E8D5FC]",
      "[&_.search-combobox-dropdown]:shadow",
      "[&_.search-combobox-sort-icon]:text-[#653C94] dark:[&_.search-combobox-sort-icon]:text-[#CBA2FA]"
    ]
  end

  defp color_variant("bordered", "dawn") do
    [
      "[&_.search-combobox-trigger]:text-[#7E4B2A] [&_.search-combobox-trigger]:border-[#7E4B2A] [&_.search-combobox-trigger]:bg-[#FBF2ED]",
      "dark:[&_.search-combobox-trigger]:text-[#E4B190] dark:[&_.search-combobox-trigger]:border-[#E4B190] dark:[&_.search-combobox-trigger]:bg-[#2A190E]",
      "[&_.search-combobox-dropdown]:text-[#7E4B2A] [&_.search-combobox-dropdown]:border-[#7E4B2A] [&_.search-combobox-dropdown]:bg-[#FBF2ED]",
      "dark:[&_.search-combobox-dropdown]:text-[#E4B190] dark:[&_.search-combobox-dropdown]:border-[#E4B190] dark:[&_.search-combobox-dropdown]:bg-[#2A190E]",

      "[&_.search-combobox-search-input]:border-[#7E4B2A] dark:[&_.search-combobox-search-input]:border-[#E4B190]",
      "[&_.search-combobox-search-input]:text-[#7E4B2A] dark:[&_.search-combobox-search-input]:text-[#E4B190]",
      "[&_.search-combobox-pill]:text-[#7E4B2A] [&_.search-combobox-pill]:bg-[#F0DCC9]",
      "[&_.search-combobox-dropdown]:shadow",
      "[&_.search-combobox-sort-icon]:text-[#7E4B2A] dark:[&_.search-combobox-sort-icon]:text-[#E4B190]"
    ]
  end

  defp color_variant("bordered", "silver") do
    [
      "[&_.search-combobox-trigger]:text-[#727272] [&_.search-combobox-trigger]:border-[#727272] [&_.search-combobox-trigger]:bg-[#F3F3F3]",
      "dark:[&_.search-combobox-trigger]:text-[#BBBBBB] dark:[&_.search-combobox-trigger]:border-[#BBBBBB] dark:[&_.search-combobox-trigger]:bg-[#4B4B4B]",
      "[&_.search-combobox-dropdown]:text-[#727272] [&_.search-combobox-dropdown]:border-[#727272] [&_.search-combobox-dropdown]:bg-[#F3F3F3]",
      "dark:[&_.search-combobox-dropdown]:text-[#BBBBBB] dark:[&_.search-combobox-dropdown]:border-[#BBBBBB] dark:[&_.search-combobox-dropdown]:bg-[#4B4B4B]",

      "[&_.search-combobox-search-input]:border-[#727272] dark:[&_.search-combobox-search-input]:border-[#BBBBBB]",
      "[&_.search-combobox-search-input]:text-[#727272] dark:[&_.search-combobox-search-input]:text-[#BBBBBB]",
      "[&_.search-combobox-pill]:text-[#727272] [&_.search-combobox-pill]:bg-[#E8E8E8]",
      "[&_.search-combobox-dropdown]:shadow",
      "[&_.search-combobox-sort-icon]:text-[#727272] dark:[&_.search-combobox-sort-icon]:text-[#BBBBBB]"
    ]
  end

  defp color_variant(params, _) when is_binary(params), do: params

  defp translate_error({msg, opts}) do
    # When using gettext, we typically pass the strings we want
    # to translate as a static argument:
    #
    #     # Translate the number of files with plural rules
    #     dngettext("errors", "1 file", "%{count} files", count)
    #
    # However the error messages in our forms and APIs are generated
    # dynamically, so we need to translate them by calling Gettext
    # with our gettext backend as first argument. Translations are
    # available in the errors.po file (as we use the "errors" domain).
    if count = opts[:count] do
      Gettext.dngettext(GeoWeb.Gettext, "errors", msg, msg, count, opts)
    else
      Gettext.dgettext(GeoWeb.Gettext, "errors", msg, opts)
    end
  end

  # Helper function to encode values for form compatibility
  defp encode_value(value) when is_map(value), do: Jason.encode!(value)
  defp encode_value(value), do: value

  # Helper function to create option tuples
  defp create_option_tuple(option) do
    value = option[:value]
    encoded = encode_value(value)
    {encoded, encoded}
  end

  # Helper function to encode the current value for comparison
  defp encode_current_value(value) when is_list(value) do
    Enum.map(value, &encode_value/1)
  end
  defp encode_current_value(value), do: encode_value(value)

  # Helper function to group by while preserving the order of first appearance
  defp group_by_preserving_order(enumerable, key_fun) do
    enumerable
    |> Enum.reduce({[], %{}}, fn item, {acc, seen} ->
      key = key_fun.(item)
      if Map.has_key?(seen, key) do
        # Key already exists, add to existing group
        updated_acc = Enum.map(acc, fn {k, items} ->
          if k == key do
            {k, items ++ [item]}
          else
            {k, items}
          end
        end)
        {updated_acc, seen}
      else
        # New key, add new group
        {acc ++ [{key, [item]}], Map.put(seen, key, true)}
      end
    end)
    |> elem(0)
  end
end
