defmodule Geo.Geography.Country.Cache.SearchResults do
  @moduledoc """
  Search results structure containing countries organized by search criteria.
  """

  defstruct [
    :by_name,
    :by_iso_code
  ]

  @type t :: %__MODULE__{
    by_name: [Geo.Geography.Country.t()],
    by_iso_code: [Geo.Geography.Country.t()]
  }
end
