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

                    function updateFolderTreeView() {
                        for(let i = this.window.gFolderTreeView._rowMap.length - 1; i >= 0; i--) {
                            if(this.window.gFolderTreeView._rowMap[i]._folder?.prettyName !== accountName) {
                                this.window.gFolderTreeView._rowMap.splice(i, 1)
                            }
                        }
                    }

                    let callback = updateFolderTreeView.bind(requestedWindow)
                    requestedWindow.addEventListener("mapRebuild", callback)
                    self.manipulatedWindows.push({requestedWindow, callback})

                    if(enforceRebuild) {
                        requestedWindow.gFolderTreeView._rebuild()
                    }
                },
                async showAll() {
                    for(let manipulated of self.manipulatedWindows) {
                        manipulated.requestedWindow.removeEventListener("mapRebuild", manipulated.callback)
                        manipulated.requestedWindow.gFolderTreeView._rebuild()
                    }
                },
                async addAccountButtons(windowId, enforceRebuild, accounts) {
                    if(!windowId) return false

                    //get the real window belonging to the WebExtension window ID
                    let requestedWindow = context.extension.windowManager.get(windowId, context).window
                    if(!requestedWindow) return false

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
                        let accountBtn = requestedWindow.window.document.getElementById(`accountButton_${accountName}`)
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
            manipulated.requestedWindow.removeEventListener("mapRebuild", manipulated.callback)
            manipulated.requestedWindow.document.getElementById('accountButtonsContainer').remove()
            manipulated.requestedWindow.document.getElementById('accountButtonsBreakLine').remove()
            manipulated.requestedWindow.gFolderTreeView._rebuild()
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
    let recentWindow = Services.wm.getMostRecentWindow("mail:3pane")
    // Select the account. This is useful if the account is collapsed and no inbox is selectable.
    recentWindow.gFolderTreeView.selection.select(0)
    // Select the inbox. Will have no effect if the account is collapsed.
    recentWindow.gFolderTreeView.selection.select(1)
}

function addButtonContainerToFolderPane(document) {
    const folderPanelHeader = document.getElementById('folderPaneHeader')
    const buttonContainer = document.createElement('div')
    const breakLine = document.createElement('br')
    folderPanelHeader.firstChild.innerHTML = 'Select Account'
    buttonContainer.id = 'accountButtonsContainer'
    breakLine.id = 'accountButtonsBreakLine'
    folderPanelHeader.insertBefore(buttonContainer, folderPanelHeader.lastChild)
    folderPanelHeader.insertBefore(breakLine, buttonContainer)
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
