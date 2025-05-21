#!/usr/bin/env node

import { defineCommand, runMain } from "citty";
import { consola } from "consola";
import { watch } from "./watch.js";

const main = defineCommand({
  meta: {
    name: "hands",
    version: "0.0.1",
    description: "Run code agents in the background locally.",
  },
  run() {
    return watch();
  },
});

void runMain(main).catch(consola.error);
