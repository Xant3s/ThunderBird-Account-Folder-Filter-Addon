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
                async showOnly(windowId, enforceRebuild, accounts, account) {
                    if (!windowId)
                        return false;

                    // get the real window belonging to the WebExtension window ID
                    let requestedWindow = context.extension.windowManager.get(windowId, context).window;
                    if(!requestedWindow)
                        return false;

                    function foo() {
                        console.log(account);
                        for(let i = this.window.gFolderTreeView._rowMap.length -1; i >= 0 ; i--){
                            if(this.window.gFolderTreeView._rowMap[i]._folder?.prettyName !== "mail@samueltruman.com"){
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
                    console.log('accounts', accounts);
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
