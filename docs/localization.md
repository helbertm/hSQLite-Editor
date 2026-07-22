# Localization

## Supported locales

The interface supports canonical BCP 47 tags `pt-BR`, `es-ES`, and `en-US`. `en-US` is the final fallback. Locale selection is stored locally and updates the document `lang` attribute.

The workspace shell and advanced runtime flows use stable catalog keys in all three locales. This includes status and error guidance, SQL Map, table population, export, history, favorites, file actions, settings, help, accessibility names, and empty states.

## Rules

- Use stable catalog keys for interface copy.
- Do not place user-facing strings directly in feature modules or templates when a catalog key can represent them.
- Use the shared `Intl` formatter helpers for numbers, dates, relative time, and collation.
- Keep SQL identifiers and user data unchanged. Locale affects presentation, not stored database content or generated SQL semantics.
- Preserve placeholders such as `{count}` and `{name}` across every catalog.
- Help, accessibility names, status messages, validation errors, and empty states are part of the localization surface.
- Design for Spanish text expansion without clipping or fixed-width assumptions.

## Adding or changing copy

1. Add the key and `en-US` value.
2. Add reviewed `pt-BR` and `es-ES` translations.
3. Run `npm run validate:i18n`.
4. Exercise all three locales with the browser locale smoke test.

The localization gate rejects uncataloged visible template copy, direct visible DOM assignments, status and announcement sink literals, non-catalog-backed toast arguments, and dynamic HTML copy. It also requires every stable message code emitted by the SQL worker to exist in the three catalogs. Its mutation fixtures prove that each detector fails when representative uncataloged copy is introduced. Catalog parity alone still does not prove linguistic quality, so browser flows exercise all three locales at desktop and mobile dimensions.

Machine translation may assist drafting but does not replace contextual review. Do not translate technical tokens, filenames, SQL keywords shown as code, or keyboard key names unless the platform convention differs.
