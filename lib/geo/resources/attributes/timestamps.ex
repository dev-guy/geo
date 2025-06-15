defmodule Geo.Resources.Attributes.Timestamps do
  @moduledoc """
  """

  defmacro __using__(_opts) do
    quote do
      attributes do
        create_timestamp :created_at
        update_timestamp :updated_at
      end
    end
  end
end
