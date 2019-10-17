
class Runner {

    constructor() {
        this.activeWindow = null;

        this.scriptPath = "~/_runner";

        $('button#run').click(() => this.run());

        document.addEventListener('keydown', ev => {
            if (ev.key === 'Enter' && (ev.ctrlKey || ev.metaKey)) {
                ev.stopPropagation();
                this.run();
            }
        }, {capture: true});

        this.script = () => this.start('~/a.out'); // default operation
    }

    run() {
        if (this.activeWindow && this.activeWindow.script == this.script)
            this.activeWindow.exec();
        else {
            this.script();
            if (this.activeWindow) this.activeWindow.script = this.script;
        }
    }

    start(prog, argsDefault=[], stdinDefault=null) {
        var w = this.activeWindow || this.createWindow();

        w.start(prog, argsDefault, stdinDefault);
    }

    readScript() {
        return new Promise((resolve, reject) =>
            fileview.io.emit('fs load', this.scriptPath, (out, err) => {
                if (err)
                    err.code == 'ENOENT' ? resolve(null) : reject(err);
                else
                    resolve(out);
            })
        );
    }

    createWindow() {
        this.activeWindow = new RunnerWindow;
        this.activeWindow.win.on('close', () => this.activeWindow = undefined);
        return this.activeWindow;
    }
}

class RunnerWindow {

    constructor() {
        this.win = this.create();
        this.argc = 2;
    }

    create() {
        var win = new tty.Window();
        $(win.element).addClass("window--runner")
            .append(win.clientArea = $('<div>').addClass('area'));
        return win;
    }

    start(prog, argsDefault=[], stdinDefault=null) {
        this.prog = prog;

        var area = this.win.clientArea;
        area.empty();

        // Add one <input> per argument
        var args = $('<div>').addClass('arguments');
        for (let argval of argsDefault)
            args.append(this._inputbox().val(argval));
        area.append(args);

        // Add <input> for stdin if applicable
        if (stdinDefault) {
            var in_ = $('<div>').addClass('input');
            in_.append(this._inputbox().val(stdinDefault));
            area.append(in_);
        }

        var out = $('<div>').addClass('output');
        area.append(out);

        var err = $('<div>').addClass('error');
        area.append(err);

        this.ui = {args, in_, out, err};

        area.on('input', 'input', () => this.exec());

        this.exec();
    }

    argvals() { 
        return this.ui.args.find('input').map((_, e) => e.value);
    }

    _inputbox() {
        return $('<input>').attr('spellcheck', false)
            .on('input', (ev) => {
                // auto-resize hack
                ev.target.size = ev.target.value.length;
            });
    }

    optvals() {
        var opts = {};
        if (this.ui.in_)
            opts.stdinContents = this.ui.in_.find('input').val();
        return opts;
    }

    exec() {
        fileview.io.emit('exec', [this.prog, ...this.argvals()], this.optvals(),
            (out) => {
                this.ui.out.text(out.all);
                this.ui.err.text(out.failed ? 
                    `failed: ${this._errText(out)}` : '');
                this.win.clientArea.removeClass(['success', 'fail']);
                this.win.clientArea.addClass(out.failed ? 'fail' : 'success');
            });
    }

    _errText(err) {
        return err.errno || err.signal || `exit code ${err.exitCode}`;
    }
}


var runner = new Runner;
