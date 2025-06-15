defmodule Geo.Resources.Attributes.Name do
  @moduledoc """
  """

  defmacro __using__(opts) do
    allow_nil? = Keyword.get(opts, :allow_nil?, true)
    unique? = Keyword.get(opts, :unique?, false)

    base_quote = quote do
      attributes do
        # Core attributes that most resources need
        attribute :name, :ci_string do
          allow_nil? unquote(allow_nil?)
        end
      end
    end

    if unique? do
      quote do
        unquote(base_quote)

        identities do
          identity :unique_name, [:name]
        end
      end
    else
      base_quote
    end
  end
end
