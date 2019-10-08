var fs = require('fs'),
    untildify = require('untildify');


function FileSystermService() { return this; }

FileSystermService.prototype.ls = function(path, func) {
    var lst;
    try {
        path = untildify(path);
        lst = fs.readdirSync(path).map(
            function(x) { 
                try {
                    return [x, fs.statSync(path+'/'+x).isDirectory() ? '/' : '']; 
                }
                catch (e) { return ['...', '...']; }
            });
    }
    catch (e) { console.warn(e); lst = ['<error>', 'X']; }
    return func(lst);
};
FileSystermService.prototype.find = function(path, depth=3, func=identity) {
    var self = this;
    if (depth == 0) return [];
    return this.ls(path, function(lst) { return func(lst.map(function(x) {
        return x.concat([x[1]!='/' ? [] : self.find(path + "/" + x[0], depth - 1)]);
    })); });
};
FileSystermService.prototype.load = function(filename, func) {
    try {
        filename = untildify(filename);
        return func(fs.readFileSync(filename).toString());
    }
    catch (e) {
        return func(undefined, e);
    }
};
FileSystermService.prototype.save = function(filename, contents, func) {
    filename = untildify(filename);
    fs.writeFile(filename, contents, func);
};

FileSystermService.prototype.attach = function(socket) {
  var self = this;
  
  socket.on('fs ls', function(path, func) {
     return self.ls(path, func);
  });
  
  socket.on('fs find', function(path, depth, func) {
      return self.find(path, depth, func);
   });
   
  socket.on('fs load', function(filename, func) {
      return self.load(filename, func);
  });
  
  socket.on('fs save', function(filename, contents, func) {
      return self.save(filename, contents, func);
  });

  return this;
}


function identity(x) { return x; }



module.exports = function(socket) {
    return new FileSystermService().attach(socket);
}