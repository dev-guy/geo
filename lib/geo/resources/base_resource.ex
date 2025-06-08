defmodule Geo.Resources.BaseResource do
  @moduledoc """
  Base resource module that provides common attributes and functionality.
  Other resources can use this module to inherit standard attributes.
  """

  defmacro __using__(opts) do
    quote do
      use Ash.Resource, unquote(opts)

      attributes do
        uuid_v7_primary_key :id

        # Core attributes that most resources need
        attribute :name, :ci_string do
          public? true
          allow_nil? true
        end

        attribute :slug, :ci_string do
          public? true
          allow_nil? true
        end

        create_timestamp :created_at
        update_timestamp :updated_at
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

      # Common preparations for queries
      preparations do
        prepare build(sort: [created_at: :desc])
      end
    end
  end
end
