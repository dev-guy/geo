defmodule Geo.Country.Country do
  use Geo.Resources.BaseResource,
    otp_app: :healthcompass_directory,
    domain: Geo.Geography,
    data_layer: AshPostgres.DataLayer

  postgres do
    repo Geo.Repo
    table "countries"
  end

  attributes do
    attribute :iso_code, :ci_string do
      allow_nil? false
      public? true

      constraints match: ~S/^[A-Z]+$/,
                  min_length: 2,
                  max_length: 3
    end

    attribute :flag, :ci_string do
      allow_nil? false
      public? true
      description "Unicode flag emoji for the country"
    end
  end

  identities do
    # Inherit unique_slug from base resource
    identity :unique_iso_code, [:iso_code]
  end

  validations do
    validate present(:name)
    validate present(:iso_code)
    validate present(:flag)
  end

  preparations do
    prepare build(sort: [name: :asc])
  end

  actions do
    defaults [:destroy]

    read :read do
      primary? true
    end

    create :create do
      accept [:name, :iso_code, :flag, :slug]
      change Geo.Resources.Changes.SlugifyName
    end

    # Upsert action that uses the unique_iso_code identity
    create :upsert do
      accept [:name, :iso_code, :flag, :slug]
      primary? true
      upsert? true
      upsert_identity :unique_iso_code
      change Geo.Resources.Changes.SlugifyName
    end

    update :update do
      accept [:name, :iso_code, :flag, :slug]
      require_atomic? false
      change Geo.Resources.Changes.SlugifyName
    end

    action :search, :string do
      argument :query, :string, allow_nil?: true, default: nil

      run fn %{arguments: %{query: query}}, _context ->
        {:ok, Geo.Geography.Country.Cache.search!(query)}
      end
    end
  end
end
