defmodule Geo.Resources.NameResource do
  @moduledoc """
  Base resource module that provides common attributes and functionality.
  Other resources can use this module to inherit standard attributes.
  """

  defmacro __using__(_opts) do
    quote do
      attributes do
        # Core attributes that most resources need
        attribute :name, :ci_string do
          allow_nil? true
        end
      end
    end
  end
end
