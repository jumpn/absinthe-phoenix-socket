// @flow

import babel from "rollup-plugin-babel";
import commonjs from "rollup-plugin-commonjs";
import fs from "fs";
import pascalCase from "pascal-case";
import resolve from "rollup-plugin-node-resolve";

import pkg from "./package.json";

const plugins = {
  babel: babel({
    exclude: "node_modules/**",
    runtimeHelpers: true
  }),
  commonjs: commonjs(),
  resolve: resolve()
};

const dirs = {
  input: "src",
  output: "dist",
  compat: "compat"
};

const getCjsAndEsConfig = fileName => ({
  input: `${dirs.input}/${fileName}`,
  output: [
    {file: `${dirs.output}/${fileName}`, format: "es"},
    {file: `${dirs.compat}/cjs/${fileName}`, format: "cjs"}
  ],
  sourcemap: true,
  plugins: [plugins.babel]
});

const sources = fs.readdirSync("src");

const getUnscopedName = pkg => pkg.name.split("/")[1];

export default [
  {
    input: `${dirs.input}/index.js`,
    output: {
      file: `${dirs.compat}/umd/index.js`,
      format: "umd"
    },
    sourcemap: true,
    plugins: [plugins.babel, plugins.resolve, plugins.commonjs],
    name: pascalCase(getUnscopedName(pkg))
  },
  ...sources.map(getCjsAndEsConfig)
];
