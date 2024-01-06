import * as mc from "@minecraft/server";  //  Required for API access.

// @TheWorldFoundry
mc.world.sendMessage("Setting up...");

const debug = true;
const performance_debug = false;  //   Use when looking at how long things take to execute

//  Map out the universe
const dimension_overworld = mc.world.getDimension("overworld");  // TODO: handle the dimension on a player-by-player basis
const dimension_nether = mc.world.getDimension("nether");
const dimension_the_end = mc.world.getDimension("the_end");
const dimensions = [ dimension_overworld,
					 dimension_nether,
					 dimension_the_end
					];

let iteration = 0;
let dx = 0;
let dz = 0;
const chunksize = 16;
const limit = 100;
const update_every = 10;

const cells = [
	"minecraft:air",
	"minecraft:iron_block",
	"minecraft:sponge"
];
for (let i = 0; i<cells.length; i++) {
	cells[i] = mc.BlockPermutation.resolve(cells[i]);  // pre-calculate the block permutation, replacing string references
};

function send_alert(msg, data) {
	/*
		Alert the user that something has happened
	*/
	if(debug) {
		mc.world.sendMessage(String(msg) + String(data));
	};
};

function game_update() {
	/*
		This will run every time the game tick happens.
		This is responsible for changing the state of the game.
		Anything that requires updates to the world will be sent to a backlog.
		Updates to the world are time-constrained
	*/
	
	const start_time = new Date().getTime();

	/* DO WORK */ 
	// Teleport the player to a new location
	// Set block in the sky at the player's Location
	// Teleport the player "home"

	for (let entity of mc.world.getPlayers({tag: `gen`})) {
		//  send_alert("[TWF] entity is ", String(entity.name));
		// let px = entity.location.x;
		// let py = entity.location.y;
		// let pz = entity.location.z;		
		let offset = chunksize * 1
		
		send_alert("[TWF] placing block at ", `execute as @p[tag=gen] at @s run setblock ~ 255 ~ minecraft:air`);
		
		dimension_overworld.runCommandAsync(`execute as @p[tag=gen] at @s run setblock ~ 255 ~ minecraft:air`);
		
		
		send_alert("[TWF] running command ", `execute as @p[tag=gen] at @s run teleport @s ~${offset} ~ ~`);

		dimension_overworld.runCommandAsync(`execute as @p[tag=gen] at @s run teleport @s ~${offset} ~ ~`);

		dx = dx + 1;
		if(dx >= limit) {
			dx = 0;
			let linelength = offset*(limit)
			dimension_overworld.runCommandAsync(`execute as @p[tag=gen] at @s run teleport @s ~-${linelength} ~ ~${offset}`);
		};


		// send_alert("[TWF] new pos is ", `${new_x} ${new_z}`);

		// send_alert("[TWF] teleporting to ", `${new_x} ${py} ${new_z}`);
		
		// dimension_overworld.runCommandAsync(`tp @p ${new_x} ${py} ${new_z}`);
		// entity.location.x = new_x
		// entity.location.z = new_z

		send_alert("[TWF] placing block at ", `execute as @p[tag=gen] at @s run setblock ~ 255 ~ minecraft:glowstone`);
		
		dimension_overworld.runCommandAsync(`execute as @p[tag=gen] at @s run setblock ~ 255 ~ minecraft:glowstone`);
		// dimension_overworld.runCommandAsync(`execute as @p at @s run setblock ~{offset} 255 ~ minecraft:glowstone`);
		// dimension_overworld.runCommandAsync(`execute as @p at @s run setblock ~{offset} 255 ~{offset} minecraft:glowstone`);
		// dimension_overworld.runCommandAsync(`execute as @p at @s run setblock ~ 255 ~{offset} minecraft:glowstone`);
		// dimension_overworld.runCommandAsync(`execute as @p at @s run setblock ~-{offset} 255 ~ minecraft:glowstone`);
		// dimension_overworld.runCommandAsync(`execute as @p at @s run setblock ~-{offset} 255 ~{offset} minecraft:glowstone`);
		// dimension_overworld.runCommandAsync(`execute as @p at @s run setblock ~ 255 ~-{offset} minecraft:glowstone`);
		// dimension_overworld.runCommandAsync(`execute as @p at @s run setblock ~-{offset} 255 ~-{offset} minecraft:glowstone`);
		// dimension_overworld.runCommandAsync(`execute as @p at @s run setblock ~{offset} 255 ~-{offset} minecraft:glowstone`);
		// let block = dimension.getBlock( {x: new_x, y: new_y, z: new_z} );
		//if(block) {
		//	block.setPermutation( cells[1] );
		//};

		// send_alert("[TWF] teleporting back ", `${px} ${py} ${pz}`);
		// dimension_overworld.runCommandAsync(`tp @p ${px} ${py} ${pz}`);
		//  entity.location.x = px
		//  entity.location.z = pz		
		// dimension_overworld.runCommand(`tp @a ${new_x} $(py) $(new_z)`)
		// dimension_overworld.runCommand(`setblock ${new_x} $(new_y) $(new_z) minecraft:iron_block`)
		// dimension_overworld.runCommand(`tp @a ${px} $(py) $(pz)`)
	};
	
	if(debug) {
		//  mc.world.sendMessage("game_update() has run");
	};

	if(performance_debug) {
		const end_time = new Date().getTime();		
		send_alert("[TWF] game_update() runtime is ", String(end_time - start_time));
	};
};

function run_each_frame() {
	/*
		Based on the backlog, selectively process as many elements as is reasonable to fit in one cycle.
		Note - cater for the player being out of the zone where changes can be applied.
		
		Based on the current machine state, add to the backlog as we process each step.
	*/
	const start_time = new Date().getTime();

	iteration += 1;  // Simple frame counter
	if(iteration % update_every == 0) {
		game_update()
	};

	if(performance_debug) {
		const end_time = new Date().getTime();		
		send_alert("[TWF] run_each_frame() runtime is ", String(end_time - start_time));
		send_alert("[TWF] run_each_frame() block_backlog length was ", String(block_backlog_length_before));
		send_alert("[TWF] run_each_frame() block_backlog length is ", String(block_backlog.size));
	};	
};

mc.system.runInterval(() => {
	try {
		run_each_frame()
	} catch(error) {   //	Unhandled exceptions go here
		// mc.world.sendMessage("[TWF] Error in mc.system.runInterval: "+String(error));  //  Not suppressed by debug
	};
}, 1);