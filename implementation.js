var { ExtensionCommon } = ChromeUtils.import("resource://gre/modules/ExtensionCommon.jsm");
var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

var myapi = class extends ExtensionCommon.ExtensionAPI {
    getAPI(context) {
        let self = this;
        context.callOnClose(this);

        // keep track of windows manipulated by this API
        this.manipulatedWindows = [];



        return {
            myapi: {
                async hidelocalfolder(windowId, enforceRebuild, accounts) {
                    if (!windowId)
                        return false;

                    //get the real window belonging to the WebExtebsion window ID
                    let requestedWindow = context.extension.windowManager.get(windowId, context).window;
                    if (!requestedWindow)
                        return false;

                    function manipulate() {
                        const originalRowMap = this.window.gFolderTreeView._rowMap.slice()

                        // Original
                        // let localFolderID = 0
                        // for(let i = this.window.gFolderTreeView._rowMap.length -1; i >= 0 ; i--){
                        //     if(this.window.gFolderTreeView._rowMap[i]._folder?.hostname == 'Local Folders'){
                        //         localFolderID = i
                        //         this.window.gFolderTreeView._rowMap.splice(i, 1);
                        //     }
                        // }
                        // this.window.gFolderTreeView._rowMap = originalRowMap.slice()
                        // this.window.gFolderTreeView._rowMap[0] = this.window.gFolderTreeView._rowMap[localFolderID]
                        ////! this.window.gFolderTreeView._rowMap[0]._folder.server.prettyName = 'Local Folders'

                        let accountNames = []
                        for(let i = this.window.gFolderTreeView._rowMap.length -1; i >= 0 ; i--){
                            accountNames.push(this.window.gFolderTreeView._rowMap[i]._folder?.prettyName)
                            // console.log(this.window.gFolderTreeView._rowMap[i]._folder?.prettyName)
                        }

                        console.log('@@@@@@@@@')
                        console.log(accounts)
                        // let localFolderIndex = accounts.findIndex(account => account.name == "mail@samueltruman.com")
                        // let unread = accounts[localFolderIndex].unreadMessagesTotal
                        // console.log(unread)


                        const folderPanelHeader = this.window.document.getElementById('folderPaneHeader')
                        folderPanelHeader.firstChild.innerHTML = 'Select Account'
                        const buttonContainer = this.window.document.createElement('div')
                        folderPanelHeader.insertBefore(buttonContainer, folderPanelHeader.lastChild)

                        // TODO: add another window above the folder pane to DOM, where user can select account.
                        // e.g. modify folder pane toolbar or replicate folder pane toolbar
                        for(let accountName of accountNames) {
                            if(accountName === 'Local Folders') {
                                continue
                            }
                            let span = this.window.document.createElement('span')
                            let accountBtn = this.window.document.createElement('button')
                            // accountBtn.setAttribute('style', 'flex-wrap: wrap;')
                            accountBtn.addEventListener('click', () => {
                                // Restore all
                                // TODO: fix
                                // this.window.gFolderTreeView._rowMap = originalRowMap.slice()
                                // // Remove all but one account
                                // for(let i = this.window.gFolderTreeView._rowMap.length -1; i >= 0 ; i--){
                                //     console.log(this.window.gFolderTreeView._rowMap[i]._folder?.prettyName)
                                //     if(this.window.gFolderTreeView._rowMap[i]._folder?.prettyName !== accountName){
                                //         this.window.gFolderTreeView._rowMap.splice(i, 1);
                                //     }
                                // }
                            })
                            folderPanelHeader.children[1].appendChild(accountBtn)
                            let toolbarBtnText = this.window.document.createElement('label')
                            let localFolderIndex = accounts.findIndex(account => account.name === accountName)
                            let unread = accounts[localFolderIndex]?.unreadMessagesTotal
                            toolbarBtnText.innerHTML = `${accountName} (${unread})`
                            toolbarBtnText.classList.add('toolbarbutton-text')
                            accountBtn.appendChild(toolbarBtnText)
                            span.appendChild(accountBtn)
                            buttonContainer.appendChild(span)
                        }




                        // TODO: Show all button



                        // TODO: splice all but one account
                        // console.log('------------')
                        // for(let i = this.window.gFolderTreeView._rowMap.length -1; i >= 0 ; i--){
                        //     console.log(this.window.gFolderTreeView._rowMap[i]._folder?.prettyName)
                        //     if(this.window.gFolderTreeView._rowMap[i]._folder?.prettyName !== 'mail@samueltruman.com'){
                        //         this.window.gFolderTreeView._rowMap.splice(i, 1);
                        //     }
                        // }
                        // console.log('@@@@@@@@@@@@@@')
                    }

                    let callback = manipulate.bind(requestedWindow);
                    requestedWindow.addEventListener("mapRebuild", callback);
                    self.manipulatedWindows.push({requestedWindow, callback});

                    // Enforce rebuild if installed.
                    if (enforceRebuild) {
                        requestedWindow.gFolderTreeView._rebuild();
                    }

                }
            }
        };
    }


    close() {
        // This is called when the API shuts down. This API could be invoked multiple times in different contexts
        // and we therefore need to cleanup actions done by this API here.
        for(let manipulated of this.manipulatedWindows) {
            manipulated.requestedWindow.removeEventListener("mapRebuild", manipulated.callback);
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
