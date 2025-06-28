defmodule GeoWeb.PageControllerTest do
  use GeoWeb.ConnCase

  setup do
    # Create Australia country for the HomeLive mount
    Geo.Geography.create_country!(%{
      name: "Australia",
      iso_code: "AU",
      flag: "🇦🇺"
    })
    :ok
  end

  test "GET /", %{conn: conn} do
    conn = get(conn, ~p"/")
    response = html_response(conn, 200)

    # Check for fly.io badge in the layout
    assert response =~ "Powered by"
    assert response =~ "https://fly.io"
    assert response =~ "fly.io/static/images/brand/logo-landscape.svg"
    assert response =~ "fly.io/static/images/brand/logo-landscape-inverted.svg"
  end
end
