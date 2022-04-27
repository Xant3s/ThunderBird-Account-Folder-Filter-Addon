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

const foo = async() => {
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
        let span = document.createElement('span')
        let accountBtn = document.createElement('button')
        accountBtn.innerText = account.name
        span.appendChild(accountBtn)
        buttonContainer.appendChild(span)
        accountBtn.addEventListener('click', () => {
            console.log(account.name)
        })

    }


    let globalVar = {value: false}
    // const currentWindow = await messenger.windows.getCurrent()
    // console.log('asdf')
    // await messenger.myapi.hidelocalfolder(currentWindow.id, false, accounts, globalVar);

    // const accs = await messenger.accounts.list(true)
    // const folders = accs.map(acc => acc.folders)
    // for(let accountIndex = 0; accountIndex < accs.length; accountIndex++) {
    //     const inbox = folders[accountIndex].filter(folder => folder.type == 'inbox')[0]
    //     if(inbox === undefined) break
    //     const inboxFolderInfo = await messenger.folders.getFolderInfo(inbox)
    //     const unreadMessagesInbox = inboxFolderInfo.unreadMessageCount
    //     let unreadMessagesTotal = 0
    //
    //     for(const folder of folders[accountIndex]) {
    //         unreadMessagesTotal += await getNumberOfUnreadMailsRecursive(folder)
    //     }
    //     console.log(accs[accountIndex].name)
    //     console.log('   Unread messages inbox: ' + unreadMessagesInbox)
    //     console.log('   Unread messages total: ' + unreadMessagesTotal)
    // }

    // Testing

    // modify folder pane for all windows of type normal
    // const windows = await messenger.windows.getAll()
    // console.log(windows)
    // const currentWindow = await messenger.windows.getCurrent()

    // searchfox: registerFolderTreeMode

}

foo()
