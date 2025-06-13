defmodule Geo.Resources.NameResource do
  @moduledoc """
  """

  defmacro __using__(opts) do
    allow_nil = Keyword.get(opts, :allow_nil?, true)

    quote do
      attributes do
        # Core attributes that most resources need
        attribute :name, :ci_string do
          allow_nil? unquote(allow_nil)
        end
      end
    end
  end
end
