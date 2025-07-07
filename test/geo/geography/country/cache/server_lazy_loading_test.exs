defmodule Geo.Geography.Country.Cache.ServerLazyLoadingTest do
  use ExUnit.Case, async: false
  use Geo.DataCase

    setup do
    # Seed some test data
    Geo.Geography.create_country!(%{
      iso_code: "US",
      name: "United States",
      slug: "united-states",
      flag: "🇺🇸"
    }, authorize?: false)

    Geo.Geography.create_country!(%{
      iso_code: "CA",
      name: "Canada",
      slug: "canada",
      flag: "🇨🇦"
    }, authorize?: false)

    :ok
  end

  test "lazy loading - countries not loaded initially" do
    {:ok, pid} = Geo.Geography.Country.Cache.Server.start_link([])

    # Initially, countries should not be loaded
    status_before = GenServer.call(pid, :status)
    assert status_before.loaded == false
    assert status_before.countries_count == 0
    assert status_before.last_refresh == nil

    # This should trigger the lazy loading
    result = GenServer.call(pid, :search_all)
    assert length(result.by_iso_code) > 0

    # Now countries should be loaded
    status_after = GenServer.call(pid, :status)
    assert status_after.loaded == true
    assert status_after.countries_count > 0
    assert status_after.last_refresh != nil

    GenServer.stop(pid)
  end

  test "lazy loading - get_by_iso_code triggers loading" do
    {:ok, pid} = Geo.Geography.Country.Cache.Server.start_link([])

    # Initially, countries should not be loaded
    status_before = GenServer.call(pid, :status)
    assert status_before.loaded == false

    # This should trigger the lazy loading
    country = GenServer.call(pid, {:get_by_iso_code, "US"})
    assert country != nil

    # Now countries should be loaded
    status_after = GenServer.call(pid, :status)
    assert status_after.loaded == true

    GenServer.stop(pid)
  end

    test "lazy loading - search triggers loading" do
    {:ok, pid} = Geo.Geography.Country.Cache.Server.start_link([])

    # Initially, countries should not be loaded
    status_before = GenServer.call(pid, :status)
    assert status_before.loaded == false

    # This should trigger the lazy loading
    result = GenServer.call(pid, {:search, "United"})
    assert length(result.by_name) > 0

    # Now countries should be loaded
    status_after = GenServer.call(pid, :status)
    assert status_after.loaded == true

    GenServer.stop(pid)
  end

  test "stop timer only starts after countries are loaded" do
    {:ok, pid} = Geo.Geography.Country.Cache.Server.start_link([])

    # Worker should start without stopping immediately
    Process.sleep(50)
    assert Process.alive?(pid)

    # Trigger loading
    _result = GenServer.call(pid, :search_all)

    # Worker should still be alive after loading
    assert Process.alive?(pid)

    GenServer.stop(pid)
  end
end
