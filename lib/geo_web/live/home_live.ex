# lib/my_app_web/live/home_live.ex
defmodule GeoWeb.HomeLive do
  use GeoWeb, :live_view

  @impl true
  def mount(_params, _session, socket) do
    {:ok, assign(socket, :now, DateTime.utc_now())}
  end

  @impl true
  def render(assigns) do
    ~H"""
    <div class="p-6">
      <h1 class="text-3xl font-bold mb-4">Welcome to MyApp!</h1>
      <p>Current UTC time: <%= @now %></p>
    </div>
    """
  end
end
