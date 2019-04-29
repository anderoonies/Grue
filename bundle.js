(function(){function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s}return e})()({1:[function(require,module,exports){
/*

  To match Zork, we need:
    north/northeast/east/southeast/south/southwest/west/northwest
    up/down
    look
    save/restore (?)
    restart
    verbose
    score
    diagnostic

    take [all]
    throw X at Y
    open X
    read X
    drop X
    put X in Y
    turn X with Y
    turn on X
    turn off X
    move X
    attack X with Y
    examine X
    inventory
    eat X
    shout
    close X
    tie X to Y
    kill self with X

  */

/*

  Placing the rules in the init property of this object is partly a response
  to the way RequireJS works, but it also has the side-effect of letting us
  segment rules into groups: some of which exist at the start, both others
  that we could call later on, in response to rule changes.

  */

var init = function(world) {
    world.parser.addRule(/(look|examine|describe)( at )*([\w\s]+)*/i, function(match) {
        var object = match[3];
        if (object) {
            world.askLocal('look', match[3]);
        } else if (world.currentRoom.check('look')) {
            world.currentRoom.ask('look');
        }
    });

    world.parser.addRule(/(open|close) ([\s\w]+)/i, function(match) {
        var verb = match[1];
        var awake = world.getLocal(false, match[2]);
        if (awake) {
            awake.ask(verb);
        } else {
            world.print("You can't open that.");
        }
    });

    world.parser.addRule(/read ([\w\s]+\w)/, function(match) {
        var awake = world.getLocal(false, match[1]);
        if (awake) {
            awake.ask('read');
        } else {
            world.print("I don't think you can read that right now.");
        }
    });

    world.parser.addRule('turn :item on', function(matches) {
        var awake = world.getLocal(false, matches.item);
        if (awake) {
            awake.ask('activate');
        } else {
            world.print('Turn what on?');
        }
    });

    world.parser.addRule('exit', function() {
        if (world.currentRoom.check('exit')) {
            world.currentRoom.ask('exit');
        } else {
            world.say(`This isn't the kind of thing you can exit.`);
        }
    });

    world.parser.addRule('turn :item off', function(matches) {
        var awake = world.getLocal(false, matches.item);
        if (awake) {
            awake.ask('deactivate');
        } else {
            world.print('Turn what off?');
        }
    });

    world.parser.addRule('use :item', function(matches) {
        var awake = world.getLocal(false, matches.item);
        if (awake) {
            awake.ask('activate');
        } else {
            world.print('Use what?');
        }
    });

    world.parser.addRule(
        /^go ([\w]+)|^(n|north|s|south|e|east|w|west|in|inside|out|outside|up|down)$/i,
        function(match) {
            world.currentRoom.ask('go', {direction: match[1] || match[2]});
        }
    );

    world.parser.addRule(/(take|get|pick up) (\w+)(?: from )*(\w*)/, function(match) {
        var portable = world.getLocal('portable=true', match[2]);
        if (!portable) return world.print("You can't take that with you.");
        portable.parent.remove(portable);
        portable.ask('taken');
        world.print('Taken.');
        this.player.inventory.add(portable);
    });

    world.parser.addRule('drop :item', function(match) {
        var dropped = this.player.inventory.contents.invoke('nudge', match.item).first();
        if (!dropped) return world.print("You don't have any of those.");
        this.player.inventory.remove(dropped);
        this.currentRoom.add(dropped);
        dropped.ask('dropped');
        world.print('Dropped.');
    });

    world.parser.addRule(/^i(nventory)*$/, function() {
        var listing = world.player.inventory.ask('contents');
        if (!listing) {
            world.print("You're not carrying anything.");
        } else {
            world.print(listing);
        }
    });
};

module.exports = {
    init: init,
};

},{}],2:[function(require,module,exports){
var BaseRules = require('./BaseRules');

var Bag = function(array) {
    if (!(this instanceof Bag)) return new Bag(array);
    this.items = [];
    if (array) {
        if (typeof array.toArray != 'undefined') {
            array = array.toArray();
        }
        this.items = this.items.concat(array);
    }
    this.length = this.items.length;
};

Bag.prototype.push = function() {
    this.items.push.apply(this.items, Array.prototype.slice.call(arguments));
    this.length = this.items.length;
    return this;
};

Bag.prototype.add = Bag.prototype.push;

Bag.prototype.remove = function(item) {
    var remaining = [];
    for (var i = 0; i < this.items.length; i++) {
        if (this.items[i] != item) remaining.push(this.items[i]);
    }
    this.items = remaining;
    this.length = this.items.length;
    return this;
};

Bag.prototype.first = function() {
    return this.items[0];
};

Bag.prototype.at = function(n) {
    return this.items[n];
};

Bag.prototype.contains = function(o) {
    return this.items.indexOf(o) != -1;
};

Bag.prototype.filter = function(f) {
    var filtered = [];
    for (var i = 0; i < this.items.length; i++) {
        if (f(this.items[i])) filtered.push(this.items[i]);
    }
    return new Bag(filtered);
};

Bag.prototype.map = function(f) {
    var mapped = this.items.map(f);
    return new Bag(mapped);
};
Bag.prototype.reduce = function(f, initial) {
    return this.items.reduce(f, initial);
};
Bag.prototype.mapGet = function(p) {
    return this.items.map(function(item) {
        return item[p];
    });
};
Bag.prototype.mapSet = function(p, value) {
    for (var i = 0; i < this.items.length; i++) {
        this.items[i][p] = value;
    }
    return this;
};
Bag.prototype.invoke = function(name) {
    var args = Array.prototype.slice.call(arguments, 1);
    var map = [];
    for (var i = 0; i < this.items.length; i++) {
        var item = this.items[i];
        if (typeof item[name] != 'function') continue;
        var result = item[name].apply(item, args);
        if (typeof result != 'undefined') {
            map.push(result);
        }
    }
    return new Bag(map);
};
Bag.prototype.each = function(f) {
    for (var i = 0; i < this.items.length; i++) {
        f(this.items[i]);
    }
    return this;
};
Bag.prototype.some = function(f) {
    for (var i = 0; i < this.items.length; i++) {
        var result = f(this.items[i]);
        if (result === false) break;
    }
    return this;
};
Bag.prototype.toArray = function() {
    return this.items;
};
Bag.prototype.combine = function() {
    var args = Array.prototype.slice.call(arguments);
    for (var i = 0; i < args.length; i++) {
        var adding = args[i];
        if (adding instanceof Bag) {
            this.items = this.items.concat(adding.items);
        } else {
            this.items = this.items.concat(adding);
        }
        this.length = this.items.length;
        return this;
    }
};
/*

We only query on attributes--it saves selector complexity. The supported
selector operators are:
  =   equals
  >   greater than
  >=  greater than or equal to
  <   less than
  <=  less than or equal to
  !=  not equal to
  ?  truthiness
  ~=  array contains
  ^=  string begins
  $=  string ends
  *=  string contains

Multiple selectors can be passed in using a comma. These act as AND operators,
not OR, which is different from CSS but necessary since we're skipping the
brackets.

*/
Bag.prototype.query = function(selectors) {
    selectors = selectors.split(',');
    var matcher = '^\\s*(\\w+)\\s*([<>!~$*^?=]{0,2})\\s*\\"{0,1}([^\\"]*)\\"{0,1}\\s*$';
    var tests = {
        '=': function(a, b) {
            return a === b;
        },
        '>': function(a, b) {
            return a > b;
        },
        '>=': function(a, b) {
            return a >= b;
        },
        '<': function(a, b) {
            return a <= b;
        },
        '!=': function(a, b) {
            return a !== b;
        },
        '?': function(a) {
            return a;
        },
        '~=': function(a, b) {
            if (typeof a.length == 'undefined') return false;
            if (typeof Array.prototype.indexOf != 'undefined') {
                return a.indexOf(b) != -1;
            } else {
                for (var i = 0; i < a.length; i++) {
                    if (a[i] == b) return true;
                }
                return false;
            }
        },
        '^=': function(a, b) {
            if (typeof a != 'string') return false;
            return a.search(b) == 0;
        },
        '$=': function(a, b) {
            if (typeof a != 'string') return false;
            return a.search(b) == a.length - b.length;
        },
        '*=': function(a, b) {
            if (typeof a != 'string') return false;
            return a.search(b) != -1;
        },
        fail: function() {
            return false;
        },
    };
    for (var i = 0; i < selectors.length; i++) {
        var parts = new RegExp(matcher).exec(selectors[i]);
        if (!parts) throw 'Bad selector: ' + selectors[i];
        selectors[i] = {
            key: parts[1],
            operator: parts[2],
        };
        var value = parts[3].replace(/^\s*|\s*$/g, '');
        if (value == 'true' || value == 'false') {
            value = value == 'true';
        } else if (value != '' && !isNaN(value)) {
            value = parseFloat(value);
        }
        selectors[i].value = value;
    }
    var passed = [];
    for (var i = 0; i < this.items.length; i++) {
        var item = this.items[i];
        var hit = true;
        for (var j = 0; j < selectors.length; j++) {
            var s = selectors[j];
            if (typeof item[s.key] == 'undefined') {
                hit = false;
                break;
            } else if (s.operator) {
                var f = tests[s.operator] || tests.fail;
                if (!f(item[s.key], s.value)) {
                    hit = false;
                    break;
                }
            }
        }
        if (hit) {
            passed.push(item);
        }
    }
    return new Bag(passed);
};

/*

The base type for all other objects in the World is the Thing. You extend off
from Thing by calling Thing.mutate() and passing in a type ID string and a
constructor function unique to your type (both of these are optional). Then
you can add properties to your new prototype at your discretion. Yes,
everything ends up shallowly inheriting from Thing, but it's probably not a
good idea to be building deep inheritance chains in your interactive fiction
anyway. There's always mixins, if you need them.

Things come with some basic shared utility methods:

  - get() - returns a property or function value by key. Similar to _.result()

  - proxy() - lets you intercept calls to get() and interfere with them. Useful
    for creating "private" properties, as well as for temporarily overriding
    certain rules.

  - cue() - sets up an action event response. See also:

  - ask() - This is similar to get(), but ask() is meant to be used for user-
    facing events, while get() is meant to construct your own internal APIs.
    ask() should return a string, while get() can return anything.

  - nudge() - feed this an object string from the parser, and it will respond
    with itself if the object "answers" to that name. For simplicity's sake, you
    can just set this.pattern and use the default nudge function. You'll often
    invoke nudge() on a Bag of objects to figure out if they respond to a given
    parser input.

  - say() - output to the browser or UI console via the World. Basically used
    as a local output method.

*/
var Thing = function(world) {
    this.classes = [];
    this.proxies = {};
    this.cues = {
        look: function() {
            this.say(this.description);
        },
    };
    this.pattern = /abcdefgh/i;

    if (world) {
        this.world = world;
        world.things.push(this);
    }
};
Thing.prototype = {
    name: '',
    description: '',
    portable: false,

    get: function(key) {
        if (!this[key]) return null;
        if (this.proxies[key]) {
            return this.proxies[key].call(this);
        }
        if (typeof this[key] == 'function') {
            return this[key]();
        } else {
            return this[key];
        }
    },
    proxy: function(key, f) {
        this.proxies[key] = f;
    },
    ask: function(key, event) {
        if (!this.cues[key]) return '';
        if (typeof this.cues[key] == 'function') {
            var response = this.cues[key].call(this, event);
            return response;
        } else {
            var response = this.cues[key];
            this.say(response);
            return response;
        }
    },
    cue: function(key, value) {
        this.cues[key] = value;
    },
    say: function(response) {
        if (this.world) {
            this.world.print(response);
        } else {
            console.log(response);
        }
    },
    nudge: function(input) {
        var result = this.pattern.test(input);
        if (result) return this;
    },
};

Thing.mutate = function(tag, f) {
    if (typeof tag == 'function') {
        f = tag;
        tag = 'Thing';
    }
    f = f || function() {};
    var Type = function(world, callback) {
        if (!(this instanceof Type)) {
            if (this instanceof World) return new Type(this, callback);
            return new Type(callback);
        }
        Thing.call(this, world);
        f.call(this, callback);
    };
    Type.prototype = new Thing();
    Type.prototype.type = tag;
    return Type;
};

var Room = Thing.mutate('Room', function() {
    this.regions = new Bag();
    this.contents = new Bag();
    this.cue('contents', function() {
        var contents = this.contents.query('type!=Scenery');
        if (contents.length) {
            return this.world.format.as('list', {
                label: `In the ${this.name} are`,
                data: contents.mapGet('name'),
            });
        }
        return '';
    });
    this.cue('look', function() {
        this.say(this.world.format.text(this.description, this.ask('contents')));
    });
    this.cue('go', function(event) {
        var compass = {
            west: 'w',
            north: 'n',
            south: 's',
            east: 'e',
            up: 'u',
            down: 'd',
            inside: 'in',
            outside: 'out',
        };
        var direction = event.direction;
        if (compass[direction]) direction = compass[direction];
        var {portal, canPass} = this.get(direction);
        console.log('break');
        if (!portal || (typeof canPass !== 'undefined' && !canPass())) {
            this.say("You can't go that way.");
        } else {
            this.world.currentRoom = portal;
            if (portal.check('look')) portal.ask('look');
        }
    });
});

Room.prototype.add = function(item) {
    this.contents.push(item);
    item.parent = this;
};

Room.prototype.remove = function(item) {
    this.contents.remove(item);
    item.parent = null;
};

Room.prototype.query = function(selector) {
    return this.contents.query(selector);
};

/*

  Rooms have a "regions" Bag that you can use to share rules across a zone.
  Regions are not actually containers--they're just Things that respond to
  ask() with false if the command is being intercepted. Any rules that can be
  preempted by a region, such as "look," should call World.currentRoom.check()
  the same way that they would call ask() on a target object first.

*/
Room.prototype.check = function(key, event) {
    var cancelled = this.regions.reduce(function(memo, region) {
        console.log(memo);
        console.log(region);
        return region.ask(key, event) !== false && memo;
    }, true);
    return cancelled;
};

Room.prototype.north = function(portal, canPass) {
    this.n = {portal, canPass};
};
Room.prototype.south = function(portal, canPass) {
    this.s = {portal, canPass};
};
Room.prototype.east = function(portal, canPass) {
    this.e = {portal, canPass};
};
Room.prototype.west = function(portal, canPass) {
    this.w = {portal, canPass};
};
var Container = Thing.mutate('Container', function() {
    this.contents = new Bag();
    this.open = false;
    this.preposition = 'Inside: ';
    this.proxy('contents', function() {
        if (this.open) {
            return this.contents;
        }
        return new Bag();
    });
    this.cue('open', function() {
        this.open = true;
        this.say('Opened.');
    });
    this.cue('close', function() {
        this.open = false;
        this.say('Closed.');
    });
    this.cue('contents', function() {
        var contents = this.get('contents');
        if (!contents.length) return '';
        var response = this.world.format.as('list', {
            label: this.preposition,
            data: contents.mapGet('name'),
        });
        return response;
    });
    this.cue('look', function() {
        this.say(this.world.format.text(this.description, this.ask('contents')));
    });
});

Container.prototype.add = function(item) {
    this.contents.push(item);
    item.parent = this;
};

Container.prototype.remove = function(item) {
    this.contents.remove(item);
    item.parent = null;
};

var Person = Thing.mutate('Person');

var Player = Thing.mutate('Player', function() {
    this.inventory = new Container(this.world);
    this.inventory.preposition = 'In your inventory:';
    this.inventory.open = true;
});

var Supporter = Thing.mutate('Supporter', function() {
    this.contents = new Bag();
});
Supporter.prototype.add = function(item) {
    this.contents.push(item);
    item.parent = this;
};
Supporter.prototype.remove = function(item) {
    this.contents.remove(item);
    item.parent = null;
};

var Scenery = Thing.mutate('Scenery', function() {});

var Screen = Thing.mutate('Screen', function(callback) {
    this.contents = new Bag();
    this.regions = new Bag();
    this.directories = new Bag();
    this.preposition = 'Screens:';
    this.cue('look', function() {
        this.say(this.world.format.text(this.description, this.ask('contents')));
    });
    this.cue('contents', function() {
        var directories = this.get('directories');
        if (!directories.length) return '';
        var response = this.world.format.as('term', {
            label: this.preposition,
            data: directories.mapGet('name'),
        });
        return response;
    });
    this.cue('exit', function() {
        if (this.parent) {
            return this.parent.cue('exit');
        }
        this.say('Exiting...');
        return callback();
    });
});

Screen.prototype.check = function(key, event) {
    var cancelled = this.regions.reduce(function(memo, region) {
        return region.ask(key, event) !== false && memo;
    }, true);
    return cancelled;
};
Screen.prototype.addDir = function(dir) {
    this.directories.push(dir);
    dir.parent = this;
};
Screen.prototype.addItem = function(item) {
    this.items.push(item);
    item.parent = this;
};

/*

The Console (not to be confused with the browser console) exists to direct
input into the parser and handle output from it. You don't need to directly
instantiate a console unless you really want to--the World will create one as
its "io" property, and then you can wire it up to an input field and an
element for output.

*/
var Console = function(input, output) {
    if (input && output) this.attach(input, output);
    this.onKey = this.onKey.bind(this);
    this.memory = [];
    this.memoryPointer = 0;
};
Console.prototype = {
    tagName: 'div',
    className: 'console-line',
    echoClass: 'console-echo',
    echoQuote: '> ',
    memory: null,
    memoryPointer: 0,
    attach: function(input, output) {
        if (this.input) {
            this.input.removeEventListener('keyup', this.onKey);
        }
        this.input = input;
        this.input.addEventListener('keyup', this.onKey);

        this.output = output;
    },
    onKey: function(e) {
        switch (e.keyCode) {
            case 13:
                var input = this.input.value;
                this.memory.unshift(input);
                this.memoryPointer = 0;
                this.read(input);
                this.input.value = '';
                break;

            case 38: //up
                this.input.value = this.memory[this.memoryPointer] || this.input.value;
                this.memoryPointer++;
                break;
        }
    },
    read: function(line) {
        this.write(line, true);
        if (this.onRead) this.onRead(line);
    },
    write: function(text, echo) {
        var div = document.createElement('div');
        var p = document.createElement('p');
        div.className = echo ? [this.className, this.echoClass].join(' ') : this.className;
        text = text.replace(/\n/g, '<br/>');
        p.innerHTML = echo ? this.echoQuote + text : text;
        div.appendChild(p);
        this.output.appendChild(div);
        if (this.onUpdate) {
            this.onUpdate();
        }
    },
    onUpdate: null,
};

/*

You'll rarely interact with the Parser directly, although it's there if you
need to. Instead, the World instantiates a parser for itself, and you'll use
its utility methods to add command mappings indirectly.

*/
var Parser = function(world, console) {
    this.world = world;
    if (console) this.attach(console);
    this.rules = [];
};
Parser.prototype = {
    errorMessage: "I don't understand that.",
    attach: function(console) {
        this.console = console;
        console.onRead = this.input.bind(this);
    },
    input: function(line) {
        var sentence = this.evaluate(line);
        if (sentence == false) {
            this.console.write(this.errorMessage);
        }
    },
    /*

  Rule definitions consist of two parts: a regular expression pattern used
  to parse out the command, and a responder function that does something
  based on the parts that are passed back. So you might have a look command:

  /(look|examine|describe)\s(at\s)*([\w\s])/i

  and then a responder function that turns it into an action:

  function(parts) {
    var verb = 'look';
    var object = parts[3];
    //gather items that respond to that name
    var prospects = world.localThings().invoke('nudge', object);
    if (prospects.length > 1) {
      return "I'm not sure which '" + object + "' you mean.";
    } else if (prospects.length) {
      return prospects.getAt(0).ask(verb);
    }
    return false;
  }

  If you pass a String instead of a regular expression to addRule, it will
  attempt to compile it using a simple parameter conversion. See compileRule()
  below for more details.

  */
    addRule: function(pattern, responder) {
        if (typeof pattern == 'string') {
            this.rules.push(this.compileRule(pattern, responder));
        } else {
            this.rules.push({
                pattern: pattern,
                responder: responder,
            });
        }
    },

    /*

  Many commands are simple enough that you shouldn't need to write regular
  expressions for them. The parser will try to compile a space-delimited
  string into a regular expression for you, using a simple, route-like syntax.
  For example, we might write:

  attack :monster with? :weapon?

  Words preceded with a colon are named parameters, and those followed with a
  question mark are optional. Even though JavaScript's regular expression
  engine lacks named parameters, we can fake it by wrapping the responder in a
  function that adds our parameters to the match array.

  */

    compileRule: function(pattern, responder) {
        var words = pattern.split(' ');
        var positions = {};
        for (var i = 0; i < words.length; i++) {
            var original = words[i];
            words[i] = original.replace(/[?:]/g, '');
            if (original.substr(0, 1) == ':') {
                positions[words[i]] = i + 1;
                words[i] = '\\w+';
            }
            words[i] = '(' + words[i] + ')';
            if (original.substr(-1) == '?') {
                words[i] += '*';
            }
        }
        var compiled = new RegExp(words.join('\\s*'));
        var filter = function(matches) {
            for (var key in positions) {
                matches[key] = matches[positions[key]];
            }
            responder.call(this, matches);
        };
        return {
            pattern: compiled,
            responder: filter,
        };
    },

    /*

  Rules are evaluated in first-in, first-out order. If no matching rule is
  found, it returns false. Rule response functions are called in the
  context of the world (this == the world).

  */
    evaluate: function(input) {
        for (var i = 0; i < this.rules.length; i++) {
            var rule = this.rules[i];
            var matches = rule.pattern.exec(input);
            if (matches) {
                return rule.responder.call(this.world, matches);
            }
        }
        return false;
    },
};

/*

I realized, partway through getting the inventory and item listings up, that
I'm starting to embed a lot of HTML. Now that I use a lot of templates in my
day job, it's obvious that inline HTML is a serious maintenance code smell.
Enter the Formatter, which is used by various objects to prepare their output
in predefined ways. This version still just basically runs off inline HTML,
but it will be extended to use templates instead.

All Formatter method calls recieve an object with two properties: label and
data (this should be familiar to AS3 coders). You can replace the Formatter
with your own object with no problems, as long as your functions can handle
these two properties.

Although you can call the Formatter methods directly, it probably makes more
sense to go through Formatter.as(), which takes a string key as the first
argument. as() can provide fallbacks in case of missing methods, whereas
calling a missing method is a type error in JavaScript. If you define your own
format object, just copy Format.as over to your version--it'll still work.

*/

var Formatter = {
    as: function(type, message) {
        if (typeof this[type] == 'undefined') {
            type == 'text';
        }
        return this[type](message);
    },
    text: function() {
        var lines = Array.prototype.slice.call(arguments);
        return lines.join('<br>');
    },
    list: function(message) {
        var output = message.label;
        output += '<ul>';
        var data = message.data;
        if (typeof data == 'string' || typeof data == 'number') {
            data = [data];
        }
        for (var i = 0; i < data.length; i++) {
            output += '<li>' + data[i] + '</li>';
        }
        output += '</ul>';
        return output;
    },
    term: function(message) {
        var label = message.label || '> ';
        var lines = Array.prototype.slice.call(message.data).map(function(line) {
            return label + line;
        });
        return lines.join('<br>');
    },
};

/*

And here we are, finally, at the World. You instantiate one (or more) of these
for your game, and then it provides factory access to the different object
types, as well as some input and output utility functions.

*/
var World = function(init) {
    if (typeof init === 'function') {
        init();
    }
    this.things = [];
    this.player = new Player(this);
    this.asLocal = [this.player.inventory];
    this.io = new Console();
    this.parser = new Parser(this, this.io);
    this.currentRoom = null;
    this.format = Formatter;
    BaseRules.init(this);
};
World.prototype = {
    Bag: Bag,
    Thing: Thing.mutate('Thing'), // Exposed to create plain "Things"
    mutate: Thing.mutate, //Exposed for mutation
    Room: Room,
    Player: Player,
    Container: Container,
    Supporter: Supporter,
    Scenery: Scenery,
    Screen: Screen,
    print: function(line) {
        this.io.write(line);
    },
    considerLocal: function(bag) {
        this.asLocal.push(bag);
    },
    getLocal: function(query, target, multiple) {
        var things = new Bag(this.asLocal);
        if (this.currentRoom) {
            things.combine(this.currentRoom.get('contents'));
        }
        var len = things.length;
        for (var i = 0; i < len; i++) {
            var item = things.at(i);
            if ((item instanceof Container && item.open) || item instanceof Supporter) {
                things.combine(item.get('contents'));
            }
        }
        if (query) {
            things = things.query(query);
        }
        things.nudge = function(keyword) {
            return this.invoke('nudge', keyword);
        };
        if (target) {
            if (multiple) {
                return things.nudge(target);
            }
            return things.nudge(target).first();
        }
        return things;
    },
    query: function(selector) {
        return new Bag(this.things).query(selector);
    },
    askLocal: function(verb, object) {
        var allowed = this.currentRoom.check(verb);
        if (!allowed) {
            return;
        }
        var awake = this.getLocal(false, object);
        if (awake) {
            awake.ask(verb);
        }
    },
};

module.exports = World;

},{"./BaseRules":1}],3:[function(require,module,exports){
var World = require('./World');

var input = document.querySelector('#input');
var output = document.querySelector('#output');

var currentDay = 14;

var shipOs = new World();
var shipInput = document.querySelector('#shipinput');
var shipOutput = document.querySelector('#shipoutput');
var openShipOs = function() {
    var modal = document.getElementById('shipos');
    shipOs.io.attach(shipInput, shipOutput);
    modal.style.display = 'block';
    shipOs.currentRoom.ask('look');
};
var closeShipOs = function() {
    var modal = document.getElementById('shipos');
    modal.style.display = 'none';
};
shipOs.io.onUpdate = function() {
    output.scrollTop = output.scrollHeight - output.offsetHeight;
};
var welcomeScreen = shipOs.Screen(shipOs, closeShipOs);
welcomeScreen.name = '_welcome';
welcomeScreen.description = 'Welcome to ShipOS.\nMy available functions are:';
welcomeScreen.cue('look', function() {
    var directories = this.get('directories');
    if (!directories.length) return '';
    var response = this.world.format.as('term', {
        label: ' ',
        data: directories.mapGet('name'),
    });
    return this.say(this.world.format.text(this.description, response));
    // this.say(this.world.format.text(this.description, this.ask('contents')));
});
shipOs.currentRoom = welcomeScreen;

var systemStats = shipOs.Screen();
systemStats.name = '_system';
systemStats.description = 'All systems operational.';
welcomeScreen.addDir(systemStats);

var ship = new World();
ship.io.attach(input, output);
ship.io.onUpdate = function() {
    output.scrollTop = output.scrollHeight - output.offsetHeight;
};

var bedRoom = ship.Room();
bedRoom.name = 'bedroom';
bedRoom.description = `You're in your bedroom. To the north is the control bay.`;
ship.currentRoom = bedRoom;

var bed = ship.Scenery();
bedRoom.add(bed);
bed.name = 'Your bed.';
bed.description = "It doesn't look very comfortable.";
bed.pattern = /bed|mattress/;

var door = ship.Scenery();
bedRoom.add(door);
door.name = 'A sliding door.';
door.open = true;
door.description = "It makes a satisfying 'whoosh' when it opens or closes.";
door.pattern = /door/;
door.cue('open', function() {
    if (this.open) {
        return this.say('The is already open.');
    } else {
        this.open = true;
        return this.say("The door gives a satisfying 'whoosh' as it opens.");
    }
});

door.cue('close', function() {
    if (this.open) {
        this.open = false;
        return this.say("The door gives a satisfying 'whoosh' as it closes.");
    } else {
        return this.say('The door is already shut.');
    }
});

var controlBay = ship.Room();
controlBay.name = 'control bay';
bedRoom.north(controlBay, function() {
    return door.open;
});
controlBay.south(bedRoom, function() {
    return door.open;
});
controlBay.description = `The control bay in the center of the ship. Hallways radiate outward like the spokes of a wheel.\n
    A circular computer is in the center of the control bay.\n
    To the south is your bedroom.\n
    To the north is the observation bay.\n`;

var computer = ship.Thing();
computer.description = 'The computer that runs the ship.';
computer.name = 'Computer';
computer.pattern = /computer/;
computer.cue('look', function() {
    return this.say(this.description);
});
computer.cue('activate', function() {
    openShipOs();
});
controlBay.add(computer);

var observationDeck = ship.Room();
observationDeck.name = 'observation deck';
controlBay.north(observationDeck);
observationDeck.south(controlBay);
observationDeck.description =
    "You're in a round, clear chamber, surrounded by the vacuum of space. Outside, you can see the adjacent spokes of the ship.";

// And then we create the leaflet, and place it inside of the mailbox for
// players to find.

// var leaflet = zork.Thing();
// mailbox.add(leaflet);
// leaflet.cue(
//     'read',
//     'WELCOME TO ZORK!\nZORK is a game of adventure, danger, and low cunning. In it you will explore some of the most amazing territory ever seen by mortals. No computer should be without one!'
// );
// leaflet.description = 'It looks like some kind of product pitch.';
// leaflet.pattern = /leaflet/;
// leaflet.portable = true;
// leaflet.name = 'A leaflet of some kind.';
//
// // Scenery is a special kind of object that's ignored for the purposes of in-
// // room inventory lists, but is still interactive. You can use it as a way to
// // flesh out a scene, but without adding objects that the player will try to
// // pick up or move around.
//
// var door = zork.Scenery();
// field.add(door);
// door.cue('open', 'The door cannot be opened.');
// door.cue('cross', "The door is boarded and you can't remove the boards.");
// door.description = "It's all boarded up.";
// door.pattern = /(boarded )*(front )*door/;
//
// // Finally, we add another room to the world. By positioning it on the n
// // property of the field, it's placed to the north. We also link its south
// // portal so we can get back to the field.
//
// var northOfHouse = zork.Room();
// northOfHouse.description =
//     'You are facing the north side of a white house. There is no door here, and all the windows are boarded up. To the north a narrow path winds through the trees.';
// field.n = northOfHouse;
// northOfHouse.s = field;
//
// // Hey, how about a darkness (magic missile sold separately!)
//
// var lantern = zork.Thing();
// lantern.pattern = /(brass )*lantern/;
// lantern.name = 'Brass lantern';
// lantern.cue('activate', function() {
//     this.say('The lantern flickers on, shedding a reluctant light on your surroundings.');
//     this.on = true;
// });
// lantern.cue('deactivate', function() {
//     this.say("The lantern's glow fades, sputters, and dies.");
//     this.on = false;
// });
// lantern.on = false;
// lantern.portable = true;
// lantern.description = "It's a classy-looking lantern";
// lantern.cue('look', function() {
//     this.say('The lantern is currently ' + (this.on ? 'lit' : 'dark') + '.');
// });
// northOfHouse.add(lantern);
//
// var darkness = zork.Thing();
// darkness.cue('look', function() {
//     if (zork.player.inventory.contents.contains(lantern) && lantern.on) {
//         return;
//     }
//     zork.print("It's too dark. You might get eaten by a grue.");
//     return false;
// });
//
// // We need some places to be dark, then.
//
// var forest = zork.Room();
// forest.description =
//     "It's a very nice forest, with paths in every direction. A bit dark though. It'd be easy to get lost.";
// forest.s = northOfHouse;
// northOfHouse.n = forest;
// forest.e = forest.n = forest.w = forest;
// forest.regions.add(darkness);
//
// // Let's start off by looking around to set the scene.
//
ship.currentRoom.ask('look');

},{"./World":2}]},{},[3]);
