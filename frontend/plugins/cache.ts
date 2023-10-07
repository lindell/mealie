import { Plugin } from "@nuxt/types";
import { Cache } from "~/composables/partials/cache";

const cachePlugin: Plugin = ({ $config }) => {
    const version: number = $config.commits;
    Cache.setVersion(version);
};

export default cachePlugin;
