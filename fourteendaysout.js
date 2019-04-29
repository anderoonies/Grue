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
