export async function setup({ gameData, loadModule, loadScript, onModsLoaded, onCharacterLoaded, onInterfaceReady, patch }) {
    const { Armoury } = await loadModule('src/armoury.mjs');
    game.armoury = new Armoury();

    patch(Game, 'registerGameData').before(function (namespace, gameData) {
        if(gameData.itemSets !== undefined)
            game.armoury.registerItemSetData(namespace, gameData.itemSets);
        if(gameData.empoweredItems !== undefined)
            game.armoury.registerEmpoweredItemData(namespace, gameData.empoweredItems);
    });

    patch(Game, 'applyDataModifications').before(function (modificationData) {
        //if(modificationData.itemSets !== undefined)
            //game.armoury.registerItemSetData(namespace, modificationData.itemSets);
        //if(modificationData.empoweredItems !== undefined)
            //game.armoury.registerEmpoweredItemData(namespace, modificationData.empoweredItems);
    });
    

    patch(Player, 'computeItemSynergies').after(function () {
        game.armoury.computeItemSets();
        game.armoury.computeEmpoweredItems();
    });


    patch(EquippedItem, 'setOccupied').before(function(player, equipped) {
        combatMenus.equipment.forEach(grid=> grid.icons.forEach((icon, slot) => { icon.tooltipElem.updateArmoury = true; }));
    });

    patch(EquippedItem, 'setEquipped').before(function(player, equipped) {
        combatMenus.equipment.forEach(grid=> grid.icons.forEach((icon, slot) => { icon.tooltipElem.updateArmoury = true; }));
    });

    patch(EquippedItem, 'setEmpty').before(function(player, equipped) {
        combatMenus.equipment.forEach(grid=> grid.icons.forEach((icon, slot) => { icon.tooltipElem.updateArmoury = true; }));
    });

    patch(EquipmentTooltipElement, 'setItem').before(function(item, showStats) {
        this.skipEmpowered = this.lastItem === item && !this.unset && !this.updateArmoury;
        if(this.empoweredContainer === undefined) {
            this.empoweredContainer = createElement('div', {
                parent: this.statContainer.parentNode,
                classList: ['row', 'no-gutters', 'text-success', 'text-center', 'pt-2']
            });
        }

        this.skipSet = this.lastItem === item && !this.unset && !this.updateArmoury;
        if(this.setContainer === undefined) {
            this.setContainer = createElement('div', {
                parent: this.statContainer.parentNode,
                classList: ['row', 'no-gutters', 'text-success', 'text-center', 'pt-2']
            });
        }
    });

    patch(EquipmentTooltipElement, 'setItem').after(function(_, item, showStats) {
        if(!this.skipEmpowered) {
            if(game.armoury.itemHasEmpowered(item) && showStats) {
                console.log(item, showStats);
                this.empoweredContainer.innerHTML = '';

                let empoweredItem = game.armoury.getEmpoweredItemFromItem(item);
                let count = empoweredItem.countActiveItems();

                let empoweredList = createElement('div', {
                    classList: ['text-center', 'col-12', 'row', 'no-gutters'],
                    parent: this.empoweredContainer
                });

                empoweredList.append(createElement('small', {
                    text: `${empoweredItem.name} (${Math.min(count, empoweredItem.highestRequirement)}/${empoweredItem.highestRequirement}):`,
                    classList: ['text-warning', 'text-center', 'font-w700', 'col-12']
                }));

                if(empoweredItem.sets !== undefined) {
                    empoweredItem.sets.forEach(set => {
                        let setCount = set.countActiveItems();
                        empoweredList.append(createElement('small', {
                            text: `${set.name} Set (${Math.min(setCount, set.itemCount())}/${set.itemCount()})`,
                            classList: [setCount > 0 ? 'text-success' : 'text-muted', 'text-center', 'col-12']
                        }));
                    });
                }

                if(empoweredItem.slotMap !== undefined) {
                    empoweredItem.slotMap.forEach((items, slot) => {
                        let foundItem = empoweredItem.getActiveItemForSlot(slot);
                        empoweredList.append(createElement('small', {
                            text: foundItem !== undefined ? foundItem.name : items[0].name,
                            classList: [foundItem !== undefined ? 'text-success' : 'text-muted', 'text-center', 'col-12']
                        }));
                    });
                }

                let stagesList = createElement('div', {
                    classList: ['text-left', 'col-12', 'row', 'no-gutters', 'pt-2'],
                    parent: this.empoweredContainer
                });

                empoweredItem.stages.forEach(stage => {
                    stagesList.append(createElement('small', {
                        innerHTML: `(${stage.required}): ${stage.modifiedDescription}`,
                        classList: [stage.required <= count ? 'text-success' : 'text-muted', 'text-center', 'col-12']
                    }));
                });
                this.skipEmpowered = true;
                showElement(this.empoweredContainer);
            } else {
                hideElement(this.empoweredContainer);
            }
        }

        if(!this.skipSet) {
            if(game.armoury.itemHasSet(item) && showStats) {
                console.log(item, showStats);
                this.setContainer.innerHTML = '';

                let set = game.armoury.getSetFromItem(item);
                let count = set.countActiveItems();

                let setList = createElement('div', {
                    classList: ['text-center', 'col-12', 'row', 'no-gutters'],
                    parent: this.setContainer
                });

                setList.append(createElement('small', {
                    text: `${set.name} (${Math.min(count, set.highestRequirement)}/${set.highestRequirement}):`,
                    classList: ['text-warning', 'text-center', 'font-w700', 'col-12']
                }));

                set.slotMap.forEach((items, slot) => {
                    let foundItem = set.getActiveItemForSlot(slot);
                    setList.append(createElement('small', {
                        text: foundItem !== undefined ? foundItem.name : items[0].name,
                        classList: [foundItem !== undefined ? 'text-success' : 'text-muted', 'text-center', 'col-12']
                    }));
                });

                let stagesList = createElement('div', {
                    classList: ['text-left', 'col-12', 'row', 'no-gutters', 'pt-2'],
                    parent: this.setContainer
                });

                set.stages.forEach(stage => {
                    stagesList.append(createElement('small', {
                        innerHTML: `(${stage.required}) Set: ${stage.modifiedDescription}`,
                        classList: [stage.required <= count ? 'text-success' : 'text-muted', 'text-center', 'col-12']
                    }));
                });
                this.skipSet = true;
                showElement(this.setContainer);
            } else {
                hideElement(this.setContainer);
            }
        }
        this.updateArmoury = false;
    });
    patch(EquipmentTooltipElement, 'setEmpty').before(function() {
        if(this.lastItem === undefined && !this.unset)
            return;
        if(this.empoweredContainer !== undefined)
            hideElement(this.empoweredContainer);
        if(this.setContainer !== undefined)
            hideElement(this.setContainer);
    });

    // Player Modifiers
    patch(Player, 'addEquippedItemModifiers').after(function() {
        game.armoury.activeItemSetStages.forEach((stages, set) => {
            stages.forEach(stage => {
                if(stage.modifiers !== undefined)
                    this.modifiers.addModifiers(set, stage.modifiers);
            });
        });
        game.armoury.activeEmpoweredItemStages.forEach((stages, empoweredItem) => {
            stages.forEach(stage => {
                if(stage.modifiers !== undefined)
                    this.modifiers.addModifiers(empoweredItem, stage.modifiers);
            });
        });
    });

    // Enemy Modifiers
    patch(Enemy, 'addPlayerEquipmentModifiers').after(function () {
        game.armoury.activeItemSetStages.forEach((stages, set) => {
            stages.forEach(stage => {
                if(stage.enemyModifiers !== undefined)
                    this.modifiers.addModifiers(set, stage.enemyModifiers);
            });
        });
        game.armoury.activeEmpoweredItemStages.forEach((stages, empoweredItem) => {
            stages.forEach(stage => {
                if(stage.enemyModifiers !== undefined)
                    this.modifiers.addModifiers(empoweredItem, stage.enemyModifiers);
            });
        });
    });

    // Conditional Modifiers
    patch(BaseManager, 'computeActiveConditionalModifiers').after(function() {
        game.armoury.activeItemSetStages.forEach((stages, set) => {
            stages.forEach(stage => {
                if(stage.conditionalModifiers !== undefined)
                    this.addActiveConditionalModifiers(set, stage.conditionalModifiers);
            });
        });
        game.armoury.activeEmpoweredItemStages.forEach((stages, empoweredItem) => {
            stages.forEach(stage => {
                if(stage.conditionalModifiers !== undefined)
                    this.addActiveConditionalModifiers(empoweredItem, stage.conditionalModifiers);
            });
        });
    });

    // Combat Effects
    patch(Player, 'mergeInheritedEffectApplicators').after(function() {
        game.armoury.activeItemSetStages.forEach((stages, set) => {
            stages.forEach(stage => {
                if(stage.combatEffects !== undefined) {
                    this.mergeEffectApplicators(stage.combatEffects);
                }
            });
        });
        game.armoury.activeEmpoweredItemStages.forEach((stages, empoweredItem) => {
            stages.forEach(stage => {
                if(stage.combatEffects !== undefined)
                    this.mergeEffectApplicators(stage.combatEffects);
            });
        });
    });


    // Sadness
    const _createItemInformationTooltip = createItemInformationTooltip;
    createItemInformationTooltip = function(...args) {
        let [ item, showStats=false ] = args;
        let html = _createItemInformationTooltip(...args);

        let customHTML = '';
        
        if(game.armoury.itemHasEmpowered(item)) {
            let empoweredContainer = createElement('div');

            let empoweredItem = game.armoury.getEmpoweredItemFromItem(item);
            let count = empoweredItem.countActiveItems();

            let empoweredList = createElement('div', {
                classList: ['text-center', 'col-12', 'row', 'no-gutters'],
                parent: empoweredContainer
            });

            empoweredList.append(createElement('small', {
                text: `${empoweredItem.name} (${Math.min(count, empoweredItem.highestRequirement)}/${empoweredItem.highestRequirement}):`,
                classList: ['text-warning', 'text-center', 'font-w700', 'col-12']
            }));

            if(empoweredItem.sets !== undefined) {
                empoweredItem.sets.forEach(set => {
                    let setCount = set.countActiveItems();
                    empoweredList.append(createElement('small', {
                        text: `${set.name} Set (${Math.min(setCount, set.itemCount())}/${set.itemCount()})`,
                        classList: [setCount > 0 ? 'text-success' : 'text-muted', 'text-center', 'col-12']
                    }));
                });
            }

            if(empoweredItem.slotMap !== undefined) {
                empoweredItem.slotMap.forEach((items, slot) => {
                    let foundItem = empoweredItem.getActiveItemForSlot(slot);
                    empoweredList.append(createElement('small', {
                        text: foundItem !== undefined ? foundItem.name : items[0].name,
                        classList: [foundItem !== undefined ? 'text-success' : 'text-muted', 'text-center', 'col-12']
                    }));
                });
            }

            let stagesList = createElement('div', {
                classList: ['text-left', 'col-12', 'row', 'no-gutters', 'pt-2'],
                parent: empoweredContainer
            });

            empoweredItem.stages.forEach(stage => {
                stagesList.append(createElement('small', {
                    innerHTML: `(${stage.required}): ${stage.modifiedDescription}`,
                    classList: [stage.required <= count ? 'text-success' : 'text-muted', 'text-center', 'col-12']
                }));
            });
            
            customHTML += empoweredContainer.innerHTML;
        }

        if(game.armoury.itemHasSet(item)) {
            let setContainer = createElement('div');

            let set = game.armoury.getSetFromItem(item);
            let count = set.countActiveItems();

            let setList = createElement('div', {
                classList: ['text-center', 'col-12', 'row', 'no-gutters'],
                parent: setContainer
            });

            setList.append(createElement('small', {
                text: `${set.name} (${Math.min(count, set.highestRequirement)}/${set.highestRequirement}):`,
                classList: ['text-warning', 'text-center', 'font-w700', 'col-12']
            }));

            set.slotMap.forEach((items, slot) => {
                let foundItem = set.getActiveItemForSlot(slot);
                setList.append(createElement('small', {
                    text: foundItem !== undefined ? foundItem.name : items[0].name,
                    classList: [foundItem !== undefined ? 'text-success' : 'text-muted', 'text-center', 'col-12']
                }));
            });

            let stagesList = createElement('div', {
                classList: ['text-left', 'col-12', 'row', 'no-gutters', 'pt-2'],
                parent: setContainer
            });

            set.stages.forEach(stage => {
                stagesList.append(createElement('small', {
                    innerHTML: `(${stage.required}) Set: ${stage.modifiedDescription}`,
                    classList: [stage.required <= count ? 'text-success' : 'text-muted', 'text-center', 'col-12']
                }));
            });
            
            customHTML += setContainer.innerHTML;
        }

        if(customHTML !== '') {
            html = html.replace(/(<div class="media-body">.*)(<\/div>\s+?<\/div>)/s, `$1${customHTML}$2`);
        }
        return html;
    }
    window.createItemInformationTooltip = createItemInformationTooltip;

    await gameData.addPackage('data/data.json');
}