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
const eqo= { tag: "twf_line", type: "armor_stand" };

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


mc.system.runInterval(() => {
	iteration += 1;

	let players = mc.world.getAllPlayers();
	if (players) {
		let px = players[0].location.x;
		let py = players[0].location.y;
		let pz = players[0].location.z;
		let dimension = players[0].dimension;
		
		let entities = dimension.getEntities(eqo);
		if (entities.length > 1) {
			for (let i = 0; i < entities.length-1; i++) {  // 
				let entity_1 = entities[i];
				let entity_2 = entities[i+1];
				
				let x1 = entity_1.location.x;
				let y1 = entity_1.location.y;
				let z1 = entity_1.location.z;
				let block_start = dimension.getBlock( {x: entity_1.location.x, y: entity_1.location.y-1, z: entity_1.location.z} ).permutation;
				
				let x2 = entity_2.location.x;
				let y2 = entity_2.location.y;
				let z2 = entity_2.location.z;
				// let block_end = dimension.getBlock( entity_2.location );
				
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
						
						add_to_block_backlog( {x: x1, y: y1, z: z1}, dimension, block_start );
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
						
						add_to_block_backlog( {x: x1, y: y1, z: z1}, dimension, block_start );
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
						
						add_to_block_backlog( {x: x1, y: y1, z: z1}, dimension, block_start);
					};
				};
			};
			
			// Now the job is to draw what we can then purge the entities
			//	entity.kill();
			//	mc.world.sendMessage("Circle of radius "+Math.floor(radius).toString());
			
			for (let entity of entities) {
				entity.kill();
			};
			
			process_block_backlog(200);
			
		};
	};
},10);
