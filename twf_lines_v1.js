import * as mc from "@minecraft/server";

//  @TheWorldFoundry
//  When the player places a specific named entity, draw a line between the entity and the previous placed entity
//  then delete the placed entity.

const block_placement_debug = true;
const debug = true;
const blck = mc.BlockPermutation.resolve("minecraft:glowstone");
const block_backlog_limit = 500;
const remove_backlog_on_error = true;

let radius = 1;
let dimension = mc.world.getDimension("overworld");
let iteration = 0;

const block_backlog = new Map();
const eqo= { tag: "twf_point", type: "armor_stand" };

mc.world.sendMessage("starting");


function send_alert(msg, data) {
	/*
		Alert the user that something has happened
	*/
	if(debug) {
		mc.world.sendMessage(String(msg) + String(data));
	};
};

function add_to_block_backlog( pos, dimension, block) {
	let key = String(pos.x)+","+String(pos.y)+","+String(pos.z)
	
	block_backlog.set( key, {d: dimension, p: pos, b: block} );	
};

function add_point(points, pos) {
	let key = String(pos.x)+","+String(pos.y)+","+String(pos.z);
	points.set( key, { p: pos } );	
};

function process_block_backlog(time_limit) {
	/*
		Reach into the block map and see if any can be processed out into the world.
	*/
	const start_time = new Date().getTime();
	// send_alert("Processing backlog ", time_limit);
	let remove_keys = [];  //  These will be purged from the backlog after processing

	let keys = Array.from( block_backlog.keys() );
	// send_alert("Keys", keys)

	let keep_going = true;
	
	let i = 0;	//	index on the block backlog
	
	while(i < block_backlog.size && keep_going) {
		// send_alert("Loop ", i);
		try {
			let val = block_backlog.get( keys[i] );
			// send_alert("val ", JSON.stringify(val));
			let dimension = val.d
			if(val) {
				let block = dimension.getBlock( val.p )
				if(block) {
					block.setPermutation( val.b );
					remove_keys.push(keys[i]);	//	If there was no error, mark this location to be deleted.
				};
			};

		} catch(error) {	//	If there's an error, keep the backlog entry in memory to try again some other time. TODO: Persistent errors should purge the block?
			if(block_placement_debug) {
				let val = block_backlog.get( keys[i] );
				send_alert(keys[i], block_backlog.get( keys[i] ));
				send_alert("process_backlog() error", error);	//	Errors can be normal, so consider doing nothing here
			};
			if(remove_backlog_on_error == true) {
				remove_keys.push(keys[i]);
			};			
		};
		
		if(new Date().getTime() - start_time >= time_limit) {
			keep_going = false	//	We've run out of time, stop processing
		}
		i += 1;
	};
	
	remove_keys.forEach((key) => {	//	Take all the successfully placed positions off the backlog list
		block_backlog.delete(key)
	});
};

function plot_line(points, x1, y1, z1, x2, y2, z2) {
	if (points == undefined) {
		points = new Map();
	};
	
	let dx = Math.abs(x2 - x1);
	let dy = Math.abs(y2 - y1);
	let dz = Math.abs(z2 - z1);
	
	let xs = 1;
	let ys = 1;
	let zs = 1;
	
	if (x2 > x1) xs = 1;
	else xs = -1;
	
	if (y2 > y1) ys = 1;
	else ys = -1;
	
	if (z2 > z1) zs = 1;
	else zs = -1;				
	
	// Driving axis is X-axis
	if (dx >= dy && dx >= dz) {
		let p1 = 2 * dy - dx;
		let p2 = 2 * dz - dx;
		while (x1 != x2) {
			// Block blending would go here
			x1 += xs;
			if (p1 >= 0) {
				y1 += ys;
				p1 -= 2 * dx;
			}
			if (p2 >= 0) {
				z1 += zs;
				p2 -= 2 * dx;
			}
			p1 += 2 * dy;
			p2 += 2 * dz;
			
			add_point( points, {x: x1, y: y1, z: z1} );
		}				
	}
	else if (dy >= dx && dy >= dz) {
		let p1 = 2 * dx - dy;
		let p2 = 2 * dz - dy;
		while (y1 != y2) {
			// Block blending would go here
			y1 += ys;
			if (p1 >= 0) {
				x1 += xs;
				p1 -= 2 * dy;
			}
			if (p2 >= 0) {
				z1 += zs;
				p2 -= 2 * dy;
			}
			p1 += 2 * dx;
			p2 += 2 * dz;
			
			add_point( points, {x: x1, y: y1, z: z1} );
		}

		// Driving axis is Z-axis"
	}
	else {
		let p1 = 2 * dy - dz;
		let p2 = 2 * dx - dz;
		while (z1 != z2) {
			// Block blending would go here
			z1 += zs;
			if (p1 >= 0) {
				y1 += ys;
				p1 -= 2 * dz;
			}
			if (p2 >= 0) {
				x1 += xs;
				p2 -= 2 * dz;
			}
			p1 += 2 * dy;
			p2 += 2 * dx;
			
			add_point( points, {x: x1, y: y1, z: z1} );
		};
	};
	return points;
}


function plot_triangle(points, x1, y1, z1, x2, y2, z2, x3, y3, z3) {
	// let block_end = dimension.getBlock( entity_2.location );
	let line_points = plot_line(undefined, x1, y1, z1, x2, y2, z2);
	
	let plane = new Map();
	// This is the first line. Draw from the third point to each block along this line
	for (let [key, val] of line_points.entries()) {
		points = plot_line(points, x3, y3, z3, val.p.x, val.p.y, val.p.z );
	};
	return points;
};

function draw_points(points, block_start) {
	for (let [key, val] of points.entries()) {
		add_to_block_backlog( {x: val.p.x, y: val.p.y, z: val.p.z}, dimension, block_start );
	};		
};

let last_entity_1 = undefined;
let last_entity_2 = undefined;

function give_point_item(player) {
	const item = new mc.ItemStack(eqo.type, 1);
	item.nameTag = eqo.tag;
	player.dimension.spawnItem(item, player.location);
};

mc.world.afterEvents.playerSpawn.subscribe(event => {
	const players = mc.world.getPlayers( { playerId: event.playerId } );
	for ( let player of players ) {
		give_point_item(player);

	};
	send_alert("[twf]","Distributed twf_point items. Place two or more to activate auto-builder.");
});

mc.system.runInterval(() => {
	iteration += 1;

	if (iteration % 40 == 0) {
		let players = mc.world.getAllPlayers();
		if (players && players.length > 0) {
			let px = players[0].location.x;
			let py = players[0].location.y;
			let pz = players[0].location.z;
			let dimension = players[0].dimension;
			
			let entities = dimension.getEntities(eqo);

			if (entities.length == 2) {
				let entity_1 = entities[0];
				let entity_2 = entities[1];
				
				if (last_entity_1 != entity_1.id || last_entity_2 != entity_2.id){
				
					let x1 = entity_1.location.x;
					let y1 = entity_1.location.y-1;
					let z1 = entity_1.location.z;

					let block_start = dimension.getBlock( {x: x1, y: y1, z: z1} ).permutation;
					
					let x2 = entity_2.location.x;
					let y2 = entity_2.location.y-1;
					let z2 = entity_2.location.z;

					let points = plot_line(undefined, x1, y1, z1, x2, y2, z2);
					draw_points(points, block_start);
					send_alert("[twf]","Line drawn.");
					
					last_entity_1 = entity_1.id;
					last_entity_2 = entity_2.id;
				};
				//draw_points(plot_line(undefined, entities[0].location.x, entities[0].location.y-1, entities[0].location.z, entities[1].location.x, entities[1].location.y-1, entities[1].location.z), dimension.getBlock( {x: entities[0].location.x, y: entities[0].location.y-1, z: entities[0].location.z} ).permutation);

			};

			if (entities.length > 2) {
				for (let i = 0; i < entities.length-2; i++) {  // 
					let entity_1 = entities[i];
					let entity_2 = entities[i+1];
					let entity_3 = entities[i+2];

					let x1 = entity_1.location.x;
					let y1 = entity_1.location.y-1;
					let z1 = entity_1.location.z;

					let block_start = dimension.getBlock( {x: x1, y: y1, z: z1} ).permutation;
					
					let x2 = entity_2.location.x;
					let y2 = entity_2.location.y-1;
					let z2 = entity_2.location.z;
					
					// let block_end = dimension.getBlock( {x: x2, y: y2, z: z2} ).permutation;

					let x3 = entity_3.location.x;
					let y3 = entity_3.location.y-1;
					let z3 = entity_3.location.z;

					let points = plot_triangle(undefined, x1, y1, z1, x2, y2, z2, x3, y3, z3);
					points = plot_triangle(points, x2, y2, z2, x3, y3, z3, x1, y1, z1);
					points = plot_triangle(points, x3, y3, z3, x1, y1, z1, x2, y2, z2);
					draw_points(points, block_start);
					send_alert("[twf]","Triangle drawn.");
				};
				// Now the job is to draw what we can then purge the entities
				//	entity.kill();
				//	mc.world.sendMessage("Circle of radius "+Math.floor(radius).toString());
				
				for (let entity of entities) {
					entity.kill();
				};
			};
		};
	};
	process_block_backlog(50);
},1);
