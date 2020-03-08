const chokidar = require('chokidar');
const debounce = require('lodash.debounce');
const liveServer = require("live-server");

const build = require('./modules/build.js');
const config = require('./config.json');

async function init() {
  await build(config);
  liveServer.start({
    port: 3000,
    host: "0.0.0.0",
    root: config.site.publicPath,
    open: true,
    ignore: '',
    file: "index.html",
    wait: 100,
    logLevel: 0,
    middleware: [function(req, res, next) { next(); }]
  }); 
  chokidar.watch(config.site.contentPath, { ignoreInitial: true }).on(
    'all',
    debounce(() => {
      build(config);
      console.log('Waiting for changes...');
    }, 100)
  );
}

init();
