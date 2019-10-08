var editorWindow = undefined;

function createWindow() {
    var win = new tty.Window();
    win.clientArea = $('<div>').addClass('area');
    $(win.element).removeClass("window--terminal");
    $(win.element).addClass("window--editor");

    $(win.element).append(win.clientArea);

    return win;
}

function createEditorWindow(title)
{
    if (!editorWindow) {
        editorWindow = createWindow();
    }

    $(editorWindow.title).text(title || "Untitled");
    
    editorWindow.clientArea.empty();

    var editor = new CodeMirror(editorWindow.clientArea[0], {
        lineNumbers: true,
        matchBrackets: true,
        mode: "text/x-java",
        indentUnit: 3,
        tabSize: 3,
        indentWithTabs: true,
        extraKeys: "basic"
    });

    editor.window = editorWindow;
    return editor;
}


var editor, editorChangeEh;

function editFile(title, filepath) {
    var s = fileview.io;

    s.emit('fs load', filepath, function(text) {
        if (editor && editorChangeEh)
            editor.off("change", editorChangeEh);

        editor = createEditorWindow(title);
        editor.setValue(text); 
        editor.on("change", editorChangeEh = function(cm, co) {
            s.emit('fs save', filepath, cm.getValue(),
                   function() {  });
        });
    });
}

