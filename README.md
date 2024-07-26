<p align="center">
  <img src="https://imgur.com/ebztWu1.gif">
</p>

# The Random MST3K-O-Matic

Can't decide which episode to watch? Let this determine your (hands of) fate!

The simplest thing to do is just grab a pre-compiled binary from the "[releases](https://github.com/eriqjaffe/random-mst3k-o-matic/releases)" section.  Binaries are available for Windows, macOS and Linux.

Because I'm not a registered developer with Apple, macOS may block the app for security reasons (not a bad thing for it to do, ultimately).  If this happens, just CTRL-click on the app and choose "Open" from the menu - that will bring up a slightly different version of the security message with an option to open the app.  You *should* only have to do that once and macOS should store an exception for the app going forward.

Similarly, Windows might pop up a "Windows protected your PC" message when you try to run the installer.  If that happens, just click "More info" and "Run anyway".

If you wish to run this from source, you will need to install [node.js](https://nodejs.org/en/download/) and [yarn](https://yarnpkg.com/getting-started/install), and then...

```
git clone https://github.com/eriqjaffe/random-mst3k-o-matic && cd random-mst3k-o-matic
yarn
yarn start
```
