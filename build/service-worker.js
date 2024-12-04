// service-worker.js

// Listener for when the extension is installed or updated
chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed or updated');
});

// Listener for browser action (e.g., clicking the extension icon)
chrome.action.onClicked.addListener((tab) => {
  console.log('Extension icon clicked');
  // Perform some action, like opening a new tab or modifying the current tab
  chrome.tabs.create({ url: 'https://www.example.com' });
});

// Listener for messages from other parts of the extension (e.g., content scripts or popup)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'log') {
    console.log('Log from React app:', message.data);
  }
  sendResponse({ result: 'Log received' });
});