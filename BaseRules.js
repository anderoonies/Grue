define('Grue/BaseRules', {

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

  init: function(world) {

    world.parser.addRule(/(look|examine|describe)( at )*([\w\s]+)*/i, function(match) {
      var awake = world.currentRoom.contents.invoke('nudge', match[3]).first();
      if (!awake && match[3]) return false;
      if (awake) {
        awake.ask('look');
      } else if (!match[3]) {
        this.currentRoom.ask('look');
      }
    });

    world.parser.addRule(/(open|close) ([\s\w]+)/i, function(match) {
      var verb = match[1];
      var awake = world.currentRoom.contents.invoke('nudge', match[2]).first();
      if (awake) {
        awake.ask(verb);
      } else {
        world.print("You can't open that.");
      }
    });

    world.parser.addRule(/(take|get|pick up) (\w+)(?: from )*(\w*)/, function(match) {
      var allTheThings = world.currentRoom.contents.toArray();
      var containers = world.currentRoom.query('type="Container",open=true');
      containers.each(function(c) {
        allTheThings = allTheThings.concat(c.contents.toArray());
      });
      allTheThings = world.Bag(allTheThings);
      var portable = allTheThings.invoke('nudge', match[2]).query('portable=true').first();
      if (!portable) return world.print("You can't take that with you.");
      portable.parent.remove(portable);
      world.print('Taken.');
      this.player.inventory.add(portable);
    });

    world.parser.addRule(/read ([\w\s]+\w)/, function(match) {
      var awake = world.getLocalThings().invoke('nudge', match[1]).first();
      if (awake) {
        awake.ask('read');
      } else {
        world.print("I don't think you can read that right now.")
      }
    });

    world.parser.addRule(/^i(nventory)*$/, function() {
      var listing = world.player.inventory.ask('contents');
      if (!listing) {
        world.print("You're not carrying anything.");
      } else {
        world.print(listing);
      }
    });

    world.parser.addRule(/^go ([\w]+)|^(n|north|s|south|e|east|w|west|in|inside|out|outside|up|down)$/i, function(match) {
      world.currentRoom.ask('go', {direction: match[1] || match[2]});
    });

    world.parser.addRule("drop :item", function(match) {
      var dropped = this.player.inventory.contents.invoke('nudge', match.item).first();
      if (!dropped) return world.print("You don't have any of those.");
      this.player.inventory.remove(dropped);
      this.currentRoom.add(dropped);
      world.print("Dropped.");
    });

  }

})