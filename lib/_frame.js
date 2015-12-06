
/**
 * Contains the code executed in the sandboxed frame under web-browser
 * 
 * Tries to create a Web-Worker inside the frame and set up the
 * communication between the worker and the parent window. Some
 * browsers restrict creating a worker inside a sandboxed iframe - if
 * this happens, the plugin initialized right inside the frame (in the
 * same thread)
 */


var scripts = document.getElementsByTagName('script');
var thisScript = scripts[scripts.length-1];
var parentNode = thisScript.parentNode;
var __jailed__path__ = thisScript.src
    .split('?')[0]
    .split('/')
    .slice(0, -1)
    .join('/')+'/';


/**
 * Initializes the plugin inside a webworker. May throw an exception
 * in case this was not permitted by the browser.
 */
var initWebworkerPlugin = function() {
    // creating worker as a blob enables import of local files
    var fs = require('fs')
    var blobCode = fs.readFileSync(__dirname + '/../dist/web/_worker.js', 'utf8')

    var blobUrl = window.URL.createObjectURL(
        new Blob([blobCode])
    );

    var worker = new Worker(blobUrl);

    // mixed content warning in Chrome silently skips worker
    // initialization without exception, handling this with timeout
    var fallbackTimeout = setTimeout(function() {
        console.warn('Failed to initialize web worker, falling back to iframe.')
        worker.terminate();
        initIframePlugin();
    }, 1000);

    // forwarding messages between the worker and parent window
    worker.addEventListener('message', function(m) {
        if (m.data.type == 'initialized') {
            clearTimeout(fallbackTimeout);
        }

        parent.postMessage(m.data, '*');
    });

    window.addEventListener('message', function(m) {
        worker.postMessage(m.data);
    });
}


/**
 * Creates plugin right in this iframe
 */
var initIframePlugin = function() {
    // loads additional script into the frame
    window.loadScript = function(path, sCb, fCb) {
        var script = document.createElement('script');
        script.src = path;

        var clear = function() {
            script.onload = null;
            script.onerror = null;
            script.onreadystatechange = null;
            script.parentNode.removeChild(script);
            currentErrorHandler = function(){};
        }

        var success = function() {
            clear();
            sCb();
        }

        var failure = function() {
            clear();
            fCb();
        }

        currentErrorHandler = failure;

        script.onerror = failure;
        script.onload = success;
        script.onreadystatechange = function() {
            var state = script.readyState;
            if (state==='loaded' || state==='complete') {
                success();
            }
        }

        parentNode.appendChild(script);
    }

        
    // handles script loading error
    // (assuming scripts are loaded one by one in the iframe)
    var currentErrorHandler = function(){};
    window.addEventListener('error', function(message) {
        currentErrorHandler();
    });
    require('./_pluginWebIframe');
    require('./_pluginCore');
}



try {
    initWebworkerPlugin();
} catch(e) {
    initIframePlugin();
}

