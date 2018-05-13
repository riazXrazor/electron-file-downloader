# electron-file-downloader 

> Simple file downloader library from electron app [Electron](http://electron.atom.io) app


## Why?

- One function call instead of having to manually implement a lot of [boilerplate](index.js).
- Saves the file to the users Downloads directory instead of prompting.
- Bounces the Downloads directory in the dock when done. *(macOS)*
- Handles multiple downloads.
- Shows badge count *(macOS & Linux only)* and download progress. Example on macOS:
## Install

```
$ npm install electron-file-downloader
```


## Usage

### Register it for all windows

This is probably what you want for your app.

```js
const {app, BrowserWindow} = require('electron');

require('electron-file-downloader')();

let win;

app.on('ready', () => {
	win = new BrowserWindow();
});
```

### Use it manually

This can be useful if you need download functionality in a reusable module.

```js
const {app, BrowserWindow, ipcMain} = require('electron');
const {download} = require('electron-file-downloader');

ipcMain.on('download-btn', (e, args) => {
	download(BrowserWindow.getFocusedWindow(), args.url)
		.then(dl => console.log(dl.getSavePath()))
		.catch(console.error);
});
```

## API

### electronFDl([options])

### electronFDl.download(window, url, [options]): Promise<[DownloadItem](https://github.com/electron/electron/blob/master/docs/api/download-item.md)>

### window

Type: `BrowserWindow`

Window to register the behavior on.

### url

Type: `string`

URL to download.

### options

#### saveAs

Type: `boolean`<br>
Default: `false`

Show a `Save As…` dialog instead of downloading immediately.

Note: Only use this option when strictly necessary. Downloading directly without a prompt is a much better user experience.

#### directory

Type: `string`<br>
Default: [User's downloads directory](http://electron.atom.io/docs/api/app/#appgetpathname)

Directory to save the file in.

#### filename

Type: `string`<br>
Default: [`downloadItem.getFilename()`](https://electron.atom.io/docs/api/download-item/#downloaditemgetfilename)

Name of the saved file.

This option only makes sense for `electronFDl.download()`.

#### errorTitle

Type: `string`<br>
Default: `Download Error`

Title of the error dialog. Can be customized for localization.

#### errorMessage

Type: `string`<br>
Default: `The download of {filename} was interrupted`

Message of the error dialog. `{filename}` is replaced with the name of the actual file. Can be customized for localization.

#### onProgress

Type: `Function`

Optional callback that receives a number of info for the current download.

```
progress 	// download progress
speed   	// download speed
remaining 	// download size remaining in bytes
status		// status of download item can be `progressing`, `interrupted`, `completed`, `cancelled` or interrupted.
total		// total size of download in bytes
downloaded:  // total downloaded size in bytes,
DownloadItem // [`downloadItem`](https://electron.atom.io/docs/api/download-item)
```

#### openFolderWhenDone

Type: `boolean`<br>
Default: `false`

Reveal the downloaded file in the system file manager, and if possible, select the file.

## License

MIT © [Riaz Laskar](http://riazxrazor.in)
