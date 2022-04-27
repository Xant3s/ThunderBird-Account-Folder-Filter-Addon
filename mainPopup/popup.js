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

const addAccountButtons = async() => {
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

    const buttonContainer = document.createElement('div')
    document.body.appendChild(buttonContainer)
    for(let account of accounts){
        let accountBtn = document.createElement('button')
        accountBtn.innerText = account.name
        accountBtn.style.display = 'block'
        buttonContainer.appendChild(accountBtn)
        accountBtn.addEventListener('click', async () => {
            console.log(account.name)
            let windows = await messenger.windows.getAll({windowTypes: ["normal"]});
            for(let window of windows) {
                if(window.type !== "normal") continue
                await messenger.AccountsFolderFilter.showOnly(window.id, true, accounts, account.name)
            }
        })
    }

    let showAllBtn = document.createElement('button')
    showAllBtn.innerText = 'Show all'
    showAllBtn.style.display = 'block'
    buttonContainer.appendChild(showAllBtn)
    showAllBtn.addEventListener('click', async () => {
        let windows = await messenger.windows.getAll({windowTypes: ["normal"]});
        for(let window of windows) {
            if(window.type !== "normal") continue
            await messenger.AccountsFolderFilter.showAll(window.id, true, accounts)
        }
    })
}

addAccountButtons()
