defmodule Geo.Resources.IdResource do
  @moduledoc """
  Base resource module that provides common attributes and functionality.
  Other resources can use this module to inherit standard attributes.
  """

  defmacro __using__(_opts) do
    quote do
      attributes do
        uuid_v7_primary_key :id
      end
    end
  end
end
