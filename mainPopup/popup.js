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
    const accs = await messenger.accounts.list(true)
    const folders = accs.map(acc => acc.folders)
    for(let accountIndex = 0; accountIndex < accs.length; accountIndex++) {
        const inbox = folders[accountIndex].filter(folder => folder.type == 'inbox')[0]
        if(inbox === undefined) break
        const inboxFolderInfo = await messenger.folders.getFolderInfo(inbox)
        const unreadMessagesInbox = inboxFolderInfo.unreadMessageCount
        let unreadMessagesTotal = 0

        for(const folder of folders[accountIndex]) {
            unreadMessagesTotal += await getNumberOfUnreadMailsRecursive(folder)
        }
        console.log(accs[accountIndex].name)
        console.log('   Unread messages inbox: ' + unreadMessagesInbox)
        console.log('   Unread messages total: ' + unreadMessagesTotal)
    }
}

foo()
