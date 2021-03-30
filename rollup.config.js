import {resolve} from "path";
import remove from "rollup-plugin-delete";
import {terser} from "rollup-plugin-terser";
import {external} from "@aminnairi/rollup-plugin-external";

export default {
  input: resolve("sources", "archmirrors.mjs"),
  plugins: [
    external(),
    remove({
      targets: [
        resolve("release", "**", "*")
      ]
    }),
    terser()
  ],
  output: {
    file: resolve("release", "archmirrors.js"),
    banner: "#!/usr/bin/env node",
    format: "cjs"
  }
}
