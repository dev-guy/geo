defmodule Geo.Resources.Attributes.Name do
  @moduledoc """
  """

  defmacro __using__(opts) do
    allow_nil? = Keyword.get(opts, :allow_nil?, true)
    unique? = Keyword.get(opts, :unique?, false)

    extra_identities =
      if unique? do
        quote do
          identities do
            identity :unique_name, [:name]
          end
        end
      end

    quote do
      attributes do
        attribute :name, :ci_string do
          allow_nil? unquote(allow_nil?)
        end
      end

      # only inject this block if `unique?: true`
      unquote(extra_identities)
    end
  end
end
