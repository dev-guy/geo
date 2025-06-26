defmodule GeoWeb.HomeLiveTest do
  use GeoWeb.ConnCase

  import Phoenix.LiveViewTest

  test "displays powered by fly.io badge", %{conn: conn} do
    {:ok, view, html} = live(conn, "/")

    # Check that the initial render includes the fly.io badge
    assert html =~ "Powered by"
    assert html =~ "fly-logo.png"
    assert html =~ "https://fly.io"

    # Verify the link attributes
    assert view
           |> element("a[href='https://fly.io']")
           |> render() =~ "Fly.io"
  end

  test "fly.io badge has correct styling and attributes", %{conn: conn} do
    {:ok, view, _html} = live(conn, "/")

    # Check the link has the correct attributes
    fly_link = element(view, "a[href='https://fly.io']")
    rendered = render(fly_link)
    
    assert rendered =~ ~s(target="_blank")
    assert rendered =~ ~s(rel="noopener noreferrer")
    assert rendered =~ ~s(class=)
  end
end