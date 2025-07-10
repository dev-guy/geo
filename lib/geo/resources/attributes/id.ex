defmodule Geo.Resources.Attributes.Id.Defunct do
  @moduledoc """
  """

  defmacro __using__(_opts) do
    quote do
      attributes do
        uuid_v7_primary_key :id
      end
    end
  end
end
