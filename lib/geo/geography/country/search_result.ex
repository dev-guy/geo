defmodule Geo.Geography.Country.SearchResult do
  use Ash.Resource,
    otp_app: :geo,
    domain: Geo.Geography

  resource do
    require_primary_key? false
  end

  attributes do
    attribute :countries_by_iso_code, {:array, :struct} do
      allow_nil? false
      public? true
      description "Countries matching the search query by ISO code"
      constraints instance_of: Geo.Geography.Country
    end

    attribute :countries_by_name, {:array, :struct} do
      allow_nil? false
      public? true
      description "Countries matching the search query by name"
      constraints instance_of: Geo.Geography.Country
    end
  end

  actions do
    defaults [:read]

    create :create do
      primary? true
      accept [:countries_by_iso_code, :countries_by_name]
    end

    read :search do
      argument :query, :string, allow_nil?: true, default: nil
      get? true

      manual Geo.Geography.Country.SearchResult.Manual.Search
    end
  end

  # === Manual Actions ===
  defmodule Manual do
    defmodule Search do
      use Ash.Resource.ManualRead

      @impl true
      def read(ash_query, _ecto_query, _opts, _context) do
        query = ash_query.arguments[:query]
        cache_results = Geo.Geography.Country.Cache.search!(query)

        # Create and return a single SearchResult resource
        search_results = Ash.create!(Geo.Geography.Country.SearchResult, %{
          countries_by_iso_code: cache_results.by_iso_code,
          countries_by_name: cache_results.by_name
        })

        {:ok, [search_results]}
      end
    end
  end
end
