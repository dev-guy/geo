defmodule Geo.Geography do
  @moduledoc """
  The Geography domain provides access to geographical data and operations.

  This domain manages country-related resources and provides efficient search
  and lookup capabilities for geographical entities. It serves as the main
  interface for accessing country data throughout the application.

  ## Resources

  - `Geo.Geography.Country` - Represents countries with ISO codes, names, flags, and slugs

  ## Key Functions

  - `list_countries/0` - Lists all countries
  - `search_countries/1` - Searches countries for use in UI selectors
  - `get_country_by_iso_code/1` - Efficiently retrieves a country by ISO code using caching
  - `create_country/1`, `update_country/1`, `upsert_country/1` - Country management operations

  ## Caching

  This domain leverages `Geo.Geography.Country.Cache` for high-performance country lookups
  and searches. The cache is started lazily when needed and automatically maintained and refreshed periodically.

  ## Function Details

  ### create_country/1
  Creates a new country with the provided attributes.
  - Parameters: `attrs` - Map containing country attributes (name, iso_code, flag, slug)
  - Returns: `{:ok, country}` on success, `{:error, changeset}` on validation failure

  ### upsert_country/1
  Creates or updates a country using the unique ISO code identity.
  This function will create a new country if one with the given ISO code doesn't exist,
  or update the existing country if it does.
  - Parameters: `attrs` - Map containing country attributes, `opts` - Options including `:upsert_fields`
  - Returns: `{:ok, country}` on success, `{:error, changeset}` on validation failure

  ### update_country/2
  Updates an existing country with the provided attributes.
  - Parameters: `country` - The country resource to update, `attrs` - Map containing attributes to update
  - Returns: `{:ok, updated_country}` on success, `{:error, changeset}` on validation failure

  ### list_countries/0
  Lists all countries in the system. Returns all countries sorted by ISO code (ascending) by default.
  - Returns: List of `Geo.Geography.Country` resources

  ### search_countries/1
  Searches countries for use in UI selectors and comboboxes.

  This function provides optimized search functionality specifically designed for user interface
  components. It returns a single list of countries that match the search query, sorted by name
  for consistent user experience.

  When no query is provided (nil or empty string), returns all countries sorted by name.
  When a query is provided, performs intelligent matching against both country names and ISO codes
  with prioritized results:
  1. Exact ISO code matches
  2. Partial ISO code matches (for queries ≤ 3 characters)
  3. Exact name matches
  4. Names starting with the query
  5. Names containing the query

  This function uses `Geo.Geography.Country.Cache` for high-performance lookups and is optimized for
  real-time search in user interfaces.

  ### get_country_by_iso_code/1
  Retrieves a country by its ISO code using high-performance caching.

  This function provides the fastest way to lookup a country by ISO code, utilizing the
  `Geo.Geography.Country.Cache` for sub-millisecond response times. The cache is refreshed every 10 minutes.
  - Parameters: `iso_code` - The ISO country code (e.g., "AU", "US", "GB")
  - Returns: `Geo.Geography.Country` resource
  - Raises: `RuntimeError` if no country with the given ISO code is found
  """
  use Ash.Domain,
    otp_app: :geo

  resources do
    resource Geo.Geography.Country do
      define :create_country, action: :create
      define :upsert_country, action: :upsert
      define :update_country, action: :update
      define :list_countries, action: :read
      define :get_country_by_iso_code, action: :get_by_iso_code
    end

    resource Geo.Geography.Country.SearchResult do
      define :search_countries, action: :search, args: [{:optional, :query}]
    end
  end


end
