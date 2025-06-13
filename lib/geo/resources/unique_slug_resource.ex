defmodule Geo.Resources.UniqueSlugResource do
  @moduledoc """
  A slug is based on the name attribute.
  """

  defmacro __using__(opts) do
    quote do
      use Geo.Resources.SlugResource, unquote(opts)

      # Common identities
      identities do
        identity :unique_slug, [:slug]
      end
    end
  end
end
