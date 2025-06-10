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
      import GeoWeb.Components.SearchCombobox, only: [search_combobox: 1]
      import GeoWeb.Components.Button, only: [button: 1, button_group: 1, input_button: 1, button_link: 1]
      import GeoWeb.Components.Spinner, only: [spinner: 1]
    end
  end
end
