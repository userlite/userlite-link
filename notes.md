# Technical Overview

This package creates a socket connection with the specified development server and uploads each "watched" file [on save](https://github.com/userlite/userlite-link/blob/32686cd91a868e236873f398158562ff902e2417/lib/traffic/index.js#L162).

### App Structure
The main thrust of the project is in the lib folder with a few exceptions:
- The views folder has the error console view. This is a simple view that shows when the backtrace of a backend error is sent to Atom for quick navigation.
- The styles folder has some less files for regular styling.
- The menus folder specifies the context menus to run the `UL Upload`, `UL Download`, etc.
- The keymaps folder sets up the key binding shortcuts. These aren't active until the package gets activated by running the `userlite-link:connect` command.
- The spec folder currently has the default jasmine tests that give good examples of how to write tests.
