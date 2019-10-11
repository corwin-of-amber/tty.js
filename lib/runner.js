const untildify = require('untildify'),
      execa = require('execa'),
      options = require('merge-options');


class RunnerService {
    exec(argv, opts, callback) {
        opts = options({stripFinalNewline: false}, opts);

        var prog = untildify(argv[0]);

        var child = execa(prog, argv.slice(1), opts);
        if (opts.stdinContents) {
            child.stdin.write(opts.stdinContents);
        }
        child.stdin.end();
       
        return child.catch(callback).then(callback);
    }

    attach(socket) {
        socket.on('exec', (argv, opts, callback) =>
           this.exec(argv, opts, callback)
        );

        return this;
    }
}



module.exports = function(socket) {
    return new RunnerService().attach(socket);
}
