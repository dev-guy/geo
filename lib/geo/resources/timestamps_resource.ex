defmodule Geo.Resources.TimestampsResource do
  @moduledoc """
  Base resource module that provides common attributes and functionality.
  Other resources can use this module to inherit standard attributes.
  """

  defmacro __using__(_opts) do
    quote do
      attributes do
        create_timestamp :created_at
        update_timestamp :updated_at
      end
    end
  end
end
