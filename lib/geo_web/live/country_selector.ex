defmodule GeoWeb.CountrySelector do
  use GeoWeb, :live_component

    @impl true
  def update(assigns, socket) do
    # Convert selected_country from Ash resource to internal format if needed
    assigns = convert_selected_country_to_internal_format(assigns)

    # Set default group_order if not provided - but ensure it's always :name if not explicitly set
    assigns = if Map.has_key?(assigns, :group_order) do
      assigns
    else
      Map.put(assigns, :group_order, :name)
    end

    if socket.assigns[:original_countries] do
      {:ok, assign(socket, assigns)}
    else
      # Get initial countries - returns a single list, we duplicate for both groups
      all_countries = Geo.Geography.selector_search_countries!()
      countries_by_iso = all_countries
      countries_by_name = all_countries

      socket =
        socket
        |> assign(:original_countries, %{iso_code_group: countries_by_iso, name_group: countries_by_name})
        |> assign(:current_countries, %{iso_code_group: countries_by_iso, name_group: countries_by_name})
        |> assign(:selected_country, nil)
        |> assign(:iso_code_group_collapsed, false)
        |> assign(:name_group_collapsed, false)
        |> assign(assigns)

      # Determine sort orders for each group
      {iso_code_sort_orders, iso_code_sort_order} = determine_sort_orders(countries_by_iso, :iso_code)
      {name_sort_orders, name_sort_order} = determine_sort_orders(countries_by_name, :name)

      socket =
        socket
        |> assign(:iso_code_sort_order, iso_code_sort_order)
        |> assign(:name_sort_order, name_sort_order)
        |> assign(:iso_code_sort_orders, iso_code_sort_orders)
        |> assign(:name_sort_orders, name_sort_orders)

      {:ok, socket}
    end
  end

    @impl true
  def render(assigns) do
        # Build group_states with sort icons based on availability
    # Order is controlled by group_order assign
        group_states = case assigns.group_order do
      :iso_code ->
        %{
          "By Country Code" => %{
            collapsed: assigns.iso_code_group_collapsed,
            sort_icon: if(length(assigns.iso_code_sort_orders) > 0, do: get_sort_icon(assigns.iso_code_sort_order), else: nil)
          },
          "By Name" => %{
            collapsed: assigns.name_group_collapsed,
            sort_icon: if(length(assigns.name_sort_orders) > 0, do: get_sort_icon(assigns.name_sort_order), else: nil)
          }
        }
      _ -> # defaults to :name
        %{
          "By Name" => %{
            collapsed: assigns.name_group_collapsed,
            sort_icon: if(length(assigns.name_sort_orders) > 0, do: get_sort_icon(assigns.name_sort_order), else: nil)
          },
          "By Country Code" => %{
            collapsed: assigns.iso_code_group_collapsed,
            sort_icon: if(length(assigns.iso_code_sort_orders) > 0, do: get_sort_icon(assigns.iso_code_sort_order), else: nil)
          }
        }
    end

        # Get ordered country groups for rendering
    {first_countries, first_group_name, second_countries, second_group_name} =
      get_ordered_country_groups_for_render(assigns.current_countries, assigns.group_order)

    assigns =
      assigns
      |> assign(:group_states, group_states)
      |> assign(:first_countries, first_countries)
      |> assign(:first_group_name, first_group_name)
      |> assign(:second_countries, second_countries)
      |> assign(:second_group_name, second_group_name)

    ~H"""
    <div id={@id} class="country-selector" phx-hook="CountrySelector">
      <form phx-change="country_selected" phx-target={@myself}>
        <.search_combobox
          name="country"
          id="country-combobox"
          value={get_selected_country_iso_code(@selected_country)}
          placeholder="Select a country..."
          search_placeholder="Type to search countries"
          search_event="search_combobox_updated"
          phx-target={@myself}
          variant="bordered"
          color="primary"
          enable_group_sorting={true}
          sort_groups={false}
          toggle_group_sort_event="toggle_group_sort"
          toggle_group_collapse_event="toggle_group_collapse"
          group_event_target={@myself}
          group_states={@group_states}
        >
        <:selection :if={@selected_country}>
          <div class="flex items-center">
            <span class="text-lg mr-2">{to_string(@selected_country.flag)}</span>
            <span class="text-base font-semibold text-gray-800">{to_string(@selected_country.name)}</span>
            <span class="text-sm font-mono text-gray-600 bg-gray-100 px-1 py-0.5 rounded ml-2">
              {to_string(@selected_country.iso_code)}
            </span>
          </div>
        </:selection>

        <:option
          :for={country <- @first_countries}
          group={@first_group_name}
          value={to_string(country.iso_code)}
        >
          <.country_option_content country={country} group_order={@group_order} group_name={@first_group_name} />
        </:option>

        <:option
          :for={country <- @second_countries}
          group={@second_group_name}
          value={to_string(country.iso_code)}
        >
          <.country_option_content country={country} group_order={@group_order} group_name={@second_group_name} />
        </:option>
        </.search_combobox>
      </form>
    </div>
    """
  end

  @impl true
  def handle_event("search_combobox_updated", %{"value" => query}, socket) do
    # Check if trimmed query is empty, but keep original query for search
    trimmed_query = String.trim(query)

    # If trimmed query is empty, use original countries and restore original sort orders
    if trimmed_query == "" do
      # Restore original sort orders from the full country list
      all_countries = Geo.Geography.selector_search_countries!()
      {iso_code_sort_orders, iso_code_sort_order} = determine_sort_orders(all_countries, :iso_code)
      {name_sort_orders, name_sort_order} = determine_sort_orders(all_countries, :name)

      socket =
        socket
        |> assign(:current_countries, socket.assigns.original_countries)
        |> assign(:iso_code_sort_orders, iso_code_sort_orders)
        |> assign(:name_sort_orders, name_sort_orders)
        |> assign(:iso_code_sort_order, iso_code_sort_order)
        |> assign(:name_sort_order, name_sort_order)

      {:noreply, socket}
    else
      try do
        search_results = Geo.Geography.selector_search_countries!(query)

        # Recalculate sort orders based on the search results
        {iso_code_sort_orders, iso_code_sort_order} = determine_sort_orders(search_results, :iso_code)
        {name_sort_orders, name_sort_order} = determine_sort_orders(search_results, :name)

        # Apply the determined sort orders to the results
        filtered_iso = sort_group(search_results, :iso_code, iso_code_sort_order)
        filtered_name = sort_group(search_results, :name, name_sort_order)

        socket =
          socket
          |> assign(:current_countries, %{iso_code_group: filtered_iso, name_group: filtered_name})
          |> assign(:iso_code_sort_orders, iso_code_sort_orders)
          |> assign(:name_sort_orders, name_sort_orders)
          |> assign(:iso_code_sort_order, iso_code_sort_order)
          |> assign(:name_sort_order, name_sort_order)

        {:noreply, socket}
      rescue
        _error ->
          socket = assign(socket, :current_countries, %{iso_code_group: [], name_group: []})
          {:noreply, socket}
      end
    end
  end

  def handle_event("toggle_group_sort", %{"group" => group_name}, socket) do
    case group_name do
      "By Country Code" ->
        orders = socket.assigns.iso_code_sort_orders
        current = socket.assigns.iso_code_sort_order
        new = next_in_list(orders, current)
        updated = sort_group(socket.assigns.current_countries.iso_code_group, :iso_code, new)

        socket =
          socket
          |> assign(:iso_code_sort_order, new)
          |> assign(
            :current_countries,
            Map.put(socket.assigns.current_countries, :iso_code_group, updated)
          )

        {:noreply, socket}

      "By Name" ->
        orders = socket.assigns.name_sort_orders
        current = socket.assigns.name_sort_order
        new = next_in_list(orders, current)
        updated = sort_group(socket.assigns.current_countries.name_group, :name, new)

        socket =
          socket
          |> assign(:name_sort_order, new)
          |> assign(
            :current_countries,
            Map.put(socket.assigns.current_countries, :name_group, updated)
          )

        {:noreply, socket}

      _ ->
        {:noreply, socket}
    end
  end

  def handle_event("toggle_group_collapse", %{"group" => group_name}, socket) do
    case group_name do
      "By Country Code" ->
        {:noreply,
         assign(socket, :iso_code_group_collapsed, !socket.assigns.iso_code_group_collapsed)}

      "By Name" ->
        {:noreply, assign(socket, :name_group_collapsed, !socket.assigns.name_group_collapsed)}

      _ ->
        {:noreply, socket}
    end
  end

  def handle_event("country_selected", %{"country" => iso_code}, socket) do
    # Find the selected country by iso_code from current countries
    # Use the iso_code group since both groups contain the same countries
    selected_country = Enum.find(socket.assigns.current_countries.iso_code_group, fn country ->
      to_string(country.iso_code) == iso_code
    end)

    # Update internal state and send the original Ash resource to parent
    socket = assign(socket, :selected_country, selected_country)
    send(self(), {:country_selected, selected_country})

    {:noreply, socket}
  end

  # Private helpers
  defp convert_selected_country_to_internal_format(assigns) do
    # No conversion needed - we work with Ash resources directly
    assigns
  end

  defp get_selected_country_iso_code(nil), do: nil
  defp get_selected_country_iso_code(country) do
    to_string(country.iso_code)
  end



  # Helper component for rendering country option content
  defp country_option_content(assigns) do
    ~H"""
    <div class="flex items-center">
      <span class="text-lg mr-2">{to_string(@country.flag)}</span>
      <%= if should_show_iso_first?(@group_order, @group_name) do %>
        <span class="text-sm font-mono text-gray-600 bg-gray-100 px-1 py-0.5 rounded mr-2">
          {to_string(@country.iso_code)}
        </span>
        <span class="text-base font-semibold text-gray-800">{to_string(@country.name)}</span>
      <% else %>
        <span class="text-base font-semibold text-gray-800">{to_string(@country.name)}</span>
        <span class="text-sm font-mono text-gray-600 bg-gray-100 px-1 py-0.5 rounded ml-2">
          {to_string(@country.iso_code)}
        </span>
      <% end %>
    </div>
    """
  end

  # Helper function to determine if ISO code should be shown first
  defp should_show_iso_first?(group_order, group_name) do
    case {group_order, group_name} do
      {:iso_code, "By Country Code"} -> true
      {:name, "By Country Code"} -> true
      _ -> false
    end
  end

  defp sort_group(list, field, :asc), do: Enum.sort_by(list, &Map.get(&1, field))

  defp sort_group(list, field, :desc),
    do: list |> Enum.sort_by(&Map.get(&1, field)) |> Enum.reverse()

  defp sort_group(list, _field, :original), do: list

  defp next_in_list(list, current) do
    idx = Enum.find_index(list, &(&1 == current)) || 0
    Enum.at(list, rem(idx + 1, length(list)))
  end

  # Get the appropriate icon for the current sort order
  defp get_sort_icon(:asc), do: "hero-chevron-up"
  defp get_sort_icon(:desc), do: "hero-chevron-down"
  defp get_sort_icon(:original), do: "hero-bars-3"

  # Determine available sort orders based on whether the list is already sorted
  defp determine_sort_orders(list, field) do
    # If list has fewer than 2 items, no sorting needed
    if length(list) < 2 do
      {[], nil}
    else
      asc_sorted = Enum.sort_by(list, &Map.get(&1, field))
      desc_sorted = asc_sorted |> Enum.reverse()

      cond do
        # If list matches ascending order, original is ascending
        list == asc_sorted ->
          {[:asc, :desc], :asc}

        # If list matches descending order, original is descending
        list == desc_sorted ->
          {[:desc, :asc], :desc}

        # If list doesn't match either, include original option
        true ->
          {[:original, :asc, :desc], :original}
      end
    end
  end

      defp get_ordered_country_groups_for_render(current_countries, group_order) do
    case group_order do
      :iso_code ->
        # When sorting by ISO code first, we want "By Country Code" to appear first
        {current_countries.iso_code_group, "By Country Code", current_countries.name_group, "By Name"}
      :name -> # explicitly handle :name
        # When sorting by name first (default), we want "By Name" to appear first
        {current_countries.name_group, "By Name", current_countries.iso_code_group, "By Country Code"}
      _ -> # fallback defaults to :name
        # Default to name ordering
        {current_countries.name_group, "By Name", current_countries.iso_code_group, "By Country Code"}
    end
  end
end
