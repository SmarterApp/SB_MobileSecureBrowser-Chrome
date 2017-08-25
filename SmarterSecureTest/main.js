// *******************************************************************************
// Educational Online Test Delivery System
// Copyright (c) 2017 American Institutes for Research
//
// Distributed under the AIR Open Source License, Version 1.0
// See accompanying file AIR-License-1_0.txt or at
// http://www.smarterapp.org/documents/American_Institutes_for_Research_Open_Source_Software_License.pdf
// *******************************************************************************
var MessageHandler = {};

var TTS = {
  status : "Stopped"
};

MessageHandler.ERROR = function(request, sendResponse) {
  this.execute = function() {
    sendResponse({
      command : request.command,
      id : request.id,
      params : request.params,
      status : 'FAIL',
      result : "",
      message : "Unknown command"
    });
  }
};

// Chrome 25 on chrome OS has a bug in it.
// Until speak is called, all the other calls fail and no useful data is
// returned.
// So, in order to initialize the interal data structures used by
// chrome/chromeOS, we do a dummy speak and then
// do our real INIT
MessageHandler.INIT_WITH_HACK = function(request, sendResponse) {
  this.execute = function() {
    chrome.tts.speak("ready", {
      lang : 'en-US',
      volume : 0.01,
      onEvent : function(event) {
        switch (event.type) { // All the TTS terminal conditions for our test
        // utterance
        case 'end':
        case 'interrupted':
        case 'cancelled':
        case 'error':
          (new MessageHandler.INIT(request, sendResponse)).execute();
          break;
        default:
        }
      }
    });
    sendResponse({
      command : request.command,
      id : request.id,
      params : request.params,
      status : 'PENDING',
      result : "",
      message : ""
    });
  }
}

MessageHandler.INIT = function(request, sendResponse) {
  this.execute = function() {
    chrome.tts.getVoices(function(voices) {
      var voiceNames = [];
      for (var i = 0; i < voices.length; i++) {
        voiceNames.push(voices[i].voiceName);
      }
      var result = {
        command : request.command,
        id : request.id,
        params : request.params,
        status : 'OK',
        result : voiceNames.join(','),
        message : ""
      };
      sendResponse(result);
    });
    sendResponse({
      command : request.command,
      id : request.id,
      params : request.params,
      status : 'PENDING',
      result : "",
      message : ""
    });
  }
};

MessageHandler.SPEAK = function(request, sendResponse) {
  this.execute = function() {
    if (!request.params)
      return;

    // Add a progress listener
    request.params[1].onEvent = function(event) {
      var result = null;
      switch (event.type) {
      case 'start':
      case 'resume':
        TTS.status = "Playing";
        result = {
          command : 'TTS STATUS',
          id : request.id,
          params : "",
          status : 'OK',
          result : 'Playing',
          message : ""
        };
        break;
      case 'pause':
        TTS.status = "Paused";
        result = {
          command : 'TTS STATUS',
          id : request.id,
          params : "",
          status : 'OK',
          result : 'Paused',
          message : ""
        };
        break;
      case 'end':
      case 'interrupted':
      case 'cancelled':
      case 'error':
        TTS.status = "Stopped";
        result = {
          command : 'TTS STATUS',
          id : request.id,
          params : "",
          status : 'OK',
          result : 'Stopped',
          message : ""
        };
        break;
      case 'word':
        result = {
          command : 'TTS WORD',
          id : request.id,
          params : '',
          status : 'OK',
          result : event.charIndex,
          message : ''
        };
        break;
      default:
      }
      if (result != null) {
        sendResponse(result);
      }
    };
    chrome.tts.speak(request.params[0], request.params[1]);
    sendResponse({
      command : request.command,
      id : request.id,
      params : request.params,
      status : 'OK',
      result : "",
      message : ""
    });
  }
};

MessageHandler.SPEAKCHUNKS = function(request, sendResponse) {
  this.execute = function() {
    if (!request.params)
      return;

    var chunks = request.params[0];
    var options = request.params[1];
    options.enqueue = true; // this property tells the chrome TTS engine to not
    // abort the current TTS playback and queue the
    // chunks to play one after the other.

    var scheduledStopTimer; // This is needed because between chunks, we get
    // playing and stopped events. We dont need to
    // propagate these to the upper layers so we try to
    // suppress them here

    // Add a progress listener
    options.onEvent = function(event) {
      var result = null;
      // console.log(event.type+" "+event.charIndex+" "+event.message);
      switch (event.type) {
      case 'start':
      case 'resume':
        if (scheduledStopTimer) { // This is a start event for the next chunk
          clearTimeout(scheduledStopTimer);
        } else {
          TTS.status = "Playing";
          result = {
            command : 'TTS STATUS',
            id : request.id,
            params : "",
            status : 'OK',
            result : 'Playing',
            message : ""
          };
        }
        break;
      case 'pause':
        TTS.status = "Paused";
        result = {
          command : 'TTS STATUS',
          id : request.id,
          params : "",
          status : 'OK',
          result : 'Paused',
          message : ""
        };
        break;
      case 'end':
      case 'interrupted':
      case 'cancelled':
      case 'error':
        scheduledStopTimer = setTimeout(function() { // lets make sure this is
          // a "real" stop and not
          // one between chunks. We
          // are arbitrarily chosing
          // to wait 1 second
          TTS.status = "Stopped";
          result = {
            command : 'TTS STATUS',
            id : request.id,
            params : "",
            status : 'OK',
            result : 'Stopped',
            message : ""
          };
        }, 1000);
        break;
      case 'word':
        result = {
          command : 'TTS WORD',
          id : request.id,
          params : '',
          status : 'OK',
          result : event.charIndex,
          message : ''
        };
        break;
      default:
      }
      if (result != null) {
        sendResponse(result);
      }
    };

    for (var i = 0; i < chunks.length; i++) {
      if (options.srcId !== undefined) { // This is some goofy chrome.tts
        // thing. this property gets set on
        // call to the speak() api and resuse
        // of this object in subsequent calls
        // will fail if this prop is not
        // removed
        delete options.srcId
      }
      chrome.tts.speak(chunks[i], options);
    }
    sendResponse({
      command : request.command,
      id : request.id,
      params : request.params,
      status : 'OK',
      result : "",
      message : ""
    });
  }
};

MessageHandler.STOP = function(request, sendResponse) {
  this.execute = function() {
    chrome.tts.stop();
    sendResponse({
      command : request.command,
      id : request.id,
      params : request.params,
      status : 'OK',
      result : "",
      message : ""
    });
  }
};

MessageHandler.PAUSE = function(request, sendResponse) {
  this.execute = function() {
    chrome.tts.pause();
    sendResponse({
      command : request.command,
      id : request.id,
      params : request.params,
      status : 'OK',
      result : "",
      message : ""
    });
  }
};

MessageHandler.RESUME = function(request, sendResponse) {
  this.execute = function() {
    chrome.tts.resume();
    sendResponse({
      command : request.command,
      id : request.id,
      params : request.params,
      status : 'OK',
      result : "",
      message : ""
    });
  }
};

MessageHandler.STATUS = function(request, sendResponse) {
  this.execute = function() {
    sendResponse({
      command : request.command,
      id : request.id,
      params : request.params,
      status : 'OK',
      result : TTS.status,
      message : ""
    });
  }
};

// This is a no-op since we are a "kiosk mode" packaged app but preserving this
// for backwards compatability with the old chrome extension
MessageHandler.FULLSCREEN = function(request, sendResponse) {
  this.execute = function() {
    var response = {
      command : request.command,
      id : request.id,
      params : request.params,
      status : 'OK',
      result : JSON.stringify(request),
      message : 'No-op'
    };
    sendResponse(response);
  }
};

// Close the app
MessageHandler.CLOSE = function(request, sendResponse) {
  this.execute = function() {
    chrome.app.window.current().close();
  }
};

// Store key value pairs. The input parameter is a object who's props will get
// stored
MessageHandler.STOREDATA = function(request, sendResponse) {
  this.execute = function() {
    chrome.storage.local.set(request.params);
    var response = {
      command : request.command,
      id : request.id,
      params : request.params,
      status : 'OK',
      result : JSON.stringify(request),
      message : 'Saved'
    };
    sendResponse(response);
  }
};

// Clear stored keys
MessageHandler.CLEARDATA = function(request, sendResponse) {
  this.execute = function() {
    chrome.storage.local.remove(request.params);
    var response = {
      command : request.command,
      id : request.id,
      params : request.params,
      status : 'OK',
      result : JSON.stringify(request),
      message : 'Removed'
    };
    sendResponse(response);
  }
};

// Get Volume
MessageHandler.GETVOLUME = function(request, sendResponse) {
  this.execute = function() {
    if (!chrome.audio) { // chrome.audio is currently only supported on
      // chromeOS
      sendResponse({
        command : request.command,
        id : request.id,
        params : request.params,
        status : 'FAILED',
        result : "",
        message : ""
      });
      return;
    }
    chrome.audio.getInfo(function(outputDevices, inputDevices) {
      var volumeObj = {};
      outputDevices.forEach(function(device) {
        if (device.isActive) {
          volumeObj.volume = device.volume;
          volumeObj.isMuted = device.isMuted;
        }
      });
      var response = {
        command : request.command,
        id : request.id,
        params : request.params,
        status : 'OK',
        result : JSON.stringify(volumeObj),
        message : ''
      };
      sendResponse(response);
    });
    sendResponse({
      command : request.command,
      id : request.id,
      params : request.params,
      status : 'PENDING',
      result : "",
      message : ""
    });
  }
};

// Set Volume
MessageHandler.SETVOLUME = function(request, sendResponse) {
  this.execute = function() {
    if (!chrome.audio) { // chrome.audio is currently only supported on
      // chromeOS
      sendResponse({
        command : request.command,
        id : request.id,
        params : request.params,
        status : 'FAILED',
        result : "",
        message : ""
      });
      return;
    }
    chrome.audio.getInfo(function(outputDevices, inputDevices) {
      outputDevices.forEach(function(device) {
        if (device.isActive) {
          chrome.audio.setProperties(device.id, request.params, function() {
            var response = {
              command : request.command,
              id : request.id,
              params : request.params,
              status : 'OK',
              result : '',
              message : ''
            };
            sendResponse(response);
          });
        }
      });
    });
    sendResponse({
      command : request.command,
      id : request.id,
      params : request.params,
      status : 'PENDING',
      result : "",
      message : ""
    });
  }
};

var sendResponse = function(response) {
  webviewcontainer.contentWindow.postMessage({
    type : "CHROME RESPONSE",
    command : response.command,
    params : response.params,
    status : response.status,
    result : response.result,
    message : response.message
  }, "*");
}
// Listen for Messages from embedded web page
window.addEventListener("message", function(event) {
  if (event.data.type && (event.data.type == "CHROME COMMAND")) {
    var rand = Math.floor((Math.random() * 10000000))
    var request = {
      command : event.data.command,
      params : event.data.params,
      id : rand
    };

    switch (request.command) {
    case 'TTS INIT':
      (new MessageHandler.INIT(request, sendResponse)).execute();
      break;
    case 'TTS INITWITHHACK':
      (new MessageHandler.INIT_WITH_HACK(request, sendResponse)).execute();
      break;
    case 'TTS SPEAK':
      (new MessageHandler.SPEAK(request, sendResponse)).execute();
      break;
    case 'TTS SPEAKCHUNKS':
      (new MessageHandler.SPEAKCHUNKS(request, sendResponse)).execute();
      break;
    case 'TTS STOP':
      (new MessageHandler.STOP(request, sendResponse)).execute();
      break;
    case 'TTS PAUSE':
      (new MessageHandler.PAUSE(request, sendResponse)).execute();
      break;
    case 'TTS RESUME':
      (new MessageHandler.RESUME(request, sendResponse)).execute();
      break;
    case 'TTS STATUS':
      (new MessageHandler.STATUS(request, sendResponse)).execute();
      break;
    case 'UI FULLSCREEN':
      (new MessageHandler.FULLSCREEN(request, sendResponse)).execute();
      break;
    case 'APP CLOSE':
      (new MessageHandler.CLOSE(request, sendResponse)).execute();
      break;
    case 'APP STOREDATA':
      (new MessageHandler.STOREDATA(request, sendResponse)).execute();
      break;
    case 'APP CLEARDATA':
      (new MessageHandler.CLEARDATA(request, sendResponse)).execute();
      break;
    case 'APP GETVOLUME':
      (new MessageHandler.GETVOLUME(request, sendResponse)).execute();
      break;
    case 'APP SETVOLUME':
      (new MessageHandler.SETVOLUME(request, sendResponse)).execute();
      break;
    default:
      (new MessageHandler.ERROR(request, sendResponse)).execute();
      break;
    }
  }
}, false);

var webviewcontainer, defaultUrl = "http://browser.smarterbalanced.org/landing";

window.addEventListener('load', function() {
  webviewcontainer = document.getElementById('container');

  // Hijack the user agent to make sure that all requests to the server have our
  // SmarterAppSecureBrowser string in the UA
  webviewcontainer.setUserAgentOverride(navigator.userAgent
      + " SmarterAppSecureBrowser/" + chrome.runtime.getManifest().version);

  // When the TDS page is loaded, execute a script to notify the page that we
  // are running inside a chrome packaged app
  webviewcontainer.addEventListener("contentload", function(event) {
    webviewcontainer.executeScript({
      file : 'appWelcome.js'
    });
  });

  // When the TDS page is loaded, send it an event so that it has a handle to
  // this window object (to communicate back to this page)
  webviewcontainer.addEventListener("loadstop", function(event) {
    webviewcontainer.contentWindow.postMessage({
      type : "CHROME RESPONSE",
      command : 'APP WELCOME'
    }, '*');

  });

  // allow requests for media so that verbal response items work
  webviewcontainer.addEventListener("permissionrequest", function(event) {
    if (event.permission === "media") {
      event.request.allow();
    }
  });

  // The background.js would have determined the bounds that our webview can
  // take up
  if (window.WIN_BOUNDS) {
    webviewcontainer.style.width = WIN_BOUNDS.width + 'px';
    webviewcontainer.style.height = WIN_BOUNDS.height + 'px';
  }

  // Disable chromevox and other accessibility features
  try {
    chrome.accessibilityFeatures.spokenFeedback.set({
      value : false,
      scope : 'regular'
    });
  } catch (ex) {
  }
  try {
    chrome.accessibilityFeatures.largeCursor.set({
      value : false,
      scope : 'regular'
    });
  } catch (ex) {
  }
  try {
    chrome.accessibilityFeatures.stickyKeys.set({
      value : false,
      scope : 'regular'
    });
  } catch (ex) {
  }
  try {
    chrome.accessibilityFeatures.highContrast.set({
      value : false,
      scope : 'regular'
    });
  } catch (ex) {
  }
  try {
    chrome.accessibilityFeatures.screenMagnifier.set({
      value : false,
      scope : 'regular'
    });
  } catch (ex) {
  }
  try {
    chrome.accessibilityFeatures.autoclick.set({
      value : false,
      scope : 'regular'
    });
  } catch (ex) {
  } // chrome docs have this mis-cased. Not my typo
  try {
    chrome.accessibilityFeatures.virtualKeyboard.set({
      value : false,
      scope : 'regular'
    });
  } catch (ex) {
  }
  try {
    chrome.accessibilityFeatures.animationPolicy.set({
      value : 'none',
      scope : 'regular'
    });
  } catch (ex) {
  }

  // If we are in Kiosk mode, let the webview go to our servers. Otherwise show
  // an error
  if (window.IS_KIOSK_SESSION) {
    chrome.storage.local.get('launchUrl', function(value) {
      var url = value.launchUrl || defaultUrl; // We are first checking local
      // storage if a new default has
      // been persisted by the
      // launchpad website (from a
      // prior launch)
      // Set webviewcontainer src attribute
      webviewcontainer.src = url;
    });
  } else {
    webviewcontainer.style.display = 'none';
    document.getElementById('error').style.display = 'block';
  }
});

console.log("Ready");
