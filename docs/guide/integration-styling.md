# Styling Integration

Vite has first-class support for various styling solutions. This guide covers how to integrate them into your Vite project.
If you are interested in Vite's built-in CSS support and handling, take a look at the [CSS features section](/guide/features#postcss).

## Tailwind CSS

Tailwind CSS has first-class support in Vite projects. To get started with Tailwind CSS, you can follow [their Vite installation guide](https://tailwindcss.com/docs/installation/using-vite) and use the `@tailwindcss/vite` plugin in your Vite application.

### PostCSS

If the project contains a valid PostCSS config, it will be automatically applied to all of the imported CSS.
Vite supports any format that is supported via [postcss-load-config](https://github.com/postcss/postcss-load-config), e.g. `postcss.config.js`.

Note that CSS minification will run after PostCSS and will use [`build.cssTarget`](/config/build-options.md#build-csstarget) option.

## CSS Pre-processors

:::info
Because Vite targets modern browsers only, it is recommended to use native CSS variables with PostCSS plugins that implement CSSWG drafts (e.g. [postcss-nesting](https://github.com/csstools/postcss-plugins/tree/main/plugins/postcss-nesting)) and author plain, future-standards-compliant CSS.
:::

That said, Vite does provide built-in support for `.scss`, `.sass`, `.less`, `.styl` and `.stylus` files. There is no need to install Vite-specific plugins for them, but the corresponding pre-processor itself must be installed:

```bash
# .scss and .sass
npm add -D sass-embedded # or sass

# .less
npm add -D less

# .styl and .stylus
npm add -D stylus
```

This also allows using pre-processors in custom components such as Vue single file components via `<style lang="sass">` and similar.

Vite improves `@import` resolving for Sass and Less so that Vite aliases are also respected. In addition, relative `url()` references inside imported Sass/Less files that are in different directories from the root file are also automatically rebased to ensure correctness. Rebasing `url()` references that starts with a variable or a interpolation are not supported due to its API constraints.

`@import` alias and url rebasing are not supported for Stylus due to its API constraints.

You can also use CSS modules combined with pre-processors by prepending `.module` to the file extension, for example `style.module.scss`.
