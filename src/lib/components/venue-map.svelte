<script>
  import { MapPin, Coffee, Mic, Users, MonitorPlay, Pencil, Plus, Trash2, Save, X } from '@lucide/svelte';
  import { createEventDispatcher } from 'svelte';
  import { slide } from 'svelte/transition';
  
  const dispatch = createEventDispatcher();
  
  export let currentLocation = null; // Can be a zone id
  export let isOrganizer = false;
  export let initialZones = null;
  
  const defaultZones = [
    { id: 'main-stage', name: 'Main Stage', icon: 'Mic', cols: 'col-span-2 row-span-2', color: 'from-blue-500/20 to-indigo-500/20 border-blue-400/30' },
    { id: 'coffee', name: 'Coffee Station', icon: 'Coffee', cols: 'col-span-1 row-span-1', color: 'from-amber-500/20 to-orange-500/20 border-amber-400/30' },
    { id: 'lounge', name: 'Networking Lounge', icon: 'Users', cols: 'col-span-2 row-span-1', color: 'from-emerald-500/20 to-teal-500/20 border-emerald-400/30' },
    { id: 'booth-a', name: 'Sponsor Booth A', icon: 'MonitorPlay', cols: 'col-span-1 row-span-1', color: 'from-purple-500/20 to-fuchsia-500/20 border-purple-400/30' },
    { id: 'booth-b', name: 'Sponsor Booth B', icon: 'MonitorPlay', cols: 'col-span-1 row-span-1', color: 'from-pink-500/20 to-rose-500/20 border-pink-400/30' },
    { id: 'entrance', name: 'Entrance / Reg', icon: 'MapPin', cols: 'col-span-1 row-span-1', color: 'from-gray-500/20 to-slate-500/20 border-gray-400/30' },
  ];

  // Map string icon names to actual components
  const iconMap = {
    Mic, Coffee, Users, MonitorPlay, MapPin
  };

  let zones = initialZones && Array.isArray(initialZones) && initialZones.length > 0 ? initialZones : defaultZones;
  let isEditing = false;
  let editingZoneId = null; // the zone currently being configured in the modal
  let editForm = { name: '', icon: '', cols: '', color: '' };

  const gridSpanOptions = [
    { value: 'col-span-1 row-span-1', label: '1x1 Small' },
    { value: 'col-span-2 row-span-1', label: '2x1 Wide' },
    { value: 'col-span-1 row-span-2', label: '1x2 Tall' },
    { value: 'col-span-2 row-span-2', label: '2x2 Large' },
    { value: 'col-span-3 row-span-1', label: '3x1 Full Width' },
  ];

  const colorOptions = [
    { value: 'from-blue-500/20 to-indigo-500/20 border-blue-400/30', name: 'Blue' },
    { value: 'from-amber-500/20 to-orange-500/20 border-amber-400/30', name: 'Orange' },
    { value: 'from-emerald-500/20 to-teal-500/20 border-emerald-400/30', name: 'Green' },
    { value: 'from-purple-500/20 to-fuchsia-500/20 border-purple-400/30', name: 'Purple' },
    { value: 'from-pink-500/20 to-rose-500/20 border-pink-400/30', name: 'Pink' },
    { value: 'from-gray-500/20 to-slate-500/20 border-gray-400/30', name: 'Gray' },
    { value: 'from-red-500/20 to-rose-500/20 border-red-400/30', name: 'Red' },
  ];

  function setLocation(zoneId) {
    if (isEditing) {
      openEditZone(zoneId);
      return;
    }
    
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
      cols: 'col-span-1 row-span-1',
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

  let dragState = null;

  function onPointerDown(e, zone) {
    if (!isEditing) return;
    e.stopPropagation();
    const colsMatch = zone.cols.match(/col-span-(\d+)/);
    const rowsMatch = zone.cols.match(/row-span-(\d+)/);
    
    dragState = {
      zoneId: zone.id,
      startX: e.clientX,
      startY: e.clientY,
      startCols: colsMatch ? parseInt(colsMatch[1], 10) : 1,
      startRows: rowsMatch ? parseInt(rowsMatch[1], 10) : 1,
    };
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  }

  function onPointerMove(e) {
    if (!dragState) return;
    const deltaX = e.clientX - dragState.startX;
    const deltaY = e.clientY - dragState.startY;
    
    // Approximate grid cell widths based on a typical container
    const colDiff = Math.round(deltaX / 120);
    const rowDiff = Math.round(deltaY / 120);

    let newCols = Math.max(1, Math.min(3, dragState.startCols + colDiff));
    let newRows = Math.max(1, Math.min(4, dragState.startRows + rowDiff));

    zones = zones.map(z => z.id === dragState.zoneId ? {
      ...z,
      cols: `col-span-${newCols} row-span-${newRows}`
    } : z);
  }

  function onPointerUp() {
    dragState = null;
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
  }

  let draggedZoneId = null;

  function onDragStart(e, zoneId) {
    if (!isEditing) return;
    draggedZoneId = zoneId;
    e.dataTransfer.effectAllowed = 'move';
  }

  function onDragOver(e) {
    if (!isEditing) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }

  function onDrop(e, targetZoneId) {
    if (!isEditing) return;
    e.preventDefault();
    if (draggedZoneId && draggedZoneId !== targetZoneId) {
      const draggedIndex = zones.findIndex(z => z.id === draggedZoneId);
      const targetIndex = zones.findIndex(z => z.id === targetZoneId);
      if (draggedIndex > -1 && targetIndex > -1) {
        const newZones = [...zones];
        const [draggedZone] = newZones.splice(draggedIndex, 1);
        newZones.splice(targetIndex, 0, draggedZone);
        zones = newZones;
      }
    }
    draggedZoneId = null;
  }
</script>

<div class="glass rounded-2xl overflow-hidden border border-white/10 animate-fade-in flex flex-col relative">
  <!-- Header -->
  <div class="p-6 border-b border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
    <div>
      <h2 class="text-lg font-bold text-white flex items-center gap-2">
        <MapPin size={18} class="text-amber-400" />
        Interactive Venue Map
      </h2>
      <p class="text-sm text-ink-500 mt-1">
        {#if isEditing}
          Tap a zone to edit it, or click Add Zone.
        {:else}
          Tap a zone to check-in and let your connections know where to find you.
        {/if}
      </p>
    </div>
    
    <div class="flex items-center gap-3">
      {#if isOrganizer}
        {#if isEditing}
          <button onclick={saveMap} class="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-sm font-semibold hover:bg-emerald-500/30 transition-colors">
            <Save size={14} />
            Save Map
          </button>
          <button onclick={addZone} class="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 text-white border border-white/20 rounded-lg text-sm font-semibold hover:bg-white/20 transition-colors">
            <Plus size={14} />
            Add Zone
          </button>
        {:else}
          <button onclick={toggleEditMode} class="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 text-ink-300 border border-white/10 rounded-lg text-sm font-semibold hover:bg-white/10 hover:text-white transition-colors">
            <Pencil size={14} />
            Edit Map
          </button>
        {/if}
      {/if}

      {#if currentLocation && !isEditing}
        <div class="bg-amber-400/10 border border-amber-400/20 text-amber-300 px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-2" transition:slide>
          <div class="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></div>
          You are at: {zones.find(z => z.id === currentLocation)?.name || 'Unknown Zone'}
        </div>
      {:else if !isEditing}
        <div class="bg-white/5 border border-white/10 text-ink-400 px-3 py-1.5 rounded-full text-xs font-semibold" transition:slide>
          Not checked in
        </div>
      {/if}
    </div>
  </div>

  <!-- Map Grid -->
  <div class="p-6 bg-black/40 relative min-h-[400px]">
    <div class="absolute inset-0 opacity-[0.03] pointer-events-none" style="background-image: radial-gradient(circle at 1px 1px, white 1px, transparent 0); background-size: 20px 20px;"></div>
    
    <div class="grid grid-cols-3 gap-3 md:gap-4 max-w-3xl mx-auto relative z-10 grid-flow-row-dense">
      {#each zones as zone (zone.id)}
        <button 
          onclick={() => setLocation(zone.id)}
          draggable={isEditing}
          ondragstart={(e) => onDragStart(e, zone.id)}
          ondragover={onDragOver}
          ondrop={(e) => onDrop(e, zone.id)}
          class="relative flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all duration-300 {zone.cols} 
                 {currentLocation === zone.id && !isEditing
                    ? 'border-amber-400 bg-amber-400/10 shadow-[0_0_20px_rgba(251,191,36,0.15)] z-20 scale-[1.02]' 
                    : isEditing 
                      ? `bg-gradient-to-br ${zone.color} border-white/30 hover:border-white/80 hover:bg-white/10 border-dashed cursor-pointer`
                      : `bg-gradient-to-br ${zone.color} hover:border-white/40 hover:bg-white/5`}"
        >
          <svelte:component this={iconMap[zone.icon] || MapPin} size={24} class={currentLocation === zone.id && !isEditing ? 'text-amber-400' : 'text-white/60 mb-2'} />
          <span class="text-sm font-medium {currentLocation === zone.id && !isEditing ? 'text-amber-300 mt-2' : 'text-white/80 text-center'}">
            {zone.name}
          </span>
          
          {#if currentLocation === zone.id && !isEditing}
            <div class="absolute inset-0 rounded-xl border border-amber-400 animate-ping opacity-20 pointer-events-none"></div>
            <div class="absolute -top-3 -right-3 w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center shadow-lg border-2 border-black">
              <MapPin size={12} class="text-black fill-black" />
            </div>
          {/if}

          {#if isEditing}
             <div class="absolute -top-2 -right-2 bg-black/80 rounded-full p-1 border border-white/20 text-white/50 hover:text-red-400 hover:border-red-400/50 transition-colors"
                  role="button" tabindex="0"
                  onclick={(e) => { e.stopPropagation(); deleteZone(zone.id); }}>
               <Trash2 size={14} />
             </div>

             <div class="absolute -bottom-2 -right-2 bg-black/80 rounded-full p-1.5 border border-white/20 text-white/50 hover:text-white hover:border-white/50 transition-colors cursor-nwse-resize z-30"
                  role="button" tabindex="0"
                  onpointerdown={(e) => onPointerDown(e, zone)}>
               <div class="w-2 h-2 bg-current rounded-full"></div>
             </div>
          {/if}
        </button>
      {/each}
    </div>
  </div>

  <!-- Edit Zone Modal overlay -->
  {#if isEditing && editingZoneId}
    <div class="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div class="bg-[#1a1b1e] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
        <div class="p-5 border-b border-white/10 flex justify-between items-center">
          <h3 class="text-lg font-bold text-white">Edit Zone</h3>
          <button onclick={() => editingZoneId = null} class="text-ink-400 hover:text-white"><X size={18}/></button>
        </div>
        <div class="p-5 space-y-4">
          <div>
            <label class="block text-xs font-semibold text-ink-400 uppercase tracking-wider mb-1.5">Zone Name</label>
            <input type="text" bind:value={editForm.name} class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-amber-400/50 focus:outline-none" />
          </div>
          
          <div>
            <label class="block text-xs font-semibold text-ink-400 uppercase tracking-wider mb-1.5">Size / Grid Span</label>
            <select bind:value={editForm.cols} class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-amber-400/50 focus:outline-none appearance-none">
              {#each gridSpanOptions as opt}
                <option value={opt.value} class="bg-[#1a1b1e]">{opt.label}</option>
              {/each}
            </select>
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
