var path = require('path');
global.argv = require('minimist')(process.argv.slice(1));
var path = require('path');
global.rootDir = path.dirname(__filename);

if(argv.dev || argv.devKaggle) {
  argv.dev = true;
} else {
  argv.dev = false;
}

var controllerPython = require('./pySetup/controllerPython.js');

var ensembler = require('ensembler');
var dataFile = process.argv[2];
argv.computerTotalCPUs = require('os').cpus().length;
argv.ppCompleteLocation = path.dirname(__filename);

console.log('thanks for inviting us along on your machine learning journey!\n');


// setting defaults if using the --dev or --devKaggle flags (speeds up development time when doing engineering work on the ppComplete library itself)
if( argv.dev ) {
  require('longjohn');
  if (dataFile.slice(-4) !== '.csv') {
    dataFile = 'data/titanic/train.csv'
  }
  if ( (argv.devKaggle && !argv.kagglePredict) || argv.devEnsemble) {
    argv.kagglePredict = 'data/titanic/test.csv';
  }
}

argv.dataFile = dataFile;
argv.dataFileName = path.basename( argv. dataFile );
argv.dataFilePretty = argv.dataFileName.slice(0,-4);
argv.binaryOutput = argv.binaryOutput || false; //python doesn't like undefined, so explicitly set this to false if it does not exist
argv.outputFileName = argv.dataFileName;
if( argv.dataFileName === 'train.csv' ) {
  dataFileFolder = path.parse(argv.dataFile).dir.split(path.sep).pop();
  argv.outputFileName = dataFileFolder + argv.dataFilePretty;
}
console.log('argv.outputFileName');
console.log(argv.outputFileName);

var readyToMakePredictions = false;
var numberOfClassifiers = require('./pySetup/classifierList');
numberOfClassifiers = Object.keys(numberOfClassifiers).length;


if (argv.devEnsemble) {
  ensembler.startListeners(numberOfClassifiers, argv.dataFilePretty, './predictions', argv.ppCompleteLocation );
  ensembler.createEnsemble( argv.dataFilePretty, './predictions', argv.ppCompleteLocation );
} else {
  // **********************************************************************************
  // Here is where we invoke the method with the path to the data
  // we pass in a callback function that will make the dataSummary a global variable 
    // and invoke parallelNets once formatting the data is done. 
  // **********************************************************************************
  controllerPython.startTraining(argv);
  
  ensembler.startListeners( numberOfClassifiers, argv.dataFilePretty, './predictions', argv.ppCompleteLocation );
}


// kills off all the child processes if the parent process faces an uncaught exception and crashes. 
// this prevents you from having zombie child processes running indefinitely.
// lifted directly from: https://www.exratione.com/2013/05/die-child-process-die/
// This is a somewhat ugly approach, but it has the advantage of working
// in conjunction with most of what third parties might choose to do with
// uncaughtException listeners, while preserving whatever the exception is.
process.once("uncaughtException", function (error) {
  // If this was the last of the listeners, then shut down the child and rethrow.
  // Our assumption here is that any other code listening for an uncaught
  // exception is going to do the sensible thing and call process.exit().
  if (process.listeners("uncaughtException").length === 0) {
    console.log('we heard an unexpected shutdown event that is causing everything to close');
    ppLibShutdown();
    throw error;
  }
});

var ppLibShutdown = function() {
  controllerPython.killAll();
};

if (process.platform === "win32") {
  var rl = require("readline").createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.on("SIGINT", function () {
    process.emit("SIGINT");
  });
}

process.on("SIGINT", function () {
  //graceful shutdown
  ppLibShutdown();
  process.exit();
});

process.on("killAll", function() {
  ppLibShutdown();
  process.exit();

});

