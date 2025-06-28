defmodule Geo.Geography.Country do
  use Ash.Resource,
    otp_app: :geo,
    domain: Geo.Geography,
    data_layer: AshPostgres.DataLayer

  # Attributes for the Country resource
  use Geo.Resources.Attributes.Id
  use Geo.Resources.Attributes.Name, allow_nil?: false, unique?: true
  use Geo.Resources.Attributes.Slug, allow_nil?: false, unique?: true
  use Geo.Resources.Attributes.Timestamps

  postgres do
    repo Geo.Repo
    table "countries"
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
      accept [:name, :slug, :iso_code, :flag]
      require_atomic? false
      change Geo.Resources.Changes.SlugifyName
    end

    # Use the cache to get a country by ISO code
    read :get_by_iso_code_cached do
      argument :iso_code, :ci_string, allow_nil?: false
      get? true

      manual Manual.GetByIsoCode
    end


  end

  # Default sort order when listing countries
  preparations do
    prepare build(sort: [iso_code: :asc])
  end

  attributes do
    attribute :iso_code, :ci_string do
      allow_nil? false
      public? true

      constraints match: ~S/^[A-Z]+$/,
                  min_length: 2,
                  max_length: 3
    end

    attribute :flag, :string do
      allow_nil? false
      public? true
      description "Unicode flag emoji for the country"
    end
  end

  # === Manual Actions ===
  defmodule Manual do
    defmodule GetByIsoCode do
      use Ash.Resource.ManualRead

      def read(ash_query, _ecto_query, _opts, _context) do
        iso_code = ash_query.arguments[:iso_code]
        {:ok, [Geo.Geography.Country.Cache.get_by_iso_code!(iso_code)]}
      end
    end


  end

  identities do
    identity :unique_iso_code, [:iso_code]
  end
end
