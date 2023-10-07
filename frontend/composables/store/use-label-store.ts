import { reactive, ref, Ref } from "@nuxtjs/composition-api";
import { useStoreActions } from "../partials/use-actions-factory";
import { Cache } from "../partials/cache";
import { MultiPurposeLabelOut } from "~/lib/api/types/labels";
import { useUserApi } from "~/composables/api";

let labelStore: Ref<MultiPurposeLabelOut[] | null> | null = null;
const labelCache = new Cache<MultiPurposeLabelOut>("labels", "id");

export function useLabelData() {
  const data = reactive({
    groupId: "",
    id: "",
    name: "",
    color: "",
  });

  function reset() {
    data.groupId = "";
    data.id = "";
    data.name = "";
    data.color = "";
  }

  return {
    data,
    reset,
  };
}

export function useLabelStore() {
  const api = useUserApi();
  const loading = ref(false);

  console.log("Hello");

  const actions = {
    ...useStoreActions<MultiPurposeLabelOut>(api.multiPurposeLabels, labelStore, loading, labelCache),
    flushStore() {
      labelStore = null;
    },
  };

  if (!labelStore) {
    labelStore = actions.getAll();
  }

  return {
    labels: labelStore,
    actions,
    loading,
  };
}
