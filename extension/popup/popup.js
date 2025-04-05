const STORAGE_KEY = "darkModeSettings";
const OPTIONS = {
  1: "DARK",
  3: "GRAY_SCALE",
  0: "DISABLED",
};

function isContentScriptAvailable(tabId) {
  return new Promise((resolve) => {
    try {
      chrome.tabs.sendMessage(
        tabId, 
        { ping: true },
        function(response) {
          if (chrome.runtime.lastError) {
            // Silently handle the error
            resolve(false);
            return;
          }
          resolve(true);
        }
      );
      
    
      setTimeout(() => {
        resolve(false);
      }, 300);
    } catch (error) {
      console.error("Error checking content script:", error);
      resolve(false);
    }
  });
}

document.querySelectorAll('input[name="displayMode"]').forEach((radio) => {
  radio.addEventListener("change", async function () {
    const modeValue = this.value;
    let option = OPTIONS[modeValue] || "0";

    chrome.tabs.query({ active: true, currentWindow: true }, async function (tabs) {
      if (!tabs || tabs.length === 0) return;
      
      try {
        const hostname = new URL(tabs[0].url).hostname;
        const tabId = tabs[0].id;
        
        // Check if we can inject on this tab
        if (!tabs[0].url.startsWith('http')) {
          console.log("Cannot apply to this page type");
          return;
        }
        
        saveSettingForHostname(hostname, option);
        
        chrome.tabs.sendMessage(
          tabId, 
          { option, hostname },
          function(response) {
            if (chrome.runtime.lastError) {
              console.log("Content script not available, injecting it now");
              
              chrome.scripting.executeScript({
                target: { tabId: tabId },
                files: ['/content-script.js']
              }).then(() => {
                setTimeout(() => {
                  chrome.tabs.sendMessage(tabId, { option, hostname });
                }, 100);
              }).catch(err => {
                console.error("Failed to inject content script:", err);
              });
            }
          }
        );
      } catch (error) {
        console.error("Error processing tab:", error);
      }
    });
  });
});

function saveSettingForHostname(hostname, option) {
  chrome.storage.sync.get([STORAGE_KEY], function (result) {
    const settings = result?.darkModeSettings || {};
    settings[hostname] = option;
    
    chrome.storage.sync.set({ [STORAGE_KEY]: settings }, function () {
      console.info(`[${STORAGE_KEY}]: Settings saved for ${hostname}`);
    });
  });
}

function applySavedPreferences(hostname) {
  chrome.storage.sync.get([STORAGE_KEY], function (result) {
    let settings = result.darkModeSettings || {};
    let savedMode = settings[hostname];

    if (settings[hostname]) {
      let defaltValue = "0";

      for (const [key, value] of Object.entries(OPTIONS)) {
        if (value === savedMode) {
          defaltValue = key;
          break;
        }
      }

      document.querySelector(
        `input[name="displayMode"][value="${defaltValue}"]`
      ).checked = true;
    }
  });
}


document.addEventListener("DOMContentLoaded", function () {
 

  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    if (tabs && tabs.length > 0 && tabs[0].url) {
      try {
        let hostname = new URL(tabs[0].url).hostname;
        applySavedPreferences(hostname);
      } catch (error) {
        console.error("Error getting hostname:", error);
      }
    }
  });
});

const SCHEDULER_KEY = "autoSchedulerSettings";

document.addEventListener("DOMContentLoaded", function () {
  
  initSchedulerUI();
});

function initSchedulerUI() {
  const schedulerToggle = document.getElementById('schedulerToggle');
  const schedulerSettings = document.getElementById('schedulerSettings');
  const saveSchedulerBtn = document.getElementById('saveScheduler');
  const customActivationOption = document.getElementById('customActivationOption');
  const customActivationTime = document.getElementById('customActivationTime');
  const customDeactivationOption = document.getElementById('customDeactivationOption');
  const customDeactivationTime = document.getElementById('customDeactivationTime');
  
  chrome.runtime.sendMessage({ action: "getSchedulerSettings" }, (response) => {
    const settings = response.settings || { enabled: false };
    
    schedulerToggle.checked = settings.enabled;
    schedulerSettings.style.display = settings.enabled ? 'block' : 'none';
    
    if (settings.activationType === 'custom') {
      customActivationOption.checked = true;
      customActivationTime.disabled = false;
      customActivationTime.value = settings.customActivationTime || '18:00';
    } else {
      document.getElementById('sunsetOption').checked = true;
    }
    
    if (settings.deactivationType === 'custom') {
      customDeactivationOption.checked = true;
      customDeactivationTime.disabled = false;
      customDeactivationTime.value = settings.customDeactivationTime || '06:00';
    } else {
      document.getElementById('sunriseOption').checked = true;
    }
  });
  
  schedulerToggle.addEventListener('change', function() {
    schedulerSettings.style.display = this.checked ? 'block' : 'none';
  });
  
  customActivationOption.addEventListener('change', function() {
    customActivationTime.disabled = !this.checked;
  });
  
  customDeactivationOption.addEventListener('change', function() {
    customDeactivationTime.disabled = !this.checked;
  });
  
  saveSchedulerBtn.addEventListener('click', function() {
    const settings = {
      enabled: schedulerToggle.checked,
      activationType: document.querySelector('input[name="activationType"]:checked').value,
      deactivationType: document.querySelector('input[name="deactivationType"]:checked').value,
      customActivationTime: customActivationTime.value,
      customDeactivationTime: customDeactivationTime.value,
      sunsetTime: '18:00',
      sunriseTime: '06:00'
    };
    
    chrome.runtime.sendMessage({ 
      action: "updateScheduler", 
      settings: settings 
    }, (response) => {
      if (response.success) {
        const saveBtn = document.getElementById('saveScheduler');
        const originalText = saveBtn.textContent;
        saveBtn.textContent = 'Saved!';
        saveBtn.style.backgroundColor = '#4CAF50';
        
        setTimeout(() => {
          saveBtn.textContent = originalText;
          saveBtn.style.backgroundColor = '';
        }, 2000);
      }
    });
  });
}
