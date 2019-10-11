var editorWindow = undefined;

function createEditorWindow(title)
{
    if (!editorWindow) {
        var win = new tty.Window();
        $(win.element).addClass("window--editor")
            .append(win.clientArea = $('<div>').addClass('area'));

        editorWindow = win;
    }

    $(editorWindow.title).text(title || "Untitled");
    
    editorWindow.clientArea.empty();

    var editor = new CodeMirror(editorWindow.clientArea[0], {
        lineNumbers: true,
        matchBrackets: true,
        mode: "text/x-c++src",
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

