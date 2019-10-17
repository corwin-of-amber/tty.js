
class Macros {
    constructor() {
        this.items = [];

        this.toolbar = $('<div>').addClass('macros');
        $(() => $('h1').append(this.toolbar));
    }

    add(macro, operation) {
        if (typeof macro == 'string')
            macro = new Macro(macro, operation);
        this.items.push(macro);
        this.toolbar.append(macro.button);
    }
}


class Macro {
    constructor(name, operation) {
        this.name = name;
        this.operation = operation;

        this.button = this.createButton();
    }

    createButton() {
        return $('<button>').text(this.name)
            .click(this.operation);
    }
}


window.macros = new Macros;
