# TypeScript Integration

Vite supports importing `.ts` files out of the box.

Note that Vite only performs transpilation on `.ts` files and **does not perform type checking**. It assumes type checking is taken care of by your IDE and build process.

The reason Vite does not perform type checking as part of the transform process is because the two jobs work fundamentally differently. Transpilation can work on a per-file basis and aligns perfectly with Vite's on-demand compile model. In comparison, type checking requires knowledge of the entire module graph. Shoe-horning type checking into Vite's transform pipeline will inevitably compromise Vite's speed benefits.

Vite's job is to get your source modules into a form that can run in the browser as fast as possible. To that end, we recommend separating static analysis checks from Vite's transform pipeline. This principle applies to other static analysis checks such as ESLint.

- For production builds, you can run `tsc --noEmit` in addition to Vite's build command.

- During development, if you need more than IDE hints, we recommend running `tsc --noEmit --watch` in a separate process, or use [vite-plugin-checker](https://github.com/fi3ework/vite-plugin-checker) if you prefer having type errors directly reported in the browser.

Vite uses [esbuild](https://github.com/evanw/esbuild) to transpile TypeScript into JavaScript which is about 20~30x faster than vanilla `tsc`, and HMR updates can reflect in the browser in under 50ms.

Use the [Type-Only Imports and Export](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-8.html#type-only-imports-and-export) syntax to avoid potential problems like type-only imports being incorrectly bundled, for example:

```ts
import type { T } from 'only/types'
export type { T }
```

## TypeScript Compiler Options

Some configuration fields under `compilerOptions` in `tsconfig.json` require special attention.

## `isolatedModules`

- [TypeScript documentation](https://www.typescriptlang.org/tsconfig#isolatedModules)

Should be set to `true`.

It is because `esbuild` only performs transpilation without type information, it doesn't support certain features like const enum and implicit type-only imports.

You must set `"isolatedModules": true` in your `tsconfig.json` under `compilerOptions`, so that TS will warn you against the features that do not work with isolated transpilation.

If a dependency doesn't work well with `"isolatedModules": true`. You can use `"skipLibCheck": true` to temporarily suppress the errors until it is fixed upstream.

## `useDefineForClassFields`

- [TypeScript documentation](https://www.typescriptlang.org/tsconfig#useDefineForClassFields)

The default value will be `true` if the TypeScript target is `ES2022` or newer including `ESNext`. It is consistent with the [behavior of TypeScript 4.3.2+](https://github.com/microsoft/TypeScript/pull/42663).
Other TypeScript targets will default to `false`.

`true` is the standard ECMAScript runtime behavior.

If you are using a library that heavily relies on class fields, please be careful about the library's intended usage of it.
While most libraries expect `"useDefineForClassFields": true`, you can explicitly set `useDefineForClassFields` to `false` if your library doesn't support it.

## `target`

- [TypeScript documentation](https://www.typescriptlang.org/tsconfig#target)

Vite ignores the `target` value in the `tsconfig.json`, following the same behavior as `esbuild`.

To specify the target in dev, the [`esbuild.target`](/config/shared-options.html#esbuild) option can be used, which defaults to `esnext` for minimal transpilation. In builds, the [`build.target`](/config/build-options.html#build-target) option takes higher priority over `esbuild.target` and can also be set if needed.

::: warning `useDefineForClassFields`

If `target` in `tsconfig.json` is not `ESNext` or `ES2022` or newer, or if there's no `tsconfig.json` file, `useDefineForClassFields` will default to `false` which can be problematic with the default `esbuild.target` value of `esnext`. It may transpile to [static initialization blocks](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes/Static_initialization_blocks#browser_compatibility) which may not be supported in your browser.

As such, it is recommended to set `target` to `ESNext` or `ES2022` or newer, or set `useDefineForClassFields` to `true` explicitly when configuring `tsconfig.json`.
:::

## Other Compiler Options Affecting the Build Result

- [`extends`](https://www.typescriptlang.org/tsconfig#extends)
- [`importsNotUsedAsValues`](https://www.typescriptlang.org/tsconfig#importsNotUsedAsValues)
- [`preserveValueImports`](https://www.typescriptlang.org/tsconfig#preserveValueImports)
- [`verbatimModuleSyntax`](https://www.typescriptlang.org/tsconfig#verbatimModuleSyntax)
- [`jsx`](https://www.typescriptlang.org/tsconfig#jsx)
- [`jsxFactory`](https://www.typescriptlang.org/tsconfig#jsxFactory)
- [`jsxFragmentFactory`](https://www.typescriptlang.org/tsconfig#jsxFragmentFactory)
- [`jsxImportSource`](https://www.typescriptlang.org/tsconfig#jsxImportSource)
- [`experimentalDecorators`](https://www.typescriptlang.org/tsconfig#experimentalDecorators)
- [`alwaysStrict`](https://www.typescriptlang.org/tsconfig#alwaysStrict)

::: tip `skipLibCheck`
Vite starter templates have `"skipLibCheck": "true"` by default to avoid typechecking dependencies, as they may choose to only support specific versions and configurations of TypeScript. You can learn more at [vuejs/vue-cli#5688](https://github.com/vuejs/vue-cli/pull/5688).
:::

## Client Types

Vite's default types are for its Node.js API. To shim the environment of client-side code in a Vite application, you can add `vite/client` to `compilerOptions.types` inside `tsconfig.json`:

```json [tsconfig.json]
{
  "compilerOptions": {
    "types": ["vite/client", "some-other-global-lib"]
  }
}
```

Note that if [`compilerOptions.types`](https://www.typescriptlang.org/tsconfig#types) is specified, only these packages will be included in the global scope (instead of all visible ”@types” packages). This is recommended since TS 5.9.

::: details Using triple-slash directive

Alternatively, you can add a `d.ts` declaration file:

```typescript [vite-env.d.ts]
/// <reference types="vite/client" />
```

:::

`vite/client` provides the following type shims:

- Asset imports (e.g. importing an `.svg` file)
- Types for the Vite-injected [constants](./env-and-mode#env-variables) on `import.meta.env`
- Types for the [HMR API](./api-hmr) on `import.meta.hot`

::: tip
To override the default typing, add a type definition file that contains your typings. Then, add the type reference before `vite/client`.

For example, to make the default import of `*.svg` a React component:

- `vite-env-override.d.ts` (the file that contains your typings):
  ```ts
  declare module '*.svg' {
    const content: React.FC<React.SVGProps<SVGElement>>
    export default content
  }
  ```
- If you are using `compilerOptions.types`, ensure the file is included in `tsconfig.json`:
  ```json [tsconfig.json]
  {
    "include": ["src", "./vite-env-override.d.ts"]
  }
  ```
- If you are using triple-slash directives, update the file containing the reference to `vite/client` (normally `vite-env.d.ts`):
  ```ts
  /// <reference types="./vite-env-override.d.ts" />
  /// <reference types="vite/client" />
  ```

:::
