defmodule Geo.Resources.Extensions.Id do
  @moduledoc """
  An Ash extension that adds a UUID v7 primary key attribute to a resource.
  """

  use Spark.Dsl.Extension,
    transformers: [
      __MODULE__.Transformer
    ]

  defmodule Transformer do
    @moduledoc false
    use Spark.Dsl.Transformer

    def before?(Ash.Resource.Transformers.BelongsToAttribute), do: true
    def before?(_), do: false

    def transform(dsl_state) do
      case Spark.Dsl.Transformer.build_entity(
             Ash.Resource.Dsl,
             [:attributes],
             :uuid_v7_primary_key,
             [:id]
           ) do
        {:ok, attribute} ->
          {:ok, Spark.Dsl.Transformer.add_entity(dsl_state, [:attributes], attribute)}

        {:error, error} ->
          {:error, error}
      end
    end
  end
end
