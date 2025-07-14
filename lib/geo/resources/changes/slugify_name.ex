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
        base_slug = slugify(name)
        unique_slug = ensure_unique_slug(changeset, base_slug)
        Ash.Changeset.force_change_attribute(changeset, :slug, unique_slug)

      # Otherwise, leave as is
      true ->
        changeset
    end
  end

  defp ensure_unique_slug(changeset, base_slug) do
    # Try base slug first
    if !slug_exists?(changeset, base_slug) do
      base_slug
    else
      find_unique_slug_with_number(changeset, base_slug)
    end
  end

  defp find_unique_slug_with_number(changeset, base_slug) do
    # Range 1: 1-9
    case find_in_range(changeset, base_slug, 1..9) do
      {:found, number} -> "#{base_slug}-#{number}"
      :not_found ->
        # Range 2: 1-99  
        case find_in_range(changeset, base_slug, 1..99) do
          {:found, number} -> "#{base_slug}-#{number}"
          :not_found ->
            # Range 3: 1-9999
            case find_in_range(changeset, base_slug, 1..9999) do
              {:found, number} -> "#{base_slug}-#{number}"
              :not_found -> raise "Could not find unique slug after trying up to 9999"
            end
        end
    end
  end

  defp find_in_range(changeset, base_slug, range) do
    Enum.find_value(range, :not_found, fn number ->
      slug_candidate = "#{base_slug}-#{number}"
      if !slug_exists?(changeset, slug_candidate) do
        {:found, number}
      end
    end)
  end

  defp slug_exists?(changeset, slug) do
    resource = changeset.resource
    query = Ash.Query.filter(resource, slug: slug)
    
    # Exclude the current record if it's an update
    query =
      case changeset.data do
        %{id: id} when not is_nil(id) ->
          Ash.Query.filter(query, id != ^id)
        _ ->
          query
      end
    
    case Ash.read(query) do
      {:ok, []} -> false
      {:ok, _} -> true
      {:error, _} -> false
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

  defp slugify(%Ash.CiString{} = ci_string) do
    ci_string
    |> to_string()
    |> slugify()
  end

  defp slugify(_), do: nil
end
