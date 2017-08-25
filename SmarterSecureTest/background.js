// *******************************************************************************
// Educational Online Test Delivery System
// Copyright (c) 2017 American Institutes for Research
//
// Distributed under the AIR Open Source License, Version 1.0
// See accompanying file AIR-License-1_0.txt or at
// http://www.smarterapp.org/documents/American_Institutes_for_Research_Open_Source_Software_License.pdf
// *******************************************************************************

/**
 * Listens for the app launching then creates the window
 * 
 * @see http://developer.chrome.com/apps/app.window.html
 */
chrome.app.runtime.onLaunched.addListener(function(launchData) {
  chrome.app.window.create('main.html', {
    id : 'main',
    state : 'maximized' /* , alwaysOnTop: true */
  }, // This config appears not to be working
  function(appWindow) {
    // propagate the launch mode to the webview
    appWindow.contentWindow.IS_KIOSK_SESSION = launchData.isKioskSession;

    // propagate the current window bounds to the main page so that
    // we can set the webview's (contained in there) size properly to maximize
    // screen realestate
    appWindow.contentWindow.WIN_BOUNDS = appWindow.getBounds();
  });
});