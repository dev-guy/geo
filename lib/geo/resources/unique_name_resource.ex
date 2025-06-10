defmodule Geo.Resources.UniqueNameResource do
  @moduledoc """
  """

  defmacro __using__(opts) do
    quote do
      use Geo.Resources.NameResource, unquote(opts)

      # Common identities
      identities do
        identity :unique_name, [:name]
      end
    end
  end
end
