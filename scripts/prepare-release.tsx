import { render } from "ink";
import React from "react";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

import { ReleaseApp, type ReleaseCliOptions } from "./release/release-ui.js";

async function main(): Promise<void> {
  const options = await parseCli();
  const app = render(<ReleaseApp options={options} />);
  await app.waitUntilExit();
}

async function parseCli(): Promise<ReleaseCliOptions> {
  const argv = await yargs(hideBin(process.argv))
    .scriptName("release:prepare")
    .usage("$0 [--dry-run] [--offline]", "Compose, review, and seal the next release")
    .option("dry-run", {
      describe: "Preview the release brief without writing files",
      type: "boolean",
      default: false,
    })
    .option("offline", {
      describe: "Use conventional commits instead of Codex analysis",
      type: "boolean",
      default: false,
    })
    .strict()
    .help()
    .parseAsync();

  return {
    dryRun: Boolean(argv.dryRun),
    offline: Boolean(argv.offline),
  };
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
