var {ExtensionCommon} = ChromeUtils.import("resource://gre/modules/ExtensionCommon.jsm")
var {Services} = ChromeUtils.import("resource://gre/modules/Services.jsm")
var {MailUtils} = ChromeUtils.import("resource:///modules/MailUtils.jsm")
var {MailServices} = ChromeUtils.import("resource:///modules/MailServices.jsm")


var AccountsFolderFilter = class extends ExtensionCommon.ExtensionAPI {
    getAPI(context) {
        let self = this
        context.callOnClose(this)

        // keep track of windows manipulated by this API
        this.manipulatedWindows = []

        return {
            AccountsFolderFilter: {
                async selectAccount(windowId, accounts, accountName) {
                    if(!windowId) return false
                    await selectAccount(this, windowId, accounts, accountName)
                },
                async showOnly(windowId, enforceRebuild, accounts, accountName) {
                    if(!windowId) return false

                    // get the real window belonging to the WebExtension window ID
                    let requestedWindow = context.extension.windowManager.get(windowId, context).window
                    if(!requestedWindow) return false

                    const browser = requestedWindow.document.getElementById('mail3PaneTabBrowser1')
                    const doc = browser.contentWindow.document
                    const folderTree = doc.getElementById("folderTree")
                    const accountList = folderTree.getElementsByTagName("ul")[0]
                    const clone = accountList.cloneNode(true)
                    const accountListItems = accountList.children

                    for(let i = accountListItems.length - 1; i >= 0; i--) {
                        if(!accountListItems[i].getAttribute("aria-label")?.includes(accountName)) {
                            accountListItems[i].remove()
                        }
                    }
                },
                async showAll() {
                    console.log('showAll not implemented')
                    // for(let manipulated of self.manipulatedWindows) {
                    //     manipulated.requestedWindow.removeEventListener("mapRebuild", manipulated.callback)
                    //     manipulated.requestedWindow.gFolderTreeView._rebuild()
                    // }
                },
                async addAccountButtons(windowId, enforceRebuild, accounts) {
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
                        accountBtn.addEventListener('click', () => selectAccount(this, windowId, accounts, accountName))
                    }

                    let showAllBtn = addAccountButton(buttonContainer)
                    showAllBtn.innerText = 'Show all'
                    showAllBtn.addEventListener('click', this.showAll)
                },
                async updateUnreadCounts(windowId, enforceRebuild, accounts) {
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
            // manipulated.requestedWindow.removeEventListener("mapRebuild", manipulated.callback)
            const folderPanelHeader = doc.getElementById('folderPaneHeaderBar')
            const row = doc.getElementById('accountFolderFilterHeaderRow')
            while(row.firstChild) {
                folderPanelHeader.appendChild(row.firstChild)
            }
            doc.getElementById('accountFolderFilterContainer').remove()
            // manipulated.requestedWindow.gFolderTreeView._rebuild()
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

async function selectAccount(api, windowId, accounts, accountName) {
    await api.showAll()
    await api.showOnly(windowId, true, accounts, accountName)
    await selectInboxOfAccount()
}

async function selectInboxOfAccount() {
    console.log('selectInboxOfAccount not implemented')
    let recentWindow = Services.wm.getMostRecentWindow("mail:3pane")
    // Select the account. This is useful if the account is collapsed and no inbox is selectable.
    // recentWindow.gFolderTreeView.selection.select(0)
    // Select the inbox. Will have no effect if the account is collapsed.
    // recentWindow.gFolderTreeView.selection.select(1)
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
    folderPanelHeader.appendChild(container)
    container.appendChild(headerRow)
    container.appendChild(breakLine)
    container.appendChild(buttonContainer)
    return buttonContainer
}

function addAccountButton(buttonContainer) {
    let button = buttonContainer.ownerDocument.createElement('button')
    button.style.display = 'block'
    buttonContainer.appendChild(button)
    return button
}

function getNumberOfTotalUnreadMails(accounts, accountName) {
    return accounts.find(account => account.name === accountName)
                    ?.unreadMessagesTotal
}

function updateButtonText(accountBtn, accountName, numUnread) {
    accountBtn.innerText = `${accountName} (${numUnread})`
}

function updateButtonStyle(accountBtn, hasUnreadMessages) {
    accountBtn.style.fontWeight = hasUnreadMessages ? 'bold' : 'normal'
}
