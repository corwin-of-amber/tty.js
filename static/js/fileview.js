var FileItemModel = Backbone.Model.extend({
    defaults: {name: "item", kind: "regular", subitems: undefined}
  });
var FilesCollection = Backbone.Collection.extend({
    model: FileItemModel,
    addFile: function(name) {
        this.add(new FileItemModel({name: name}));
    },
    setAll: function(filenames, prefix) {
        fc = this;
        this.set(filenames.filter(this.visible).map(function(x) { 
            return new FileItemModel({name: x[0]+x[1],
                fullpath: prefix + "/" + x[0],
                kind: (x[1]=='/' ? 'directory' : 'regular'),
                subitems: (fc.recurse(x) ? new FilesCollection().setAll(x[2], prefix + "/" + x[0]) : undefined)}); 
        }));
        return this;
    },
    visible: function(item) {
        return !match(fileview.config.hidden, item[0]) && item[0] != "lib";
    },
    recurse: function(item) {
        return item[1] == '/' && !match(fileview.config.prune, item[0]);
    }
  });

function match(options, value) {
    return options instanceof Array ? options.indexOf(value) != -1 : options == value;
}

var FileItemView = Backbone.View.extend({
    tagName: "li",
    
    events: {   
      'click a': function() { this.trigger('click'); }
    },
    
    initialize: function() {
      this.listenTo(this.model, 'change', this.render);
      this.listenTo(this.model, 'destroy', this.remove);
    },
    
    render: function() {
      this.$el.html($("<a>").text(this.model.get('name')));
      this.$el.addClass('FileItem-' + this.model.get('kind'));
      if (this.model.get('name')[0] == '.')
          this.$el.addClass('FileItem-dot');
      var si = this.model.get('subitems');
      if (si) {
          var subfv = new FileView({el: $("<ul>"), model: si});
          this.listenTo(subfv, 'click-item', function(v) { this.trigger('click-item', v); });
          this.$el.append(subfv.$el);
          this._bindCollapse();
      }
      return this;
    },
    
    _bindCollapse: function() {
        var me = this;
        if (fv.collapsed.indexOf(this.model.get('name')) >= 0)
            me.$el.addClass("collapse");
        this.$el.children("a").click(function() {
            me.$el.toggleClass("collapse");
        });
    }
  });


var FileView = Backbone.View.extend({
    el: $('#files'),
    initialize: function() {
      this.listenTo(this.model, 'add', this.addOne);
      this.listenTo(this.model, 'reset', this.readdAll);
      this.listenTo(this.model, 'remove', this.removed);
      this.readdAll();
    },
    addOne: function(item) {
      var view = new FileItemView({model: item});
      this.$el.append(view.render().el);
      this.listenTo(view, 'click', function() { this.trigger('click-item', view); });
      this.listenTo(view, 'click-item', function(v) { this.trigger('click-item', v); });
    },
    readdAll: function() {
        this.$el.children().remove();
        this.model.each(this.addOne, this);
    },
    removed: function(m) { m.destroy(); },
  });


var fm = new FilesCollection();
var fv = new FileView({model: fm});

var s = io.connect();

function cd(path) {
    function refresh() {
        fv.collapsed = $.makeArray(
                fv.$el.find(".collapse > a").map(function() { return $(this).text(); }));
        s.emit("fs find", path, function(x) { fm.path = path; fm.setAll(x, fm.path); });
    }
    s.emit("fs load", path + "/.ttyrc", function(x) { if (x) eval(x); });
    refresh();
    setInterval(refresh, 1500);
}

var fileview = {config: {hidden: ".", prune: ""}};
var editorWindow = undefined;

function createWindow() {
    var win = new tty.Window();
    win.clientArea = $('<div>').addClass('area');
    $(win.element).removeClass("window--terminal");
    $(win.element).addClass("window--editor");

    $(win.element).append(win.clientArea);

    return win;
}

function create_codemirror_in_window(title)
{
    if (!editorWindow) {
        editorWindow = createWindow();
    }

    $(editorWindow.title).text(title || "Untitled");
    
    var editor = new CodeMirror(null, {
        lineNumbers: true,
        matchBrackets: true,
        mode: "text/x-java",
        indentUnit: 3,
        tabSize: 3,
        indentWithTabs: true,
        extraKeys: "basic"
    });

    editorWindow.clientArea.html(editor.getWrapperElement());

    editor.window = editorWindow;
    return editor;
}



var own_event = undefined;
    
fv.on('click-item', function(itemview) { 
    var m = itemview.model;
    if (m.get('kind') == "regular") {
        var filepath = m.get('fullpath');
        s.emit('fs load', filepath,
              function(text) {
                editor = create_codemirror_in_window(m.get('name'));
                if (own_event) editor.off("change", own_event);
                editor.setValue(text); 
                editor.on("change", own_event = function(cm, co) {
                    s.emit('fs save', filepath, cm.getValue(),
                            function() {  });
                });
            });
      }
});
