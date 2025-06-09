defmodule GeoWeb.CountrySelector do
  use GeoWeb, :live_component

  @impl true
  def update(assigns, socket) do
    if socket.assigns[:original_countries] do
      {:ok, assign(socket, assigns)}
    else
      countries = Geo.Geography.list_countries!()

      # Convert to maps for easier handling
      country_maps = Enum.map(countries, fn country ->
        %{
          iso_code: to_string(country.iso_code),
          name: to_string(country.name),
          flag: to_string(country.flag)
        }
      end)

      countries_by_iso = country_maps
      countries_by_name = country_maps

      socket =
        socket
        |> assign(:original_countries, %{iso_code_group: countries_by_iso, name_group: countries_by_name})
        |> assign(:current_countries, %{iso_code_group: countries_by_iso, name_group: countries_by_name})
        |> assign(:query, "")
        |> assign(:selected_country, nil)
        |> assign(:loading_countries, false)
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
    # Note: Order matters here - "By Name" should come first in the dropdown
    group_states = %{
      "By Name" => %{
        collapsed: assigns.name_group_collapsed,
        sort_icon: if(length(assigns.name_sort_orders) > 0, do: get_sort_icon(assigns.name_sort_order), else: nil)
      },
      "By Iso code" => %{
        collapsed: assigns.iso_code_group_collapsed,
        sort_icon: if(length(assigns.iso_code_sort_orders) > 0, do: get_sort_icon(assigns.iso_code_sort_order), else: nil)
      }
    }

    assigns = assign(assigns, :group_states, group_states)

    ~H"""
    <div id={@id} class="country-selector">
      <.search_combobox
        name="country"
        id="country-combobox"
        value={@selected_country}
        placeholder="Select a country..."
        search_placeholder="Type to search countries"
        search_event="search_countries"
        phx-change="country_selected"
        variant="bordered"
        color="primary"
        enable_group_sorting={true}
        toggle_group_sort_event="toggle_iso_code_sort"
        toggle_group_collapse_event="toggle_iso_code_group"
      >
        <:selection :if={@selected_country}>
          <div class="flex items-center">
            <span class="text-lg mr-2">{@selected_country.flag}</span>
            <span class="text-base font-semibold text-gray-800">{@selected_country.name}</span>
            <span class="text-sm font-mono text-gray-600 bg-gray-100 px-1 py-0.5 rounded">
              {@selected_country.iso_code}
            </span>
          </div>
        </:selection>
        <:option
          :for={country <- @current_countries.name_group}
          group="By Name"
          value={country}
        >
          <div class="flex items-center">
            <span class="text-lg mr-2">{country.flag}</span>
            <span class="text-base font-semibold text-gray-800">{country.name}</span>
            <span class="text-sm font-mono text-gray-600 bg-gray-100 px-1 py-0.5 rounded">
              {country.iso_code}
            </span>
          </div>
        </:option>
        <:option
          :for={country <- @current_countries.iso_code_group}
          group="By Iso code"
          value={country}
        >
          <div class="flex items-center">
            <span class="text-lg mr-2">{country.flag}</span>
            <span class="text-base font-semibold text-gray-800">{country.name}</span>
            <span class="text-sm font-mono text-gray-600 bg-gray-100 px-1 py-0.5 rounded">
              {country.iso_code}
            </span>
          </div>
        </:option>

      </.search_combobox>

      <%= if @query != "" && @current_countries.iso_code_group == [] && @current_countries.name_group == [] && !@loading_countries do %>
        <div class="mt-2 p-3 text-sm text-gray-500 bg-gray-50 rounded-md">
          No countries found matching "{@query}". Try a different search term.
        </div>
      <% end %>

      <%= if @loading_countries do %>
        <div class="mt-2 flex items-center justify-between text-sm text-gray-500 bg-gray-50 rounded-md p-4">
          <div class="flex items-center">
            <.spinner size="small" color="primary" class="mr-3" />
            <span>Searching countries...</span>
          </div>
          <.button
            variant="transparent"
            size="small"
            phx-click="cancel_country_search"
            class="text-gray-500 hover:text-gray-700"
          >
            Cancel
          </.button>
        </div>
      <% end %>
    </div>
    """
  end

  @impl true
  def handle_event("search_countries", %{"value" => query}, socket) do
    down = String.downcase(query)
    original = socket.assigns.original_countries

    filtered_code = original.iso_code_group |> Enum.filter(&matches(&1, down))
    filtered_name = original.name_group |> Enum.filter(&matches(&1, down))

    filtered_code = sort_group(filtered_code, :iso_code, socket.assigns.iso_code_sort_order)
    filtered_name = sort_group(filtered_name, :name, socket.assigns.name_sort_order)

    socket =
      socket
      |> assign(:query, query)
      |> assign(:current_countries, %{iso_code_group: filtered_code, name_group: filtered_name})

    {:noreply, socket}
  end

  def handle_event("toggle_iso_code_sort", %{"group" => group_name}, socket) do
    case group_name do
      "By Iso code" ->
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

  def handle_event("toggle_iso_code_group", %{"group" => group_name}, socket) do
    case group_name do
      "By Iso code" ->
        {:noreply,
         assign(socket, :iso_code_group_collapsed, !socket.assigns.iso_code_group_collapsed)}

      "By Name" ->
        {:noreply, assign(socket, :name_group_collapsed, !socket.assigns.name_group_collapsed)}

      _ ->
        {:noreply, socket}
    end
  end

  def handle_event("cancel_country_search", _, socket) do
    {:noreply,
     socket
     |> assign(:query, "")
     |> assign(:current_countries, socket.assigns.original_countries)}
  end

  def handle_event("country_selected", %{"value" => encoded_country}, socket) do
    selected = case Jason.decode(encoded_country) do
      {:ok, country_map} ->
        # Convert back to atom keys for consistency
        %{
          iso_code: country_map["iso_code"],
          name: country_map["name"],
          flag: country_map["flag"]
        }
      {:error, _} ->
        # Fallback: try to find by iso_code if it's a simple string
        (socket.assigns.original_countries.iso_code_group ++
           socket.assigns.original_countries.name_group)
        |> Enum.find(&(&1.iso_code == encoded_country))
    end

    socket = assign(socket, :selected_country, selected)
    send(self(), {:country_selected, selected})
    {:noreply, socket}
  end

  # Private helpers
  defp matches(country, down) do
    String.contains?(String.downcase(country.name), down) ||
      String.contains?(String.downcase(country.iso_code), down)
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
end
