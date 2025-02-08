# Custom Themes

v0.8.5 introduces custom app themes, allowing you to customize the colors used in the app!

To get started, simply add your custom colors to [exampleTheme.json](https://github.com/Vali-98/ChatterUI/blob/master/docs/exampleTheme.json), then import them in the Settings > Change Theme > Gear Icon > Import

This doc will explain each property of the theme object:

#### Metadata

-   name : The unique name for your Theme - you cannot have themes of the same name!
-   version: Current schema version, currently `1`

#### Colors

All colors range from key \_100 to \_900. The schema only accepts strings formatted in `#RRGGBB` or `#RGB`

-   primary - This is the primary theme color which generally determines the color of inputs and buttons
    -   `_500` should be the base tone for this color
    -   `_100` should be the lightest tone in light mode, and darkest tone in dark mode
    -   `_900` should be the darkest tone in light mode, and lightest tone in dark mode
-   neutral - This is the color used for surfaces - though it scales up to \_900, currently the app rarely uses tones above \_500
    -   `_100` should be your lightest tone in light mode, and darkest tone in dark mode
        -   note that this value controls the default background color for the app
    -   `_900` should be the darkest tone for light mode, and lightest tone for dark mode
-   error - This is the color for critical functions like deletion
    -   `_500` should be the base tone for this color
    -   `_100` should be the lightest tone in light mode, and darkest tone in dark mode
    -   `_900` should be the darkest tone in light mode, and lightest tone in dark mode
-   text - This is the color for text in the app
    -   `_100` should be the most readable color
    -   `_900` should be the least readable color
-   shadow - This controls the colors for shadows
-   quote - This controls the colors for Markdown texts wrapped in double quotes for the chat, eg. `"This is some quoted text."`
