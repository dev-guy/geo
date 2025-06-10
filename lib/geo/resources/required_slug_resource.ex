defmodule Geo.Resources.RequiredSlugResource do
  @moduledoc """
  """

  defmacro __using__(_opts) do
    quote do
      attributes do
        attribute :slug, :ci_string do
          allow_nil? false
        end
      end

      # Common validations
      validations do
        # This is \w but lowercase only
        validate match(:slug, {~S/^[a-z0-9-]+$/, "i"}) do
          message "must contain only lowercase letters, numbers, and hyphens"
          where present(:slug)
        end
      end

      # Common identities
      identities do
        identity :unique_slug, [:slug]
      end
    end
  end
end
