<script>
  import { MapPin, Coffee, Mic, Users, MonitorPlay, Pencil, Plus, Trash2, Save, X, CalendarClock, Clock, DoorOpen, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Music, Ticket, Sofa, Droplets, Utensils, Store, Info, Car } from '@lucide/svelte';
  import { createEventDispatcher, onMount, onDestroy } from 'svelte';
  import { slide } from 'svelte/transition';
  import PillScroller from '$lib/components/pill-scroller.svelte';
  
  const dispatch = createEventDispatcher();
  
  export let currentLocation = null; // Can be a zone id
  export let isOrganizer = false;
  export let initialZones = null;
  export let schedule = [];

  let timeInterval;
  let currentTime = new Date();

  onMount(() => {
    timeInterval = setInterval(() => {
      currentTime = new Date();
    }, 1000);
  });

  onDestroy(() => {
    if (timeInterval) clearInterval(timeInterval);
  });

  $: globalLiveSession = (schedule || []).find(item => {
    const start = new Date(item.start_time);
    const end = new Date(item.end_time);
    return currentTime >= start && currentTime <= end;
  });

  $: globalNextSession = (schedule || [])
    .filter(item => new Date(item.start_time) > currentTime)
    .sort((a, b) => new Date(a.start_time) - new Date(b.start_time))[0];

  // Helper function to find live or upcoming timeline session for a zone
  function getZoneSchedule(zoneName, _globalLive, _globalNext, _schedule) {
    if (!_schedule || !Array.isArray(_schedule) || _schedule.length === 0 || !zoneName) {
      return { live: null, upcoming: null, all: [] };
    }

    const nameLower = zoneName.toLowerCase().trim();
    const isMatch = (loc) => {
      if (!loc) return false;
      const locLower = loc.toLowerCase().trim();
      return locLower === nameLower || locLower.includes(nameLower) || nameLower.includes(locLower);
    };

    const zoneSessions = _schedule.filter(item => isMatch(item.location));
    
    const live = _globalLive && isMatch(_globalLive.location) ? _globalLive : null;
    const upcoming = _globalNext && isMatch(_globalNext.location) ? _globalNext : null;

    return {
      live,
      upcoming,
      all: zoneSessions
    };
  }

  function formatTime(isoStr) {
    if (!isoStr) return '';
    return new Date(isoStr).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }

  function formatTimelineTimeRange(start, end) {
    if (!start) return "";
    const startDate = new Date(start);
    if (isNaN(startDate.getTime())) return "";

    const startTimeStr = startDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    if (!end) return startTimeStr;

    const endDate = new Date(end);
    if (isNaN(endDate.getTime())) return startTimeStr;

    const endTimeStr = endDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

    const diffMins = Math.max(0, Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60)));
    let durStr = "";
    if (diffMins > 0) {
      if (diffMins < 60) {
        durStr = `${diffMins}m`;
      } else {
        const hrs = Math.floor(diffMins / 60);
        const remainingMins = diffMins % 60;
        durStr = remainingMins ? `${hrs}h ${remainingMins}m` : `${hrs}h`;
      }
    }

    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())}`;

    const startDateStr = `${startDate.getFullYear()}-${pad(startDate.getMonth() + 1)}-${pad(startDate.getDate())}`;
    const endDateStr = `${endDate.getFullYear()}-${pad(endDate.getMonth() + 1)}-${pad(endDate.getDate())}`;

    const formatDayLabel = (dt, dStr) => {
      if (dStr === todayStr) return "Today";
      if (dStr === tomorrowStr) return "Tomorrow";
      return dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    };

    const startLabel = formatDayLabel(startDate, startDateStr);
    const endLabel = formatDayLabel(endDate, endDateStr);

    const durSuffix = durStr ? ` (${durStr})` : "";

    if (startDateStr === endDateStr) {
      return `${startLabel}, ${startTimeStr} – ${endTimeStr}${durSuffix}`;
    }

    return `${startLabel}, ${startTimeStr} – ${endLabel}, ${endTimeStr}${durSuffix}`;
  }

  $: unaddedLocations = Array.from(new Set((schedule || []).map(s => s.location).filter(Boolean)))
    .filter(loc => !zones.some(z => z.name.toLowerCase().trim() === loc.toLowerCase().trim()));

  let gridCols = 6;
  let gridRows = 6;
  
  const emptyDoors = () => ({ top: [], bottom: [], left: [], right: [] });

  const defaultZones = [
    { id: 'main-stage', name: 'Main Stage', icon: 'Mic', x: 2, y: 1, w: 4, h: 2, color: 'from-blue-500/20 to-indigo-500/20 border-blue-400/30', door: { ...emptyDoors(), bottom: [50] } },
    { id: 'coffee', name: 'Coffee Station', icon: 'Coffee', x: 1, y: 1, w: 1, h: 2, color: 'from-amber-500/20 to-orange-500/20 border-amber-400/30', door: { ...emptyDoors(), right: [50] } },
    { id: 'lounge', name: 'Networking Lounge', icon: 'Users', x: 1, y: 3, w: 3, h: 2, color: 'from-emerald-500/20 to-teal-500/20 border-emerald-400/30', door: { ...emptyDoors(), top: [50] } },
    { id: 'booth-a', name: 'Sponsor Booth A', icon: 'MonitorPlay', x: 4, y: 3, w: 1, h: 2, color: 'from-purple-500/20 to-fuchsia-500/20 border-purple-400/30', door: { ...emptyDoors(), left: [50] } },
    { id: 'booth-b', name: 'Sponsor Booth B', icon: 'MonitorPlay', x: 5, y: 3, w: 2, h: 1, color: 'from-pink-500/20 to-rose-500/20 border-pink-400/30', door: { ...emptyDoors(), bottom: [50] } },
    { id: 'entrance', name: 'Entrance / Reg', icon: 'MapPin', x: 5, y: 4, w: 2, h: 2, color: 'from-gray-500/20 to-slate-500/20 border-gray-400/30', door: { ...emptyDoors(), top: [50] } },
  ];

  // Map string icon names to actual components
  const iconMap = {
    MapPin, Mic, Coffee, Users, MonitorPlay, Music, Ticket, Sofa, Droplets, Utensils, Store, Info, Car
  };

  // Gracefully migrate legacy cols data and upgrade door property
  let zones = (initialZones && Array.isArray(initialZones) && initialZones.length > 0) 
    ? initialZones.map(z => {
        let newZ = { ...z };
        if (newZ.cols) {
          const c = newZ.cols.match(/col-span-(\d+)/);
          const r = newZ.cols.match(/row-span-(\d+)/);
          newZ = { ...newZ, x: 1, y: 1, w: c ? parseInt(c[1], 10) : 1, h: r ? parseInt(r[1], 10) : 1, cols: undefined };
        }
        
        const d = emptyDoors();
        if (newZ.door) {
          if (typeof newZ.door === 'string') {
            d[newZ.door] = [50];
          } else {
             ['top', 'bottom', 'left', 'right'].forEach(side => {
               if (Array.isArray(newZ.door[side])) {
                 d[side] = [...newZ.door[side]];
               } else if (typeof newZ.door[side] === 'number') {
                 const count = newZ.door[side];
                 for (let i = 0; i < count; i++) {
                   d[side].push(((i + 1) / (count + 1)) * 100);
                 }
               }
             });
          }
        }
        newZ.door = d;
        return newZ;
      })
    : defaultZones;

  let isEditing = false;
  let editingZoneId = null; 
  let editForm = { name: '', icon: '', color: '', door: emptyDoors() };

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

  let backupState = null;

  function toggleEditMode() {
    if (!isEditing) {
      backupState = JSON.stringify({ zones, gridCols, gridRows });
    }
    isEditing = !isEditing;
  }

  function cancelEdit() {
    if (backupState) {
      const b = JSON.parse(backupState);
      zones = b.zones;
      gridCols = b.gridCols;
      gridRows = b.gridRows;
    }
    isEditing = false;
    editingZoneId = null;
    backupState = null;
  }

  function saveMap() {
    isEditing = false;
    backupState = null;
    dispatch('saveMap', zones);
  }

  function addZone() {
    const newId = 'zone-' + Date.now();
    zones = [...zones, {
      id: newId,
      name: 'New Zone',
      icon: 'MapPin',
      x: 1, y: 1, w: 1, h: 1,
      door: emptyDoors(),
      color: 'from-gray-500/20 to-slate-500/20 border-gray-400/30'
    }];
    openEditZone(newId);
  }

  function openEditZone(zoneId) {
    const zone = zones.find(z => z.id === zoneId);
    if (!zone) return;
    editingZoneId = zoneId;
    editForm = { 
      ...zone, 
      door: { 
        top: [...zone.door.top], 
        bottom: [...zone.door.bottom], 
        left: [...zone.door.left], 
        right: [...zone.door.right] 
      } 
    };
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

  function onDoorPointerDown(e, zone, side, index) {
    if (!isEditing) return;
    e.stopPropagation();
    
    const blockEl = e.currentTarget.closest('.relative.flex');
    if (!blockEl) return;
    
    dragState = {
      type: 'door',
      zoneId: zone.id,
      side,
      index,
      rect: blockEl.getBoundingClientRect()
    };
    
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  }

  function onPointerMove(e) {
    if (!dragState) return;
    
    if (dragState.type === 'door') {
      const { zoneId, side, index, rect } = dragState;
      let newOffset = 50;
      
      if (side === 'top' || side === 'bottom') {
        newOffset = ((e.clientX - rect.left) / rect.width) * 100;
      } else {
        newOffset = ((e.clientY - rect.top) / rect.height) * 100;
      }
      
      newOffset = Math.max(0, Math.min(100, newOffset));
      
      zones = zones.map(z => {
        if (z.id === zoneId) {
          const newDoors = { ...z.door };
          newDoors[side] = [...newDoors[side]];
          newDoors[side][index] = newOffset;
          return { ...z, door: newDoors };
        }
        return z;
      });
      return;
    }

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
            <button onclick={cancelEdit} class="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg text-sm font-semibold hover:bg-red-500/20 transition-colors">
              <X size={14} />
              Cancel
            </button>
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
  <div class="p-4 sm:p-6 bg-black/40 relative overflow-x-auto overflow-y-hidden scrollbar-hide">
    
    <div class="grid gap-3 md:gap-4 mx-auto relative z-10 min-w-max sm:min-w-0 p-2" 
         style="grid-template-columns: repeat({gridCols}, minmax(80px, 1fr)); grid-auto-rows: minmax(80px, 1fr);">
      
      {#if isEditing}
        <!-- Visual Grid Lines -->
        {#each Array(gridCols * gridRows) as _, i}
          <div class="border border-white/8 rounded-xl pointer-events-none bg-white/[0.02]" style="grid-column: {(i % gridCols) + 1}; grid-row: {Math.floor(i / gridCols) + 1}; min-height: 80px;"></div>
        {/each}
      {/if}

      {#each zones as zone (zone.id)}
        {@const zoneSched = getZoneSchedule(zone.name, globalLiveSession, globalNextSession, schedule)}
        {@const activeSession = zoneSched.live || zoneSched.upcoming}
        {@const doorIsActive = currentLocation === zone.id}
        {@const isCompact = zone.w === 1 && zone.h === 1}
        <div 
          style="grid-column: {zone.x} / span {zone.w}; grid-row: {zone.y} / span {zone.h};"
          class="relative flex flex-col items-center justify-center {isCompact ? 'p-1' : 'p-3 sm:p-4'} rounded-xl border-2 transition-all duration-200 text-center
                 {currentLocation === zone.id && !isEditing
                    ? 'border-amber-400 bg-amber-400/10 shadow-[0_0_20px_rgba(251,191,36,0.25)] z-20 ring-2 ring-amber-400/50' 
                    : isEditing 
                      ? `bg-gradient-to-br ${zone.color} border-white/30 hover:border-white/80 hover:bg-white/10 border-dashed`
                      : `bg-gradient-to-br ${zone.color} hover:border-white/40 hover:bg-white/5`}"
        >
          {#if !isEditing}
             <!-- Non-editing interactable button covering the block -->
             <button class="absolute inset-0 w-full h-full cursor-pointer z-10" onclick={() => setLocation(zone.id)} aria-label="Set location to {zone.name}"></button>
          {/if}

          {#if isCompact}
            <!-- Compact mode: icon + status dot only, tooltip shows full info -->
            <div
              class="relative flex items-center justify-center pointer-events-none"
              title="{zone.name}{activeSession && !isEditing ? (zoneSched.live ? ' · Live: ' + zoneSched.live.title : ' · Up Next: ' + zoneSched.upcoming.title) : ''}"
            >
              <svelte:component this={iconMap[zone.icon] || MapPin} size={18} class={currentLocation === zone.id && !isEditing ? 'text-amber-400' : 'text-white/60'} />
              {#if activeSession && !isEditing}
                <span class="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border border-black/30
                  {zoneSched.live ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}"
                ></span>
              {/if}
            </div>
            {#if currentLocation === zone.id && !isEditing}
              <span class="text-[9px] font-bold text-amber-300 mt-0.5 pointer-events-none truncate w-full text-center">{zone.name}</span>
            {/if}
          {:else}
            <!-- Full mode: icon + name + session badges -->
            <svelte:component this={iconMap[zone.icon] || MapPin} size={22} class={currentLocation === zone.id && !isEditing ? 'text-amber-400' : 'text-white/60 mb-1 pointer-events-none'} />
            <span class="text-xs font-bold {currentLocation === zone.id && !isEditing ? 'text-amber-300' : 'text-white/90 text-center pointer-events-none'}">
              {zone.name}
            </span>

            <!-- Session Badge displayed directly on the block without clicking -->
            {#if activeSession && !isEditing}
              <div class="mt-1.5 w-full pointer-events-none px-1 flex flex-col gap-1">
                {#if zoneSched.live}
                  <div class="bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 px-2 py-1 rounded-lg text-[10px] text-center shadow-sm">
                    <span class="font-extrabold uppercase text-[9px] text-emerald-400 tracking-wider flex items-center justify-center gap-1">
                      <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      LIVE NOW
                    </span>
                    <span class="font-bold block truncate text-white mt-0.5" title={zoneSched.live.title}>{zoneSched.live.title}</span>
                  </div>
                {/if}
                {#if zoneSched.upcoming && zoneSched.upcoming.id !== zoneSched.live?.id}
                  <div class="bg-amber-400/10 border border-amber-400/20 text-amber-200 px-2 py-1 rounded-lg text-[10px] text-center">
                    <span class="text-[9px] text-amber-400/80 font-bold block uppercase tracking-wider">UP NEXT</span>
                    <span class="font-semibold block truncate text-white/90 mt-0.5" title={zoneSched.upcoming.title}>{zoneSched.upcoming.title}</span>
                  </div>
                {/if}
              </div>
            {/if}
          {/if}
          
          {#if currentLocation === zone.id && !isEditing}
            <div class="absolute inset-0 rounded-xl border border-amber-400 animate-ping opacity-20 pointer-events-none"></div>
            <div class="absolute top-1.5 right-1.5 w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center shadow-lg border border-black pointer-events-none z-20">
              <MapPin size={11} class="text-black fill-black" />
            </div>
          {/if}

          <!-- Door direction indicators -->
          {#if zone.door}
            {#if zone.door.top.length > 0}
              {#each zone.door.top as offset, i}
                <div class="absolute top-0 z-30 {isEditing ? 'cursor-ew-resize hover:scale-125 transition-transform' : 'pointer-events-none'}" 
                     style="left: {offset}%; transform: translate(-50%, -50%);"
                     onpointerdown={isEditing ? (e) => onDoorPointerDown(e, zone, 'top', i) : null}>
                  <div class="flex flex-col items-center gap-0.5">
                    <ArrowUp size={10} class="{doorIsActive ? 'text-amber-400' : 'text-white/50'}" />
                    <div class="w-6 h-3 rounded-b-md border-x border-b {doorIsActive ? 'border-amber-400/60 bg-amber-400/15' : 'border-white/20 bg-white/8'}  flex items-center justify-center {isEditing ? 'bg-white/20' : ''}">
                      <DoorOpen size={9} class="{doorIsActive ? 'text-amber-300' : 'text-white/40'}" />
                    </div>
                  </div>
                </div>
              {/each}
            {/if}

            {#if zone.door.bottom.length > 0}
              {#each zone.door.bottom as offset, i}
                <div class="absolute bottom-0 z-30 {isEditing ? 'cursor-ew-resize hover:scale-125 transition-transform' : 'pointer-events-none'}" 
                     style="left: {offset}%; transform: translate(-50%, 50%);"
                     onpointerdown={isEditing ? (e) => onDoorPointerDown(e, zone, 'bottom', i) : null}>
                  <div class="flex flex-col items-center gap-0.5">
                    <div class="w-6 h-3 rounded-t-md border-x border-t {doorIsActive ? 'border-amber-400/60 bg-amber-400/15' : 'border-white/20 bg-white/8'} flex items-center justify-center {isEditing ? 'bg-white/20' : ''}">
                      <DoorOpen size={9} class="{doorIsActive ? 'text-amber-300' : 'text-white/40'}" />
                    </div>
                    <ArrowDown size={10} class="{doorIsActive ? 'text-amber-400' : 'text-white/50'}" />
                  </div>
                </div>
              {/each}
            {/if}

            {#if zone.door.left.length > 0}
              {#each zone.door.left as offset, i}
                <div class="absolute left-0 z-30 {isEditing ? 'cursor-ns-resize hover:scale-125 transition-transform' : 'pointer-events-none'}" 
                     style="top: {offset}%; transform: translate(-50%, -50%);"
                     onpointerdown={isEditing ? (e) => onDoorPointerDown(e, zone, 'left', i) : null}>
                  <div class="flex items-center gap-0.5">
                    <ArrowLeft size={10} class="{doorIsActive ? 'text-amber-400' : 'text-white/50'}" />
                    <div class="h-6 w-3 rounded-r-md border-y border-r {doorIsActive ? 'border-amber-400/60 bg-amber-400/15' : 'border-white/20 bg-white/8'} flex items-center justify-center {isEditing ? 'bg-white/20' : ''}">
                      <DoorOpen size={9} class="{doorIsActive ? 'text-amber-300' : 'text-white/40'}" />
                    </div>
                  </div>
                </div>
              {/each}
            {/if}

            {#if zone.door.right.length > 0}
              {#each zone.door.right as offset, i}
                <div class="absolute right-0 z-30 {isEditing ? 'cursor-ns-resize hover:scale-125 transition-transform' : 'pointer-events-none'}" 
                     style="top: {offset}%; transform: translate(50%, -50%);"
                     onpointerdown={isEditing ? (e) => onDoorPointerDown(e, zone, 'right', i) : null}>
                  <div class="flex items-center gap-0.5">
                    <div class="h-6 w-3 rounded-l-md border-y border-l {doorIsActive ? 'border-amber-400/60 bg-amber-400/15' : 'border-white/20 bg-white/8'} flex items-center justify-center {isEditing ? 'bg-white/20' : ''}">
                      <DoorOpen size={9} class="{doorIsActive ? 'text-amber-300' : 'text-white/40'}" />
                    </div>
                    <ArrowRight size={10} class="{doorIsActive ? 'text-amber-400' : 'text-white/50'}" />
                  </div>
                </div>
              {/each}
            {/if}
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

  <!-- Selected Zone Sessions Footer Panel -->
  {#if currentLocation && !isEditing}
    {@const activeZoneObj = zones.find(z => z.id === currentLocation)}
    {@const activeZoneSched = activeZoneObj ? getZoneSchedule(activeZoneObj.name, globalLiveSession, globalNextSession, schedule) : null}
    {#if activeZoneSched && activeZoneSched.all.length > 0}
      <div class="p-4 sm:p-5 border-t border-white/10 bg-black/40 space-y-3" transition:slide>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <CalendarClock size={16} class="text-amber-400" />
            <h4 class="text-xs font-bold uppercase tracking-wider text-white">Schedule at {activeZoneObj.name}</h4>
          </div>
          <span class="text-[11px] text-ink-400 font-mono">{activeZoneSched.all.length} session{activeZoneSched.all.length === 1 ? '' : 's'}</span>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {#each activeZoneSched.all as session}
            <div class="glass rounded-xl border border-white/8 p-3 space-y-1 text-left">
              <div class="flex items-center justify-between gap-2">
                <span class="text-[10px] font-mono font-bold text-amber-300 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
                  {formatTimelineTimeRange(session.start_time, session.end_time)}
                </span>
                <span class="text-[9px] uppercase font-semibold text-ink-400">{session.category}</span>
              </div>
              <p class="text-xs font-bold text-white leading-snug">{session.title}</p>
              {#if session.speaker_name}
                <p class="text-[11px] text-indigo-300 font-medium">🎤 {session.speaker_name} {#if session.speaker_role}<span class="text-ink-500">({session.speaker_role})</span>{/if}</p>
              {/if}
            </div>
          {/each}
        </div>
      </div>
    {/if}
  {/if}

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
            <div class="block text-xs font-semibold text-ink-400 uppercase tracking-wider mb-1.5">Zone Name</div>
            <input type="text" bind:value={editForm.name} class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-amber-400/50 focus:outline-none" />
            
            <!-- Timeline locations not yet added to Venue Map -->
            {#if unaddedLocations.length > 0}
              <div class="pt-2">
                <PillScroller label="Unadded Timeline Locations:">
                  {#each unaddedLocations as loc}
                    <button
                      type="button"
                      onclick={() => (editForm.name = loc)}
                      class="text-[10px] px-2 py-0.5 rounded-full border transition-all bg-amber-400/10 border-amber-400/30 text-amber-300 hover:bg-amber-400/20 whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      + {loc}
                    </button>
                  {/each}
                </PillScroller>
              </div>
            {/if}
          </div>

          <div>
            <div class="block text-xs font-semibold text-ink-400 uppercase tracking-wider mb-1.5">Icon</div>
            <div class="flex flex-wrap gap-2">
              {#each Object.keys(iconMap) as iconName}
                <button onclick={() => editForm.icon = iconName} class="p-2 rounded-lg border transition-colors {editForm.icon === iconName ? 'bg-amber-400/20 border-amber-400/50 text-amber-400' : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:text-white'}">
                  <svelte:component this={iconMap[iconName]} size={20} />
                </button>
              {/each}
            </div>
          </div>

          <div>
            <div class="block text-xs font-semibold text-ink-400 uppercase tracking-wider mb-1.5">Color Theme</div>
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

          <!-- Door Direction -->
          <div>
            <div class="block text-xs font-semibold text-ink-400 uppercase tracking-wider mb-1.5">Doors</div>
            <div class="grid grid-cols-3 gap-1.5">
              <!-- Top row -->
              <div></div>
              <div class="flex items-center justify-between px-2 py-1 bg-white/5 border border-white/10 rounded-lg">
                <button onclick={() => { editForm.door.top.pop(); editForm.door.top = editForm.door.top; }} class="text-white/50 hover:text-white">-</button>
                <div class="flex items-center gap-1.5 text-xs font-semibold {editForm.door.top.length > 0 ? 'text-amber-300' : 'text-white/50'}">
                  <ArrowUp size={12} /> {editForm.door.top.length}
                </div>
                <button onclick={() => editForm.door.top = [...editForm.door.top, 50]} class="text-white/50 hover:text-white">+</button>
              </div>
              <div></div>
              
              <!-- Middle row -->
              <div class="flex items-center justify-between px-2 py-1 bg-white/5 border border-white/10 rounded-lg">
                <button onclick={() => { editForm.door.left.pop(); editForm.door.left = editForm.door.left; }} class="text-white/50 hover:text-white">-</button>
                <div class="flex items-center gap-1.5 text-xs font-semibold {editForm.door.left.length > 0 ? 'text-amber-300' : 'text-white/50'}">
                  <ArrowLeft size={12} /> {editForm.door.left.length}
                </div>
                <button onclick={() => editForm.door.left = [...editForm.door.left, 50]} class="text-white/50 hover:text-white">+</button>
              </div>
              <div class="flex items-center justify-center py-1 bg-white/5 border border-white/10 rounded-lg">
                 <DoorOpen size={16} class="text-white/30" />
              </div>
              <div class="flex items-center justify-between px-2 py-1 bg-white/5 border border-white/10 rounded-lg">
                <button onclick={() => { editForm.door.right.pop(); editForm.door.right = editForm.door.right; }} class="text-white/50 hover:text-white">-</button>
                <div class="flex items-center gap-1.5 text-xs font-semibold {editForm.door.right.length > 0 ? 'text-amber-300' : 'text-white/50'}">
                  {editForm.door.right.length} <ArrowRight size={12} />
                </div>
                <button onclick={() => editForm.door.right = [...editForm.door.right, 50]} class="text-white/50 hover:text-white">+</button>
              </div>
              
              <!-- Bottom row -->
              <div></div>
              <div class="flex items-center justify-between px-2 py-1 bg-white/5 border border-white/10 rounded-lg">
                <button onclick={() => { editForm.door.bottom.pop(); editForm.door.bottom = editForm.door.bottom; }} class="text-white/50 hover:text-white">-</button>
                <div class="flex items-center gap-1.5 text-xs font-semibold {editForm.door.bottom.length > 0 ? 'text-amber-300' : 'text-white/50'}">
                  <ArrowDown size={12} /> {editForm.door.bottom.length}
                </div>
                <button onclick={() => editForm.door.bottom = [...editForm.door.bottom, 50]} class="text-white/50 hover:text-white">+</button>
              </div>
              <div></div>
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
