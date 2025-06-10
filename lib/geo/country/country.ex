defmodule Geo.Country.Country.ManualGetByIsoCode do
  use Ash.Resource.ManualRead

  def read(ash_query, _ecto_query, _opts, _context) do
    iso_code = ash_query.arguments[:iso_code]
    {:ok, [Geo.Country.Cache.get_by_iso_code!(iso_code)]}
  end
end

defmodule Geo.Country.Country do
  use Ash.Resource,
    otp_app: :healthcompass_directory,
    domain: Geo.Geography,
    data_layer: AshPostgres.DataLayer

  use Geo.Resources.IdResource
  use Geo.Resources.RequiredUniqueNameResource
  use Geo.Resources.RequiredSlugResource
  use Geo.Resources.TimestampsResource

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
    prepare build(sort: [iso_code: :asc])
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

    # Cached operation for getting by ISO code
    read :get_by_iso_code_cached do
      argument :iso_code, :ci_string, allow_nil?: false

      manual Geo.Country.Country.ManualGetByIsoCode
    end

    # Cached operation for selector search
    action :selector_search, :map do
      argument :query, :string, allow_nil?: true, default: nil
      run fn input, _context ->
        query = input.arguments.query
        {iso_code_results, name_results} = Geo.Country.Cache.search!(query)
        {:ok, %{by_iso_code: iso_code_results, by_name: name_results}}
      end
    end
  end
end
