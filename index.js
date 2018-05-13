'use strict';
const path = require('path');
const electron = require('electron');
const unusedFilename = require('unused-filename');
const pupa = require('pupa');
const extName = require('ext-name');

const app = electron.app;
const shell = electron.shell;

function getFilenameFromMime(name, mime) {
	const exts = extName.mime(mime);

	if (exts.length !== 1) {
		return name;
	}

	return `${name}.${exts[0].ext}`;
}

function registerListener(session, opts = {}, cb = () => {}) {
	const downloadItems = new Set();
	let TotalReceivedBytes = 0;
	let TotalCompletedBytes = 0;
	let TotalBytes = 0;
	let TotalProgress = 0;
	let ReceivedBytesArr = [];
	const activeDownloadItems = () => downloadItems.size;
	const progressDownloadItems = (item,state) => {
		let speedValue = 0;
		let totalBytes = item.getTotalBytes()
		let receivedBytes = item.getReceivedBytes();
		ReceivedBytesArr.push(receivedBytes);
		if (ReceivedBytesArr.length >= 2) {
			let PreviousReceivedBytes = ReceivedBytesArr.shift();
			speedValue = Math.max(PreviousReceivedBytes, ReceivedBytesArr[0]) - Math.min(PreviousReceivedBytes, ReceivedBytesArr[0]);
		}
		return {
			progress: receivedBytes / totalBytes,
			speed: speedValue,
			remaining: totalBytes - receivedBytes,
			status: state,
			total: totalBytes,
			downloaded: receivedBytes,
			DownloadItem: item
		}
	}

	const listener = (e, item, webContents) => {
		downloadItems.add(item);
		TotalBytes += item.getTotalBytes();

		let hostWebContents = webContents;
		if (webContents.getType() === 'webview') {
			hostWebContents = webContents.hostWebContents;
		}
		const win = electron.BrowserWindow.fromWebContents(hostWebContents);

		const dir = opts.directory || app.getPath('downloads');
		let filePath;
		if (opts.filename) {
			filePath = path.join(dir, opts.filename);
		} else {
			const filename = item.getFilename();
			const name = path.extname(filename) ? filename : getFilenameFromMime(filename, item.getMimeType());

			filePath = unusedFilename.sync(path.join(dir, name));
		}

		const errorMessage = opts.errorMessage || 'The download of {filename} was interrupted';
		const errorTitle = opts.errorTitle || 'Download Error';

		if (!opts.saveAs) {
			item.setSavePath(filePath);
		}

		if (typeof opts.onStarted === 'function') {
			opts.onStarted(item);
		}

		item.on('updated', (e,state) => {
			TotalReceivedBytes = [...downloadItems].reduce((receivedBytes, item) => {
				receivedBytes += item.getReceivedBytes();
				return receivedBytes;
			}, TotalCompletedBytes);

			if (['darwin', 'linux'].includes(process.platform)) {
				app.setBadgeCount(activeDownloadItems());
			}

			if (!win.isDestroyed()) {
				win.setProgressBar(TotalReceivedBytes / TotalBytes);
			}

			if (typeof opts.onProgress === 'function') {
				opts.onProgress(progressDownloadItems(item, state));
			}
		});

		item.on('done', (e, state) => {
			TotalCompletedBytes += item.getTotalBytes();
			downloadItems.delete(item);

			if (['darwin', 'linux'].includes(process.platform)) {
				app.setBadgeCount(activeDownloadItems());
			}

			if (!win.isDestroyed() && !activeDownloadItems()) {
				 win.setProgressBar(-1);
				TotalReceivedBytes = 0;
				TotalCompletedBytes = 0;
				TotalBytes = 0;
				ReceivedBytesArr = [];
			}

			if (state === 'interrupted') {
				// const message = pupa(errorMessage, {filename: item.getFilename()});
				// electron.dialog.showErrorBox(errorTitle, message);
				// cb(new Error(message));
			} else if (state === 'completed') {
				if (process.platform === 'darwin') {
					// app.dock.downloadFinished(filePath);
				}

				if (opts.openFolderWhenDone) {
					shell.showItemInFolder(filePath);
				}

				if (opts.unregisterWhenDone) {
					session.removeListener('will-download', listener);
				}

				cb(null, progressDownloadItems(item, state));
			}
		});
	};

	session.on('will-download', listener);
}

module.exports = (opts = {}) => {
	app.on('session-created', session => {
		registerListener(session, opts);
	});
};

module.exports.download = (win, url, opts) => new Promise((resolve, reject) => {
	opts = Object.assign({}, opts, {unregisterWhenDone: true});

	registerListener(win.webContents.session, opts, (err, item) => {
		if (err) {
			reject(err);
		} else {
			resolve(item);
		}
	});

	win.webContents.downloadURL(url);
});
