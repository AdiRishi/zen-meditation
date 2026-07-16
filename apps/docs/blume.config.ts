import { defineConfig } from "blume";

export default defineConfig({
  title: "Moss",
  description: "A quiet meditation companion for a regular practice.",
  github: {
    owner: "AdiRishi",
    repo: "moss-meditation",
    dir: "apps/docs",
  },
  deployment: {
    site: "https://adirishi.github.io",
    base: "/moss-meditation",
  },
});
