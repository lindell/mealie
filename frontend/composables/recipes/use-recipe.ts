import { ref, onMounted } from "@nuxtjs/composition-api";
import { recipeCache } from "./recipe-cache";
import { useUserApi } from "~/composables/api";
import { Recipe } from "~/lib/api/types/recipe";

export const useRecipe = function (slug: string, eager = true) {
  const api = useUserApi();
  const loading = ref(false);

  const recipe = ref<Recipe | null>(null);

  async function fetchRecipe() {
    loading.value = true;
    const { data } = await api.recipes.getOne(slug);
    loading.value = false;
    if (data) {
      recipeCache.set(data);
      recipe.value = data;
    }
  }

  async function deleteRecipe() {
    loading.value = true;
    const { data } = await api.recipes.deleteOne(slug);
    loading.value = false;
    return data;
  }

  async function updateRecipe(recipe: Recipe) {
    loading.value = true;
    const { data } = await api.recipes.updateOne(slug, recipe);
    loading.value = false;
    return data;
  }

  onMounted(() => {
    if (eager) {
      recipeCache.fillRef(recipe, slug);
      fetchRecipe();
    }
  });

  return {
    recipe,
    loading,
    fetchRecipe,
    deleteRecipe,
    updateRecipe,
  };
};
