defmodule GeoWeb.HomeLive do
  use GeoWeb, :live_view

  @impl true
  def mount(_params, _session, socket) do
  end

  @impl true
  def render(assigns) do
    ~H"""
    <div class="p-6">
      <h1 class="text-3xl font-bold mb-4">Welcome to Geo!</h1>
      <.live_component
        module={GeoWeb.CountrySelector}
        id="country"
      />
    </div>
    """
  end
end
