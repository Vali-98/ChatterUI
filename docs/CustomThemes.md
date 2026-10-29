# Custom Themes

Edit [exampleTheme.json](exampleTheme.json), then import it from **Settings > Appearance > Theme options > Import Theme**. Themes can also be pasted or exported from this menu.

## Metadata

- `name`: Unique theme name.
- `version`: Current format version, `2`. Version 1 files are converted on import.
- `mode`: `light` or `dark`. Controls system-bar appearance.

## Colors

Colors accept `#RGB` or `#RRGGBB`.

### primary

Accent colors for buttons, selections and controls.

- `_100`–`_200`: Subtle and selected backgrounds.
- `_300`–`_400`: Borders and indicators.
- `_500`: Filled buttons and active controls.
- `_700`: Colored text and icons.

### neutral

Background and border colors.

- `_100`: App background.
- `_200`: Component surfaces.
- `_300`: Inset and selected surfaces.
- `_400`: Subtle borders.
- `_500`: Stronger borders.

### text

App text colors.

- `_100`: Main text.
- `_200`: Secondary text.
- `_300`: Descriptions.
- `_400`: Muted text and placeholders.
- `_500`: Disabled text.

### error

Colors for errors and destructive actions. Uses the same shade conventions as `primary`.

### warning

Colors for warnings. Uses the same shade conventions as `primary`. All shades are optional and default to `#d4a017`.

### Optional shades

Primary and error require `_100`–`_500` and `_700`. Neutral and text require `_100`–`_500`.

Omitted shades use these fallbacks, in order:

| Shade  | Fallbacks              |
| ------ | ---------------------- |
| `_600` | `_500`                 |
| `_700` | `_400`                 |
| `_800` | `_700`, `_400`         |
| `_900` | `_800`, `_700`, `_400` |

### shadow

- `color`: Shadow color.
- `opacity`: Shadow opacity, from `0` to `1`.

## Chat

All `chat` properties are optional and default to app palette colors.

- `text`: Shared message text color, including headings, bold text and maths.
- `metadata`: Message times, indices and generation statistics.
- `user`: User bubble `background` and `border`.
- `character`: Character bubble `background` and `border`.

Both bubble backgrounds default to `neutral._200`. Choose backgrounds that remain readable with the shared text colors. Low-contrast imports display a warning.

### chat.markdown

- `quote`: Text wrapped in double quotes.
- `emphasis`: Italic text using `*asterisks*` or `_underscores_`.
- `link`: Link text and border color.
- `inlineCode`: `background` and `text`.
- `codeBlock`: `background`, `text`, `headerBackground` and `headerText`.
- `blockquote`: `background`, `text` and `border` for `>` blocks.
- `table`: `headerBackground`, `background` and `border`.

### chat.section

Colors for expandable chat sections, including reasoning.

- `background`: Section body background.
- `headerBackground`: Header background.
- `headerText`: Header text and icon color.
- `border`: Section border color.

Section content uses the shared chat text and Markdown colors.

## Context Meter

All `context` properties are optional.

- `system`: System allocation; defaults to `#5b9bd5`.
- `history`: History allocation; defaults to `primary._500`.
- `reserved`: Reserved allocation; defaults to `#d4a34b`.
- `free`: Free space; defaults to `neutral._300`.
