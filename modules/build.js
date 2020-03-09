const fs = require('fs');
const path = require('path');
const fse = require('fs-extra');
const frontMatter = require('front-matter');
const marked = require('marked');
const ejs = require('ejs');

// enable code syntax highlighting library
const hljs = require("highlight.js");
marked.setOptions({
  highlight: function(md) {
    return hljs.highlightAuto(md).value;
  }
});

const build = async (options = {}) => {
  console.log('Building site...');
  const startTime = process.hrtime();

  // clear destination folder
  // fse.emptyDirSync(options.site.publicPath);

  // copy assets folder
  const assetsPath = path.join(options.site.themePath, 'assets');
  if (fse.existsSync(assetsPath)) {
    fse.copySync(assetsPath, options.site.publicPath);
  }

  // build site by sections
  await buildSection({
    section: options.blog,
    site: options.site
  });
  await buildSection({
    section: options.projects,
    site: options.site
  });
  await buildSection({
    section: options.pages,
    site: options.site
  });

  const timeDiff = process.hrtime(startTime);
  const duration = timeDiff[0] * 1000 + timeDiff[1] / 1e6;
  console.log(`Site built succesfully in ${duration}ms`);
};

const buildSection = async (options = {}) => {
  return new Promise((resolve, reject) => {
    const sectionContentPath = path.join(options.site.contentPath, options.section.name);
    walk(sectionContentPath, function(err, files){
      if(err) {
        reject(err);
        return;
      }
      let list = [];
      for(const file of files) {
        if(path.extname(file).toLowerCase() === 'md') {
          continue;
        }
        let newPath = file.replace(path.join(options.site.contentPath, options.section.name), '')
          .replace('.md', '/');
        const fileContent = fs.readFileSync(file, 'utf-8');
        const item = frontMatter(fileContent);
        const listItem = {
          section: options.section.name,
          url: options.site.basePrefix + options.section.urlPrefix + newPath,
          title: item.attributes.title,
          description: item.attributes.description,
          date: item.attributes.date,
          draft: item.attributes.draft,
          tags: item.attributes.tags || [],
          layout: item.attributes.layout || 'default',
          content: marked(item.body)
        };
        if(listItem.draft) {
          continue;
        }
        list.push(listItem);
      }
      // sort blog list by post date
      list.sort(function(a, b){ return b.date -a.date; });
      let tags = [];
      for(let page of list) {
        buildPage(page, options);
        for(let tag of page.tags) {
          if(!tags.includes(tag)) {
            tags.push(tag);
          }
        }
      }
      // build tags pages
      for(let tag of tags) {
        buildTagPage(list, tag, options);
      }
      if(options.section.indexPage) {
        fse.copyFileSync(path.join(options.site.publicPath, options.section.indexPage),
          path.join(options.site.publicPath, 'index.html'));
      } else {
        buildIndex(list, options);
      }
      resolve();
    });    
  });
};

// build markdown page with given layout
const buildPage = function(page, options) {
  console.log('build page', page.url);
  let destPath = path.join(options.site.publicPath, page.url);
  // create destination directory
  fse.mkdirsSync(destPath);
  
  const layoutFile = path.join(options.site.themePath, 'layouts', `${page.layout}.ejs`);
  const layoutTemplate = fse.readFileSync(layoutFile, 'utf-8');
  const templateConfig = {
    list: page.list,
    site: options.site,
    page: page
  };
  const pageHTML = ejs.render(
    layoutTemplate,
    Object.assign({}, templateConfig, {
      body: page.content,
      filename: path.join(options.site.themePath, `layout-${page.layout}`)
    })
  );
  console.log('save to', destPath);
  fse.writeFileSync(path.join(destPath, 'index.html'), pageHTML);
};

// build public index.html file with list of posts
const buildIndex = function(list, options) {
  const listPage = {
    section: options.section.name,
    url: options.site.basePrefix + options.section.urlPrefix,
    title: 'Blog posts',
    description: '',
    date: new Date().getTime(),
    draft: null,
    layout: 'list',
    content: '',
    list: list
  };
  buildPage(listPage, options);
};

const buildTagPage = function(list, tag, options) {
  let listByTag = [];
  for(let item of list) {
    if(item.tags.includes(tag)) {
      listByTag.push(item);
    }
  }
  const listPage = {
    section: options.section.name,
    url: options.site.basePrefix + options.section.urlPrefix +
      '/tag/' + tag,
    title: 'Blog posts',
    description: '',
    date: new Date().getTime(),
    draft: null,
    layout: 'list',
    content: '',
    list: listByTag
  };
  buildPage(listPage, options);
}

// read directory content recusively
const walk = function(dir, done) {
  let results = [];
  fs.readdir(dir, function(err, list) {
    if (err) return done(err);
    let i = 0;
    (function next() {
      let file = list[i++];
      if (!file) return done(null, results);
      file = path.resolve(dir, file);
      fs.stat(file, function(err, stat) {
        if (stat && stat.isDirectory()) {
          walk(file, function(err, res) {
            results = results.concat(res);
            next();
          });
        } else {
          results.push(file);
          next();
        }
      });
    })();
  });
};

module.exports = build;