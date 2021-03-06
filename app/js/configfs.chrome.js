/*global define, chrome, zed */
define(function(require, exports, module) {
    var architect = require("../dep/architect");
    plugin.consumes = ["command"];
    plugin.provides = ["configfs"];
    return plugin;

    function plugin(options, imports, register) {
        var command = imports.command;
        var fsUtil = require("./fs/util");

        var queueFs = fsUtil.queuedFilesystem();

        // Let's instaiate a new architect app with a configfs and the re-expose
        // that service as configfs
        architect.resolveConfig([{
            packagePath: "./fs/config.chrome",
            watchSelf: true
        }], function(err, config) {
            if (err) {
                return register(err);
            }
            architect.createApp(config, function(err, app) {
                if (err) {
                    return register(err);
                }
                // register(null, {
                //     configfs: app.getService("fs")
                // });
                try {
                    queueFs.resolve(app.getService("fs"));
                } catch (e) {
                    console.error("Couldn't resolve fs", e);
                }
            });
        });

        register(null, {
            configfs: queueFs
        });

        command.define("Configuration:Store in Local Folder", {
            doc: "Prompt for a local folder in which to store your Zed config. " + "Zed must restart for this to take effect.",
            exec: function() {
                chrome.fileSystem.chooseEntry({
                    type: "openDirectory"
                }, function(dir) {
                    if (!dir) {
                        return;
                    }
                    var id = chrome.fileSystem.retainEntry(dir);
                    chrome.storage.local.set({
                        configDir: id
                    }, function() {
                        zed.getService("ui").prompt({
                            message: "Configuration location set, will now restart Zed for changes to take effect."
                        }).then(function() {
                            chrome.runtime.reload();
                        });
                    });
                });
            },
            readOnly: true
        });

        command.define("Configuration:Store in Google Drive", {
            doc: "Begin syncing your Zed config with Google Drive. " + "Zed must restart for this to take effect.",
            exec: function() {
                chrome.storage.local.remove("configDir", function() {
                    zed.getService("ui").prompt({
                        message: "Configuration location set to Google Drive, will now restart Zed for changes to take effect."
                    }).then(function() {
                        chrome.runtime.reload();
                    });
                });
            },
            readOnly: true
        });
    }
});
