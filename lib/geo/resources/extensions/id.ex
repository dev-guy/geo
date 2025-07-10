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
      attribute = %Ash.Resource.Attribute{
        name: :id,
        type: :uuid_v7,
        allow_nil?: false,
        writable?: false,
        public?: true,
        primary_key?: true,
        default: &Ash.UUIDv7.generate/0
      }

      {:ok, Spark.Dsl.Transformer.add_entity(dsl_state, [:attributes], attribute)}
    end
  end
end
