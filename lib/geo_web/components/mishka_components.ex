defmodule GeoWeb.Components.MishkaComponents do
  defmacro __using__(_) do
    quote do
      import GeoWeb.Components.Alert,
        only: [
          flash: 1,
          flash_group: 1,
          alert: 1,
          show_alert: 1,
          show_alert: 2,
          hide_alert: 1,
          hide_alert: 2
        ]

      import GeoWeb.Components.Icon, only: [icon: 1]
      import GeoWeb.Components.ScrollArea, only: [scroll_area: 1]
    end
  end
end
