# Translations

- Files: `locales/<language>/<section>.json`.
- Use flat, complete keys: `"onboarding.persona": "Make it yours"`.
- Keep the section prefix in the key. Calls remain `t('onboarding.persona')`.
- When adding a section file, import and spread it in that language's `index.ts`.
- VS Code i18n Ally is configured in `.vscode/settings.json`. Reload the window if it still shows the old files.

Files are merged into the default translation namespace. Filenames do not add a key prefix.
