// src/splash.js

// Get elements
const launchScreen = document.getElementById('launch-screen');
const enterButton = document.getElementById('enter-app-button');
let hideTimeoutId = null; // To store the timeout ID

// Function to hide the launch screen
function hideLaunchScreen() {
  if (launchScreen) {
    // Clear the timeout if it hasn't fired yet (e.g., button clicked)
    if (hideTimeoutId) {
      clearTimeout(hideTimeoutId);
      hideTimeoutId = null;
    }
    // Fade out effect
    launchScreen.style.opacity = '0';
    // Remove from layout after fade out
    // Use 'transitionend' event for more robust removal after fade
    launchScreen.addEventListener('transitionend', () => {
        if (launchScreen.style.opacity === '0') { // Ensure it's the fade-out transition
             launchScreen.style.display = 'none';
        }
    }, { once: true }); // Remove listener after it runs once

    // Fallback removal in case transitionend doesn't fire (e.g., element removed by React)
    setTimeout(() => {
        if (launchScreen.style.opacity === '0') {
             launchScreen.style.display = 'none';
        }
    }, 550); // Slightly longer than transition duration
  }
}

// Add click listener to the button
if (enterButton) {
  enterButton.addEventListener('click', hideLaunchScreen);
} else {
  console.warn('Splash screen button not found.'); // Log if button is missing
}

// Set timeout to hide automatically after 5 seconds
if (launchScreen) {
  hideTimeoutId = setTimeout(hideLaunchScreen, 5000); // 5000 milliseconds = 5 seconds
} else {
   console.warn('Launch screen element not found.'); // Log if screen is missing
}