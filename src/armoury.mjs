const { settings, characterStorage, patch } = mod.getContext(import.meta);

class ItemSetBonusStage {
    constructor(data, set) {
        this.set = set;
        this.required = data.required;
        this.name = `${this.set.name} - ${this.required} Pieces`;

        if(data.customDescription)
            this._customDescription = data.customDescription;

        if(data.combatEffects !== undefined)
            this.combatEffects = game.getCombatEffectApplicatorsWithTriggersFromData(data.combatEffects);
        if(data.resistanceStats !== undefined) {
            data.resistanceStats.forEach(stat => {
                const damageType = game.damageTypes.getObjectSafe(stat.id);
                this.resistanceStats.set(damageType, stat.value);
            });
        }
        game.queueForSoftDependencyReg(data, this);
    }
    
    registerSoftDependencies(data, game) {
        try {
            if(data.modifiers !== undefined)
                this.modifiers = game.getModifierValuesFromData(data.modifiers);
            if(data.enemyModifiers !== undefined)
                this.enemyModifiers = game.getEnemyModifierValuesFromData(data.enemyModifiers);
            if(data.conditionalModifiers !== undefined)
                this.conditionalModifiers = data.conditionalModifiers.map(data => new ConditionalModifier(data,game,this));
        } catch (e) {
            throw new DataConstructionError(ItemSetBonusStage.name, e);
        }
        console.log(this);
    }
    get hasDescription() {
        return this._customDescription !== undefined || this.modifiers !== undefined || this.combatEffects !== undefined || this.conditionalModifiers !== undefined;
    }
    get description() {
        if (this._customDescription !== undefined) {
            if(containsDisabledModifier(this.modifiers))
                return this._customDescription + getLangString('MENU_TEXT_CONTAINS_DISABLED_MODIFIER');
            return this._customDescription;
        }
        if(StatObject.hasStats(this))
            return StatObject.formatAsPlainList(this);
        return '';
    }
    get modifiedDescription() {
        if (this._modifiedDescription !== undefined)
            return this._modifiedDescription;
        let desc = applyDescriptionModifications(this.description);
        this._modifiedDescription = desc;
        return this._modifiedDescription;
    }
}

class EmpoweredItemBonusStage {
    constructor(data, empoweredItem) {
        this.empoweredItem = empoweredItem;
        this.required = data.required;
        this.name = `${this.empoweredItem.name} - ${this.required} Pieces`;

        if(data.customDescription)
            this._customDescription = data.customDescription;

        if(data.combatEffects !== undefined)
            this.combatEffects = game.getCombatEffectApplicatorsWithTriggersFromData(data.combatEffects);
        if(data.resistanceStats !== undefined) {
            data.resistanceStats.forEach(stat => {
                const damageType = game.damageTypes.getObjectSafe(stat.id);
                this.resistanceStats.set(damageType, stat.value);
            });
        }
        game.queueForSoftDependencyReg(data, this);
    }
    
    registerSoftDependencies(data, game) {
        try {
            if(data.modifiers !== undefined)
                this.modifiers = game.getModifierValuesFromData(data.modifiers);
            if(data.enemyModifiers !== undefined)
                this.enemyModifiers = game.getEnemyModifierValuesFromData(data.enemyModifiers);
            if(data.conditionalModifiers !== undefined)
                this.conditionalModifiers = data.conditionalModifiers.map(data => new ConditionalModifier(data,game,this));
        } catch (e) {
            throw new DataConstructionError(EmpoweredItemBonusStage.name, e);
        }
        console.log(this);
    }
    get hasDescription() {
        return this._customDescription !== undefined || this.modifiers !== undefined || this.combatEffects !== undefined || this.conditionalModifiers !== undefined;
    }
    get description() {
        if (this._customDescription !== undefined) {
            if(containsDisabledModifier(this.modifiers))
                return this._customDescription + getLangString('MENU_TEXT_CONTAINS_DISABLED_MODIFIER');
            return this._customDescription;
        }
        if(StatObject.hasStats(this))
            return StatObject.formatAsPlainList(this);
        return '';
    }
    get modifiedDescription() {
        if (this._modifiedDescription !== undefined)
            return this._modifiedDescription;
        let desc = applyDescriptionModifications(this.description);
        this._modifiedDescription = desc;
        return this._modifiedDescription;
    }
}

class ItemSet extends NamespacedObject {
    constructor(namespace, data) {
        super(namespace, data.id);
        this.name = data.name;

        if(data.stages !== undefined) {
            this.stages = data.stages.map(stageData => new ItemSetBonusStage(stageData, this));
            this.highestRequirement = Math.max(...this.stages.map(stage => stage.required));
        }

        game.queueForSoftDependencyReg(data, this);
    }

    registerSoftDependencies(data, game) {
        try {
            if(data.equipmentSlots !== undefined) {
                this.slotMap = new Map();
                data.equipmentSlots.forEach(equipmentSlotData => {
                    let equipmentSlot = game.equipmentSlots.getObjectByID(equipmentSlotData.slotID);
                    let items = equipmentSlotData.itemIDs.map(item => game.items.getObjectByID(item));

                    game.armoury.registerItemsToSet(items, this);
                    this.slotMap.set(equipmentSlot, items);
                });
            }
        } catch (e) {
            throw new DataConstructionError(ItemSet.name, e);
        }
        console.log(this);
    }

    itemCount() {
        let count = 0;
        if(this.slotMap !== undefined)
            count += this.slotMap.size;
        return count;
    }

    getActiveItemForSlot(slot) {
        let items = this.slotMap.get(slot);
        let activeItem = game.combat.player.equipment.getItemInSlot(slot.id);
        if(activeItem.baseItem !== undefined)
            activeItem = activeItem.baseItem;
        return items.find(item => activeItem === item);
    }

    countActiveItems() {
        let count = 0;
        this.slotMap.forEach((items, slot) => {
            let equippedItem = game.combat.player.equipment.getItemInSlot(slot.id);
            if(equippedItem.baseItem !== undefined)
                equippedItem = equippedItem.baseItem;
            if(items.includes(equippedItem))
                count++;
        });
        return count;
    }
}

class EmpoweredItem extends NamespacedObject {
    constructor(namespace, data) {
        super(namespace, data.id);
        this.name = data.name;

        if(data.stages !== undefined) {
            this.stages = data.stages.map(stageData => new EmpoweredItemBonusStage(stageData, this));
            this.highestRequirement = Math.max(...this.stages.map(stage => stage.required));
        }

        game.queueForSoftDependencyReg(data, this);
    }

    registerSoftDependencies(data, game) {
        try {
            if(data.item !== undefined) {
                this.equipmentSlot = game.equipmentSlots.getObjectByID(data.item.slotID);
                this.item = game.items.getObjectByID(data.item.itemID);
            }
            if(data.equipmentSlots !== undefined) {
                this.slotMap = new Map();

                data.equipmentSlots.forEach(equipmentSlotData => {
                    let equipmentSlot = game.equipmentSlots.getObjectByID(equipmentSlotData.slotID);
                    let items = equipmentSlotData.itemIDs.map(item => game.items.getObjectByID(item));

                    this.slotMap.set(equipmentSlot, items);
                });
            }
            if(data.sets !== undefined) {
                this.sets = data.sets.map(setID => game.armoury.sets.getObjectByID(setID));
            }
            game.armoury.registerEmpoweredItem(this.item, this);
        } catch (e) {
            throw new DataConstructionError(EmpoweredItem.name, e);
        }
        console.log(this);
    }

    itemCount() {
        let count = 0;
        if(this.sets !== undefined)
            this.sets.forEach(set => {
                count += set.countActiveItems();
        });
        if(this.slotMap !== undefined)
            count += this.slotMap.size;
        return count;
    }

    getActiveItemForSlot(slot) {
        let items = this.slotMap.get(slot);
        let activeItem = game.combat.player.equipment.getItemInSlot(slot.id);
        if(activeItem.baseItem !== undefined)
            activeItem = activeItem.baseItem;
        return items.find(item => activeItem === item);
    }

    countActiveItems() {
        let count = 0;
        if(this.sets !== undefined)
            this.sets.forEach(set => {
                count += set.countActiveItems();
        });
        
        if(this.slotMap != undefined) {
            this.slotMap.forEach((items, slot) => {
            let equippedItem = game.combat.player.equipment.getItemInSlot(slot.id);
            if(equippedItem.baseItem !== undefined)
                equippedItem = equippedItem.baseItem;
                if(items.includes(equippedItem))
                    count++;
            });
        }
        return count;
    }
}

export class Armoury {
    constructor() {
        this.sets = new NamespaceRegistry(game.registeredNamespaces);
        this.empoweredItems = new NamespaceRegistry(game.registeredNamespaces);

        this.itemToSet = new Map();
        this.activeItemSetStages = new Map();

        this.itemToEmpowered = new Map();
        this.activeEmpoweredItemStages = new Map();
    }

    itemHasSet(item) {
        if(item.baseItem !== undefined)
            item = item.baseItem;
        return this.itemToSet.has(item);
    }

    getSetFromItem(item) {
        if(item.baseItem !== undefined)
            item = item.baseItem;
        return this.itemToSet.get(item);
    }

    itemHasEmpowered(item) {
        if(item.baseItem !== undefined)
            item = item.baseItem;
        return this.itemToEmpowered.has(item);
    }

    getEmpoweredItemFromItem(item) {
        if(item.baseItem !== undefined)
            item = item.baseItem;
        return this.itemToEmpowered.get(item);
    }

    computeItemSets() {
        this.activeItemSetStages.clear();
        const potentialSets = new Set();
        game.combat.player.equipment.equippedArray.forEach((equipped)=>{
            if(equipped.providesStats) {
                let item = equipped.item;
                if(item.baseItem !== undefined)
                    item = item.baseItem;
                const set = this.itemToSet.get(item);
                if(set !== undefined)
                    potentialSets.add(set);
            }
        });
        potentialSets.forEach((set)=> {
            let setCount = set.countActiveItems();
            let stages = set.stages.filter(stage => setCount >= stage.required);
            this.activeItemSetStages.set(set, stages);
        });
    }

    computeEmpoweredItems() {
        this.activeEmpoweredItemStages.clear();
        const potentialEmpoweredItems = new Set();
        game.combat.player.equipment.equippedArray.forEach((equipped)=>{
            if(equipped.providesStats) {
                let item = equipped.item;
                if(item.baseItem !== undefined)
                    item = item.baseItem;
                const empoweredItem = this.itemToEmpowered.get(item);
                if(empoweredItem !== undefined && empoweredItem.item === item)
                    potentialEmpoweredItems.add(empoweredItem);
            }
        });
        potentialEmpoweredItems.forEach((empoweredItem)=> {
            let empoweredItemCount = empoweredItem.countActiveItems();
            let stages = empoweredItem.stages.filter(stage => empoweredItemCount >= stage.required);
            this.activeEmpoweredItemStages.set(empoweredItem, stages);
        });
    }

    registerItemsToSet(items, set) {
        items.forEach(item => {
            this.itemToSet.set(item, set);
        });
    }

    registerEmpoweredItem(item, empoweredItem) {
        this.itemToEmpowered.set(item, empoweredItem);
    }

    registerItemSetData(namespace, data) {
        data.forEach(data => {
            this.sets.registerObject(new ItemSet(namespace, data));
        });
    }

    registerEmpoweredItemData(namespace, data) {
        data.forEach(data => {
            this.empoweredItems.registerObject(new EmpoweredItem(namespace, data));
        });
    }
}