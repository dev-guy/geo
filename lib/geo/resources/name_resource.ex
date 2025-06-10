defmodule Geo.Resources.NameResource do
  @moduledoc """
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
