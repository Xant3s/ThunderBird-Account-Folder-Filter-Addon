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
                async hidelocalfolder(windowId, enforceRebuild) {
                    if (!windowId)
                        return false;

                    //get the real window belonging to the WebExtebsion window ID
                    let requestedWindow = context.extension.windowManager.get(windowId, context).window;
                    if (!requestedWindow)
                        return false;

                    function manipulate() {
                        // console.log(this.window.gFolderTreeView._rowMap.empty())
                        // this.window.gFolderTreeView.splice(0,this.window.gFolderTreeView.length)

                        // Original
                        let localFolderID = 0
                        // for(let i = this.window.gFolderTreeView._rowMap.length -1; i >= 0 ; i--){
                        //     if(this.window.gFolderTreeView._rowMap[i]._folder?.hostname == 'Local Folders'){
                        //         localFolderID = i
                                // this.window.gFolderTreeView._rowMap.splice(i, 1);
                        //     }
                        // }
                        // this.window.gFolderTreeView._rowMap[0] = this.window.gFolderTreeView._rowMap[localFolderID]
                        ////! this.window.gFolderTreeView._rowMap[0]._folder.server.prettyName = 'Local Folders'


                        // add another window above the folder pane to DOM, where user can select account.
                        // e.g. modify folder pane toolbar or replicate folder pane toolbar
                        this.window.document.getElementById('folderPaneHeader').firstChild.innerHTML = 'Select Account'
                        // const newLabel = this.window.document.createElement("Label")
                        // newLabel.innerHTML = 'TEST 42'
                        const testBtn = this.window.document.createElement('toolbarbutton')
                        testBtn.setAttribute('label', 'testBtn')
                        testBtn.setAttribute('style', 'flex-wrap: wrap;')
                        testBtn.addEventListener('click', () => {
                            console.log('testBtn clicked')
                        })
                        this.window.document.getElementById('folderPaneHeader').children[1].appendChild(testBtn)


                        const toolbarBtnText = this.window.document.createElement('label')
                        toolbarBtnText.innerHTML = 'testBtn'
                        toolbarBtnText.classList.add('toolbarbutton-text')
                        testBtn.appendChild(toolbarBtnText)
                        // this.window.document.getElementById('folderPaneHeader').appendChild(newLabel)
                        this.window.document.getElementById('folderPaneHeader').appendChild(testBtn)

                        // splice all but one account
                        // console.log('------------')
                        // for(let i = this.window.gFolderTreeView._rowMap.length -1; i >= 0 ; i--){
                        //     console.log(this.window.gFolderTreeView._rowMap[i]._folder?.prettyName)
                        //     if(this.window.gFolderTreeView._rowMap[i]._folder?.prettyName !== 'mail@samueltruman.com'){
                        //         this.window.gFolderTreeView._rowMap.splice(i, 1);
                        //     }
                        // }
                        // console.log('@@@@@@@@@@@@@@')

                        console.log('Hello world')
                        console.log(this.window.gFolderTreeView._rowMap)
                        console.log(this.window.gFolderTreeView._rowMap[1]._folder.abbreviatedName)
                        console.log(this.window.gFolderTreeView._rowMap[2]._folder._children)

                        // let properties = FolderUtils.getFolderProperties(this.window.gFolderTreeView._rowMap[0]._folder, false)
                        // properties.




                        // for(let i = this.window.gFolderTreeView._rowMap.length -1; i >= 0 ; i--){
                        //     if(this.window.gFolderTreeView._rowMap[i]._folder?.hostname == 'Local Folders'){
                        //         this.window.gFolderTreeView._rowMap.splice(i, 1);
                        //     }
                        // }
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
