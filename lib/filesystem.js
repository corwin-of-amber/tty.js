var fs = require('fs');


function FileSystermService() { return this; }

FileSystermService.prototype.ls = function(path, func) {
    var lst;
    try {
        lst = fs.readdirSync(path).map(
            function(x) { return [x, fs.statSync(path+'/'+x).isDirectory() ? '/' : '']; });
    }
    catch (e) { lst = []; }
    return func(lst);
};
FileSystermService.prototype.find = function(path, func) {
    var thisfv = this;
    return this.ls(path, function(lst) { return func(lst.map(function(x) {
        return x.concat([x[1]!='/' ? [] : thisfv.find(path + "/" + x[0], identity)]);
    })); });
};
FileSystermService.prototype.load = function(filename, func) {
    try {
        return func(fs.readFileSync(filename).toString());
    }
    catch (e) {
        return func(undefined, e);
    }
};
FileSystermService.prototype.save = function(filename, contents, func) {
    fs.writeFile(filename, contents, func);
};
//var sh = require('execSync');
var sh = {
    exec: function(cmd) {
        var sp = require('child_process')
              .spawnSync('/bin/sh', ['-c', cmd], {encoding: 'utf-8'});
        /* adapter for deprecated execSync */
        return {code: sp.status, stdout: sp.stdout, stderr: sp.stderr};
    }
};
FileSystermService.prototype.execute = function(script, func) {
    try {
        return func(sh.exec(script));  /* So non-secure :P */
    }
    catch (e) {
        return func(e);
    }
};

FileSystermService.prototype.attach = function(socket) {
  var self = this;
  
  socket.on('fs ls', function(path, func) {
     return self.ls(path, func);
  });
  
  socket.on('fs find', function(path, func) {
      return self.find(path, func);
   });
   
  socket.on('fs load', function(filename, func) {
      return self.load(filename, func);
  });
  
  socket.on('fs save', function(filename, contents, func) {
      return self.save(filename, contents, func);
  });
  
  socket.on('fs exec', function(script, func) {
      return self.execute(script, func);
  });

  return this;
}


function identity(x) { return x; }



module.exports = function(socket) {
    return new FileSystermService().attach(socket);
}