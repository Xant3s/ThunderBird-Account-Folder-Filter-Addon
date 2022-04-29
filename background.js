const main = async () => {
    await waitForLoad()
    await init()
}

main()


async function waitForLoad() {
    let onCreate = new Promise(function(resolve, reject) {
        const listener = () => {
            browser.windows.onCreated.removeListener(listener)
            resolve(true)
        }

        browser.windows.onCreated.addListener(listener)
    })

    let windows = await browser.windows.getAll({windowTypes: ["normal"]})
    if(windows.length > 0) {
        return false
    }
    return onCreate
}

async function init() {
    // Handle existing windows.
    let windows = await messenger.windows.getAll({windowTypes: ["normal"]})
    for(let window of windows) {
        startAddon(window, true)
    }

    // Handle future windows.
    messenger.windows.onCreated.addListener((window) => startAddon(window, false))

    // Update number of unread messages in account filter buttons.
    messenger.folders.onFolderInfoChanged.addListener(async (folder, folderInfo) => {
        let windows = await messenger.windows.getAll({windowTypes: ["normal"]})
        for(let window of windows) {
            updateUnreadCounter(window)
        }
    })
}

async function startAddon(window, enforceRebuild) {
    if(window.type !== "normal") return
    let accounts = await getNumberOfUnreadMails()
    await messenger.AccountsFolderFilter.addAccountButtons(window.id, enforceRebuild, accounts)
    await messenger.AccountsFolderFilter.showOnly(window.id, enforceRebuild, accounts, accounts[0].name)
}

async function updateUnreadCounter(window) {
    if(window.type !== "normal") return
    let accounts = await getNumberOfUnreadMails()
    await messenger.AccountsFolderFilter.updateUnreadCounts(window.id, true, accounts)
}

async function getNumberOfUnreadMails() {
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
    return accounts
}

const getNumberOfUnreadMailsRecursive = async (folder) => {
    const hasChildFolders = folder.subFolders.length > 0
    const folderInfo = await messenger.folders.getFolderInfo(folder)
    if(!hasChildFolders) {
        return folderInfo.unreadMessageCount
    }
    let result = folderInfo.unreadMessageCount
    for(const childFolder of folder.subFolders) {
        result += await getNumberOfUnreadMailsRecursive(childFolder)
    }
    return result
}
