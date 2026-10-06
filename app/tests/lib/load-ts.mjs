// Load one TypeScript (or TSX) module of the app in a plain node test.
//
// The file is transpiled with the app's own typescript and written under
// node_modules/.cache/asterion-tests/, so its bare imports (react, …) resolve
// from the app's node_modules. Relative or aliased imports the module makes
// are swapped for the stand-ins the test passes in `replace`.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import ts from 'typescript'

export const APP = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const CACHE = join(APP, 'node_modules', '.cache', 'asterion-tests')

/**
 * @param {string} file path from the app root, e.g. 'components/asterion/thread-turns.tsx'
 * @param {Record<string, string>} replace import specifier → source text of a stand-in module
 */
export async function loadTs(file, replace = {}) {
  mkdirSync(CACHE, { recursive: true })
  let text = ts.transpileModule(readFileSync(join(APP, file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
    fileName: file,
  }).outputText
  for (const [specifier, source] of Object.entries(replace)) {
    const stand = join(CACHE, `${basename(file)}.${specifier.replace(/[^a-z0-9]/gi, '_')}.mjs`)
    writeFileSync(stand, source)
    text = text.split(`'${specifier}'`).join(`'${pathToFileURL(stand).href}'`)
  }
  const out = join(CACHE, `${basename(file)}.${process.pid}.mjs`)
  writeFileSync(out, text)
  return import(pathToFileURL(out).href)
}
