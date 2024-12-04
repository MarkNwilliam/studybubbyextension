// logToServiceWorker.js

export function logToServiceWorker(data) {
    chrome.runtime.sendMessage({ action: 'log', data: data }, (response) => {
      console.log('Service worker log response:', response);
    });
  }