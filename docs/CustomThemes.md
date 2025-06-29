# Custom Themes

v0.8.5 introduces custom app themes, allowing you to customize the colors used in the app!

To get started, simply add your custom colors to [exampleTheme.json](https://github.com/Vali-98/ChatterUI/blob/master/docs/exampleTheme.json), then import them in the `Settings` > `Change Theme` > `Gear Icon` > `Import`

This doc will explain each property of the theme object:

## Metadata

- `name`: The unique name for your Theme - you cannot have themes of the same name!
- `version`: Current schema version, currently `1`.

## Colors

All colors range from key \_100 to \_900. The schema only accepts strings formatted in `#RRGGBB` or `#RGB`

### primary

This is the primary theme color which generally determines the color of inputs and buttons.

1. `_100`: Should be the lightest tone in light mode, and darkest tone in dark mode.
2. `_500`: Should be the base tone for this color.
3. `_900`: Should be the darkest tone in light mode, and lightest tone in dark mode.

<details>
<summary><i><b>More Details</b></i></summary>

- `_100`: Tag background under each character
- `_200`:
    - Background of selected item in drop-down menu.
    - Frame color of:
      - Popup
      - (Settings): "Add" tag button
      - (User menu):
        - "Save"
        - "New User"
      - (Models menu):
        - "Show settings"
        - "Back to models"
      - (Chat sidebar): "Start new chat"
- `_300`: 
    - Frame color of:
      - (Main sidebar): Active app mode
      - (User profiles sidebar): User pfp.
    - Background color of:
      - Drop-down menu.
      - Active character sort.
      - Character pfp edit button.
- `_400`: 
    - Progress bar color.
    - Frame color of:
      - (Settings): Big buttons
      - (Character Edit):
        - Tag frame.
        - Export frame.
- `_500`:
    - Active slider head.
    - "Model loaded" arrow in chat interface.
    - Horizontal line in chat.
    - Frame color of:
        - (User profiles sidebar): 
            - User profile picture.
            - Active profile frame.
    - Background color of:
        - (User profiles sidebar):
            - "Save" button.
            - "New user" button.
        - (Settings): "Add" tag button.
    - Accent color circle in theme selector
- `_600`: (NO EFFECT)
- `_700`: (Settings) Text of big buttons.
- `_800`: (Chat) Foldable section arrow (Thought Process)
- `_900`: (NO EFFECT)

</details>

### neutral

This is the color used for surfaces - though it scales up to \_900, currently the app rarely uses tones above \_500

1. `_100`: Should be your lightest tone in light mode, and darkest tone in dark mode
> [!Note] 
> `_100` controls the default background color for the app
2. `_900`: Should be the darkest tone for light mode, and lightest tone for dark mode

<details>
<summary><i><b>More Details</b></i></summary>

- `_100`: Background color of the whole app.
- `_200`:
    - Background color of:
        - Popup.
        - Inactive character sort.
        - (Model menu): Model cards.
        - (User menu): Edit pfp button.
        - (Chat):
            - Media attachment.
            - "Model Loaded"
        - (Formatting menu): Drop-down input filter.
    - Frame color of:
        - Inactive app mode.
        - Character pfp
        - (Character search):
            - Tag filter.
- `_300`:
   - Inactive slider background.
   - (Chat): Extra actions menu divider. 
   - (Theme selector): Active theme frame.
   - (Character edit menu): Tag box frame.
- `_400`:
   - Inactive slider head.
   - Foldable section background (Thought process).
   - Editable field frame.
   - Sampler value frame.
- `_500`:
   - Settings divider.
   - Active slider background.
   - Checkbox frame.
- `_600`: (NO EFFECT)
- `_700`: (NO EFFECT) 
- `_800`: (NO EFFECT)
- `_900`: (NO EFFECT)

</details>

### error

This is the color for critical functions like deletion.

- `_100`: Should be the lightest tone in light mode, and darkest tone in dark mode.
- `_500`: Should be the base tone for this color.
- `_900`: Should be the darkest tone in light mode, and lightest tone in dark mode.


### text

This is the color for text in the app

- `_100`: Should be the most readable color.
- `_900`: Should be the least readable color.


### shadow
This controls the colors for shadows


### quote

This controls the colors for Markdown texts wrapped in double quotes for the chat. 

E.g. `"This is some quoted text."`
