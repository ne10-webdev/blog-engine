const fs = require('fs');
const path = require('path');
const fse = require('fs-extra');

const build = async (options = {}) => {
  console.log('Building site...');
  const startTime = process.hrtime();

  // clear destination folder
  fse.emptyDirSync(options.site.publicPath);

  // copy assets folder
  const assetsPath = path.join(options.site.themePath, 'assets');
  if (fse.existsSync(assetsPath)) {
    fse.copySync(assetsPath, options.site.publicPath);
  }

  const timeDiff = process.hrtime(startTime);
  const duration = timeDiff[0] * 1000 + timeDiff[1] / 1e6;
  console.log(`Site built succesfully in ${duration}ms`);
};

module.exports = build;