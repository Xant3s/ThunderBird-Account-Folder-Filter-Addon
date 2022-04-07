// function to hide the local folder in the given main window (if it is a normal main window)
function hideLocalFolder(window, enforceRebuild) {
    if (window.type != "normal")
        return;

    // hide local folders for the given window
    messenger.myapi.hidelocalfolder(window.id, enforceRebuild);
}



// run thru all already opened main windows (type = normal) and hide local folders
// this will take care of all windows already open while the add-on is being installed or
// activated during the runtime of Thunderbird.
async function init() {
    let windows = await messenger.windows.getAll({windowTypes: ["normal"]});
    for (let window of windows) {
        hideLocalFolder(window, true);
    }

    // register a event listener for newly opened windows, to
    // automatically call hideLocalFolders() for them
    messenger.windows.onCreated.addListener((window) => hideLocalFolder(window, false));
}


async function waitForLoad() {
    let onCreate = new Promise(function(resolve, reject) {
        function listener() {
            browser.windows.onCreated.removeListener(listener);
            resolve(true);
        }
        browser.windows.onCreated.addListener(listener);
    });

    let windows = await browser.windows.getAll({windowTypes:["normal"]});
    if (windows.length > 0) {
        return false;
    } else {
        return onCreate;
    }
}

// self-executing async "main" function
(async () => {
    await waitForLoad();
    init();
})()





