const {ExtensionCommon} = ChromeUtils.importESModule("resource://gre/modules/ExtensionCommon.sys.mjs")
const {MailUtils} = ChromeUtils.importESModule("resource:///modules/MailUtils.sys.mjs")
const {MailServices} = ChromeUtils.importESModule("resource:///modules/MailServices.sys.mjs")


var AccountsFolderFilter = class extends ExtensionCommon.ExtensionAPI {
    getAPI(context) {
        let self = this
        context.callOnClose(this)

        // keep track of windows manipulated by this API
        this.manipulatedWindows = []

        return {
            AccountsFolderFilter: {
                async showOnly(windowId, accounts, accountName) {
                    if(!windowId) return false

                    // get the real window belonging to the WebExtension window ID
                    let requestedWindow = context.extension.windowManager.get(windowId, context).window
                    if(!requestedWindow) return false

                    const browser = requestedWindow.document.getElementById('mail3PaneTabBrowser1')
                    const doc = browser.contentWindow.document
                    const folderTree = doc.getElementById("folderTree")
                    const accountList = folderTree.getElementsByTagName("ul")[0]
                    self.originalAccountList = accountList.cloneNode(true)
                    const accountListItems = accountList.children

                    for(let i = accountListItems.length - 1; i >= 0; i--) {
                        if(!accountListItems[i].getAttribute("aria-label")?.includes(accountName)) {
                            accountListItems[i].remove()
                        }
                        else {
                            // Show account's inbox
                            accountListItems[i].getElementsByTagName('li')[0].click()
                        }
                    }
                },
                async showAll() {
                    if(!self.originalAccountList) return
                    for(let manipulated of self.manipulatedWindows) {
                        manipulated.document.getElementById('appmenu_smartFolders').click()
                        manipulated.document.getElementById('appmenu_allFolders').click()
                        manipulated.document.getElementById('appmenu_allFolders').click()
                        manipulated.document.getElementById('appmenu_smartFolders').click()
                    }
                },
                async addAccountButtons(windowId, accounts) {
                    if(!windowId) return false

                    //get the real window belonging to the WebExtension window ID
                    let requestedWindow = context.extension.windowManager.get(windowId, context).window
                    if(!requestedWindow) return false
                    self.manipulatedWindows.push(requestedWindow)

                    let accountNames = accounts.map(account => account.name)
                    const buttonContainer = addButtonContainerToFolderPane(requestedWindow.window.document)

                    for(let accountName of accountNames) {
                        if(accountName === 'Local Folders') continue
                        let accountBtn = addAccountButton(buttonContainer)
                        let numUnread = getNumberOfTotalUnreadMails(accounts, accountName)
                        accountBtn.id = `accountButton_${accountName}`
                        updateButtonText(accountBtn, accountName, numUnread)
                        updateButtonStyle(accountBtn, numUnread)
                        accountBtn.addEventListener('mousedown', () => this.showAll())
                        accountBtn.addEventListener('mouseup', async() => this.showOnly(windowId, accounts, accountName))
                    }

                    let showAllBtn = addAccountButton(buttonContainer)
                    showAllBtn.innerText = 'Show all'
                    showAllBtn.addEventListener('click', this.showAll)
                },
                async updateUnreadCounts(windowId, accounts) {
                    if(!windowId) return false

                    //get the real window belonging to the WebExtension window ID
                    let requestedWindow = context.extension.windowManager.get(windowId, context).window
                    if(!requestedWindow) return false

                    let accountNames = accounts.map(account => account.name)

                    for(let accountName of accountNames) {
                        if(accountName === 'Local Folders') continue
                        const browser = requestedWindow.document.getElementById('mail3PaneTabBrowser1')
                        const doc = browser.contentWindow.document
                        let accountBtn = doc.getElementById(`accountButton_${accountName}`)
                        let numUnread = getNumberOfTotalUnreadMails(accounts, accountName)
                        updateButtonText(accountBtn, accountName, numUnread)
                        updateButtonStyle(accountBtn, numUnread)
                    }
                }
            }
        }
    }

    close() {
        // This is called when the API shuts down. This API could be invoked multiple times in different contexts
        // and we therefore need to cleanup actions done by this API here.
        for(let manipulated of this.manipulatedWindows) {
            const browser = manipulated.document.getElementById('mail3PaneTabBrowser1')
            const doc = browser.contentWindow.document
            const folderPanelHeader = doc.getElementById('folderPaneHeaderBar')
            const row = doc.getElementById('accountFolderFilterHeaderRow')
            while(row.firstChild) {
                folderPanelHeader.appendChild(row.firstChild)
            }
            doc.getElementById('accountFolderFilterContainer').remove()
            // TODO: show all accounts
        }
    }

    onShutdown(isAppShutdown) {
        // This is called when the add-on or Thunderbird itself is shutting down.
        if(isAppShutdown) {
            return
        }
        Services.obs.notifyObservers(null, "startupcache-invalidate", null)
    }
}

function addButtonContainerToFolderPane(document) {
    const browser = document.getElementById('mail3PaneTabBrowser1')
    const doc = browser.contentWindow.document
    const folderPanelHeader = doc.getElementById('folderPaneHeaderBar')
    const container = document.createElement('div')
    container.id = 'accountFolderFilterContainer'
    container.style.display = 'flex'
    container.style.flexDirection = 'column'
    container.style.alignItems = 'center'
    container.style.width = '100%'
    const headerRow = document.createElement('div')
    headerRow.id = 'accountFolderFilterHeaderRow'
    headerRow.style.display = 'flex'
    headerRow.style.flexDirection = 'row-reverse'
    headerRow.style.gap = 'var(--folder-tree-header-gap)'
    headerRow.style.padding = 'var(--folder-tree-header-padding)'
    headerRow.style.alignItems = 'center'

    // move all standard element to headerRow
    while(folderPanelHeader.firstChild) {
        headerRow.appendChild(folderPanelHeader.firstChild)
    }

    const breakLine = document.createElement('br')
    breakLine.id = 'accountButtonsBreakLine'
    const buttonContainer = document.createElement('div')
    buttonContainer.id = 'accountButtonsContainer'
    buttonContainer.style.display = 'flex'
    buttonContainer.style.flexDirection = 'column'
    buttonContainer.style.width = '100%'
    folderPanelHeader.appendChild(container)
    container.appendChild(headerRow)
    container.appendChild(breakLine)
    container.appendChild(buttonContainer)
    return buttonContainer
}

function addAccountButton(buttonContainer) {
    const buttonDiv = buttonContainer.ownerDocument.createElement('div')
    buttonDiv.style.display = 'inline-block'
    buttonDiv.style.padding = '5px 10px'
    buttonDiv.style.backgroundColor = 'var(--toolbarbutton-hover-background)'
    buttonDiv.style.marginTop = '2px'
    buttonDiv.style.color = 'primary'
    buttonDiv.style.borderRadius = '3px'
    buttonDiv.style.transition = 'background-color 0.3s ease'
    const accountName = buttonContainer.ownerDocument.createElement('span')
    accountName.style.display = 'inline-block'
    accountName.style.width = '90%'
    accountName.style.whiteSpace = 'nowrap'
    accountName.style.overflow = 'hidden'
    accountName.style.textOverflow = 'ellipsis'
    const unreadCounter = buttonContainer.ownerDocument.createElement('span')
    unreadCounter.style.float = 'right'
    unreadCounter.style.display = 'inline-block'
    unreadCounter.style.borderRadius = '100%'
    unreadCounter.style.backgroundColor = 'gray'
    unreadCounter.style.color = 'white'
    unreadCounter.style.width = '20px'
    unreadCounter.style.height = '20px'
    unreadCounter.style.textAlign = 'center'
    unreadCounter.style.lineHeight = '20px'
    unreadCounter.innerText = '?'
    buttonDiv.addEventListener('mouseover', () => buttonDiv.style.backgroundColor = 'gray')
    buttonDiv.addEventListener('mouseout', () => buttonDiv.style.backgroundColor = 'var(--toolbarbutton-hover-background)')
    buttonDiv.appendChild(accountName)
    buttonDiv.appendChild(unreadCounter)
    buttonContainer.appendChild(buttonDiv)
    return buttonDiv
}

function getNumberOfTotalUnreadMails(accounts, accountName) {
    return accounts.find(account => account.name === accountName)
                    ?.unreadMessagesTotal
}

function updateButtonText(accountBtn, accountName, numUnread) {
    accountBtn.firstChild.innerText = accountName
    accountBtn.lastChild.innerText = numUnread
}

function updateButtonStyle(accountBtn, hasUnreadMessages) {
    accountBtn.style.fontWeight = hasUnreadMessages ? 'bold' : 'normal'
}
