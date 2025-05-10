<knowledge_base>

## knowledge_base

### gui_for_cores_docs

#### main

##### Title: GUI.for.Cores Project User Manual
##### Description: User manual for the GUI.for.Cores project.

##### Applications
- Count: 2
- Names:
    - GUI.for.Clash
    - GUI.for.SingBox

##### Original Intentions
###### Title: Original Intentions
###### Description: The GUI.for Cores project aims to generate configuration files for cores quickly and display parameters as UI options, providing default values for these options at the same time. Based on this, this project has developed a series of auxiliary functions around the cores
###### Features:
    - Profiles management
    - Subscriptions management
    - Proxy groups management
    - Plugin System
    - Scheduled Task System
###### Benefits: These functions significantly improve the ease of use of the cores, especially the Plugin System, which makes the core more fun and extensible

##### Not VPN or Proxy Applications
###### Title: Not VPN or Proxy Applications
###### Description: The applications based on this project are neither VPN nor proxy applications. They don't integrate any proxy applications or similar functions

##### Note
###### Title: Note
###### Points:
    - Please do not download any of **our** applications aside from the GitHub Releases page. Otherwise, security may be compromised, this is extremely IMPORTANT!
    - To all blog and website owners, please do not provide any download links other than GitHub Releases on the grounds of _'convenience'_ or _'caring for readers'_
    - Please do not launch any applications downloaded from unknown sources, even if they are uploaded by the developers of this project in the group. GitHub Releases is the only trustworthy source!

##### Q & A
###### Title: Q & A
###### Questions:
    - **Question:** How to submit PRs for the project?
        **Answer:** As of now, we do not recommend submitting PRs for new functions, but the bug-fixing ones are welcome. Here are the reasons: the developers have their own agenda regarding the applications' architectures and functions. New functions that are not planned will interrupt the developement process. But we are sincerely grateful to your enthusiasm and support for this project
    - **Question:** Aside from submitting the bug-fixing PRs, what can I do to make the project better?
        **Answers:**
            - Base on the GUI.for.Cores project, develope GUI applications for other cores
            - Complete the user manual to help others
            - Test and identify bugs or vulnerabilities, and provide optimization ideas for UI and functions
    - **Question:** May I use the source code of this project for further developement?
        **Answer:** Definitely. You may use all the current code from this project for the developement of other GUI applications for cores

##### To Do
###### Title: To Do
###### Tasks:
    - **Task:** Migrate the framework to wails-v3-alpha
        **Status:** pending
    - **Task:** Develop a visualized traffic usage plugin
        **Status:** pending
    - **Task:** More GNU/Linux desktops support
        **Status:** checked
    - **Task:** TUN mode in macOS and GNU/Linux
        **Status:** checked
    - **Task:** Better installation and upgrade experience on macOS and GNU/Linux
        **Status:** pending
    - **Task:** Rewrite some functions for GUI.for.SingBox
        **Status:** checked
    - **Task:** GUI applications for Android™
        **Status:** pending

#### install

##### Title: Installation

##### 1. Download
###### Title: 1. Download
###### GUI.for.clash Download Link: [Download Link](https://github.com/GUI-for-Cores/GUI.for.Clash/releases/latest)
###### GUI.for.singbox Download Link: [Download Link](https://github.com/GUI-for-Cores/GUI.for.SingBox/releases/latest)
###### Platforms:
    - Windows-amd64
    - Windows-arm64
    - Windows-386
    - macOS-amd64
    - macOS-arm64
    - Ubuntu-amd64
###### Instruction: Check the device's operating system and CPU architecture, download the corresponding file

##### 2. Windows
###### Title: 2. Windows
###### Steps:
    - Unzip the downloaded file, and move it to any folder of your choice;
    - Take GUI.for.Clash as an example: `D:\\MyPrograms\\GUI.for.Cores\\GUI.for.Clash`;
    - The path of the exe file is: `D:\\MyPrograms\\GUI.for.Cores\\GUI.for.Clash\\GUI.for.Clash.exe`.
###### Notes:
    - Avoid using `spaces` in the path
    - Avoid using `Chinese characters` in the path

##### 3. macOS
###### Title: 3. macOS
###### Steps:
    - Double click the zip file, move the `unzipped` file to `Desktop`, follow these steps:
    - Double click the executable, The error message "**Cannot open... because the developer cannot be verified**", click Cancel button;
    - Go to System Settings - Privacy & Security - Security, "**Cannot be opened because the developer cannot be verified**", click "**Open Anyway**", enter the password to confirm.
###### Note: The unzipped executable must be `moved` at least once (as the example step above, it is moved from Downloads to Desktop), otherwise the executable will not have the `permission to write`

##### 4. Linux
###### Title: 4. Linux
###### Description: Only tested on Ubuntu 22.04.4, if you are on other distributions, download the same file and try to run it.
###### Steps:
    - Unzipped the file, move the executable to the directory of your choice, take GUI.for.Clash for example: `/opt/GUI.for.Clash`
    - Create the desktop shortcut manually: create a file named `GUI.for.Clash.desktop`, copy and paste the following content, move the file to `/usr/share/applications` directory

    ```
    [Desktop Entry]
    Version=1.0
    Name=GUI.for.Clash
    Comment=GUI.for.Clash
    Exec=/path/to/GUI.for.Clash/GUI.for.Clash
    Icon=/path/to/GUI.for.Clash/appicon.png
    Terminal=false
    Type=Application
    Categories=Application;GUI.for.Clash;
    StartupNotify=true
    ```

##### 5. Directory Dissection
###### Title: 5. Directory Dissection
###### Example: Using GUI.for.Clash as an example:

    **Directory:** `GUI.for.Clash`
    **Structure:**
    - `data`: Application resource directory
        - `.cache`: Cache folder, temporary files should be placed in this directory
        - `mihomo`: Core files directory
        - `plugins`: Plugin directory, only stores plugin source code, each plugin corresponds to a plugin-xxx.js file
        - `rolling-release`: Rolling release resource directory, stores compiled frontend files
        - `rulesets`: Ruleset directory, referenced by the core application
        - `subscribes`: Subscription directory, referenced by the core application
        - `third`: Third-party application directory, third-party applications downloaded by plugins should be placed and run in this directory
        - `plugins.yaml`: Plugin index file
        - `profiles.yaml`: Configuration index file
        - `rulesets.yaml`: Ruleset index file
        - `scheduledtasks.yaml`: Scheduled tasks index file
        - `subscribes.yaml`: Subscriptions index file
        - `user.yaml`: Application configuration file: APP settings, plugin settings
    - `GUI.for.Clash.exe`: Main application

#### uninstall

##### Title: Uninstallation

##### If the application has been run
###### Title: If the application has been run
###### Steps:
    1. **Step:** Please run the application again and revert some changes. In the Settings page, turn off `Run As Admin` and `Startup on Boot`
        **Action:** Completely exit the application, including terminating the core process.
    2. **Step:** Delete the folder: `%APPDATA%[BinaryName.exe]`
        **Note:** BinaryName is the application's name
    3. **Step:** Delete the `data` folder (you can keep it if you want)
        **Description:** The `data` folder is in the same directory as the application, it is created when the application starts and stores binaries, subscriptions, configurations, rulesets, plugins and scheduled tasks files

##### If the application has not been run
###### Title: If the application has not been run
###### Description: You should give it a try

#### update

##### Title: Update

##### Update Normally
###### Title: Update Normally
###### Description: How to update the application normally.

###### 1. Windows and GNU/Linux
    ###### Title: 1. Windows and GNU/Linux
    ###### Steps:
        - Go to the `Settings` - `About`, click on the version number to check for updates

###### 1. macOS
    ###### Title: 1. macOS
    ###### Steps:
        - Go to the `Settings` - `About`, click on the version number to check for updates. then manually replace the main program.

##### Rolling-Release
###### Title: Rolling-Release
###### Description: How to update the application using Rolling-Release.
###### Steps:
    - Go to the `Settings` page, turn on `Enable Rolling Release`, install the `滚动发行` plugin, run the plugin to update the application

##### Comparison of the Two Update Methods
###### Title: Comparison of the Two Update Methods
###### Update Normally Note: Update normally is not user-friendly on macOS, but the experience is better on Windows and GNU/Linux. However, the download size is larger than Rolling Release, and it can be slower if the network connection is poor
###### Rolling Release Note: Rolling Release is user-friendly on all three platforms and supports automatic updates. It provides faster, newer and more stable GUI experience
###### Note: Note: Rolling Release is only supported by `GUI.for.Clash v1.8.2` and `GUI.for.SingBox v1.8.1` or later, and `Enable Rolling Release` must be turned on, the `滚动发行` plugin must be installed

#### how_it_works

##### Title: How it works
##### Description: Understand how the application works by configuring and starting it normally

##### 1. Getting Started
###### Title: 1. Getting Started
###### Description: When running the application for the first time, there is a `Quick Start` button. Enter the subscription link, and after saving it, GUI performs the following actions:
###### Steps:
    - Creates a config segment(profile) in profiles.yaml. This segment is the configuration for GUI, not for the cores
    - Creates a subscription data segment(subscription) in subscribes.yaml, including the subscription link, expiration date and traffic details
    - Fetches the subscription data, reads the proxies infomation from it, and saves them to `subscribes/ID_xxxxxx.yaml`. The files are named with random IDs
    - If the subscription data is successfully fetched, a successful initialization notification will be displayed, and the core will be ready to start. If the application fails to fetch the subscription data, the user must go to the `Subscriptions` page and manually update the corresponding subscription

##### 2. Starting with a Profile
###### Title: 2. Starting with a Profile
###### Description: Choose a profile, click the `Click to Start` button, GUI will generate a `config.yaml` or `config.json` file based on the chosen profile and call the core application to run with it. If multiple profiles were created, right-click on one of them in the `profiles` page, in the `More` submenu, click `Start/Restart with This Profile`. The profiles at the top of the `Profiles` page will be displayed on the `Overview` page, with a maximum of `4` configurations shown

##### 3. Configuring as System Proxy
###### Title: 3. Configuring as System Proxy
###### Description: By default, GUI does not configure itself as system proxy automatically. When `System Proxy` button on the `Overview` page is clicked, GUI reads HTTP port and Mixed port from the configuration file and chooses one of them as the system proxy. The Mixed port always has higher priority than the HTTP port

##### 4. TUN Mode
###### Title: 4. TUN Mode
###### Description: In TUN mode, GUI does not make any modifications to the operating system. Creating the virtual adapters and configuring the routes are done by the cores. TUN mode requires administrator privileges. Please turn on `Run as Admin` in the Settings page, exit the application, and re-open it. Please refrain from using the application's Restart button from any menu in this step.

#### plugins

##### Title: Plugins System
##### Description: The plugins system enhances the GUI's functionality and user experience.
##### Warning: Refrain from installing plugins from unknown or encrypted sources, or plugins that are sophisticated and hard to audit, as they may harm your system
##### Image: /zh/resources/guide/101_plugins.png

##### What Can the Plugins Do?
###### Title: What Can the Plugins Do?
###### Description: Plugins system is very powerful. It can perform the following actions:
###### Points:
    - Modifies the application's themes and languages, manages profiles, subscriptions, rulesets, and cores.
    - Modifies the generated configurations and the subscription data
    - Integrates third-party applications, expand GUI capabilities
    - All GUI operations can be performed by plugins

##### How Plugins Work
###### Title: How Plugins Work
###### Description: Plugins in GUI are a series of triggers. These triggers are executed when certain conditions are met. GUI supports the following types of triggers:
###### Triggers:
    - `on::manual`: Executes when the Run button is clicked, GUI performs the action `onRUN` in the source code
    - `on::subscribe`: Executes when the subscriptions are being updated, GUI performs the action `onSubscribe` in the source code and passes a parameter, which is an array of the proxy lists. This action requires returning an array of the proxy lists
    - `on::generate`: Executes when the configuration file is generated. GUI performs the action `onGenerate` in the source code and passes a parameter, which is an object containing the configuraion for the cores. This action needs to return the processed parameters or return them unchanged.
    - `on::startup`: Executes when the application is started, GUI performs the action `onStartup` in the source code, no parameter is passed, and no data needs to be returned
    - `on::shutdown`: Executes when the application is closed, GUI performs the action `onShutdown` in the source code, no parameter is passed, and no data needs to be returned
    - `onInstall`: If the `onInstall` parameter of a plugin is present, `Install` and `Uninstall` button will be added to the plugin card. Upon clicking, GUI will perform the `onInstall` and `onUninstall` actions in the source code. These actions can be used for initialization and follow-up tasks. When the `onInstall` action executes without errors, GUI will consider the plugin successfully installed and mark it as installed. When the `onUninstall` action executes without errors, GUI will consider the plugin successfully uninstalled and mark it as uninstalled (i.e., not installed)
    - `menus`: When `menus` is present in the plugin settings, the corresponding options will appear on the menu when right-clicking the plugin card. Upon clicking the options, the corresponding actions will be performed
    - `configuration`: When `configuration` is present in the plugin settings, right-click on the plugin card to configure the plugin

##### Plugin Status Code
###### Title: Plugin Status Code
###### Description: Plugin hooks are able to return status codes. The status codes are:
###### Status Codes:
    - **Code:** 0
        **Description:** No Status, recommended for use in `onInstall` and `onUninstall` actions
    - **Code:** 1
        **Description:** Running, recommended for use in `onRun` actions
    - **Code:** 2
        **Description:** Stopped, recommended for use in the customizable menu `Stop` actions

###### Code Example:
###### Description: The following content is an example, which includes all hooks' actions

    - **Run Hook:** `onRun` - Executes when the Run button is clicked
    ```javascript
    const onRun = async () => {
      await StartMyProgram();
      return 1; // 表示插件正在运行中
    };
    ```
    - **Stop Hook:** `Stop` - Custom menu item: Stop
    ```javascript
    const Stop = async () => {
      await StopMyProgram();
      return 2; // 表示已经停止运行
    };
    ```
    - **Start Hook:** `Start` - Custom menu item: Start
    ```javascript
    const Start = async () => {
      await StartMyProgram();
      return 1; // 表示插件正在运行中
    };
    ```
    - **Install Hook:** `onInstall` - Executes when installing
    ```javascript
    const onInstall = async () => {
      await InstallMyProgram();
      return 0; // 表示初始状态
    };
    ```
    - **Uninstall Hook:** `onUninstall` - Executes when uninstalling
    ```javascript
    const onUninstall = async () => {
      await UninstallMyProgram();
      return 0; // 表示初始状态
    };
    ```
    - **Subscribe Hook:** `onSubscribe` - Executes when updating subscription
    ```javascript
    const onSubscribe = async (proxies, subscription) => {
      return proxies;
    };
    ```
    - **Generate Hook:** `onGenerate` - Executes when generating configuration
    ```javascript
    const onGenerate = async (config, profile) => {
      return config;
    };
    ```
    - **Startup Hook:** `onStartup` - Executes when the application is started
    ```javascript
    const onStartup = async () => {};
    ```
    - **Shutdown Hook:** `onShutdown` - Executes when the application is closed
    ```javascript
    const onShutdown = async () => {};
    ```
    - **Ready Hook:** `onReady` - Executes when the application is ready
    ```javascript
    const onReady = async () => {};
    ```
    - **Task Hook:** `onTask` - Executes when the scheduled task is performed
    ```javascript
    const onTask = async () => {};
    ```
    - **Configure Hook:** `onConfigure` - Executes when configuring the plugin
    ```javascript
    const onConfigure = async (config, old) => {};
    ```

##### Code of Conduct for Creating Plugins
###### Title: Code of Conduct for Creating Plugins
###### Points:
    - The code should be well-formatted, easy to read, and non-encrypted
    - I/O operations should be performed inside the application's data folder, refrain from accessing the user's private folders
    - Temporary files should be stored in the `data/.cache` folder, the files must be deleted upon the completion of the operations
    - Third-Party applications should be placed in the `data/third` folder, the corresponding folder must be deleted upon uninstallation
    - Refrain from dynamically creating `script`, `style`, and other tags, as well as importing external js, CSS, and similar operations
    - If any invasive operations are performed on the operating system, the changes must be reverted upon uninstallation

##### Examples of Creating Plugins
###### Title: Examples of Creating Plugins

###### 1. Example of An `onRun` Triggered Plugin
    ###### Title: 1. Example of An `onRun` Triggered Plugin
    ###### Steps:
        - First, create a plugin:  ![](/zh/resources/guide/102_plugin_example.png)
        - then, write the corresponding code:  ![](/zh/resources/guide/103_plugin_example.png)
        - Finally, try to install, run and uninstall the plugin: ![](/zh/resources/guide/104_plugin_example.png)

###### 2. Example of An `onSubscribe` Triggered Plugin
    ###### Title: 2. Example of An `onSubscribe` Triggered Plugin
    ```javascript
    const onSubscribe = (proxies, metadata) => {
      // 示例：把节点名称中的新加坡替换为空
      proxies = proxies.map((v) => {
        return {
          ...v,
          name: v.name.replace("新加坡", ""),
        };
      });
      return proxies;
    };
    ```
    ###### Description: params: proxies是一个代理数组\nparams: metadata是订阅元数据\nreturn: 请返回一个代理数组[]

###### 3. Example of An `onGenerate` Triggered Plugin
    ###### Title: 3. Example of An `onGenerate` Triggered Plugin
    ```javascript
    const onGenerate = (config, metadata) => {
      if (metadata.name == "某个profile") {
        // 仅当某个profile时，才处理
        // 一些处理...
      }
      // 移除tun配置
      delete config.tun;
      // 关闭DNS服务器
      config.dns.enable = false;
      return config;
    };
    ```
    ###### Description: params: config是已生成的标准的内核配置，即config.yaml文件的内容\nparams: metadata是生成内核配置的源数据，即GUI所使用的profile数据\nreturn: 请返回标准的内核配置

###### 4. Example of An `onStartup` Triggered Plugin
    ###### Title: 4. Example of An `onStartup` Triggered Plugin
    ```javascript
    const onStartup = () => {
        alert('APP启动了')
    }
    ```

###### 5. Example of An `onShutdown` Triggered Plugin
    ###### Title: 5. Example of An `onShutdown` Triggered Plugin
    ```javascript
    const onShutdown = () => {
        alert('APP关闭了')
    }
    ```

##### Capabilities: Plugins
###### Title: Capabilities: Plugins
###### Description: We demonstrated Plugins.message and Plugins.HttpGet above. So what other capabilities does the `Plugins` object have? Press Ctrl+Shift+F12 in the application interface to open the DevTools, switch to the console tab, type `Plugins`, and press Enter to find out. For more detailed examples, refer to the source code.

##### More Examples
###### Title: More Examples
###### Example Categories:

    - **Category:** Message Display
        **Description:** Examples for displaying and managing messages within the GUI.
        ```javascript
        // 消息提示示例
        const { id } = Plugins.message.info('GUI.for.Cores', 4_000)
        await Plugins.sleep(1_000)
        Plugins.message.update(id, 'is')
        await Plugins.sleep(1_000)
        Plugins.message.update(id, 'powerful')
        await Plugins.sleep(1_000)
        Plugins.message.destroy(id)
        ```
    - **Category:** APP Settings
        **Description:** Examples for interacting with and modifying application-level settings.
        ```javascript
        // APP设置示例
        const appSettings = Plugins.useAppSettingsStore()
        appSettings.app.theme = 'dark' // light
        appSettings.app.lang = 'en' // zh
        ```
    - **Category:** System Proxy Management
        **Description:** Examples for controlling and manipulating system-level proxy settings.
        ```javascript
        // 系统代理管理示例
        const envStore = Plugins.useEnvStore()
        envStore.setSystemProxy()
        envStore.clearSystemProxy()
        envStore.switchSystemProxy()
        ```
    - **Category:** Core Management
        **Description:** Examples for managing the core application (e.g., starting, stopping, restarting).
        ```javascript
        // 内核管理示例
        const kernelApiStore = Plugins.useKernelApiStore()
        kernelApiStore.startKernel()
        kernelApiStore.stopKernel()
        kernelApiStore.restartKernel()
        ```
    - **Category:** Profile Management
        **Description:** Examples for managing application profiles (adding, editing, deleting).
        ```javascript
        // 配置管理示例
        const profilesStore = Plugins.useProfilesStore()
        profilesStore.addProfile(p: ProfileType)
        profilesStore.editProfile(id: string, p: ProfileType)
        profilesStore.deleteProfile(id: string)
        ```
    - **Category:** Subscription Management
        **Description:** Examples for managing subscriptions (adding, editing, updating).
        ```javascript
        // 订阅管理示例
        const subscribesStore = Plugins.useSubscribesStore()
        subscribesStore.addSubscribe(s: SubscribeType)
        subscribesStore.editSubscribe(id: string, s: SubscribeType)
        subscribesStore.deleteSubscribe(id: string)
        subscribesStore.updateSubscribe(id: string)
        ```
    - **Category:** Ruleset Management
        **Description:** Examples for managing rulesets (adding, editing, deleting, updating).
        ```javascript
        // 规则组管理示例
        const rulesetsStore = Plugins.useRulesetsStore()
        rulesetsStore.addRuleset(r: RuleSetType)
        rulesetsStore.editRuleset(id: string, r: RuleSetType)
        rulesetsStore.deleteRuleset(id: string)
        rulesetsStore.updateRuleset(id: string)
        ```
    - **Category:** Plugin Management
        **Description:** Examples for managing plugins (adding, editing, deleting, updating, reloading, and updating triggers).
        ```javascript
        // 插件管理示例
        const pluginsStore = Plugins.usePluginsStore()
        pluginsStore.addPlugin(p: PluginType)
        pluginsStore.editPlugin(id: string, p: PluginType)
        pluginsStore.deletePlugin(id: string)
        pluginsStore.updatePlugin(id: string)
        pluginsStore.reloadPlugin(plugin: PluginType, code = '')
        pluginsStore.updatePluginTrigger(plugin: PluginType)
        ```
    - **Category:** Scheduled Task Management
        **Description:** Examples for managing scheduled tasks (deleting, editing, adding).
        ```javascript
        // 计划任务管理示例
        const scheduledTasksStore = Plugins.useScheduledTasksStore()
        scheduledTasksStore.deleteScheduledTask(id: string)
        scheduledTasksStore.editScheduledTask(id: string, s: ScheduledTaskType)
        scheduledTasksStore.addScheduledTask(s: ScheduledTaskType)
        ```

##### Plugin-Hub and Notes
###### Title: Plugin-Hub and Notes
###### Plugin Hub Description: Plugin-Hub is a repository for users to conveniently download plugins, the source code can be reviewed on [Plugin-Hub](https://github.com/GUI-for-Cores/Plugin-Hub)。
###### Image: /zh/resources/guide/105_plugin_hub.png
###### Edit Button Note: Modifying the source code of the plugins downloaded from Plugin-Hub is discouraged by clicking the ~`Edit`~ (now changed to `Develope`) button on the plugin card's top right menu. This is because all the plugins published in Plugin-Hub are already debugged, and the triggers, menus and config options are all well-designed. If users arbitrarily edit these plugins, such as adding triggers that are not implemented in the source code, the plugins will fail to execute
###### Develop Button Note: So why do we not remove the `Develope` button? Because we want to leave the choices to the users. Some users might have ideas to improve the capabilities of the existing plugins, GUI does not limit these users
###### Uninstall Reinstall Note: But what if the source code is messed up? Uninstall and delete the plugins, then go to the Plugin-Hub and reinstall them
###### Install Uninstall Button Note: Why do some plugins have the `Install` and `Uninstall` buttons while others do not? This depends on how the plugins work. For example, the plugin AdGuardHome itself does not provide any functionalities; it requires a third-party application to work, that is why the `Install` and `Uninstall` buttons are provided for downloading and uninstalling the application. Moreover, 节点转换 plugin does not require any third-party applications to run, so the `Install` and `Uninstall` buttons are not necessary
###### Configure Option Note: Some plugins need to be configured before functioning, right-click on the plugin card and choose the third option `Configure` to open the config page. Some plugins do not have the `Configure` option, which means that these plugins do not require to be configured to function
###### Closing Note: That's about it. We welcome you to write plugins for GUI and submit them to the Plugin-Hub

#### tasks

##### Title: Scheduled Task System
##### Description: How to configure and use the scheduled task system.
##### Image: /zh/resources/guide/301_tasks.png

##### What Can the Scheduled Task System do?
###### Title: What Can the Scheduled Task System do?
###### Description: It can perform the following actions regularly:
###### Points:
    - Regularly updates subscriptions
    - Regularly updates rulesets
    - Regularly updates plugins
    - Regularly runs plugins
    - Regularly runs scripts

##### How the Scheduled Task Works
###### Title: How the Scheduled Task Works
###### Dependencies: Dependencies for the Scheduled Task System: https://github.com/robfig/cron/tree/v3
###### Details:
    - Scheduled tasks use cron expression
    - Supports second-level precision, meaning the cron expression format is 6 fields, for example, `*  *  *  *  *  *`, which runs every second.

##### Examples of Creating Scheduled Tasks
###### Title: Examples of Creating Scheduled Tasks

###### 1. Regularly update subscriptions
    ###### Title: 1. Regularly update subscriptions
    ###### Image: /zh/resources/guide/302_tasks.png

###### 2. Regularly update rulesets
    ###### Title: 2. Regularly update rulesets
    ###### Image: /zh/resources/guide/303_tasks.png

###### 3. Regularly update plugins
    ###### Title: 3. Regularly update plugins
    ###### Image: /zh/resources/guide/304_tasks.png

###### 4. Regularly run plugins
    ###### Title: 4. Regularly run plugins
    ###### Description: The plugin requires an `onTask` action present
    ```javascript
    const onTask = () => {
      // 插件逻辑
      return "返回值会出现在日志中";
    };
    ```
    ###### Image: /zh/resources/guide/305_tasks.png

###### 5. Regularly run scripts
    ###### Title: 5. Regularly run scripts
    ###### Description: `return` can be written in the script. The returned value will show up in the logs
    ###### Image: /zh/resources/guide/306_tasks.png

##### Scheduled Task Logs
###### Title: Scheduled Task Logs
###### Image: /zh/resources/guide/307_tasks.png

#### mixin_script

##### Title: Mixin & Script
##### Description: Enhancements to profile customization, including Mixin and Script features.

##### Introduction
###### Title: Introduction
###### Description: Before `Mixin` and `Script` were introduced, similar actions could be performed by the plugins. The way to do it was to add an `onGenerate` trigger, modify the generated config file with customizations, but this caused inconvenience:
###### Inconveniences:
    - 1. Affects all config files, if only some of them require to be modified, `if` must be used
    - 2. The code must be in `JavaScript`, which is not friendly to the users who do not have coding experience
###### Mixin and Script Solution: `Mixin` and `Script` fixed the two problems mentioned above. They are bound to the current profile and work only on it. They do not affect all profiles and do not require knowing `if` and `JavaScript`

##### Mixin
###### Title: Mixin
###### Description: `Mixin` combines `the config that provided by user` and `the config that generated by GUI`. If there are conflicts, the user can designate which one has the higher priority
###### Image: /zh/resources/guide/601_mixin.png
###### Examples:

    - **GUI.for.Clash, in YAML format**
        ###### Title: GUI.for.Clash, in YAML format
        ```yaml
        mode: global
        ipv6: true
        mixed-port: 7890
        tun:
          enable: true
          stack: gVisor
          dns-hijack:
            - any:53
        dns:
          enable: true
          ipv6: true
          default-nameserver:
            - 223.5.5.5
            - 114.114.114.114
        ```

    - **GUI for SingBox, in JSON format**
        ###### Title: GUI for SingBox, in JSON format
        ```json
        {
          "log": {
            "timestamp": false
          },
          "experimental": {
            "clash_api": {
              "external_controller": "127.0.0.1:20123",
              "default_mode": "global"
            },
            "cache_file": {
              "enabled": true,
              "store_fakeip": true
            }
          }
        }
        ```
###### Note: Mixin does not support `array.concat`, it can only choose between `the config that provided by user` or `the config that generated by GUI`. If the operation is performed on an array, `Script` is the only option

##### Script
###### Title: `Script`
###### Description: `Script` performs the same action as the `onGenerate` hook in plugins. GUI passes `the config that generated by GUI` to the `onGenerate` action via the parameter `config`, the user modifies `config`, and the final configuration is returned
###### Image: /zh/resources/guide/602_script.png
###### Examples:

    - **GUI.for.Clash**
        ###### Title: GUI.for.Clash
        ```javascript
        const onGenerate = async (config) => {
          config.dns["default-nameserver"].unshift("223.5.5.5");
          config.dns["default-nameserver"].unshift("114.114.114.114");
          config.sniffer = {
            enable: false,
            "force-dns-mapping": true,
            "parse-pure-ip": true,
            "override-destination": false,
            sniff: {
              HTTP: {
                ports: [80, "8080-8880"],
                "override-destination": true,
              },
              TLS: {
                ports: [443, 8443],
              },
              QUIC: {
                ports: [443, 8443],
              },
            },
            "force-domain": ["+.v2ex.com"],
            "skip-domain": ["Mijia Cloud"],
          };
          return config;
        };
        ```

    - **GUI.for.SingBox**
        ###### Title: GUI.for.SingBox
        ```javascript
        const onGenerate = async (config) => {
          config.log.timestamp = false;
          config.experimental.clash_api.default_mode = "global";
          config.dns.servers.unshift({
            tag: "remote-dns-google",
            address: "tls://8.8.4.4",
            address_resolver: "remote-resolver-dns",
            detour: "🚀 Select",
          });
          return config;
        };
        ```

#### skills

##### Title: Tips

##### Right-Click on Title Bar
###### Title: Right-Click on Title Bar
###### Description: The following functions are provided when right-clicking on the title bar
###### Functions:
    - Reset Window: Resets the window to the optimal size. If you prefer things to be perfectly aligned, you might find yourself using this option frequently
    - Reload Window: Equivalent to refreshing the interface. GUI performs a series actions after starting, except triggering the `onStartup` action
    - Restart App: Equivalent to exiting GUI and then restarting it, the `onStartup` action will be triggered
    - Exit App: Completely quits GUI, but whether the core and plugins quit depends on your configuration

##### `Cnnections` on the OverView Page Is Clickable
###### Title: `Cnnections` on the OverView Page Is Clickable
###### Description: The Connections page shows all connections information returned by the cores. `Right-click` on each connection to add it to a corresponding ruleset. The modification is persistent and stored in the `rulesets/direct.yaml`, `rulesets/reject.yaml`, and `rulesets/proxy.yaml` files. To make the modification effective, add these three ruleset files to the profiles

##### `Controller` on the Buttom of the OverView Page Is Clickable
###### Title: `Controller` on the Buttom of the OverView Page Is Clickable
###### Description: Clicking on `Controller` opens the groups panel, as does scrolling on the OverView Page

##### Each Item on the Profiles Page Is Right-Clickable
###### Title: Each Item on the Profiles Page Is Right-Clickable
###### Description: Right-Click on each profile, there are options for changing names, general settings and more. The user does not have to click on the `Edit` button in the top right corner and then go to the respective settings page one step at a time
###### More Option Description: `More` option in the right-click menu allows the user to switch to current profile with one click or use current profile as a template to create a new profile

##### The User Can Add the Proxy Provider's `Website Link` to the Subscription Card When Adding it
###### Title: The User Can Add the Proxy Provider's `Website Link` to the Subscription Card When Adding it
###### Description: After saving, a `link` icon will appear on the subscription card. Click on it to quickly open the proxy provider's website

##### The `Plugin-Hub` Button on the Plugins Page Is the Plugin-Hub
###### Title: The `Plugin-Hub` Button on the Plugins Page Is the Plugin-Hub
###### Description: All plugins do not need to be manually imported from the GitHub repository. Simply open the `Plugin-Hub` to complete the process

##### Update the Applications by Clicking on the `Settings` - `About` Button
###### Title: Update the Applications by Clicking on the `Settings` - `About` Button

##### Press Ctrl + Shift + F12 to Open DevTools
###### Title: Press Ctrl + Shift + F12 to Open DevTools
###### Description: The Applications do not have a log system, so no log is recorded. Debugging can be done in the DevTools

##### Press Ctrl + Shift + P to Open Command Palette
###### Title: Press Ctrl + Shift + P to Open Command Palette
###### Description: The Command Palette has some built-in options, such as shortcuts. Use the `Arrow Key` to select, `Enter` to execute, and `Esc` to quit

#### plugin_list

##### Title: 插件列表
##### Plugins:

    - **Name:** 插件配置示例
        **Plugin ID:** plugin-configuration-example
        **Description:** 插件配置示例,该示例包含了多种数据格式:字符串数组、长文本、键值对、布尔值、单文本。开发者可在编辑插件中配置插件源码中使用到的参数,通过相关API进行引用。用户可右键【配置插件】对这些参数按需修改。
        **Source Code:** 查看源码
    - **Name:** GeoLite2 操作示例
        **Plugin ID:** plugin-mmdb-example
        **Description:** 插件API MMDB操作示例
        **Source Code:** 查看源码
    - **Name:** 节点转换
        **Plugin ID:** plugin-node-convert
        **Description:** 节点格式转换插件,支持v2Ray格式转clash、clash格式转sing-box。
        **Source Code:** 查看源码
    - **Name:** 滚动发行
        **Plugin ID:** plugin-rolling-release
        **Description:** 提升GUI升级体验,获取更快、更新、更稳定的版本更新。
        **Source Code:** 查看源码
    - **Name:** Gemini 助手
        **Plugin ID:** plugin-gemini-ai
        **Description:** 使用Gemini,GUI高高手!
        **Source Code:** 查看源码
        **Link:** https://gui-for-cores.github.io/zh/guide/plugin-hub/
    - **Name:** Workers AI 助手
        **Plugin ID:** plugin-workers-ai
        **Description:** 关于GUI,为什么不问问神奇海螺?
        **Source Code:** 查看源码
    - **Name:** TUN 模式助手
        **Plugin ID:** plugin-tun-assistant
        **Description:** TUN模式食用指南!
        **Source Code:** 查看源码
    - **Name:** 系统证书安全检测
        **Plugin ID:** plugin-check-certificate
        **Description:** 检测系统是否具有未经验证的证书!
        **Source Code:** 查看源码
    - **Name:** 代理守卫
        **Plugin ID:** plugin-system-proxy-guard
        **Description:** 谁动了我的系统代理?防止系统代理被篡改
        **Source Code:** 查看源码
    - **Name:** 外接网卡系统代理
        **Plugin ID:** plugin-systemproxy-external
        **Description:** 为macOS的外接网卡设置系统代理。
        **Source Code:** 查看源码
    - **Name:** Hosts管理
        **Plugin ID:** plugin-hosts-management
        **Description:** 在三种预设Hosts中自由切换
        **Source Code:** 查看源码
    - **Name:** Twemoji.Mozilla
        **Plugin ID:** plugin-install-font
        **Description:** 下载并安装字体“Twemoji.Mozilla.ttf”,你的节点将正常显示国旗图标。(Twemoji font in COLR/CPAL layered format)
        **Source Code:** 查看源码
    - **Name:** Live2D 看板娘
        **Plugin ID:** plugin-live2d-widget
        **Description:** 把萌萌哒的看板娘抱回家(ノ≧∇≦)ノ
        **Source Code:** 查看源码
    - **Name:** AdGuardHome
        **Plugin ID:** plugin-adguardhome
        **Description:** 集成AdGuardHome程序。(Network-wide ads & trackers blocking DNS server)
        **Source Code:** 查看源码
    - **Name:** 文件互传助手
        **Plugin ID:** plugin-file-transfer-assistant
        **Description:** 文件互传助手,支持Siri快捷指令。
        **Source Code:** 查看源码
    - **Name:** Alist
        **Plugin ID:** plugin-alist
        **Description:** A file list/WebDAV program that supports multiple storages, powered by Gin and Solidjs. / 一个支持多存储的文件列表/WebDAV程序,使用 Gin 和 Solidjs。
        **Source Code:** 查看源码
    - **Name:** frp 内网穿透
        **Plugin ID:** plugin-frp-client
        **Description:** FRP内网穿透客户端程序。(A fast reverse proxy to help you expose a local server behind a NAT or firewall to the internet.)
        **Source Code:** 查看源码
    - **Name:** Sub-Store 纯净版
        **Plugin ID:** plugin-sub-store-v3
        **Description:** 高级订阅管理工具。无Node.js、无MITM, 优雅。(Advanced Subscription Manager for QX, Loon, Surge, Stash and Shadowrocket!)
        **Source Code:** 查看源码
    - **Name:** Sub-Store Nodejs版
        **Plugin ID:** plugin-sub-store-v2
        **Description:** 高级订阅管理工具,Node.js版,无需编译。(Advanced Subscription Manager for QX, Loon, Surge, Stash and Shadowrocket!)
        **Source Code:** 查看源码
    - **Name:** Sub-Store 脚本支持
        **Plugin ID:** plugin-sub-store-script-support
        **Description:** 安装后Sub-Store可正常使用测落地的相关脚本。
        **Source Code:** 查看源码
    - **Name:** 配置同步
        **Plugin ID:** plugin-sync-configuration
        **Description:** 使用自建服务同步GUI配置。
        **Source Code:** 查看源码
    - **Name:** 配置同步 - Gists
        **Plugin ID:** plugin-sync-configuration-gists
        **Description:** 使用Gists同步GUI配置。
        **Source Code:** 查看源码
    - **Name:** 配置同步 - WebDAV
        **Plugin ID:** plugin-sync-configuration-webdav
        **Description:** 使用webDAV协议同步GUI配置。
        **Source Code:** 查看源码
    - **Name:** 搬瓦工VPS 管理
        **Plugin ID:** plugin-bandwagon-vps
        **Description:** 管理你的搬瓦工VPS。
        **Source Code:** 查看源码
    - **Name:** 解锁网易云音乐
        **Plugin ID:** plugin-unblockneteasemusic
        **Description:** 解锁网易云音乐插件,需要安装CA证书。请在音乐客户端内开启:使用IE代理设置。(Revive unavailable songs for Netease Cloud Music (Refactored & Enhanced version))
        **Source Code:** 查看源码
    - **Name:** 防代理重名
        **Plugin ID:** plugin-index-the-proxy-name
        **Description:** 在代理名称后面加上索引、避免名称冲突。
        **Source Code:** 查看源码
    - **Name:** 解除UWP应用本地回环限制
        **Plugin ID:** plugin-uwp-loopback-exempt
        **Description:** 解除Window的UWP应用本地回环限制,解除后UWP应用将支持系统代理。
        **Source Code:** 查看源码
    - **Name:** 一键设置终端代理
        **Plugin ID:** plugin-terminal-proxy
        **Description:** 一键设置系统cmd、powershell等终端的代理,非常适用于使用系统代理的用户。
        **Source Code:** 查看源码
    - **Name:** 更好的代理名称显示
        **Plugin ID:** plugin-modify-proxy-name
        **Description:** 在节点名称前加上对应的国家地区的 Emoji;移除节点名称中的一些关键词;对节点名称进行标号。 Supported by: QiChaiQiChai
        **Source Code:** 查看源码
    - **Name:** IP 信息查询
        **Plugin ID:** plugin-ip-geolocation
        **Description:** 快速查询当前 IP 信息。Supported by: QiChaiQiChai
        **Source Code:** 查看源码
    - **Name:** SpeedTest 速度测试
        **Plugin ID:** plugin-speedtest
        **Description:** 测试当前节点延迟和下行速度。Supported by: QiChaiQiChai
        **Source Code:** 查看源码
    - **Name:** GeoIP 查询
        **Plugin ID:** plugin-geoip-search
        **Description:** 查询 IP 信息。Supported by: QiChaiQiChai
        **Source Code:** 查看源码
    - **Name:** Scamalytics IP 欺诈风险查询
        **Plugin ID:** plugin-scamalytics-ip-fraud-risk
        **Description:** 查询当前节点落地 IP 的欺诈风险。Supported by: QiChaiQiChai
        **Source Code:** 查看源码
    - **Name:** Yacd-meta 仪表板
        **Plugin ID:** plugin-open-yacd-meta-dashboard
        **Description:** 启动 Yacd-meta 仪表板。Supported by: QiChaiQiChai
        **Source Code:** 查看源码
    - **Name:** 自定义主题
        **Plugin ID:** plugin-custom-theme
        **Description:** 通过修改css变量,实现任意主题配色!
        **Source Code:** 查看源码
    - **Name:** 阿里云盘签到
        **Plugin ID:** plugin-aliyunpan-signin
        **Description:** 阿里云盘自动签到,可配合计划任务系统。
        **Source Code:** 查看源码
    - **Name:** 屏幕录制
        **Plugin ID:** plugin-screen-recorder
        **Description:** 使用浏览器提供的API录制屏幕。
        **Source Code:** 查看源码
    - **Name:** RESTful-Api v1
        **Plugin ID:** plugin-gui-restful-api-v1
        **Description:** GUI RESTful-Api,可通过HTTP协议控制GUI。
        **Source Code:** 查看源码
    - **Name:** metacubexd 仪表板
        **Plugin ID:** plugin-metacubexd-dashboard
        **Description:** 一个更好看的Mihomo仪表板。Supported by: ColinZeb
        **Source Code:** 查看源码

#### gui_for_singbox

##### Title: GUI.for.SingBox 用户指南 (v1.9.0)
##### Website: https://gui-for-cores.github.io/zh/guide/gfs/community
##### Description: GUI.for.SingBox 用户指南，版本 v1.9.0

##### Introduction
###### Title: 简介
###### Content: 欢迎使用 GUI.for.SingBox！本指南将帮助您快速上手，通过简洁的图形界面操作，轻松生成 Sing-Box 客户端配置并运行，无需再为复杂的 JSON 配置而烦恼。GUI.for.SingBox 几乎支持 Sing-Box 作为客户端的全部特性。

##### Software Settings
###### Title: 软件设置
###### Description: 本节介绍 GUI.for.SingBox 的各项设置选项，以便您根据自身需求进行配置。

###### General Settings
    ###### Title: 通用设置
    ###### Image: /zh/resources/gfs/v1.9.0/GUI-settings.png
    ###### Options:
        - **Option:** 语言 (Language)
            **Description:** 选择软件显示语言，目前支持中文和英文。本指南以**中文**为例。
        - **Option:** 内核缓存
            **Description:** Sing-Box 的缓存数据存储目录，路径为 `data/sing-box`，用于持久化 Fake-IP 数据和远程规则集。
        - **Option:** 关闭窗口时退出程序
            **Description:** 勾选后，点击窗口关闭按钮将直接退出程序，不显示托盘图标。
        - **Option:** 退出程序时同时关闭内核
            **Description:** 勾选后，退出程序时会同时结束 `sing-box.exe` 进程，停止 Sing-Box 运行。
        - **Option:** 自动启动内核程序
            **Description:** 勾选后，启动软件时会自动启动 Sing-Box 内核。
        - **Option:** 以管理员身份运行
            **Description:** 对于非 Windows `Administrators` 用户组成员，建议勾选此项，以避免 TUN 模式启动失败或在 `Tun.stack` 为 `system` 或 `mixed` 时无法修改系统防火墙设置。
        - **Option:** 开机时启动
            **Description:** 勾选后，程序将随系统自动启动。

###### Kernel Tab
    ###### Title: 内核选项卡
    ###### Description: 用于管理 Sing-Box 核心程序，包括下载和更新。

###### About Tab
    ###### Title: 关于选项卡
    ###### Description: 查看软件版本信息和进行在线更新。

##### Subscription Settings (必须)
###### Title: 订阅设置 (必须)
###### Description: 本节介绍如何配置订阅，这是使用 GUI.for.SingBox 的必要步骤。
###### Subscription Format Description: GUI.for.SingBox 的订阅部分仅需包含出站 (outbounds) 部分，格式如下：
###### Subscription Format Code:
    ```json
    [
        {
            "type": "vless",
            "tag": "Proxy1",
            "server": "xxx.xxx.xxx.xxx",
            "server_port": 443,
            "uuid": "..."
        },
        {
            "type": "shadowsocks",
            "tag": "Proxy2"
        }
    ]
    ```

###### Manual Management Example
    ###### Description: 以下以手动管理方式为例，后续您可使用 GUI 进行节点管理。
    ###### Image: /zh/resources/gfs/v1.9.0/add-subscription.png
    ###### Steps:
        - **Step:** 保存路径
            **Description:** 填写 JSON 文件的完整路径，建议使用相对路径。
        - **Step:** 命名
            **Description:** 为订阅文件命名并保存。
        - **Step:** 更新
            **Description:** 点击更新按钮，确保订阅的节点数量正确显示。
    ###### Subscription Info Image:
    ###### Image: /zh/resources/gfs/v1.9.0/subscription-list.png
    ###### Alt: 订阅信息.png
    ###### Title: 订阅信息

##### Config Settings (必须)
###### Title: 配置设置 (必须)
###### Description: 本节介绍如何创建和管理配置，这是使用 GUI.for.SingBox 的核心步骤.
###### Config Menu Image:
    ###### Image: /zh/resources/gfs/v1.9.0/config-menu.png
    ###### Alt: 右键菜单.png
    ###### Title: 右键菜单
###### Steps:
    - **Step:** 添加配置
        **Description:** 点击`添加`新建配置，并自定义配置名称。
    - **Step:** 右键菜单
        **Description:** 在创建的配置上点击右键，可以进行详细设置，或者使用向导模式进行逐步设置。
    - **Step:** 文档按钮
        **Description:** 在设置过程中，点击右上角的`文档按钮`，可以预览当前配置的 JSON 文件。
###### Add Config Image:
    ###### Image: /zh/resources/gfs/v1.9.0/add-config.png
    ###### Alt: 新建配置.png
    ###### Title: 新建配置
###### Preview Config Image:
    ###### Image: /zh/resources/gfs/v1.9.0/perview-config.png
    ###### Alt: 预览配置.png
    ###### Title: 预览配置

###### General Settings
    ###### Title: 通用设置
    ###### Description: 本节介绍配置的全局选项。
    ###### Image: /zh/resources/gfs/v1.9.0/general-settings.png
    ###### Options:
        - **Option:** 工作模式
            **Description:** 对应 Sing-Box 的 `clash_api.default_mode` 字段，设置内核的默认工作模式。
            ###### Available Modes:
                - **Name:** 全局 (global)
                    **Description:** 所有流量走代理。
                - **Name:** 规则 (rule)
                    **Description:** 根据规则列表决定是否走代理，建议默认使用。
                - **Name:** 直连 (direct)
                    **Description:** 所有流量直连。
        - **Option:** 禁用日志
            **Description:** 对应 Sing-Box 的 `log.disabled` 字段，启用后将不输出日志。
        - **Option:** 日志级别
            **Description:** 对应 Sing-Box 的 `log.level` 字段，设置日志输出级别，等级由低到高：
            ###### Log Levels:
                - **Level:** 跟踪 (trace)
                    **Description:** 详细的调试信息，通常用于开发。
                - **Level:** 调试 (debug)
                    **Description:** 调试信息，有助于诊断问题。
                - **Level:** 信息 (info)
                    **Description:** 一般的信息，例如程序启动、配置加载等。
                - **Level:** 警告 (warn)
                    **Description:** 可能存在问题的情况，但不一定导致错误。
                - **Level:** 错误 (error)
                    **Description:** 发生了错误，程序可能无法正常运行。
                - **Level:** 致命 (fatal)
                    **Description:** 严重的错误，导致程序崩溃。
                - **Level:** 恐慌 (panic)
                    **Description:** 紧急情况，程序将立即停止运行。
        - **Option:** 日志保存路径
            **Description:** 对应 Sing-Box 的 `log.output` 字段，启用后日志将输出到指定文件。
        - **Option:** 日志时间戳
            **Description:** 对应 Sing-Box 的 `log.timestamp` 字段，启用后输出的日志将显示时间。
        - **Option:** RESTful WEB API 监听地址
            **Description:** 对应 Sing-Box 的 `clash_api.external_controller` 字段，用于 `clash_api` 方式的监听地址，格式为 `address:port`。用于第三方控制面板。如果为空，则禁用 `clash_api`。如需局域网访问，请将 `address` 改为 `0.0.0.0`。
        - **Option:** RESTful API 密钥
            **Description:** 对应 Sing-Box 的 `clash_api.secret` 字段，用于 `clash_api` 的身份验证。当监听地址为 `0.0.0.0` 时，建议设置此项。
        - **Option:** Web UI 路径
            **Description:** 对应 Sing-Box 的 `clash_api.external_ui` 字段，指定本地 Web 面板资源的目录，例如目录为 `ui`，将通过 `http://{{external-controller}}/ui` 访问。如果设置了此项，但指定的目录为空，或者不存在时，会默认下载 Yacd-meta 面板。
        - **Option:** Web UI 下载地址
            **Description:** 对应 Sing-Box 的 `clash_api.external_ui_download_url` 字段，用于指定 Web 静态资源的远程 ZIP 文件下载地址。
        - **Option:** Web UI 下载地址的出站标签
            **Description:** 对应 Sing-Box 的 `clash_api.external_ui_download_detour` 字段，指定下载 Web 静态资源使用的出站。
        - **Option:** 允许从私有网络访问
            **Description:** 对应 Sing-Box 的 `clash_api.access_control_allow_private_network` 字段，启用后将允许从公共网站访问私有网络上的 `clash_api`。
        - **Option:** 允许的 CORS 来源
            **Description:** 对应 Sing-Box 的 `clash_api.access_control_allow_origin` 字段，指定允许访问 `clash_api` 的来源，如果需要从公共网站访问私有网络上的 `clash_api`，则必须明确指定来源地址，而不是使用 `*`。
        - **Option:** 启用缓存
            **Description:** 对应 Sing-Box 的 `cache_file.enabled` 字段，启用后将记录出站分组的选择，以及将远程规则集存储到缓存文件中。
        - **Option:** 缓存文件路径
            **Description:** 对应 Sing-Box 的 `cache_file.path` 字段，用于指定缓存文件的路径，默认使用 `cache.db`。
        - **Option:** 缓存文件中的标识符
            **Description:** 对应 Sing-Box 的 `cache_file.cache_id` 字段，默认为空，如果设置了内容，指定的配置缓存将使用一个独立的存储区域。当有多个配置时，建议为不同的配置设置特定的标识，避免缓存干扰。
        - **Option:** 持久化 FakeIP
            **Description:** 对应 Sing-Box 的 `cache_file.store_fakeip` 字段，启用后将把 `fakeip` 记录存储到缓存文件中。
        - **Option:** 持久化已拒绝的 DNS 响应
            **Description:** 对应 Sing-Box 的 `cache_file.store_rdrc` 字段，启用后将把被拒绝的 DNS 响应存储到缓存文件中。

###### Inbounds Settings
    ###### Title: 入站设置
    ###### Description: 本节介绍如何配置 Sing-Box 的 `inbounds` 字段，用于设置入站配置的选项，可以添加或删除指定入站，支持 `Mixed`、`Http`、`Socks`、`Tun`。
    ###### Image: /zh/resources/gfs/v1.9.0/inbounds-settings.png

        - **Mixed Inbound**
            ###### Title: Mixed 入站
            ###### Description: 类型 `type` 为 `mixed`，是一个集合了 `socks4`、`socks4a`、`socks5` 和 `http` 服务器的混合入站。
            ###### Options:
                - **Option:** 名称 (必须)
                    **Description:** 对应 Sing-Box 的 `inbounds.tag` 字段，用于指定入站标签，默认为 `mixed-in`，可自定义。
                - **Option:** Http/Socks 验证用户
                    **Description:** 对应 Sing-Box 的 `inbounds.users` 字段，用于添加用户认证，格式为 `user:password`，可设置多组。
                - **Option:** 监听地址 (必须)
                    **Description:** 对应 Sing-Box 的 `listen` 字段，指定入站服务的监听地址，默认为 `127.0.0.1`，如需局域网访问请改为 `0.0.0.0` 或者 `::`。
                - **Option:** 端口 (必须)
                    **Description:** 对应 Sing-Box 的 `listen_port` 字段，指定入站服务的监听端口，默认为 `20122`，可自定义。
                - **Option:** TCP 快速打开
                    **Description:** 对应 Sing-Box 的 `tcp_fast_open` 字段，启用后可以加快连接速度，需要服务端支持。
                - **Option:** 多路径 TCP
                    **Description:** 对应 Sing-Box 的 `tcp_multi_path` 字段，启用后可以提高传输效率和可靠性，需要服务端支持。
                - **Option:** UDP 分段
                    **Description:** 对应 Sing-Box 的 `udp_fragment` 字段，启用后可以优化传输 UDP 大数据包时的性能，但可能导致延迟或丢包，需要服务端支持。

        - **HTTP Inbound**
            ###### Title: HTTP 入站
            ###### Description: 类型 `type` 为 `http`，默认名称 `tag` 为 `http-in`，默认端口为 `20121`，其余设置同 `Mixed 入站`。

        - **SOCKS Inbound**
            ###### Title: SOCKS 入站
            ###### Description: 类型 `type` 为 `socks`，默认名称 `tag` 为 `socks-in`，默认端口为 `20120`，其余设置同 `Mixed 入站`。

        - **Tun Inbound**
            ###### Title: Tun 入站
            ###### Description: 一种透明代理模式，通过创建虚拟网络接口接管系统的所有网络流量，即使应用程序不支持手动设置代理。Windows 需要在设置里启用 `以管理员身份运行`，Linux 和 Mac 需要点击内核设置页面的授权按钮进行授权。
            ###### Image: /zh/resources/gfs/v1.9.0/inbounds-tun.png
            ###### Options:
                - **Option:** 名称 (必须)
                    **Description:** 对应 Sing-Box 的 `inbounds.tag` 字段，用于指定入站标签，默认为 `tun-in`，可自定义。
                - **Option:** TUN 网卡名称
                    **Description:** 对应 Sing-Box 的 `tun.interface_name` 字段，默认会自动设置，可自定义。
                - **Option:** TUN 模式堆栈
                    **Description:** 对应 Sing-Box 的 `tun.stack` 字段，用于选择网络协议栈实现。
                    ###### TUN Stack Notes:
                        ###### Description: 关于 TUN 模式下不同堆栈的选择和防火墙设置的说明：
                        ###### Points:
                            - **Description:** system 使用系统协议栈，可以提供更稳定/全面的 tun 体验，且占用相对其他堆栈更低
                                **Details:** 使用系统提供的网络协议栈，通常更稳定，兼容性更强，且资源占用相对较少。
                            - **Description:** gvisor 通过在用户空间中实现网络协议栈，可以提供更高的安全性和隔离性，同时可以避免操作系统内核和用户空间之间的切换，从而在特定情况下具有更好的网络处理性能
                                **Details:** 使用 Google 的 gVisor，在用户空间实现网络协议栈，安全性更高，隔离性更好，但可能带来一定的性能开销。
                            - **Description:** mixed 混合堆栈，tcp 使用 system 栈，udp 使用 gvisor 栈，使用体验可能相对更好
                                **Details:** 混合模式，TCP 使用 system 栈，UDP 使用 Gvisor 栈，试图结合两者的优点。
                            - **Description:** 如果打开了防火墙，则无法使用 system 和 mixed 协议栈，通过以下方式放行内核：
                                ###### Platform Specific Instructions:
                                    - **Windows:**
                                        ###### Steps:
                                            - 启用**以管理员身份运行**。
                                            - 设置 -> Windows 安全中心 -> 允许应用通过防火墙 -> 选中内核程序。
                                    - **macOS:**
                                        ###### Steps:
                                            - 点击内核页面的授权按钮。
                                            - 或者使用**TUN模式助手**提供的命令。
                                            - 如果遇到开启防火墙无法使用的情况，可以尝试放行：系统设置 -> 网络 -> 防火墙 -> 选项 -> 添加 sing-box 程序。
                                    - **Linux:**
                                        ###### Steps:
                                            - 点击内核页面的授权按钮。
                                            - 或者使用**TUN模式助手**提供的命令。
                                            - 一般无需配置，防火墙默认不拦截应用。
                                            - 如果遇到开启防火墙无法使用的情况，可以尝试放行 TUN 网卡出站流量（假设 TUN 网卡为 sing-box）: `sudo iptables -A OUTPUT -o sing-box -j ACCEPT`

                - **Option:** 自动设置全局路由
                    **Description:** 对应 Sing-Box 的 `tun.auto_route` 字段，用于自动设置到 Tun 的默认路由，建议启用。 **注意**：为避免网络回环，在启用 `自动设置全局路由` 时，应同时启用 `自动检测出站接口`，或者手动设置正确的 `出站接口名称`。
                - **Option:** 严格路由
                    **Description:** 对应 Sing-Box 的 `tun.strict_route` 字段，启用后会强制执行更严格的路由规则，以避免 IP 地址泄露并增强 DNS 劫持效果。让不支持的网络不可访问，例如你的网络同时支持 IPv4 和 IPv6，但你只想代理 IPv4，就删除了 IPv6 前缀，这个时候就需要启用此选项，避免 IPv6 网络绕过核心，直连目标服务器。  **注意**：启用严格路由可能会导致某些应用程序（如 VirtualBox）在特定情况下无法正常工作。
                - **Option:** 独立于端点的 NAT
                    **Description:** 对应 Sing-Box 的 `tun.endpoint_independent_nat` 字段，此选项仅在堆栈为 `gvisor` 时可用，其他堆栈默认为已启用。可能对某些应用场景有帮助，但启用后可能导致性能下降，因此在没有明确需要时，不建议启用。
                - **Option:** 最大传输单元
                    **Description:** 对应 Sing-Box 的 `tun.mtu` 字段，默认为 `9000`，用于设置 TUN 网卡的最大传输单元 (MTU)。该值会影响极限状态下的网络传输速率，一般情况下使用默认值即可。
                - **Option:** IPv4 和 IPv6 前缀
                    **Description:** 对应 Sing-Box 的 `tun.address` 字段，用于设置 TUN 接口的 IPv4 和 IPv6 地址前缀，一般默认即可。
                - **Option:** 自定义路由
                    **Description:** 对应 Sing-Box 的 `tun.route_address` 字段，用于在启用 `自动设置全局路由` 时，设置自定义的路由地址，而不是使用默认路由，通常情况下无需设置。

###### Outbounds Settings
    ###### Title: 出站设置
    ###### Description: 本节介绍如何配置 Sing-Box 的 `outbounds` 字段，用于配置节点分组。
    ###### Image: /zh/resources/gfs/v1.9.0/outbounds-settins.png
    ###### Edit Outbounds Group Description: 编辑出站分组可以将自己添加的订阅节点加入该组。
    ###### Edit Outbounds Group Image:
        ###### Image: /zh/resources/gfs/v1.9.0/edit-outbounds-group.png
        ###### Alt: 编辑分组.png
        ###### Title: 编辑分组
    ###### Options:
        - **Option:** 名称 (必须)
            **Description:** 对应 Sing-Box 的 `outbounds.tag` 字段，用于设置分组名称，可以添加 emoji 符号。
        - **Option:** 类型
            **Description:** 对应 Sing-Box 的 `outbounds.type` 字段，可选：
                - 直连 (direct)：所有流量直连。
                - 手动选择 (selector)：手动选择出站节点。
                - 自动选择 (urltest)：自动选择延迟最低的节点。
        - **Option:** 中断现有连接
            **Description:** 对应 Sing-Box 的 `interrupt_exist_connections` 字段，用于设置当选定的出站连接发生变化时，是否中断现有的入站连接。 内部连接将始终被中断。
        - **Option:** 自动选择 (urltest)
            ###### Description: 当 `type` 为 `urltest` 时，按照设置的间隔定期对目标链接进行延迟测试，最后根据延迟容差选择节点。
            ###### Details: 基于测速结果动态选择可用节点。
            ###### Settings:
                - **Setting:** 测延迟链接
                    **Description:** 对应 Sing-Box 的 `urltest.url` 字段，用于配置延迟测试的 URL，默认使用 `https://www.gstatic.com/generate_204` 进行测试。
                - **Setting:** 测试间隔 (m)
                    **Description:** 对应 Sing-Box 的 `urltest.interval` 字段，用于设置延迟测试的间隔，默认为 `3m`。
                - **Setting:** 测试容差 (ms)
                    **Description:** 对应 Sing-Box 的 `urltest.tolerance` 字段，用于设置节点切换的延迟容差，单位为毫秒，默认为 `150`。
        - **Option:** 包含和排除
            **Description:** 选项用于设置所选订阅或分组内需要包含或排除的节点名称，支持正则表达式。
    ###### Note: 可以根据需求添加/编辑/删除分组。

###### Route Settings
    ###### Title: 路由设置
    ###### Description: 本节介绍如何配置 Sing-Box 的 `route` 字段，用于配置路由规则、规则集等选项。

        - **General**
            ###### Title: 通用
            ###### Description: 本节介绍路由设置的全局选项。
            ###### Image: /zh/resources/gfs/v1.9.0/route-settings.png
            ###### Options:
                - **Option:** 查找进程信息
                    **Description:** 对应 Sing-Box 的 `route.find_process` 字段，启用后将在连接信息内显示进程名称。
                - **Option:** 自动检测出站接口
                    **Description:** 对应 Sing-Box 的 `route.auto_detect_interface` 字段，用于自动选择流量出口的网络接口。默认情况下，出站连接会绑定到默认网络接口，以防止在 TUN 模式下出现路由循环。启用 Tun 入站时，务必启用此选项。
                - **Option:** 出站接口名称
                    **Description:** 对应 Sing-Box 的 `route.default_interface` 字段，用于手动设置作为流量出口的网络接口。如果您有多出口网卡同时连接，建议手动指定出口网卡。
                - **Option:** 默认出站标签
                    **Description:** 对应 Sing-Box 的 `route.final` 字段，用于选择默认出站名称，即未命中任何规则时所使用的出站。

        - **Rule Set**
            ###### Title: 规则集
            ###### Description: 本节介绍如何配置 Sing-Box 的 `route.rule_set` 字段，用于添加和管理当前配置内的本地或远程规则集。
            ###### Image: /zh/resources/gfs/v1.9.0/route-rule_set.png
            ###### Options:
                - **Option:** 名称 (必须)
                    **Description:** 对应 Sing-Box 的 `tag` 字段，用于设置规则集名称，以便在路由规则和 DNS 规则内引用。
                - **Option:** 类型
                    **Description:** 对应 Sing-Box 的 `type` 字段，用于设置规则集类型，可选：
                        - 内联 (inline)：直接在配置中定义规则集。
                        - 本地 (local)：引用本地规则集文件。
                        - 远程 (remote)：从远程仓库下载规则集文件。
                - **Option:** 内联规则集
                    **Description:** 请参考 [规则集 - sing-box](https://sing-box.sagernet.org/zh/configuration/rule-set/)
                - **Option:** 本地规则集
                    **Description:** 需要在软件的规则集页面先进行添加，才能从配置内引用。
                - **Option:** 远程规则集
                    ###### Description: 从指定远程仓库下载规则集文件。 如果缓存已启用，远程规则集将被存储到缓存文件中。
                    ###### Details: 用于从远程获取并自动更新规则集。  `type` 为 `remote`
                    ###### Settings:
                        - **Setting:** 格式
                            ###### Description: 对应 Sing-Box 的 `rule_set.format` 字段，用于指定远程规则集的格式。
                            ###### Options:
                                - **Name:** 源文件 (source)
                                    **Description:** JSON 格式的规则集文件。
                                - **Name:** 二进制 (binary)
                                    **Description:** SRS 格式的规则集文件。
                        - **Setting:** 远程链接
                            **Description:** 对应 Sing-Box 的 `rule_set.format.url` 字段，用于设置下载远程规则集的地址，规则集文件后缀必须为 `json` 或者 `srs`。
                        - **Setting:** 下载方式
                            **Description:** 对应 Sing-Box 的 `rule_set.download_detour` 字段，用于指定下载远程规则集的出站标签。
                        - **Setting:** 自动更新间隔
                            **Description:** 对应 Sing-Box 的 `rule_set.update_interval` 字段，用于指定远程规则集的更新间隔，默认为 `1d`。
            ###### Edit Rule Set Remote Image:
                ###### Image: /zh/resources/gfs/v1.9.0/edit-rule_set-remote.png
                ###### Alt: 编辑规则集.png
                ###### Title: 编辑规则集

        - **Rule**
            ###### Title: 规则
            ###### Description: 本节介绍如何配置 Sing-Box 的 `route.rule` 字段，用于设置 Sing-Box 的路由规则、规则动作、DNS 劫持和协议嗅探等选项。
            ###### Image: /zh/resources/gfs/v1.9.0/route-rule.png
            ###### Options:
                - **Option:** 规则类型
                    ###### Description: 选择要添加的规则类型。
                    ###### Details: 规则默认按前后顺序依次匹配
                    ###### Available Types:
                        - **Name:** 入站 (inbound)
                            **Description:** 对应 Sing-Box 的 `route.rule.inbound` 字段，用于匹配入站标签。
                        - **Name:** 网络 (network)
                            **Description:** 对应 Sing-Box 的 `route.rule.network` 字段，用于匹配网络类型，可选 `tcp` 或 `udp`。
                        - **Name:** 协议 (protocol)
                            **Description:** 对应 Sing-Box 的 `route.rule.protocol` 字段，用于匹配探测到的协议，例如 `quic`、`stun`、`bittorrent` 等。
                        - **Name:** 域名 (domain)
                            **Description:** 对应 Sing-Box 的 `route.rule.domain` 字段，用于匹配完整域名，例如 `example.com`。
                        - **Name:** 域名后缀 (domain_suffix)
                            **Description:** 对应 Sing-Box 的 `route.rule.domain_suffix` 字段，用于匹配域名后缀，例如 `.cn`。
                        - **Name:** 域名关键词 (domain_keyword)
                            **Description:** 对应 Sing-Box 的 `route.rule.domain_keyword` 字段，用于匹配域名关键字，例如 `google`。
                        - **Name:** 域名正则 (domain_regex)
                            **Description:** 对应 Sing-Box 的 `route.rule.domain_regex` 字段，用正则表达式匹配域名，例如 `^tracker\\.[a-zA-Z0-9.-]+$`，表示匹配开头包含 `tracker` 的域名，如 `tracker.example.com`。
                        - **Name:** 源 IP 地址段 (source_ip_cidr)
                            **Description:** 对应 Sing-Box 的 `route.rule.source_ip_cidr` 字段，用于匹配来源 IP 地址段，例如 `192.168.0.0/24`，表示匹配来源为 `192.168.0.1` - `192.168.0.254` 地址范围内的连接。
                        - **Name:** IP 地址段 (ip_cidr)
                            **Description:** 对应 Sing-Box 的 `route.rule.ip_cidr` 字段，用于匹配目标 IP 地址段，例如 `10.0.0.0/24`，表示匹配访问目标为 `10.0.0.1` - `10.0.0.254` 地址范围内的连接。
                        - **Name:** 是否为私有 IP
                            **Description:** 对应 Sing-Box 的 `route.rule.private_ip` 字段，用于匹配目标地址是否为私有 IP，地址范围包括 `10.0.0.0/8`、`172.16.0.0/12`、`192.168.0.0/16`。
                        - **Name:** 源端口 (source_port)
                            **Description:** 对应 Sing-Box 的 `route.rule.source_port` 字段，用于匹配来源端口，例如 `8888`，表示匹配来源端口为 `8888` 的连接，可设置端口范围为 `1` - `65535`。
                        - **Name:** 源端口范围 (source_port_range)
                            **Description:** 对应 Sing-Box 的 `route.rule.source_port_range` 字段，用于匹配来源端口范围，例如 `1000:2000` 表示匹配 `1000` - `2000` 的所有端口，`:3000` 表示匹配到 `3000` 的所有端口，`4000:` 表示匹配 `4000` 开始的所有端口。
                        - **Name:** 端口 (port)
                            **Description:** 对应 Sing-Box 的 `route.rule.port` 字段，用于匹配目标端口，其余同 **源端口**。
                        - **Name:** 端口范围 (port_range)
                            **Description:** 对应 Sing-Box 的 `route.rule.port_range` 字段，用于匹配目标端口范围，其余同 **源端口范围**。
                        - **Name:** 进程名称 (process_name)
                            **Description:** 对应 Sing-Box 的 `route.rule.process_name` 字段，用于匹配本地进程的名称，例如 `chrome.exe`，表示匹配来自此进程的连接。
                            **Note:** 仅支持 Linux、Windows 和 macOS。
                        - **Name:** 进程路径 (process_path)
                            **Description:** 对应 Sing-Box 的 `route.rule.process_path` 字段，用于匹配本地进程的路径，例如 `D:\\MyApp\\telegram.exe`，表示匹配来自指定路径的进程的连接。
                            **Note:** 仅支持 Linux、Windows 和 macOS.
                        - **Name:** 进程路径正则 (process_path_regex)
                            **Description:** 对应 Sing-Box 的 `route.rule.process_path_regex` 字段，用正则表达式匹配进程路径，例如 `.*beta.*` 表示匹配路径内包含 `beta` 的进程，如 `C:\\app_beta\\test.exe`。
                            **Note:** 仅支持 Linux、Windows 和 macOS。
                        - **Name:** Clash 模式 (clash_mode)
                            **Description:** 对应 Sing-Box 的 `route.rules.clash_mode` 字段，用于匹配 Clash 模式，指定所选工作模式的规则策略，`direct` 和 `global` 应分别设置为直连和代理出站，一般情况下默认即可。
                        - **Name:** 规则集 (rule_set)
                            **Description:** 对应 Sing-Box 的 `route.rule.rule_set` 字段，用于匹配在规则集页面添加过的规则集。
                - **Option:** 规则动作
                    ###### Description: 选择要指定的动作。
                    ###### Actions:
                        - **Name:** 路由 (route)
                            **Description:** 对应 Sing-Box 的 `route.rule.action` 字段，将匹配规则的连接路由到指定出站。
                        - **Name:** 路由设置选项 (route-options)
                            **Description:** 为路由设置选项，添加拨号字段。
                        - **Name:** 拒绝连接 (reject)
                            **Description:** 将匹配规则的连接直接关闭。
                        - **Name:** 劫持 DNS 请求 (hijack-dns)
                            **Description:** 将匹配规则的 DNS 请求，劫持至 sing-box 的 DNS 模块。
                        - **Name:** 协议嗅探 (sniff)
                            **Description:** 对连接的协议纪进行嗅探，务必为入站规则添加此动作，否则协议和域名规则将不生效。
                        - **Name:** 解析 DNS (resolve)
                            **Description:** 将请求的目标从域名解析为 IP 地址，一般情况无需添加
                - **Option:** 反向匹配 (invert)
                    **Description:** 对应 Sing-Box 的 `route.rule.invert` 字段，启用后将反选匹配结果，例如添加了 `cn-ip` 的规则，将会匹配不包含在此规则集中的连接。
                - **Option:** 出站标签 (outbound)
                    **Description:** 对应 Sing-Box 的 `route.rule.outbound` 字段，用于指定匹配规则的出站名称。
                - **Option:** 路由选项 (route options)
                    **Description:** 填写路由设置选项字段，可直接填写 JSON 内容，详情参考 [规则动作 - sing-box](https://sing-box.sagernet.org/zh/configuration/route/rule_action/#route-options_1)。
                - **Option:** 启用的探测器 (sniffer)
                    **Description:** 对应 Sing-Box 的 `route.rule.sniffer` 字段，用于设置需要启用的探测器，默认启用所有探测器，一般情况无需设置。
                - **Option:** 策略 (strategy)
                    **Description:** 对应 Sing-Box 的 `route.rule.strategy` 字段，用于设置 DNS 解析策略。
                - **Option:** DNS 服务器 (server)
                    **Description:** 对应 Sing-Box 的 `route.rule.server` 字段，用于指定要使用的 DNS 服务器的标签，而不是通过 DNS 路由进行选择。
                - **Option:** 载荷 (payload)
                    **Description:** 选择或填写 `规则类型` 的值，例如 `quic`、`53`，无需带引号。
            ###### Note: 规则默认按前后顺序依次匹配

###### DNS Settings
    ###### Title: DNS 设置
    ###### Description: 本节介绍如何配置 Sing-Box 的 `dns` 字段，用于配置 DNS 服务器、DNS 规则等选项。

        - **General**
            ###### Title: 通用
            ###### Description: 本节介绍 DNS 设置的全局选项。
            ###### Image: /zh/resources/gfs/v1.9.0/dns-settings.png
            ###### Options:
                - **Option:** 禁用 DNS 缓存
                    **Description:** 对应 Sing-Box 的 `dns.disable_cache` 字段，用于设置 DNS 查询的记录是否缓存，一般无需启用。
                - **Option:** 禁用 DNS 缓存过期
                    **Description:** 对应 Sing-Box 的 `dns.disable_expire` 字段，用于设置 DNS 查询缓存是否会过期，一般无需启用。
                - **Option:** 独立缓存
                    **Description:** 对应 Sing-Box 的 `dns.independent_cache` 字段，用于将每个 DNS 服务器的缓存独立存储，以满足特殊目的。如果启用，将轻微降低性能，一般无需启用。
                - **Option:** 回退 DNS
                    **Description:** 对应 Sing-Box 的 `dns.final` 字段，用于选择默认 DNS 服务器，即未命中任何 DNS 规则时所使用的服务器。
                - **Option:** 解析策略
                    **Description:** 对应 Sing-Box 的 `dns.strategy` 字段，用于设置默认的域名解析策略，可选 IPV4 优先、IPV6 优先、只使用 IPV4、只使用 IPV6。
                - **Option:** 客户端子网
                    **Description:** 对应 Sing-Box 的 `dns.client_subnet` 字段，用于设置 DNS 查询时附带的客户端 IP 子网信息，告诉 DNS 服务器你的大致 IP 地址范围，以便它能给你更准确的解析结果。 如果你提供的是一个 IP 地址，程序会自动把它转换成对应的子网格式，一般无需设置。
                - **Option:** Fake-IP
                    **Description:** 对应 Sing-Box 的 `dns.fakeip` 字段，启用后将会自动添加 FakeIP 相关服务器和规则，一般按照弹出提示默认添加即可，按需启用。
                - **Option:** Fake-IP 范围 (IPv4)
                    **Description:** 对应 Sing-Box 的 `dns.fakeip.inet4_range` 字段，用于指定 FakeIP 的 IPv4 地址范围，一般默认即可。
                - **Option:** Fake-IP 范围 (IPv6)
                    **Description:** 对应 Sing-Box 的 `dns.fakeip.inet6_range` 字段，用于指定 FakeIP 的 IPv6 地址范围，一般默认即可。

        - **Servers**
            ###### Title: 服务器
            ###### Description: 本节介绍如何配置 Sing-Box 的 `dns.servers` 字段，用于添加和配置 DNS 查询服务器，一般情况默认即可。
            ###### Image: /zh/resources/gfs/v1.9.0/dns-servers.png
            ###### Options:
                - **Option:** 名称
                    **Description:** 对应 Sing-Box 的 `dns.servers.tag` 字段，用于设置 DNS 服务器的名称。
                - **Option:** 地址
                    **Description:** 对应 Sing-Box 的 `dns.servers.address` 字段，用于设置 DNS 服务器的地址，支持多种协议和格式，可填写 IP 地址、域名、`local`、`fakeip` 等，详情查看 [DNS 服务器 - sing-box](https://sing-box.sagernet.org/zh/configuration/dns/server/#address)。
                - **Option:** 解析策略
                    **Description:** 对应 Sing-Box 的 `dns.servers.strategy` 字段，用于设置当前 DNS 服务器的默认解析策略，如设置，**通用** 设置的 **解析策略** 将不再生效，一般默认即可。
                - **Option:** 出站标签
                    **Description:** 对应 Sing-Box 的 `dns.servers.detour` 字段，用于指定连接到 DNS 服务器的出站标签。
                - **Option:** 解析本 DNS 服务器域名的 DNS
                    **Description:** 对应 Sing-Box 的 `dns.servers.address_resolver` 字段，用于解析本 DNS 服务器的域名的另一个 DNS 服务器的标签，如果当前服务器地址包括域名则必须设置，指定的解析服务器必须为 IP 地址。
                - **Option:** 客户端子网
                    **Description:** 对应 Sing-Box 的 `dns.servers.client_subnet` 字段，同 **通用**，一般无需设置。

        - **Rule**
            ###### Title: 规则
            ###### Description: 本节介绍如何配置 Sing-Box 的 `dns.rule` 字段，设置方法和 `路由规则` 基本一致，一般默认即可，仅介绍几个重点选项，其余请参考 `路由规则` 设置。
            ###### Image: /zh/resources/gfs/v1.9.0/dns-rule.png
            ###### Options:
                - **Option:** 出站 (outbound)
                    **Description:** 对应 Sing-Box 的 `dns.rule.outbound` 字段，用于匹配出站标签，指定出站所使用的 DNS 服务器，`any` 可作为值用于匹配任意出站。
                - **Option:** 拒绝方式 (method)
                    **Description:** 对应 Sing-Box 的 `dns.rule.method` 字段，仅在选择 `拒绝连接` 规则动作时可用，可选 `返回 NXDOMAIN`、 `丢弃请求`，分别对应 `default`、 `drop`。
                - **Option:** 目标 DNS 服务器的标签 (server)
                    **Description:** 对应 Sing-Box 的 `dns.rule.server` 字段，用于指定匹配规则时所使用的 DNS 服务器的标签。
            ###### Note: `any` 出站规则必须添加，一般默认即可，用于解析节点服务器，且指定的 DNS 服务器必须为直连出站，否则将导致错误问题。
            ###### Rule Matching Order Note: 规则默认按前后顺序依次匹配

###### Rule Set
    ###### Title: 规则集
    ###### Description: 本节介绍如何配置和管理规则集。规则集有两种类型：本地规则集和远程规则集。远程规则集在 `路由设置` 中添加，此处不再赘述。

        - **Local Rule Set**
            ###### Title: 本地规则集
            ###### Description: 用于添加本地规则集。
            ###### Image: /zh/resources/gfs/v1.9.0/rule_set-list.png
            ###### Creation Methods:
                - **Method:** 从远程链接下载
                    **Description:** 通过远程链接下载 SRS 格式的二进制规则集或 JSON 格式的源规则集。
                - **Method:** 本地创建
                    **Description:** 使用本地创建 JSON 格式的源规则集。
                    **Format Reference:** [源文件格式 - sing-box](https://sing-box.sagernet.org/zh/configuration/rule-set/source-format/) 和 [无头规则 - sing-box](https://sing-box.sagernet.org/zh/configuration/rule-set/headless-rule/)

        - **Rule Set Sources**
            ###### Title: 规则集获取方式
            ###### Description: 以下是一些常用的规则集资源：

            - **GEOIP**
                ###### Title: GEOIP
                ###### Sources:
                    - [GitHub - MetaCubeX/meta-rules-dat - GEOIP](https://github.com/MetaCubeX/meta-rules-dat/tree/sing/geo/geoip)
                    - [GitHub - SagerNet/sing-geoip at rule-set](https://github.com/SagerNet/sing-geoip/tree/rule-set)

            - **GEOSITE**
                ###### Title: GEOSITE
                ###### Sources:
                    - [GitHub - MetaCubeX/meta-rules-dat - GEOSITE](https://github.com/MetaCubeX/meta-rules-dat/tree/sing/geo/geosite)
                    - [GitHub - SagerNet/sing-geosite at rule-set](https://github.com/SagerNet/sing-geosite/tree/rule-set)

###### Important Notes
    ###### Title: 注意事项
    ###### Points:
        - 非 Administrators 用户组的用户建议打开 `设置` - `通用` 中的 `以管理员身份运行`，否则无法使用 TUN 启动内核。
        - 若代理节点标签 (tag) 使用了国旗等图标无法正常显示，请安装插件 【Twemoji.Mozilla】。

#### gui_for_clash

##### Title: GUI.for.Clash 使用指南
##### Website: https://gui-for-cores.github.io/zh/guide/gfc/how-to-use

##### Sections:

    - **Section:** 内核下载与配置
        ###### Title: 内核下载与配置
        ###### Description: 介绍如何下载和配置 GUI.for.Clash 的内核。

        - **Sub-section:** 下载内核文件
            ###### Title: 下载内核文件
            ###### Content:
                1.  转到 `设置` - `内核` 页面。
                2.  如果未检测到内核文件，点击 `更新` 按钮下载内核。
            ###### Image: /zh/resources/gfc/205_how_to_use.png

        - **Sub-section:** 手动安装内核文件（备用方案）
            ###### Title: 手动安装内核文件（备用方案）
            ###### Content:
                1.  如果下载失败，可以手动下载内核文件。
                2.  获取与你的操作系统和架构匹配的内核文件（例如：`mihomo-windows-amd64.exe`）。
                3.  将文件重命名为 `mihomo-${os}-${arch}.exe` 或 `mihomo-${os}-${arch}-alpha.exe`，其中 `${os}` 和 `${arch}` 分别代表操作系统和架构。（例如：`mihomo-windows-amd64.exe` 或 `mihomo-darwin-arm64-alpha.exe`）。
                4.  将文件放置在程序的 `data/mihomo` 目录下。（GUI 程序的 `data` 目录通常与程序的可执行文件在同一目录下，或者在用户配置的特定数据存储位置）
                5.  重启应用程序。

        - **Sub-section:** 验证内核状态
            ###### Title: 验证内核状态
            ###### Content:
                1.  成功下载或安装后，界面应正确显示内核版本号。
                2.  通过点击切换按钮，可以选择不同的内核分支进行使用（例如，稳定版，测试版）。
            ###### Image: /zh/resources/gfc/206_how_to_use.png

    - **Section:** 快速导入节点与配置
        ###### Title: 快速导入节点与配置
        ###### Description: 通过快速开始功能，快速导入订阅并启动内核。

        - **Sub-section:** 使用快速开始功能
            ###### Title: 使用快速开始功能
            ###### Content:
                1.  在 `概览` 页面，找到并点击 `快速开始` 按钮。
                2.  在弹出的输入框中填入你的订阅链接 (订阅链接通常是一个以 `http` 或 `https` 开头的 URL)。
                3.  GUI 将自动执行以下操作：
                    *   下载订阅文件。
                    *   解析订阅文件中的节点信息 (包括服务器地址、端口、加密方式等)。
                    *   创建一个以随机 ID 命名的 .yaml 文件来存储节点信息 (这个文件位于 GUI 的数据目录下)。
                    *   创建一个 `配置` 文件 (profile)，并自动关联上刚刚下载的订阅文件。
            ###### Image: /zh/resources/gfc/200_how_to_use.png

        - **Sub-section:** 启动内核
            ###### Title: 启动内核
            ###### Content:
                1.  在成功导入订阅并完成配置后，点击 `启动内核` 按钮以启动代理服务。
            ###### Image: /zh/resources/gfc/207_how_to_use.png

        - **Sub-section:** 系统代理与 TUN 模式
            ###### Title: 系统代理与 TUN 模式
            ###### Content:
                1.  默认情况下，GUI 不会自动修改你的系统代理设置。你需要手动启用 `系统代理`。
                2.  手动开启 `系统代理` 的方法取决于你的操作系统和浏览器设置。
                3.  GUI 的 `设置` 页面中提供了 `自动配置系统代理` 选项，你可以开启此功能，让 GUI 自动配置系统代理，但注意可能与某些系统环境不兼容。
                4.  如果需要使用 TUN 模式 (更底层的网络代理方式，通常用于更高级的代理需求)，则需要开启 `以管理员身份运行` 。
                5.  重要提示： TUN 模式和系统代理应确保只有一个处于开启状态。同时开启可能会导致网络问题。
            ###### Image: /zh/resources/gfc/208_how_to_use.png

    - **Section:** 进阶配置：手动创建订阅与配置
        ###### Title: 进阶配置：手动创建订阅与配置
        ###### Description: 详细介绍手动创建订阅、配置代理组和分流规则的方法，以实现更灵活的配置。

        - **Sub-section:** 创建订阅
            ###### Title: 创建订阅
            ###### Content:
                1.  在 GUI 界面中，进入 `订阅` 页面。
                2.  点击 `添加` 按钮以创建一个新的订阅。
                3.  在弹出的订阅创建表单中，填写以下信息：
                    *   `名称`：为你的订阅设置一个易于识别的名称。
                    *   `类型`：选择订阅的类型。通常选择 `URL` (从订阅链接获取节点) 或 `本地` (从本地文件获取节点)。
                    *   `链接` 或 `本地路径`：
                        *   如果类型是 `URL`，填写订阅链接 (通常是一个以 `http` 或 `https` 开头的 URL)。
                        *   如果类型是 `本地`，填写本地订阅文件的路径。建议填写为 `data/local/${filename}.txt`。 其中 `${filename}`  是你自定义的文件名。
                    *   `保存路径`：GUI 会将订阅数据保存到此路径。通常情况下，你不需要修改此设置。
                4.  如果你的订阅类型选择为 `本地`，GUI 会从 `链接` 中读取文本 (即本地文件)，处理后保存到 `保存路径` 里。如果 `链接` 和 `保存路径` 填写一致，GUI 将跳过保存步骤，仅更新节点数量等元数据。
                5.  `启用` 选项： 勾选此选项以启用订阅。
                6.  `使用订阅内的代理组和分流规则` 选项： 如果你希望使用订阅提供商预设的代理组和分流规则，请勾选此选项。但通常不推荐，因为这限制了你的自定义灵活性。
                7.  添加完订阅后，点击 `更新` 按钮，GUI 会根据你的设置下载并处理订阅信息。
                8.  更推荐手动配置的原因：手动配置能更好地控制代理组和分流规则，提供更灵活的自定义选项，以满足个性化的需求。
            ###### Image: /zh/resources/gfc/201_how_to_use.png

        - **Sub-section:** 创建配置 (Profile)
            ###### Title: 创建配置 (Profile)
            ###### Content:
                1.  在 GUI 中，转到 `配置` 页面 (也称为 `Profiles` 页面)。
                2.  点击 `添加` 按钮以创建一个新的配置 (profile)。
                3.  填写必填项：
                    *   `名称`：为你的配置设置一个易于识别的名称。
                    *   `通用设置`：配置代理模式 (例如：全局代理，规则代理，直接连接)，以及其他通用选项。请参考 mihomo 官方文档理解这些设置。
                    *   `TUN 设置`： 配置 TUN 模式相关选项 (如果需要使用 TUN 模式)。参考 mihomo 官方文档。
                    *   `DNS 设置`： 配置 DNS 解析相关选项。参考 mihomo 官方文档。
                    *   `代理组`：配置代理组，用于组织和管理代理节点。这是配置的核心部分。
                    *   `分流规则`：配置分流规则，用于将流量导向不同的代理或直接连接。
                4.  GUI 支持大部分内核参数配置。如果 GUI 界面中缺少你需要的参数，你可以通过创建插件来扩展功能。
                5.  插件示例：创建一个触发器为 `生成配置时` 的插件，用于自定义配置：
                    ```javascript
                    const onGenerate = (config) => {
                      // 按下Ctrl+Shift+F12来查看config里有哪些内容
                      console.log(config);
                      // 增加域名嗅探字段
                      config.sniffer = {
                        enable: false,
                        "force-dns-mapping": true,
                        "parse-pure-ip": true,
                        "override-destination": false,
                        sniff: {
                          HTTP: {
                            ports: [80, "8080-8880"],
                            "override-destination": true,
                          },
                          TLS: {
                            ports: [443, 8443],
                          },
                          QUIC: {
                            ports: [443, 8443],
                          },
                        },
                        "force-domain": ["+.v2ex.com"],
                        "skip-domain": ["Mijia Cloud"],
                      };
                      return config;
                    };
                    ```
                    *  此插件在生成配置文件时执行，并将处理后的配置返回给 GUI。
                    *  通过 `Ctrl+Shift+F12`  打开开发者工具(DevTools)，可以查看  `config` 对象中的内容，以了解可配置的参数。
                6.  新建配置默认包含代理组 (例如： `DIRECT` (直连), `REJECT` (拒绝)，`GLOBAL` (全局代理)，`PROXY` (代理) 等)。
                7.  每个代理组需要至少引用一个 `订阅` 或 `节点`，否则会显示感叹号。
                8.  配置完成后，在 `概览` 页面选择该配置文件并启动内核。
            ###### Image: /zh/resources/gfc/209_how_to_use.png

        - **Sub-section:** 配置代理组 (Proxy Groups)
            ###### Title: 配置代理组 (Proxy Groups)
            ###### Content:
                1.  在配置的编辑界面中，找到 `代理组` (Proxy Groups) 部分。 这是配置的核心部分。
                2.  点击一个代理组的 `编辑` 按钮。
                3.  代理组配置界面包含以下区域：
                    *   **区域 1：已添加的代理** (包括 `DIRECT`, `REJECT` 等)。点击代理名称，将其添加到当前代理组。
                    *   **区域 2：订阅列表**。点击订阅名称，将订阅添加到当前代理组。这会将订阅中的所有节点都添加到该组。
                    *   **区域 3：订阅节点列表**。展开订阅，可以单独选择订阅中的某个节点，添加到当前代理组。这通常用于多订阅联合使用的情况。
                4.  程序限制 `自我引用`： 一个代理组不能引用自身。同时，也要避免 `循环引用`。例如，组 A 引用了组 B，组 B 又引用了组 A，这种情况是不允许的，会导致网络配置混乱。
            ###### Image: /zh/resources/gfc/210_how_to_use.png

        - **Sub-section:** 配置分流规则 (Rules)
            ###### Title: 配置分流规则 (Rules)
            ###### Content:
                1.  在配置编辑界面中，找到 `分流规则` (Rules) 部分。
                2.  `规则` 设置界面对应于内核配置文件中的  `rules`  字段。
                3.  GUI 没有将  `rules`  字段变为更清晰的展示，因为熟悉内核配置的用户会更易于理解当前的展示方式。
                4.  点击 `添加` 按钮以添加新的规则。
                5.  选择规则类型：通常选择 `DOMAIN-SUFFIX` (域名后缀匹配), `DOMAIN-KEYWORD` (域名关键词匹配),  `DOMAIN` (完整域名匹配),  `IP-CIDR` (IP 地址段匹配) 等。
                6.  在规则的  `值`  字段中，填写要匹配的域名或 IP 地址。 例如，对于  `DOMAIN-SUFFIX`  规则，填写域名后缀(例如 `google.com`)。
                7.  在  `代理组`  字段中，选择匹配的流量要使用的代理组。
                8.  如果你的规则集列表是空的，那么可以在 `插件中心` 找到一个名为 `一键添加规则集` 的插件并运行它，以快速添加常用的规则集。
                9.  对于  `GEOSITE` (域名集合) 或  `GEOIP` (国家 IP 代码规则)  类型的规则，需要参考项目 [MetaCubeX/meta-rules-dat](https://github.com/MetaCubeX/meta-rules-dat) 进行配置，以获取最新的 GEOIP 和 GEOSITE 数据
            ###### Image: /zh/resources/gfc/212_how_to_use.png

#### consultant

##### Title: GUI.for.Cores 用户程序顾问
##### Description: 为用户解决关于 GUI.for.Cores 程序的各种问题。

##### Sections:

    - **Section:** 程序设计目的与功能
        ###### Title: 程序设计目的与功能
        ###### Description: GUI.for.Cores 概述

        - **Sub-section:** 核心功能
            ###### Title: 核心功能
            ###### Content:
                1.  快速生成核心配置文件。
                2.  通过用户界面 (UI) 展示和修改参数，提供合理的默认值。
                3.  配置管理。
                4.  订阅管理。
                5.  规则组管理。
                6.  插件系统。
                7.  计划任务系统。

        - **Sub-section:** 软件性质
            ###### Title: 软件性质
            ###### Content:
                1.  **不是 VPN 或代理软件，不提供任何代理功能。**
                2.  使用 wails+vue3 开发。
                3.  编译后体积小巧 (约 10MB，压缩后约 5MB)。
                4.  使用 Golang 编写的增强功能供 JavaScript 调用，支持网络请求、文件读写和命令执行。
                5.  不依赖 Node.js 或 Electron，但需依赖 WebView2。
                6.  插件系统在浏览器中运行，而非 Node.js。

        - **Sub-section:** 项目资源
            ###### Title: 项目资源
            ###### Content:
                1.  项目开源地址：[GitHub](https://github.com/GUI-for-Cores)。
                2.  计划任务使用 6 位 cron 表达式，例如：`* * * * * *` (表示每秒执行)。
                3.  滚动发行原理为：仅编译并分发前端文件，存储在 `data/rolling-release` 目录，程序启动后读取该目录。

    - **Section:** 用户系统环境 (请用户提供以下信息)
        ###### Title: 用户系统环境 (请用户提供以下信息)
        ###### Description: 为了更好地解决问题，请用户提供以下信息:
        ###### Items:
            - 1.  操作系统:
            - 2.  程序路径:
            - 3.  程序名:
            - 4.  程序版本:
            - 5.  用户代理 (UA):
            - 6.  网络代理:
            - 7.  网络接口:
            - 8.  是否为管理员身份:

    - **Section:** 常见问题与解决方法
        ###### Title: 常见问题与解决方法
        ###### Description: 列出常见问题及对应的解决方案。 请用户根据自身情况选择合适的解决方案。
        ###### Problems:
            - **Question:** 自启动不生效？
                **Solution:** 请检查程序路径中是否包含中文或空格。
            - **Question:** TUN 模式无权限？
                **Solution:** Windows: 前往设置-通用，勾选以管理员身份运行并重启程序；Linux 和 macOS: 前往设置-内核，点击授权图标进行授权。
            - **Question:** TUN 模式无法上网？
                **Solution:** 尝试更换 TUN 堆栈模式，并检查 Windows 防火墙设置。
            - **Question:** TUN 模式出现 SSL 错误？
                **Solution:** 请配置系统 DNS 为公网 IP (如 8.8.8.8)。
            - **Question:** 首页只显示 4 个配置项？
                **Solution:** 这是程序设计所致。您可以在配置页调整顺序，前四项将显示在首页。
            - **Question:** 订阅无流量信息？
                **Solution:** 请修改订阅链接，添加 `&flag=clash.meta`，或将订阅 UA 修改为 `clash.meta`；若使用 GUI.for.SingBox，还需安装节点转换插件。
            - **Question:** 出现 403 API rate limit exceeded 错误？
                **Solution:** 请前往设置-通用，填写 【向 REST API 进行身份验证】。
            - **Question:** 更新订阅出现 `Not a valid subscription data`？
                **Solution:** 若使用 GUI.for.Clash，修改订阅链接，添加 `&flag=clash.meta`；若使用 GUI.for.SingBox，修改订阅链接，添加 `&flag=clash.meta`，同时安装【节点转换】插件，或更换为原生支持 sing-box 的链接。
            - **Question:** GUI.for.SingBox 启动内核报错  `"start service: initialize cache-file: timeout"`？
                **Solution:** sing-box 的缓存文件被占用，可能是 sing-box 进程因意外情况没有被正确结束，请打开任务管理器，手动结束 sing-box 进程后，重新启动内核即可。
            - **Question:** GUI.for.SingBox 启动内核报错  `"start dns/***[*****]:detour to an empty direct outbound makes no sense"`？
                **Solution:** sing-box 从 1.12.0-alpha.20 版本开始不再允许将 DNS 服务器的出站设置为 direct 类型，解决办法：配置设置 -> DNS 设置 -> 服务器 -> 找到出站标签选择了直连类型的服务器，点击编辑按钮，点击出站标签的 x 按钮，清除即可，此选项为空时，默认即为直连出站，但不允许直接设置为 direct 类型。
            - **Question:** GUI.for.SingBox 启动内核报错  `"create service: initialize outbound[*]: missing tags"`
                **Solution:** 索引号 +1 的出站分组是一个空的分组，未包含有效节点或者其他出站分组，解决办法：配置设置 -> 出站设置 -> 找到左侧标注红色感叹号的出站分组，点击编辑按钮，选中订阅或者其他有效分组后，重新启动内核即可。
            - **Question:** 滚动发行提示无法跨大版本升级？
                **Solution:** 大版本发布后，需要到设置-关于里更新，滚动发行插件只工作在最新大版本中。
            - **Question:** 如何更换托盘图标？
                **Solution:** 设置 - 打开应用程序文件夹，修改 `data/.cache/icons` 目录下的图标文件。

    - **Section:** 参考文档
        ###### Title: 参考文档
        ###### Description: 提供详细的文档链接，以供用户参考。
        ###### Resources:
            - **Title:** 插件系统
                **Link:** [指南](https://gui-for-cores.github.io/zh/guide/04-plugins)
            - **Title:** 计划任务系统
                **Link:** [指南](https://gui-for-cores.github.io/zh/guide/05-tasks)
            - **Title:** 混入与脚本
                **Link:** [指南](https://gui-for-cores.github.io/zh/guide/06-mixin-script)
            - **Title:** 使用技巧
                **Link:** [指南](https://gui-for-cores.github.io/zh/guide/08-skills)
            - **Title:** 添加节点和规则集
                **Link:** [指南](https://gui-for-cores.github.io/zh/guide/community/01-add-proxies-and-rulesets)
            - **Title:** 在 Gnome 桌面环境中免密码运行 TUN 模式
                **Link:** [指南](https://gui-for-cores.github.io/zh/guide/community/02-run-tun-mode-without-password)
            - **Title:** 程序版本发布通知频道
                **Link:** [Telegram](https://t.me/GUI_for_Cores_Channel)
            - **Title:** 程序交流群组
                **Link:** [Telegram](https://t.me/GUI_for_Cores)

    - **Section:** 注意事项
        ###### Title: 注意事项
        ###### Content:
            - 1.  **所有解决方案应基于上述信息及用户的系统环境，不得捏造或臆想。**
            - 2.  **对于无法解决的问题，请引导用户至文档：[文档](https://gui-for-cores.github.io/)。**

#### community

##### add-proxies-and-rulesets

###### Title: Import Custom Proxies
###### Description: Importing custom proxies that are not provided by subscription links.

    - **Create A New Config**
        ###### Title: 1. Create A New Config
        ###### Description: Click on the `Add` button on the `Subscription` page, choose `Manual` for Subscription Type (if the application does not provide a `Manual` option, choose `local` instead, and fill `Remote Url` and `Save Path` with the same value). Enter the name, and the `Save Path` can be default or a desired one

    - **Add Proxies**
        ###### Title: 2. Add Proxies
        ###### Description: After saving the new subscription, right-click on it and choose `Edit Proxies` or `Edit Proxies(Source)`

        - **GUI.for.Clash**
            ###### Title: 2.1. GUI.for.Clash
            ###### Steps:
                - If the `Edit Proxies` page is opened, click on the `Add Proxy` button in the top right corner, enter the `proxies` segment of the mihomo configuration, one proxy at a time. For example:
                ```yaml
                name: "vless-reality-vision"
                type: vless
                server: server
                port: 443
                uuid: uuid
                network: tcp
                tls: true
                udp: true
                flow: xtls-rprx-vision
                servername: www.microsoft.com
                reality-opts:
                  public-key: xxx
                  short-id: xxx
                client-fingerprint: chrome
                ```
                - If the `Edit Proxies(Source)` page is opend, enter all the `proxies` segment content of the mihomo configuration. For example:
                ```yaml
                proxies:
                  - name: "vless-reality-vision"
                    type: vless
                    server: server
                    port: 443
                    uuid: uuid
                    network: tcp
                    tls: true
                    udp: true
                    flow: xtls-rprx-vision
                    servername: www.microsoft.com
                    reality-opts:
                      public-key: xxx
                      short-id: xxx
                    client-fingerprint: chrome

                  - name: tuic
                    server: www.example.com
                    port: 10443
                    type: tuic
                    token: TOKEN
                    uuid: 00000000-0000-0000-0000-000000000001
                    password: PASSWORD_1
                    disable-sni: true
                    reduce-rtt: true
                    request-timeout: 8000
                    udp-relay-mode: native
                ```

        - **GUI.for.SingBox**
            ###### Title: 2.2. GUI.for.SingBox
            ###### Description: The same as 2.1, but the content should be the `outbounds` segment of sing-box configuration, and in JSON format
            ###### Steps:
                - If the `Edit Proxies` page is opened, click on the `Add Proxy` button in the top right corner, enter the `outbounds` segment of the sing-box configuration, one proxy at a time. For example:
                ```json
                {
                    "type": "vless",
                    "tag": "vless-out",
                    "server": "127.0.0.1",
                    "server_port": 1080,
                    "uuid": "bf000d23-0752-40b4-affe-68f7707a9661",
                    "flow": "xtls-rprx-vision",
                    "network": "tcp",
                    "tls": {},
                    "packet_encoding": "",
                    "multiplex": {},
                    "transport": {}
                }
                ```
                - If the `Edit Proxies(Source)` page is opend, enter all the `outbounds` content of the sing-box configuration. For example:
                ```json
                [
                    {
                        "type": "vless",
                        "tag": "vless-out",
                        "server": "127.0.0.1",
                        "server_port": 1080,
                        "uuid": "bf000d23-0752-40b4-affe-68f7707a9661",
                        "flow": "xtls-rprx-vision",
                        "network": "tcp",
                        "tls": {},
                        "packet_encoding": "",
                        "multiplex": {},
                        "transport": {}
                    },
                    {
                        "type": "tuic",
                        "tag": "tuic-out",
                        "server": "127.0.0.1",
                        "server_port": 1080,
                        "uuid": "2DD61D93-75D8-4DA4-AC0E-6AECE7EAC365",
                        "password": "hello",
                        "congestion_control": "cubic",
                        "udp_relay_mode": "native",
                        "udp_over_stream": false,
                        "zero_rtt_handshake": false,
                        "heartbeat": "10s",
                        "network": "tcp",
                        "tls": {}
                    }
                ]
                ```

    - **Add Custom Rulesets**
        ###### Title: Add Custom Rulesets

        - **Create A New Ruleset**
            ###### Title: 1. Create A New Ruleset
            ###### Description: Click on the `Add` button on the `Rulesets` page, choose `Manual` for Ruleset Type. Enter the name, and the `Save Path` can be default or a desired one

        - **Add Rules**
            ###### Title: 2. Add Rules
            ###### Description: After saving the new ruleset, right-click on it and choose `Edit Rules` or `Open File`

            - **GUI.for.Clash**
                ###### Title: 2.1 GUI.for.Clash
                ###### Steps:
                    - If the `Edit Rules` page is opened, add the rules in the format as below and click on the `Add` button
                    ```
                    DOMAIN-SUFFIX,example.com
                    ```
                    - If multiple rules are added at one time, `DOMAIN-SUFFIX` must not be omitted, and use `|` as seperators. For example:
                    ```
                    DOMAIN-SUFFIX,example.com|DOMAIN-SUFFIX,example2.com
                    ```
                ###### Open File Example:
                    ###### Description: If the `Open File` page is opened, add the rules in the format as below and click on the `save` button
                    ```yaml
                    payload:
                      - DOMAIN-SUFFIX,example.com
                      - DOMAIN-SUFFIX,example2.com
                      - PROCESS-NAME,test.exe
                    ```
                ###### Note: All other rules like `PROCESS-PATH` follow the same rules as above, please refer to the mihomo's user manual for details

            - **GUI.for.SingBox**
                ###### Title: 2.2. GUI.for.SingBox
                ###### Steps:
                    - Click on the `Add` button in the `Rulesets` page, choose `Manual` for Ruleset Type, enter the name, `Save Path` can be default or a desired one
                    - Right-click on it and choose `Edit Rules`, add the rules in the format as below and click on the `save` button
                    ```json
                    {
                        "version": 1,
                        "rules": [
                            {
                                "domain_suffix": [
                                    "example.com",
                                    "example2.com"
                                ]
                            },
                            {
                                "process_name": "test.exe"
                            }
                        ]
                    }
                    ```
                ###### Other Rules Note: All other rules like `process_path` follow the same rules as above, please refer to the sing-box's user manual for details
                ###### Matching Relation Note: For the matching relationships between key values 'AND' and 'OR', please refer to https://sing-box.sagernet.org/configuration/rule-set/headless-rule/#default-fields

##### run-tun-mode-without-password

###### Title: Run TUN mode in Gnome Desktop Environment Without Password

    - **Preparation**
        ###### Title: Preparation
        ###### Points:
            - Installed and configured GUI.for.SingBox for it to run TUN mode without issues
            - The current user has sufficient privileges to run `sudo`
            - When launch GUI.for.SingBox manually or at system startup, Gnome prompts one or multiple dialog(s) asking for password
            - The OS uses systemd as init, please check for polkit service if the OS uses OpenRC and other init systems

    - **Check If polkit Service Is Running**
        ###### Title: Check If polkit Service Is Running
        ###### Command: `systemctl status polkit`
        ###### Installation Command: `sudo systemctl enable --now polkit`
        ###### Description: If the status is not `active (running)`, run the following command:

    - **Create a polkit Policy**
        ###### Title: Create a polkit Policy
        ###### Description: The filename can be customized
        ###### Command: `sudo vi /etc/polkit-1/rules.d/99-nopassword.rules`
        ```
        polkit.addRule(function (action, subject) {
          if (
            (action.id == "org.freedesktop.resolve1.set-domains" ||
              action.id == "org.freedesktop.resolve1.set-default-route" ||
              action.id == "org.freedesktop.resolve1.set-dns-servers") &&
            subject.local &&
            subject.active &&
            subject.isInGroup("wheel")
          ) {
            return polkit.Result.YES;
          }
        });
        ```

    - **Add Current User to Wheel Group**
        ###### Title: Add Current User to Wheel Group
        ###### Description: Debian and its derivatives need to create the `wheel` group first, and then run the following command (remember to replace ${CurrentUser} with the actual current username):
        ###### Command: `sudo usermod -G wheel ${CurrentUser}`

    - **Restart polkit Service and Apply the Changes**
        ###### Title: Restart polkit Service and Apply the Changes
        ###### Command: `sudo systemctl restart polkit`
        ###### Or Restart System: Or, restart the system

    - **Notes and Citations**
        ###### Title: Notes and Citations
        ###### Points:
            - The content above has been tested on Fedora 40, Gnome 46.3.1
            - Reference: [https://cn.linux-console.net/?p=31038](https://cn.linux-console.net/?p=31038)
            - This manual was completed with the help of another user from the group

        - **Appendix: Find Out `action.id` and Use Them for Other Applications**
            ###### Title: Appendix: Find Out `action.id` and Use Them for Other Applications
            ###### Description: The following commands apply to GUI.for.Clash and other similar applications, and should also be working on other Desktop Environments. Replace the `Create a Polkit Policy` content with the actual returned values of `action.id`
            ###### Commands:
                - `pkaction | grep domain`
                - `pkaction | grep route`
                - `pkaction | grep dns`

</knowledge_base>
