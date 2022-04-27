var { ExtensionCommon } = ChromeUtils.import("resource://gre/modules/ExtensionCommon.jsm");
var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

var AccountsFolderFilter = class extends ExtensionCommon.ExtensionAPI {
    getAPI(context) {
        let self = this;
        context.callOnClose(this);

        // keep track of windows manipulated by this API
        this.manipulatedWindows = [];

        return {
            AccountsFolderFilter: {
                async showOnly(windowId, enforceRebuild, accounts, accountName) {
                    if(!windowId)
                        return false;

                    // get the real window belonging to the WebExtension window ID
                    let requestedWindow = context.extension.windowManager.get(windowId, context).window;
                    if(!requestedWindow)
                        return false;

                    function foo() {
                        for(let i = this.window.gFolderTreeView._rowMap.length -1; i >= 0 ; i--){
                            if(this.window.gFolderTreeView._rowMap[i]._folder?.prettyName !== accountName){
                                this.window.gFolderTreeView._rowMap.splice(i, 1);
                            }
                        }
                    }

                    let callback = foo.bind(requestedWindow);
                    requestedWindow.addEventListener("mapRebuild", callback);
                    self.manipulatedWindows.push({requestedWindow, callback});

                    if(enforceRebuild) {
                        requestedWindow.gFolderTreeView._rebuild();
                    }
                },
                async showAll(windowId, enforceRebuild, accounts) {
                    for(let manipulated of self.manipulatedWindows) {
                        manipulated.requestedWindow.removeEventListener("mapRebuild", manipulated.callback);
                        manipulated.requestedWindow.gFolderTreeView._rebuild();
                    }
                },
                async addAccountButtons(windowId, enforceRebuild, accounts) {
                    if(!windowId) return false;

                    //get the real window belonging to the WebExtension window ID
                    let requestedWindow = context.extension.windowManager.get(windowId, context).window;
                    if(!requestedWindow) return false;

                    let accountNames = accounts.map(account => account.name)

                    function manipulate(api) {
                        const folderPanelHeader = this.window.document.getElementById('folderPaneHeader')
                        folderPanelHeader.firstChild.innerHTML = 'Select Account'
                        const buttonContainer = this.window.document.createElement('div')
                        buttonContainer.id = 'accountButtonsContainer'
                        folderPanelHeader.insertBefore(buttonContainer, folderPanelHeader.lastChild)
                        const breakLine = this.window.document.createElement('br')
                        breakLine.id = 'accountButtonsBreakLine'
                        folderPanelHeader.insertBefore(breakLine, buttonContainer)

                        for(let accountName of accountNames) {
                            if (accountName === 'Local Folders') continue

                            async function bar() {
                                await api.showOnly(windowId, true, accounts, accountName)
                            }

                            let accountBtn = this.window.document.createElement('button')
                            let localFolderIndex = accounts.findIndex(account => account.name === accountName)
                            let unread = accounts[localFolderIndex]?.unreadMessagesTotal
                            accountBtn.innerText = `${accountName} (${unread})`
                            accountBtn.style.display = 'block'
                            accountBtn.addEventListener('click', bar.bind(this))
                            buttonContainer.appendChild(accountBtn)
                        }

                        async function foobar() {
                            await api.showAll(windowId, true, accounts)
                        }
                        let showAllBtn = this.window.document.createElement('button')
                        showAllBtn.innerText = 'Show all'
                        showAllBtn.style.display = 'block'
                        buttonContainer.appendChild(showAllBtn)
                        showAllBtn.addEventListener('click', foobar.bind(this))

                    }

                    let callback = manipulate.bind(requestedWindow, this);
                    callback(this)
                }
            }
        };
    }

    close() {
        // This is called when the API shuts down. This API could be invoked multiple times in different contexts
        // and we therefore need to cleanup actions done by this API here.
        for(let manipulated of this.manipulatedWindows) {
            manipulated.requestedWindow.removeEventListener("mapRebuild", manipulated.callback);
            manipulated.requestedWindow.document.getElementById('accountButtonsContainer').remove()
            manipulated.requestedWindow.document.getElementById('accountButtonsBreakLine').remove()
            manipulated.requestedWindow.gFolderTreeView._rebuild();
        }
    }

    onShutdown(isAppShutdown) {
        // This is called when the add-on or Thunderbird itself is shutting down.
        if (isAppShutdown) {
            return;
        }
        Services.obs.notifyObservers(null, "startupcache-invalidate", null);
    }
};
