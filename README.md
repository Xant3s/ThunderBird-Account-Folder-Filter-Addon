# ThunderBird Account Folder Filter Addon

## Abstract

This addon allows users to filter folders by account. Only folder that belong to the selected account will be displayed. The user can switch the active account using buttons that are injected into the folder pane toolbar.

## Required Permissions

This addon requires features that cannot be implemented with existing ThunderBird WebExtension APIs. Therefore, the addon implements its own experiment API.

Experiment APIs have full access to Thunderbird's core functions and can bypass the WebExtension permission system entirely. Including one or more Experiment APIs will therefore disable the individual permission prompt and instead prompt the user only for the [Have full, unrestriced access to Thunderbird, and your computer](https://support.mozilla.org/en-US/kb/permission-request-messages-thunderbird-extensions) permission.

## Requirements

This addon requires the folder pane toolbar to be visible. The addon was tested with the 'all folders' view mode.

## How to Build

To generate the addon file which can be installed by users, zip the project folder and rename the file extension to .xpi.

## How to Debug

### Developer Toolbox

Menu > Tools > Developer Tools > Developer Toolbox

### Add as Temporary Extension

https://developer.thunderbird.net/add-ons/mailextensions/hello-world-add-on/using-webextension-apis
