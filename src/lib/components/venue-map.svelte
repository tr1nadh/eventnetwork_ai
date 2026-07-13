<script>
  import { MapPin, Coffee, Mic, Users, MonitorPlay, Pencil, Plus, Trash2, Save, X } from '@lucide/svelte';
  import { createEventDispatcher } from 'svelte';
  import { slide } from 'svelte/transition';
  
  const dispatch = createEventDispatcher();
  
  export let currentLocation = null; // Can be a zone id
  export let isOrganizer = false;
  export let initialZones = null;

  let gridCols = 6;
  let gridRows = 6;
  
  const defaultZones = [
    { id: 'main-stage', name: 'Main Stage', icon: 'Mic', x: 2, y: 1, w: 4, h: 2, color: 'from-blue-500/20 to-indigo-500/20 border-blue-400/30' },
    { id: 'coffee', name: 'Coffee Station', icon: 'Coffee', x: 1, y: 1, w: 1, h: 2, color: 'from-amber-500/20 to-orange-500/20 border-amber-400/30' },
    { id: 'lounge', name: 'Networking Lounge', icon: 'Users', x: 1, y: 3, w: 3, h: 2, color: 'from-emerald-500/20 to-teal-500/20 border-emerald-400/30' },
    { id: 'booth-a', name: 'Sponsor Booth A', icon: 'MonitorPlay', x: 4, y: 3, w: 1, h: 2, color: 'from-purple-500/20 to-fuchsia-500/20 border-purple-400/30' },
    { id: 'booth-b', name: 'Sponsor Booth B', icon: 'MonitorPlay', x: 5, y: 3, w: 2, h: 1, color: 'from-pink-500/20 to-rose-500/20 border-pink-400/30' },
    { id: 'entrance', name: 'Entrance / Reg', icon: 'MapPin', x: 5, y: 4, w: 2, h: 2, color: 'from-gray-500/20 to-slate-500/20 border-gray-400/30' },
  ];

  // Map string icon names to actual components
  const iconMap = {
    Mic, Coffee, Users, MonitorPlay, MapPin
  };

  // Gracefully migrate legacy cols data
  let zones = (initialZones && Array.isArray(initialZones) && initialZones.length > 0) 
    ? initialZones.map(z => {
        if (z.cols) {
          const c = z.cols.match(/col-span-(\d+)/);
          const r = z.cols.match(/row-span-(\d+)/);
          return { ...z, x: 1, y: 1, w: c ? parseInt(c[1], 10) : 1, h: r ? parseInt(r[1], 10) : 1, cols: undefined };
        }
        return z;
      })
    : defaultZones;

  let isEditing = false;
  let editingZoneId = null; 
  let editForm = { name: '', icon: '', color: '' };

  const colorOptions = [
    { value: 'from-blue-500/20 to-indigo-500/20 border-blue-400/30', name: 'Blue' },
    { value: 'from-amber-500/20 to-orange-500/20 border-amber-400/30', name: 'Orange' },
    { value: 'from-emerald-500/20 to-teal-500/20 border-emerald-400/30', name: 'Green' },
    { value: 'from-purple-500/20 to-fuchsia-500/20 border-purple-400/30', name: 'Purple' },
    { value: 'from-pink-500/20 to-rose-500/20 border-pink-400/30', name: 'Pink' },
    { value: 'from-gray-500/20 to-slate-500/20 border-gray-400/30', name: 'Gray' },
    { value: 'from-red-500/20 to-red-700 border-red-400/30', name: 'Red' },
  ];

  function setLocation(zoneId) {
    if (isEditing) return; // Disallow checking in while editing
    if (currentLocation === zoneId) {
      currentLocation = null;
    } else {
      currentLocation = zoneId;
    }
    dispatch('locationChange', currentLocation);
  }

  function toggleEditMode() {
    isEditing = !isEditing;
  }

  function saveMap() {
    isEditing = false;
    dispatch('saveMap', zones);
  }

  function addZone() {
    const newId = 'zone-' + Date.now();
    zones = [...zones, {
      id: newId,
      name: 'New Zone',
      icon: 'MapPin',
      x: 1, y: 1, w: 1, h: 1,
      color: 'from-gray-500/20 to-slate-500/20 border-gray-400/30'
    }];
    openEditZone(newId);
  }

  function openEditZone(zoneId) {
    const zone = zones.find(z => z.id === zoneId);
    if (!zone) return;
    editingZoneId = zoneId;
    editForm = { ...zone };
  }

  function saveZone() {
    zones = zones.map(z => z.id === editingZoneId ? { ...editForm, id: editingZoneId } : z);
    editingZoneId = null;
  }

  function deleteZone(zoneId) {
    zones = zones.filter(z => z.id !== zoneId);
    if (editingZoneId === zoneId) editingZoneId = null;
  }

  // Live Drag and Resize Engine
  let dragState = null;

  function onPointerDown(e, zone, handle = 'center') {
    if (!isEditing) return;
    e.stopPropagation();
    
    dragState = {
      zoneId: zone.id,
      handle,
      startX: e.clientX,
      startY: e.clientY,
      initialX: zone.x,
      initialY: zone.y,
      initialW: zone.w,
      initialH: zone.h
    };
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  }

  function onPointerMove(e) {
    if (!dragState) return;
    const deltaX = e.clientX - dragState.startX;
    const deltaY = e.clientY - dragState.startY;
    
    // We assume roughly 100px per grid cell for interaction sensitivity
    const colDiff = Math.round(deltaX / 100);
    const rowDiff = Math.round(deltaY / 100);

    let { initialX, initialY, initialW, initialH, handle } = dragState;
    let newX = initialX;
    let newY = initialY;
    let newW = initialW;
    let newH = initialH;

    if (handle === 'center') {
      newX = Math.max(1, Math.min(gridCols - newW + 1, initialX + colDiff));
      newY = Math.max(1, Math.min(gridRows - newH + 1, initialY + rowDiff));
    } else {
      if (handle.includes('e')) newW = Math.max(1, Math.min(gridCols - initialX + 1, initialW + colDiff));
      if (handle.includes('s')) newH = Math.max(1, Math.min(gridRows - initialY + 1, initialH + rowDiff));
      if (handle.includes('w')) {
        let diff = Math.min(initialW - 1, colDiff); 
        diff = Math.max(1 - initialX, diff); 
        newX = initialX + diff;
        newW = initialW - diff;
      }
      if (handle.includes('n')) {
        let diff = Math.min(initialH - 1, rowDiff);
        diff = Math.max(1 - initialY, diff);
        newY = initialY + diff;
        newH = initialH - diff;
      }
    }

    // Auto-adjust (Swap) when moving the center
    let swapped = false;
    if (handle === 'center' && (newX !== dragState.initialX || newY !== dragState.initialY)) {
        // Find if we completely overlap exactly with another block of same size for a clean swap
        const targetZone = zones.find(z => z.id !== dragState.zoneId && z.x === newX && z.y === newY && z.w === newW && z.h === newH);
        if (targetZone) {
            zones = zones.map(z => {
                if (z.id === targetZone.id) return { ...z, x: dragState.initialX, y: dragState.initialY };
                return z;
            });
            dragState.initialX = newX;
            dragState.initialY = newY;
            dragState.startX = e.clientX; 
            dragState.startY = e.clientY;
            swapped = true;
        }
    }

    if (!swapped) {
      zones = zones.map(z => z.id === dragState.zoneId ? {
        ...z, x: newX, y: newY, w: newW, h: newH
      } : z);
    }
  }

  function onPointerUp() {
    dragState = null;
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
  }
</script>

<div class="glass rounded-2xl overflow-hidden border border-white/10 animate-fade-in flex flex-col relative">
  <!-- Header -->
  <div class="p-4 sm:p-6 border-b border-white/10 flex flex-col gap-3">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div>
        <h2 class="text-lg font-bold text-white flex items-center gap-2">
          <MapPin size={18} class="text-amber-400" />
          Interactive Venue Map
        </h2>
        <p class="text-sm text-ink-500 mt-1">
          {#if isEditing}
            Drag blocks to move them, or grab any edge to resize.
          {:else}
            Tap a zone to check-in and let your connections know where to find you.
          {/if}
        </p>
      </div>
      
      <div class="flex flex-wrap items-center gap-2">
        {#if isOrganizer}
          {#if isEditing}
            <div class="flex items-center gap-1.5 bg-black/40 rounded-lg px-2 py-1">
              <span class="text-xs text-white/50 uppercase font-bold tracking-wider hidden xs:inline">Cols</span>
              <button onclick={() => gridCols = Math.max(3, gridCols - 1)} class="w-6 h-6 flex items-center justify-center bg-white/10 text-white rounded hover:bg-white/20 text-sm font-bold">-</button>
              <span class="text-sm text-white font-mono w-5 text-center">{gridCols}</span>
              <button onclick={() => gridCols++} class="w-6 h-6 flex items-center justify-center bg-white/10 text-white rounded hover:bg-white/20 text-sm font-bold">+</button>
            </div>
            <div class="flex items-center gap-1.5 bg-black/40 rounded-lg px-2 py-1">
              <span class="text-xs text-white/50 uppercase font-bold tracking-wider hidden xs:inline">Rows</span>
              <button onclick={() => gridRows = Math.max(3, gridRows - 1)} class="w-6 h-6 flex items-center justify-center bg-white/10 text-white rounded hover:bg-white/20 text-sm font-bold">-</button>
              <span class="text-sm text-white font-mono w-5 text-center">{gridRows}</span>
              <button onclick={() => gridRows++} class="w-6 h-6 flex items-center justify-center bg-white/10 text-white rounded hover:bg-white/20 text-sm font-bold">+</button>
            </div>
            <button onclick={saveMap} class="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-sm font-semibold hover:bg-emerald-500/30 transition-colors">
              <Save size={14} />
              Save
            </button>
            <button onclick={addZone} class="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white/10 text-white border border-white/20 rounded-lg text-sm font-semibold hover:bg-white/20 transition-colors">
              <Plus size={14} />
              Add
            </button>
          {:else}
            <button onclick={toggleEditMode} class="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 sm:px-3 sm:py-1.5 bg-white/5 text-ink-300 border border-white/10 rounded-lg text-sm font-semibold hover:bg-white/10 hover:text-white transition-colors">
              <Pencil size={14} />
              Edit Map
            </button>
          {/if}
        {/if}

        {#if currentLocation && !isEditing}
          <div class="bg-amber-400/10 border border-amber-400/20 text-amber-300 px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-2" transition:slide>
            <div class="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></div>
            <span class="hidden sm:inline">You are at:</span> {zones.find(z => z.id === currentLocation)?.name || 'Unknown Zone'}
          </div>
        {:else if !isEditing}
          <div class="bg-white/5 border border-white/10 text-ink-400 px-3 py-1.5 rounded-full text-xs font-semibold" transition:slide>
            Not checked in
          </div>
        {/if}
      </div>
    </div>
  </div>

  <!-- Map Grid -->
  <div class="p-4 sm:p-6 bg-black/40 relative overflow-x-auto overflow-y-hidden">
    
    <div class="grid gap-3 md:gap-4 mx-auto relative z-10 min-w-max sm:min-w-0" 
         style="grid-template-columns: repeat({gridCols}, minmax(80px, 1fr)); grid-auto-rows: minmax(80px, 1fr);">
      
      {#if isEditing}
        <!-- Visual Grid Lines -->
        {#each Array(gridCols * gridRows) as _, i}
          <div class="border border-white/8 rounded-xl pointer-events-none bg-white/[0.02]" style="grid-column: {(i % gridCols) + 1}; grid-row: {Math.floor(i / gridCols) + 1}; min-height: 80px;"></div>
        {/each}
      {/if}

      {#each zones as zone (zone.id)}
        <div 
          style="grid-column: {zone.x} / span {zone.w}; grid-row: {zone.y} / span {zone.h};"
          class="relative flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all duration-200 
                 {currentLocation === zone.id && !isEditing
                    ? 'border-amber-400 bg-amber-400/10 shadow-[0_0_20px_rgba(251,191,36,0.15)] z-20 scale-[1.02]' 
                    : isEditing 
                      ? `bg-gradient-to-br ${zone.color} border-white/30 hover:border-white/80 hover:bg-white/10 border-dashed`
                      : `bg-gradient-to-br ${zone.color} hover:border-white/40 hover:bg-white/5`}"
        >
          {#if !isEditing}
             <!-- Non-editing interactable button covering the block -->
             <button class="absolute inset-0 w-full h-full cursor-pointer z-10" onclick={() => setLocation(zone.id)} aria-label="Set location to {zone.name}"></button>
          {/if}

          <svelte:component this={iconMap[zone.icon] || MapPin} size={24} class={currentLocation === zone.id && !isEditing ? 'text-amber-400' : 'text-white/60 mb-2 pointer-events-none'} />
          <span class="text-sm font-medium {currentLocation === zone.id && !isEditing ? 'text-amber-300 mt-2' : 'text-white/80 text-center pointer-events-none'}">
            {zone.name}
          </span>
          
          {#if currentLocation === zone.id && !isEditing}
            <div class="absolute inset-0 rounded-xl border border-amber-400 animate-ping opacity-20 pointer-events-none"></div>
            <div class="absolute -top-3 -right-3 w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center shadow-lg border-2 border-black pointer-events-none">
              <MapPin size={12} class="text-black fill-black" />
            </div>
          {/if}

          {#if isEditing}
             <!-- Center Drag Overlay -->
             <div class="absolute inset-0 z-10 cursor-move" onpointerdown={(e) => onPointerDown(e, zone, 'center')} role="button" tabindex="0"></div>

             <!-- Edge Resizers -->
             <div class="absolute top-0 left-2 right-2 h-2 cursor-ns-resize z-20 hover:bg-white/20 rounded-full" onpointerdown={(e) => onPointerDown(e, zone, 'n')}></div>
             <div class="absolute bottom-0 left-2 right-2 h-2 cursor-ns-resize z-20 hover:bg-white/20 rounded-full" onpointerdown={(e) => onPointerDown(e, zone, 's')}></div>
             <div class="absolute left-0 top-2 bottom-2 w-2 cursor-ew-resize z-20 hover:bg-white/20 rounded-full" onpointerdown={(e) => onPointerDown(e, zone, 'w')}></div>
             <div class="absolute right-0 top-2 bottom-2 w-2 cursor-ew-resize z-20 hover:bg-white/20 rounded-full" onpointerdown={(e) => onPointerDown(e, zone, 'e')}></div>

             <!-- Corner Resizers -->
             <div class="absolute top-0 left-0 w-4 h-4 cursor-nwse-resize z-30" onpointerdown={(e) => onPointerDown(e, zone, 'nw')}></div>
             <div class="absolute top-0 right-0 w-4 h-4 cursor-nesw-resize z-30" onpointerdown={(e) => onPointerDown(e, zone, 'ne')}></div>
             <div class="absolute bottom-0 left-0 w-4 h-4 cursor-nesw-resize z-30" onpointerdown={(e) => onPointerDown(e, zone, 'sw')}></div>
             <div class="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize z-30" onpointerdown={(e) => onPointerDown(e, zone, 'se')}>
               <div class="absolute bottom-1 right-1 w-2 h-2 bg-white/50 rounded-full pointer-events-none"></div>
             </div>

             <!-- Delete & Edit buttons -->
             <div class="absolute -top-3 -right-3 bg-black/90 rounded-full p-1.5 border border-white/20 text-white/50 hover:text-red-400 hover:border-red-400/50 transition-colors z-40 cursor-pointer shadow-lg"
                  role="button" tabindex="0"
                  onclick={(e) => { e.stopPropagation(); deleteZone(zone.id); }}>
               <Trash2 size={14} />
             </div>
             <div class="absolute -top-3 -left-3 bg-black/90 rounded-full p-1.5 border border-white/20 text-white/50 hover:text-white hover:border-white/50 transition-colors z-40 cursor-pointer shadow-lg"
                  role="button" tabindex="0"
                  onclick={(e) => { e.stopPropagation(); openEditZone(zone.id); }}>
               <Pencil size={14} />
             </div>
          {/if}
        </div>
      {/each}
    </div>
  </div>

  <!-- Edit Zone Modal overlay -->
  {#if isEditing && editingZoneId}
    <div class="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div class="bg-[#1a1b1e] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
        <div class="p-5 border-b border-white/10 flex justify-between items-center">
          <h3 class="text-lg font-bold text-white">Edit Zone Info</h3>
          <button onclick={() => editingZoneId = null} class="text-ink-400 hover:text-white"><X size={18}/></button>
        </div>
        <div class="p-5 space-y-4">
          <div>
            <label class="block text-xs font-semibold text-ink-400 uppercase tracking-wider mb-1.5">Zone Name</label>
            <input type="text" bind:value={editForm.name} class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-amber-400/50 focus:outline-none" />
          </div>

          <div>
            <label class="block text-xs font-semibold text-ink-400 uppercase tracking-wider mb-1.5">Icon</label>
            <div class="flex gap-2">
              {#each Object.keys(iconMap) as iconName}
                <button onclick={() => editForm.icon = iconName} class="p-2 rounded-lg border {editForm.icon === iconName ? 'bg-amber-400/20 border-amber-400/50 text-amber-400' : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:text-white'}">
                  <svelte:component this={iconMap[iconName]} size={20} />
                </button>
              {/each}
            </div>
          </div>

          <div>
            <label class="block text-xs font-semibold text-ink-400 uppercase tracking-wider mb-1.5">Color Theme</label>
            <div class="grid grid-cols-4 gap-2">
              {#each colorOptions as color}
                <button onclick={() => editForm.color = color.value} class="h-8 rounded border-2 transition-all bg-gradient-to-br {editForm.color === color.value ? 'border-white scale-105' : 'border-transparent opacity-60 hover:opacity-100'}"
                        class:from-blue-500={color.name === 'Blue'}
                        class:to-indigo-500={color.name === 'Blue'}
                        class:from-amber-500={color.name === 'Orange'}
                        class:to-orange-500={color.name === 'Orange'}
                        class:from-emerald-500={color.name === 'Green'}
                        class:to-teal-500={color.name === 'Green'}
                        class:from-purple-500={color.name === 'Purple'}
                        class:to-fuchsia-500={color.name === 'Purple'}
                        class:from-pink-500={color.name === 'Pink'}
                        class:to-rose-500={color.name === 'Pink'}
                        class:from-gray-500={color.name === 'Gray'}
                        class:to-slate-500={color.name === 'Gray'}
                        class:from-red-500={color.name === 'Red'}
                        class:to-red-700={color.name === 'Red'}
                        title={color.name}></button>
              {/each}
            </div>
          </div>
        </div>
        <div class="p-5 border-t border-white/10 bg-black/20 flex justify-end gap-3">
          <button onclick={() => editingZoneId = null} class="px-4 py-2 text-sm font-medium text-ink-300 hover:text-white">Cancel</button>
          <button onclick={saveZone} class="px-4 py-2 text-sm font-medium bg-white text-black rounded-lg hover:bg-gray-200">Done</button>
        </div>
      </div>
    </div>
  {/if}
</div>
