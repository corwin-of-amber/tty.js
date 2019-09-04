

var runner = {
        config: {args: ["", ""], argsPosition: "bottom", runOnChange: true, outputOnError: true},
        window: undefined
};

function create_run_in_window(title)
{
    // Create run element
    var el = $("<div>").addClass("result");
    
    var win = new tty.Window();
    $(win.element).removeClass("window--terminal");
    $(win.element).addClass("window--run");
    $(win.element).find(".terminal").remove();
    $(win.element).append(el);
    win.result = el[0];
    // Override some unwanted methods from tty.js
    win.tabs[0].setProcessName = function() {};
    win.tabs[0].pollProcessName = function() {};
    $(win.title).text(title || "Untitled");
        
    attach_argument_boxes(win);
    
    return win;
}


function attach_argument_boxes(win)
{
    // Create input elements
    var arg1 = $("<input>").addClass("argument").attr('spellcheck', 'false');
    var arg2 = $("<input>").addClass("argument").attr('spellcheck', 'false');

    if (runner.config.argsPosition == "bottom") {
        if (runner.config.args.length == 1)
            $(win.element).append(arg1);
        else
            $(win.element).append(arg1).append(arg2);
    }
    else {
        if (runner.config.args.length == 1)
            $(win.element).prepend(arg1);
        else
            $(win.element).prepend(arg2).prepend(arg1);
    }

    // default vals
    arg1.val(runner.config.args[0]);
    if (runner.config.args.length > 1)
        arg2.val(runner.config.args[1]);

    // Events
    rerun = function() {
        if (win.runScript) {
            var cmd = win.runScript + " '" + arg1.val() + "' '" + arg2.val() + "'";
            run_script_in_window(win, undefined, cmd);
        }
    };
    if (runner.config.runOnChange) {
        arg2.on('input', rerun);
        arg1.on('input', rerun);
    }
    
    $(document).keypress(function(ev) {
        //console.log(ev);
        // rerun script on Alt+Enter or Cmd+Enter or Alt+9
        if ((ev.altKey || ev.metaKey) && (ev.keyCode == 13 || ev.keyCode == 170)) {
            rerun(); return false;
        }
        // Alt+0 or Cmd+0 to clear the args and set focus
        if ((ev.altKey || ev.metaKey) && (ev.keyCode == 186 || ev.keyCode == 48)) {
            arg1.val("");
            arg2.val("");
            arg1.focus();
            return false;
        }
    });
}

function run_script(title, script)
{
    var win = runner.window ? runner.window : (runner.window = create_run_in_window(title));
    run_script_in_window(win, title, script);
}

function run_script_in_window(win, title, script)
{
    s.emit("fs exec", script, function(result) {
        if (result.code == 0) {
            $(win.result).removeClass("error plaintext");
            if (result.stdout[0] == "<")
                win.result.innerHTML = result.stdout;
            else
                $(win.result).text(result.stdout).addClass("plaintext");
        }
        else {
            if (runner.config.outputOnError)
                $(win.result).text(result.stdout).addClass("plaintext");
            $(win.result).addClass("error");
        }
    });
    win.runScript = script.split(" ")[0];  // @@ ugly
}