import { Cache } from "../partials/cache";
import { Recipe } from "~/lib/api/types/recipe";

export const recipeCache = new Cache<Recipe>("recipeCache", "slug");
