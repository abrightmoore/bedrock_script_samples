//    @TheWorldFoundry

import { system, world, Player, EntityHealthComponent, ItemStack  } from "@minecraft/server";

world.afterEvents.entityHurt.subscribe((event) => {
	const { damageSource, hurtEntity } = event;
	// world.sendMessage('Ouch!');
	if (damageSource) {
		if (!(damageSource.damagingEntity instanceof Player)) return;
		
		world.sendMessage('THEM ALL I HAVE TO CATCH!');
		const health = hurtEntity.getComponent("health");
		if (health) {
			const item = new ItemStack("minecraft:snowball", 1);
			item.setLore([
				'§c§lName§r',
				String(hurtEntity.nameTag),
				'§c§lType§r',
				String(hurtEntity.typeId),
				'§c§lHealth§r',
				String(health.currentValue),
			]);
			item.nameTag = "Soul Stone"
			damageSource.damagingEntity.dimension.spawnItem(item, hurtEntity.location);
			hurtEntity.teleport({x:hurtEntity.location.x, y:-10000, z:hurtEntity.location.z} )
			event.cancel
		}
	}
});



world.beforeEvents.itemUseOn.subscribe((event) => {
	const { source, block, itemStack } = event
	
	if (!(source instanceof Player)) return;
	if (!(block.permutation.matches("minecraft:grass") )) return;
	if (!(itemStack.nameTag == 'Soul Stone')) return;
	// event.cancel = true;
	world.sendMessage('Player using Soul Stone!');	
	const mob_type = itemStack.getLore()[3]
	const mob_health = itemStack.getLore()[5]
	world.sendMessage(itemStack.getLore()[1]);
	world.sendMessage(mob_type);
	world.sendMessage(mob_health);
	
    system.runTimeout(() => {
		const mob = source.dimension.spawnEntity(mob_type, { x: block.location.x, y: block.location.y+1, z: block.location.z });
		world.sendMessage('mob spawned');
		const health = mob.getComponent("health");
		if (health) {
			health.resetToMaxValue();
			const max_health = health.currentValue;
			mob.applyDamage(max_health - parseInt(mob_health));
		}
		mob.nameTag = itemStack.getLore()[1]

    }, 1);

});
