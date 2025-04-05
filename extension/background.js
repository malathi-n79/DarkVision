const STORAGE_KEY = "darkModeSettings";
const SCHEDULER_KEY = "autoSchedulerSettings";

chrome.runtime.onInstalled.addListener(() => {
  initializeScheduler();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "darkModeActivation") {
    activateDarkMode();
  } else if (alarm.name === "darkModeDeactivation") {
    deactivateDarkMode();
  }
});

function initializeScheduler() {
  chrome.storage.sync.get([SCHEDULER_KEY], (result) => {
    const settings = result[SCHEDULER_KEY] || {};
    
    if (settings.enabled) {
      setupAlarms(settings);
    }
  });
}

function setupAlarms(settings) {
  chrome.alarms.clearAll();
  
  if (!settings.enabled) return;
  
  const now = new Date();
  
  if (settings.activationType === "sunset" && settings.sunsetTime) {
    const [hours, minutes] = settings.sunsetTime.split(':').map(Number);
    let activationTime = new Date(now);
    activationTime.setHours(hours, minutes, 0, 0);
    
    if (activationTime < now) {
      activationTime.setDate(activationTime.getDate() + 1);
    }
    
    const delayInMinutes = (activationTime - now) / (1000 * 60);
    chrome.alarms.create("darkModeActivation", {
      delayInMinutes: delayInMinutes,
      periodInMinutes: 24 * 60 
    });
  } else if (settings.activationType === "custom" && settings.customActivationTime) {
    const [hours, minutes] = settings.customActivationTime.split(':').map(Number);
    let activationTime = new Date(now);
    activationTime.setHours(hours, minutes, 0, 0);
    
    if (activationTime < now) {
      activationTime.setDate(activationTime.getDate() + 1);
    }
    
    const delayInMinutes = (activationTime - now) / (1000 * 60);
    chrome.alarms.create("darkModeActivation", {
      delayInMinutes: delayInMinutes,
      periodInMinutes: 24 * 60 
    });
  }
  
  if (settings.deactivationType === "sunrise" && settings.sunriseTime) {
    const [hours, minutes] = settings.sunriseTime.split(':').map(Number);
    let deactivationTime = new Date(now);
    deactivationTime.setHours(hours, minutes, 0, 0);
    
    if (deactivationTime < now) {
      deactivationTime.setDate(deactivationTime.getDate() + 1);
    }
    
    const delayInMinutes = (deactivationTime - now) / (1000 * 60);
    chrome.alarms.create("darkModeDeactivation", {
      delayInMinutes: delayInMinutes,
      periodInMinutes: 24 * 60 
    });
  } else if (settings.deactivationType === "custom" && settings.customDeactivationTime) {
    const [hours, minutes] = settings.customDeactivationTime.split(':').map(Number);
    let deactivationTime = new Date(now);
    deactivationTime.setHours(hours, minutes, 0, 0);
    
    if (deactivationTime < now) {
      deactivationTime.setDate(deactivationTime.getDate() + 1);
    }
    
    const delayInMinutes = (deactivationTime - now) / (1000 * 60);
    chrome.alarms.create("darkModeDeactivation", {
      delayInMinutes: delayInMinutes,
      periodInMinutes: 24 * 60 
    });
  }
}

function activateDarkMode() {
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach(tab => {
      if (tab.url.startsWith('http')) {
        try {
          const hostname = new URL(tab.url).hostname;
          
          saveSettingForHostname(hostname, "DARK");
          
          // Add error handling for message sending
          chrome.tabs.sendMessage(tab.id, { option: "DARK", hostname }, (response) => {
            if (chrome.runtime.lastError) {
              // Silently handle the error - tab might be closed or not have content script
              console.log(`Could not send message to tab ${tab.id}: ${chrome.runtime.lastError.message}`);
            }
          });
        } catch (error) {
          console.error("Error processing tab:", error);
        }
      }
    });
  });
}

function deactivateDarkMode() {
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach(tab => {
      if (tab.url.startsWith('http')) {
        try {
          const hostname = new URL(tab.url).hostname;
          
          saveSettingForHostname(hostname, "DISABLED");
          
          // Add error handling for message sending
          chrome.tabs.sendMessage(tab.id, { option: "DISABLED", hostname }, (response) => {
            if (chrome.runtime.lastError) {
              // Silently handle the error - tab might be closed or not have content script
              console.log(`Could not send message to tab ${tab.id}: ${chrome.runtime.lastError.message}`);
            }
          });
        } catch (error) {
          console.error("Error processing tab:", error);
        }
      }
    });
  });
}

function saveSettingForHostname(hostname, option) {
  chrome.storage.sync.get([STORAGE_KEY], function (result) {
    const settings = result[STORAGE_KEY] || {};
    settings[hostname] = option;
    
    chrome.storage.sync.set({ [STORAGE_KEY]: settings }, function () {
      console.info(`[${STORAGE_KEY}]: Settings saved for ${hostname}`);
    });
  });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "updateScheduler") {
    chrome.storage.sync.set({ [SCHEDULER_KEY]: request.settings }, () => {
      setupAlarms(request.settings);
      sendResponse({ success: true });
    });
    return true;

  } else if (request.action === "getSchedulerSettings") {
    chrome.storage.sync.get([SCHEDULER_KEY], (result) => {
      sendResponse({ settings: result[SCHEDULER_KEY] || { enabled: false } });
    });
    return true;

  }
});