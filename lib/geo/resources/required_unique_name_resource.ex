defmodule Geo.Resources.RequiredUniqueNameResource do
  @moduledoc """
  Base resource module that provides common attributes and functionality.
  Other resources can use this module to inherit standard attributes.
  """

  defmacro __using__(_opts) do
    quote do
      attributes do
        # Core attributes that most resources need
        attribute :name, :ci_string do
          public? true
          allow_nil? false
        end
      end

      # Common identities
      identities do
        identity :unique_name, [:name]
      end
    end
  end
end
