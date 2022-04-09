const getNumberOfUnreadMailsRecursive = async (folder) => {
    const hasChildFolders = folder.subFolders.length > 0
    const folderInfo = await messenger.folders.getFolderInfo(folder)
    if(hasChildFolders) {
        let result = folderInfo.unreadMessageCount
        for(const childFolder of folder.subFolders) {
            result += await getNumberOfUnreadMailsRecursive(childFolder)
        }
        return result
    } else {
        return folderInfo.unreadMessageCount
    }
}

// function to hide the local folder in the given main window (if it is a normal main window)
async function hideLocalFolder(window, enforceRebuild) {
    if (window.type != "normal")
        return;


    let accounts = []
    const accs = await messenger.accounts.list(true)
    const folders = accs.map(acc => acc.folders)
    for(let accountIndex = 0; accountIndex < accs.length; accountIndex++) {
        const inbox = folders[accountIndex].filter(folder => folder.type === 'inbox')[0]
        if(inbox === undefined) continue
        const inboxFolderInfo = await messenger.folders.getFolderInfo(inbox)
        const unreadMessagesInbox = inboxFolderInfo.unreadMessageCount
        let unreadMessagesTotal = 0

        for(const folder of folders[accountIndex]) {
            unreadMessagesTotal += await getNumberOfUnreadMailsRecursive(folder)
        }
        accounts.push({
            name: accs[accountIndex].name,
            unreadMessagesInbox: unreadMessagesInbox,
            unreadMessagesTotal: unreadMessagesTotal
        })
    }


    // hide local folders for the given window
    messenger.myapi.hidelocalfolder(window.id, enforceRebuild, accounts);
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





