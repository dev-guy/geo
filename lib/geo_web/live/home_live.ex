defmodule GeoWeb.HomeLive do
  use GeoWeb, :live_view

  @impl true
  def mount(_params, _session, socket) do
    # Get default country (Australia)
    default_country = Geo.Geography.get_country_by_iso_code!(%{iso_code: "AU"})

    {:ok, assign(socket,
      page_title: "Home",
      selected_country: default_country
    )}
  end

  @impl true
  def handle_info({:country_selected, country}, socket) do
    new_socket = assign(socket, selected_country: country)
    {:noreply, new_socket}
  end

  @impl true
  def handle_event("country_selected", %{"country" => iso_code}, socket) do
    # Find the country by iso_code
    country =
      try do
        Geo.Geography.get_country_by_iso_code!(iso_code)
      rescue
        _ ->
          # Fallback to regular query if cache is not available (e.g., in tests)
          Geo.Geography.list_countries!(filter: [iso_code: iso_code])
          |> List.first()
      end

    {:noreply, assign(socket, :selected_country, country)}
  end

  @impl true
  def handle_event("cycle_theme", _params, socket) do
    new_theme =
      case socket.assigns.theme do
        "system" -> "light"
        "light" -> "dark"
        "dark" -> "system"
      end

    {:noreply,
     socket
     |> assign(:theme, new_theme)
     |> push_event("cycle_theme", %{theme: new_theme})}
  end

  @impl true
  def render(assigns) do
    ~H"""
    <div class="max-w-4xl mx-auto p-6">
      <div class="text-center mb-8">
        <h1 class="text-4xl font-bold text-gray-900 mb-4">
          Welcome to Geo
        </h1>
      </div>

      <div class="bg-white rounded-lg shadow-lg p-6 mb-8">
        <h2 class="text-2xl font-semibold text-gray-800 mb-4">Country Selector</h2>
        <.live_component
          module={GeoWeb.CountrySelector}
          id="country-selector"
          selected_country={@selected_country}
        />
      </div>

      <%= if @selected_country do %>
        <div class="bg-white rounded-lg shadow-lg p-6">
          <h2 class="text-2xl font-semibold text-gray-800 mb-4">Selected Country</h2>
          <div class="flex items-center space-x-4">
            <span class="text-6xl"><%= @selected_country.flag %></span>
            <div>
              <h3 class="text-xl font-bold text-gray-900"><%= @selected_country.name %></h3>
              <p class="text-gray-600">ISO Code: <span class="font-mono bg-gray-100 px-2 py-1 rounded"><%= @selected_country.iso_code %></span></p>
            </div>
          </div>
        </div>
      <% end %>
    </div>
    """
  end
end
