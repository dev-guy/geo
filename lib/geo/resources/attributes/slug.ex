defmodule Geo.Resources.Attributes.Slug do
  @moduledoc """
  A slug is based on the name attribute.
  """

  defmacro __using__(opts) do
    allow_nil? = Keyword.get(opts, :allow_nil?, true)
    unique? = Keyword.get(opts, :unique?, false)

    base_quote = quote do
      attributes do
        attribute :slug, :ci_string do
          allow_nil? unquote(allow_nil?)
          writable? true
          generated? true
        end
      end

      validations do
        # This is \w but lowercase only
        validate match(:slug, {~S/^[a-z0-9-]+$/, "i"}) do
          message "must contain only lowercase letters, numbers, and hyphens"
          where present(:slug)
        end
      end
    end

    if unique? do
      quote do
        unquote(base_quote)

        identities do
          identity :unique_slug, [:slug]
        end
      end
    else
      base_quote
    end
  end
end
