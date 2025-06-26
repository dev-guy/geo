defmodule GeoWeb.Components.ThemeToggle do
  use Phoenix.Component
  import GeoWeb.Components.Icon

  attr :theme, :string, default: "system"

  def theme_toggle(assigns) do
    ~H"""
    <div class="relative">
      <button
        type="button"
        phx-click="cycle_theme"
        class="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
        title={"Current theme: #{@theme}"}
      >
        <%= case @theme do %>
          <% "light" -> %>
            <.icon name="hero-sun" class="h-4 w-4" />
            <span>Light</span>
          <% "dark" -> %>
            <.icon name="hero-moon" class="h-4 w-4" />
            <span>Dark</span>
          <% _ -> %>
            <.icon name="hero-computer-desktop" class="h-4 w-4" />
            <span>System</span>
        <% end %>
      </button>
    </div>
    """
  end
end
