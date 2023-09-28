import * as mc from "@minecraft/server";

//  @TheWorldFoundry
//  When the player places a specific named entity, create a pattern of blocks in the air around it
//  then delete the placed entity.

const blck = mc.BlockPermutation.resolve("minecraft:glowstone");
let radius = 3;
let dimension = mc.world.getDimension("overworld");
let iteration = 0;

mc.world.sendMessage("starting");

mc.system.runInterval(() => {
	iteration += 1;

	let players = mc.world.getAllPlayers();
	let px = players[0].location.x;
	let py = players[0].location.y;
	let pz = players[0].location.z;
	

	for (let entity of dimension.getEntities({ type: "armor_stand" })) {
		
		let ox = entity.location.x;
		let oy = entity.location.y;
		let oz = entity.location.z;
		
		let ddx = px - ox; 
		let ddy = py - oy;
		let ddz = pz - oz;
		
		radius = Math.sqrt(ddx*ddx + ddy*ddy + ddz*ddz);
		
		for (let dx = -radius; dx <= radius; dx++ ) {
			for (let dy = -radius; dy <= radius; dy++ ) {
				for (let dz = -radius; dz <= radius; dz++ ) {
					if ((dx * dx + dy * dy + dz * dz) <= radius * radius) { 
						dimension.getBlock( {x: ox+dx, y: oy+dy, z: oz+dz}).setPermutation(blck);
					}
				}
			}
		}

		entity.kill();
		mc.world.sendMessage("Circle of radius "+Math.floor(radius).toString());
	};
},10);
