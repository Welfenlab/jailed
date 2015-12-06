
require('./_pluginWebWorker');
require('./_pluginCore');

self.postMessage({
	type : "initialized",
	dedicatedThread : true
}); 