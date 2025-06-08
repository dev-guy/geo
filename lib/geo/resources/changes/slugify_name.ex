defmodule Geo.Resources.Changes.SlugifyName do
  @moduledoc """
  Change module that automatically generates a slug from the name attribute.

  This change will:
  - Generate a slug from the name if no slug is provided
  - Only regenerate the slug if the name changes and no new slug was explicitly provided
  - Convert to lowercase, replace spaces and special characters with hyphens
  - Remove consecutive hyphens and trim hyphens from ends
  """

  use Ash.Resource.Change

  @impl true
  def change(changeset, _opts, _context) do
    Ash.Changeset.before_action(changeset, &maybe_generate_slug/1)
  end

  defp maybe_generate_slug(changeset) do
    name = Ash.Changeset.get_attribute(changeset, :name)
    slug = Ash.Changeset.get_attribute(changeset, :slug)
    slug_changing? = Ash.Changeset.changing_attribute?(changeset, :slug)

    cond do
      # If slug is explicitly being set, don't override it
      slug_changing? && not is_nil(slug) ->
        changeset

      # If we have a name but no slug, generate one
      not is_nil(name) ->
        generated_slug = slugify(name)
        Ash.Changeset.force_change_attribute(changeset, :slug, generated_slug)

      # Otherwise, leave as is
      true ->
        changeset
    end
  end

  defp slugify(text) when is_binary(text) do
    text
    |> String.downcase()
    # Normalize Unicode characters (decompose accented characters)
    |> :unicode.characters_to_nfd_binary()
    # Remove diacritical marks (combining characters)
    |> String.replace(~r/\p{M}/u, "")
    # Keep only ASCII letters, numbers, spaces, and hyphens
    |> String.replace(~r/[^a-z0-9\s-]/u, "")
    # Replace spaces and multiple hyphens with single hyphen
    |> String.replace(~r/[-\s]+/, "-")
    # Remove leading/trailing hyphens
    |> String.trim("-")
  end

  defp slugify(_), do: nil
end
