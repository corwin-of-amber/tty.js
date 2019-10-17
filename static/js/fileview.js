var FileItemModel = Backbone.Model.extend({
    defaults: {name: "item", kind: "regular", subitems: undefined}
});

var FilesCollection = Backbone.Collection.extend({
    model: FileItemModel,
    addFile: function(name) {
        this.add(new FileItemModel({name: name}));
    },
    setAll: function(filenames, prefix) {
        function recurse(item) {
            return new FilesCollection().setAll(item[2], prefix + "/" + item[0]);
        }

        filenames = this.dirsFirst(filenames);

        this.set(filenames.filter(this.visible).map((x) =>
            new FileItemModel({name: x[0]+x[1],
                fullpath: `${prefix}/${x[0]}`,
                kind: (x[1]=='/' ? 'directory' : 'regular'),
                subitems: (this.enter(x) ? recurse(x) : undefined)})
        ));
        return this;
    },
    dirsFirst(filenames) {
        return _.sortBy(filenames, item => item[1] + item[0]);
    },
    visible: function(item) {
        return !fileview.config.hidden.some(pat => pat.exec(item[0]));
    },
    enter: function(item) {
        return item[1] == '/' && !fileview.config.prune.some(pat => pat.exec(item[0]));
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
        this.listenTo(this.model, 'reset', this.readAll);
        this.listenTo(this.model, 'remove', this.removed);
        this.readAll();
    },
    addOne: function(item) {
        var view = new FileItemView({model: item});
        this.$el.append(view.render().el);
        this.listenTo(view, 'click', function() { this.trigger('click-item', view); });
        this.listenTo(view, 'click-item', function(v) { this.trigger('click-item', v); });
    },
    readAll: function() {
        this.$el.children().remove();
        this.model.each(this.addOne, this);
    },
    removed: function(m) { m.destroy(); },
});


var fileview = {config: {hidden: [/^[._]/], prune: [], depth: 3}};
fileview.io = io.connect();

var fv = new FileView({model: new FilesCollection()});

fileview.refresh = function(path) {
    var s = fileview.io,
        fm = fv.model;

    path = path || fm.path || "~";

    fv.collapsed = $.makeArray(
            fv.$el.find(".collapse > a").map(function() { return $(this).text(); }));
    s.emit("fs find", path, fileview.config.depth,
        function(x) { fm.path = path; fm.setAll(x, fm.path); });
}

fileview.cd = function(path) {

    if (fv.$el.length === 0) {
        fv.$el = $('<ul>').attr('id', 'files').appendTo(document.body);
    }
    
    fileview.refresh(path);
    if (!fileview._interval)
        fileview._interval = setInterval(fileview.refresh, 1500);
}


fv.on('click-item', function(itemview) { 
    var m = itemview.model;
    if (m.get('kind') == "regular") {
        editFile(m.get('name'), m.get('fullpath'));
    }
});
