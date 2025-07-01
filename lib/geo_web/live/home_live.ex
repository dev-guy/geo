defmodule GeoWeb.HomeLive do
  use GeoWeb, :live_view

  @impl true
  def mount(_params, _session, socket) do
    # Get default country (Australia)
    default_country = Geo.Geography.get_country_by_iso_code!(%{iso_code: "AU"})
    dbg("Mounting HomeLive")

    {:ok, assign(socket,
      page_title: "Home",
      selected_country: default_country,
      theme: "system"
    )}
  end

  @impl true
  def handle_info({:country_selected, country}, socket) do
    new_socket = assign(socket, selected_country: country)
    {:noreply, new_socket}
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
    <div class="max-w-4xl mx-auto p-4 sm:p-6">

      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 sm:p-6 mb-6 sm:mb-8">
        <.live_component
          module={GeoWeb.CountrySelector}
          id="country-selector"
          selected_country={@selected_country}
        />
      </div>

      <%= if @selected_country do %>
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 sm:p-6">
          <h2 class="text-xl sm:text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-4">Selected Country</h2>
          <div class="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
            <span class="text-4xl sm:text-5xl md:text-6xl"><%= @selected_country.flag %></span>
            <div class="flex-1 min-w-0">
              <h3 class="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100 break-words"><%= @selected_country.name %></h3>
              <p class="text-sm sm:text-base text-gray-600 dark:text-gray-400 break-words">
                ISO Code: <span class="font-mono bg-gray-100 dark:bg-gray-700 dark:text-gray-300 px-2 py-1 rounded text-xs sm:text-sm"><%= @selected_country.iso_code %></span>
              </p>
            </div>
          </div>
        </div>
      <% end %>
    </div>
    """
  end
end
