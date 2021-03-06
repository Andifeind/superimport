'use strict';

let path = require('path');
let fs = require('fs');

let getPaths = function() {
  let curDir = process.cwd();
  let dirs = [curDir + '/node_modules'];

  while (true) {
    curDir = path.join(curDir, '..');
    dirs.push(curDir + '/node_modules');

    if (curDir === '/') {
      return dirs;
    }
  }
}

function readDir(dir, opts) {
  opts = opts || {}

  let files = [];
  fs.readdirSync(dir).forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      if (opts.recursive) {
        files = files.concat(readDir(filePath, opts));
      }
    }
    else {
      if (/\.js(on)?$/.test(file)) {
        files.push(filePath);
      }
    }
  });

  return files;
}

module.exports = function(moduleName, importDirs) {
  const modulePath = getModulePath(moduleName, importDirs);
  if (modulePath === null) {
    throw new Error(`Module '${moduleName}' was not found!\n`);
  }

  return require(modulePath);
};

function importAll(dirs, opts) {
  opts = opts || {}

  if (typeof opts === 'boolean') {
    opts = {
      recursive: opts
    }
  }

  let files = []
  if (!Array.isArray(dirs)) {
    dirs = [dirs]
  }

  dirs.forEach((dir) => {
    if (dir[0] === '.') {
      dir = path.resolve(path.dirname(module.parent.filename), dir)
    }


    try {
      readDir(dir, opts).filter(f => /\.(js|node)$/.test(f)).map(f => {
        const m = require(f)
        m.filename = f
        files.push(m)
      });
    } catch (err) {
      if (!opts.silent) {
        throw err
      }
    }
  })

  files.apply = function(ctx, args) {
    files.forEach(file => file.apply(ctx, args))
  }

  files.call = function(ctx) {
    const args = Array.prototype.slice.call(arguments, 1)
    files.apply(ctx, args)
  }

  return files
}

function moduleExists(moduleName, paths) {
  return !!getModulePath(moduleName, paths)
}

function getModulePath(moduleName, paths) {
  paths = paths || module.parent.paths.concat(getPaths());
  for (let dir of paths) {
    try {
      const modulePath = path.join(dir, moduleName)
      fs.accessSync(modulePath)
      return modulePath
    } catch (err) {
      // Ignore errors
    }
  }

  return null
}

module.exports.importAll = importAll
module.exports.moduleExists = moduleExists
module.exports.getModulePath = getModulePath
