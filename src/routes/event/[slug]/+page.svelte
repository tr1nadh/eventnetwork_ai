<script>
  import { slide, fade } from "svelte/transition";
  import { goto } from "$app/navigation";
  import {
    ArrowLeft,
    ArrowRight,
    BarChart3,
    LoaderCircle,
    LineChart,
    LogIn,
    MapPin,
    Network,
    PieChart,
    Plus,
    Sparkles,
    TrendingUp,
    Users,
    CheckCircle2,
    CheckCheck,
    Crown,
    Globe,
    CalendarClock,
    Lock,
    RefreshCcw,
    Brain,
    UserCircle2,
    Eye,
    Target,
    RefreshCw,
    Info,
    X,
    Ghost,
    MessageCircle,
    MoreVertical,
    Pencil,
    Trash2,
    Search,
    UserPlus,
    UserCheck,
    Clock,
    MapPinOff,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    Settings,
    Save,
    AlertTriangle,
    Copy,
    Check,
    Calendar,
    Megaphone,
    Pin,
    PinOff,
    Filter,
    Bell,
  } from "@lucide/svelte";
  import Sidebar from "$lib/components/sidebar.svelte";
  import PageShell from "$lib/components/page-shell.svelte";
  import ConnectionChatModal from "$lib/components/connection-chat-modal.svelte";
  import AiMeetingPrepModal from "$lib/components/ai-meeting-prep-modal.svelte";
  import AmdAiLoading from "$lib/components/amd-ai-loading.svelte";
  import ConnectionToast from "$lib/components/connection-toast.svelte";
  import VenueMap from "$lib/components/venue-map.svelte";
  import AICreditsExhausted from "$lib/components/AICreditsExhausted.svelte";
  import PillScroller from "$lib/components/pill-scroller.svelte";
  import { Button } from "$lib/components/ui/button/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import { Label } from "$lib/components/ui/label/index.js";
  import { toast } from "$lib/components/ui/sonner/index.js";
  import * as Tabs from "$lib/components/ui/tabs/index.js";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import {
    activeTab,
    matchesStore,
    connectionsStore,
    aiMeetingPrepStore,
    clearAllEventStores,
  } from "$lib/stores/eventStore";
  import { clearAllChatStores } from "$lib/stores/chatStore";
  import { aiCreditsStore } from "$lib/stores/ai-credits";

  // Embedding helper – calls server-side /api/embeddings to keep the API key secure
  async function generateEmbedding(text) {
    const res = await fetch("/api/embeddings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ text }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error ?? "Embedding generation failed");
    }
    const { embedding } = await res.json();
    return embedding;
  }
  import { createSupabaseBrowserClient } from "$lib/supabase/client";
  import { onMount, onDestroy } from "svelte";

  const supabase = createSupabaseBrowserClient();

  export let data;
  let realtimeChannel;

  // Announcements State & Reactive Handlers
  let announcementsList = data.announcements ?? [];
  let announcementSearchQuery = "";
  let pinnedSlideIndex = 0;
  let pinnedSwipeStartX = 0;

  let showAnnouncementModal = false;
  let editingAnnouncement = null;
  let announcementTitle = "";
  let announcementContent = "";
  let announcementPriority = "normal";
  let announcementIsPinned = false;
  let savingAnnouncement = false;
  let deletingAnnouncementId = null;

  $: announcementsList = data.announcements ?? [];

  $: pinnedAnnouncements = announcementsList.filter(a => a.is_pinned).slice(0, 3);

  $: filteredAnnouncements = announcementsList.filter(item => {
    if (!announcementSearchQuery.trim()) return true;
    const q = announcementSearchQuery.toLowerCase();
    return item.title.toLowerCase().includes(q) || item.content.toLowerCase().includes(q);
  });

  function getPriorityBorderClass(priority) {
    if (priority === 'urgent') {
      return 'border-rose-500/60 bg-rose-500/5';
    }
    if (priority === 'high') {
      return 'border-amber-500/60 bg-amber-500/5';
    }
    if (priority === 'low') {
      return 'border-slate-500/30 bg-slate-500/5';
    }
    return 'border-indigo-500/40 bg-indigo-500/5';
  }

  function openNewAnnouncementModal() {
    editingAnnouncement = null;
    announcementTitle = "";
    announcementContent = "";
    announcementPriority = "normal";
    announcementIsPinned = false;
    showAnnouncementModal = true;
  }

  function openEditAnnouncementModal(item) {
    editingAnnouncement = item;
    announcementTitle = item.title;
    announcementContent = item.content;
    announcementPriority = item.priority ?? "normal";
    announcementIsPinned = item.is_pinned ?? false;
    showAnnouncementModal = true;
  }

  async function handleSaveAnnouncement() {
    if (!announcementTitle.trim() || !announcementContent.trim()) {
      toast.error("Please provide both title and content.");
      return;
    }

    if (announcementIsPinned) {
      const currentlyPinned = announcementsList.filter(a => a.is_pinned && a.id !== editingAnnouncement?.id);
      if (currentlyPinned.length >= 3) {
        toast.error("Maximum 3 announcements can be pinned at a time.");
        return;
      }
    }

    savingAnnouncement = true;
    try {
      const isEditing = Boolean(editingAnnouncement);
      const url = `/api/events/${currentEvent.id}/announcements`;
      const method = isEditing ? 'PUT' : 'POST';
      const body = {
        title: announcementTitle.trim(),
        content: announcementContent.trim(),
        priority: announcementPriority,
        is_pinned: announcementIsPinned
      };
      if (isEditing) {
        body.id = editingAnnouncement.id;
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body)
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(json?.message ?? json?.error ?? 'Failed to save announcement.');
        return;
      }

      if (isEditing) {
        announcementsList = announcementsList.map(a => a.id === json.announcement.id ? json.announcement : a);
        toast.success("Announcement updated!");
      } else {
        announcementsList = [json.announcement, ...announcementsList];
        toast.success("Announcement posted!");
      }

      showAnnouncementModal = false;
    } catch (err) {
      toast.error(err.message ?? "An error occurred.");
    } finally {
      savingAnnouncement = false;
    }
  }

  async function togglePinAnnouncement(item) {
    try {
      const newPinned = !item.is_pinned;

      if (newPinned) {
        const currentlyPinned = announcementsList.filter(a => a.is_pinned);
        if (currentlyPinned.length >= 3) {
          toast.error("Maximum 3 announcements can be pinned at a time.");
          return;
        }
      }

      const res = await fetch(`/api/events/${currentEvent.id}/announcements`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          id: item.id,
          title: item.title,
          content: item.content,
          priority: item.priority,
          is_pinned: newPinned
        })
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error("Failed to update pin status");
        return;
      }

      announcementsList = announcementsList.map(a => a.id === item.id ? json.announcement : a);
      toast.success(newPinned ? "Announcement pinned to top" : "Announcement unpinned");
    } catch (e) {
      toast.error("An error occurred");
    }
  }

  async function handleDeleteAnnouncement(id) {
    deletingAnnouncementId = id;
    try {
      const res = await fetch(`/api/events/${currentEvent.id}/announcements?id=${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        toast.error(json?.message ?? "Failed to delete announcement");
        return;
      }

      announcementsList = announcementsList.filter(a => a.id !== id);
      toast.success("Announcement deleted");
    } catch (e) {
      toast.error("An error occurred");
    } finally {
      deletingAnnouncementId = null;
    }
  }

  let timeInterval;
  let currentTime = new Date();

  onMount(() => {
    // Hide page loading indicator once mounted
    pageLoading = false;
    
    timeInterval = setInterval(() => {
      currentTime = new Date();
    }, 1000);

    // Always clear the connections store on mount so we don't show stale data from another event
    connectionsStore.set([]);


    if (!data.user?.id) return;

    if (data.isParticipant) {
      fetchAllConnections();
      fetchAttendees();

      // Setup a single channel for connections realtime updates
      realtimeChannel = supabase
        .channel(`connections-changes-${Date.now()}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "connections",
            filter: `event_id=eq.${data.event.id}`,
          },
          async (payload) => {
            const { eventType, new: newRecord, old: oldRecord } = payload;

            if (eventType === "INSERT") {
              if (
                newRecord.receiver_user_id === data.user.id &&
                newRecord.status === "pending"
              ) {
                const { data: profile } = await supabase
                  .from("network_profiles")
                  .select("display_name")
                  .eq("user_id", newRecord.sender_user_id)
                  .eq("event_id", data.event.id)
                  .single();
                const senderName = profile?.display_name || "Someone";

                connectionsStore.update((conns) => {
                  if (conns.find((c) => c.id === newRecord.id)) return conns;
                  return [
                    { ...newRecord, profile: { display_name: senderName } },
                    ...conns,
                  ];
                });

                toast.custom(ConnectionToast, {
                  componentProps: {
                    title: "New Connection Request",
                    message: `${senderName} wants to connect with you.`,
                    type: "request",
                  },
                });

                if (
                  typeof window !== "undefined" &&
                  "Notification" in window &&
                  Notification.permission === "granted"
                ) {
                  const notification = new Notification(
                    "New Connection Request",
                    { body: `${senderName} wants to connect with you.` },
                  );
                  notification.onclick = () => {
                    window.focus();
                    networkFilter = "received";
                    activeTab.set("network");
                  };
                }
              } else if (newRecord.sender_user_id === data.user.id) {
                // Fetch all connections for inserts we initiated so we get the profile join cleanly
                fetchAllConnections();
              }
            } else if (eventType === "UPDATE") {
              if (
                newRecord.sender_user_id !== data.user.id &&
                newRecord.receiver_user_id !== data.user.id
              )
                return;

              connectionsStore.update((conns) => {
                const idx = conns.findIndex((c) => c.id === newRecord.id);
                if (idx >= 0) {
                  conns[idx] = { ...conns[idx], ...newRecord };
                }
                return conns;
              });

              if (
                newRecord.sender_user_id === data.user.id &&
                oldRecord.status === "pending" &&
                newRecord.status === "accepted" &&
                !newRecord.met_at
              ) {
                const { data: profile } = await supabase
                  .from("network_profiles")
                  .select("display_name")
                  .eq("user_id", newRecord.receiver_user_id)
                  .eq("event_id", data.event.id)
                  .single();
                const receiverName = profile?.display_name || "Your connection";

                toast.custom(ConnectionToast, {
                  componentProps: {
                    title: "Connection Accepted",
                    message: `${receiverName} accepted your connection request.`,
                    type: "accepted",
                  },
                });

                if (
                  typeof window !== "undefined" &&
                  "Notification" in window &&
                  Notification.permission === "granted"
                ) {
                  const notification = new Notification("Connection Accepted", {
                    body: `${receiverName} accepted your connection request.`,
                  });
                  notification.onclick = () => {
                    window.focus();
                    networkFilter = "connected";
                    activeTab.set("network");
                  };
                }
              } else if (
                newRecord.sender_user_id === data.user.id &&
                oldRecord.status === "pending" &&
                newRecord.status === "rejected"
              ) {
                const { data: profile } = await supabase
                  .from("network_profiles")
                  .select("display_name")
                  .eq("user_id", newRecord.receiver_user_id)
                  .eq("event_id", data.event.id)
                  .single();
                const receiverName = profile?.display_name || "Your connection";

                toast.custom(ConnectionToast, {
                  componentProps: {
                    title: "Connection Request Declined",
                    message: `${receiverName} declined your connection request.`,
                    type: "rejected",
                  },
                });
              } else if (
                oldRecord.met_at == null &&
                newRecord.met_at != null &&
                newRecord.status === "accepted"
              ) {
                const otherUserId =
                  newRecord.sender_user_id === data.user.id
                    ? newRecord.receiver_user_id
                    : newRecord.sender_user_id;
                const { data: profile } = await supabase
                  .from("network_profiles")
                  .select("display_name")
                  .eq("user_id", otherUserId)
                  .eq("event_id", data.event.id)
                  .single();
                const name = profile?.display_name || "Your connection";

                toast.custom(ConnectionToast, {
                  componentProps: {
                    title: "Meeting Confirmed",
                    message: `You and ${name} have officially met.`,
                    type: "met",
                  },
                });
              }
            } else if (eventType === "DELETE") {
              if (
                oldRecord.sender_user_id === data.user.id ||
                oldRecord.receiver_user_id === data.user.id
              ) {
                fetchAllConnections();
              }
            }
          },
        )
        .subscribe();
    }
  });

  onDestroy(() => {
    if (realtimeChannel) {
      supabase.removeChannel(realtimeChannel);
    }
    if (timeInterval) clearInterval(timeInterval);
  });

  let signingOut = false;
  let joining = false;
  let savingProfile = false;
  let pageLoading = true; // Start true so skeleton UI shows until mounted
  let refreshingMatches = false;
  let aiProfileText = "";
  let aiGenerating = false;
  let aiGenerationError = "";

  function formatEventDateRange(start, end) {
    if (!start) return "";
    const startDate = new Date(start);
    const startDateStr = startDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const startTimeStr = startDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    if (!end) return `${startDateStr}, ${startTimeStr}`;
    const endDate = new Date(end);
    const endDateStr = endDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const endTimeStr = endDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    const sameDay = startDate.getFullYear() === endDate.getFullYear() &&
                    startDate.getMonth() === endDate.getMonth() &&
                    startDate.getDate() === endDate.getDate();
    if (sameDay) {
      return `${startDateStr} • ${startTimeStr} - ${endTimeStr}`;
    }
    return `${startDateStr}, ${startTimeStr} – ${endDateStr}, ${endTimeStr}`;
  }

  function formatDatetimeLocal(date) {
    if (!date || isNaN(date.getTime())) return "";
    const pad = (n) => String(n).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  let editProfileOpen = false;

  let currentEvent = data.event;

  // Edit & Delete state
  let editEventModalOpen = false;
  let deleteEventModalOpen = false;
  let editingEvent = false;
  let editEventError = "";
  let editEventName = "";
  let editEventSlug = "";
  let editEventDescription = "";
  let editEventStartTime = "";
  let editEventEndTime = "";
  let editEventFormat = "offline";
  let editEventLocation = "";
  let editEventGoogleMapUrl = "";
  let editEventApprovalRequired = false;
  let editEventVenueEnabled = true;

  let togglingVenueMap = false;

  async function toggleVenueEnabled() {
    if (!data.isOrganizer || togglingVenueMap) return;
    togglingVenueMap = true;
    const newStatus = currentEvent.is_venue_enabled === false ? true : false;
    try {
      const res = await fetch(`/api/events/${currentEvent.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: currentEvent.name,
          slug: currentEvent.slug,
          is_venue_enabled: newStatus,
        }),
      });
      const resData = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          resData.message || resData.error || "Failed to update venue map status"
        );
      }
      currentEvent = { ...currentEvent, is_venue_enabled: newStatus };
      toast.success(
        newStatus ? "Venue map enabled for attendees" : "Venue map disabled for attendees"
      );
    } catch (e) {
      toast.error(e.message || "Failed to update venue status");
    } finally {
      togglingVenueMap = false;
    }
  }

  let deletingEvent = false;
  let deleteEventError = "";

  // --- Event Timeline State & Handlers ---
  let timelineItems = data.timeline || [];
  $: if (data.timeline) {
    timelineItems = data.timeline;
  }

  // --- All concurrently live sessions (can be more than one) ---
  $: liveSessions = (() => {
    currentTime; // Bind reactivity
    if (!timelineItems?.length) return [];
    const now = Date.now();
    return timelineItems.filter(it => {
      if (!it.start_time || !it.end_time) return false;
      return now >= new Date(it.start_time).getTime() && now < new Date(it.end_time).getTime();
    });
  })();

  // Keep liveSession as a singular reference (first live session) for backwards compat
  $: liveSession = liveSessions[0] ?? null;

  $: isEndingSoon = (() => {
    currentTime;
    if (!liveSession?.end_time) return false;
    const msLeft = new Date(liveSession.end_time).getTime() - Date.now();
    return msLeft > 0 && msLeft <= 2 * 60 * 1000; // within 2 minutes
  })();

  $: nextSession = (() => {
    currentTime;
    const now = Date.now();
    return timelineItems
      ?.filter(it => it.start_time && new Date(it.start_time).getTime() > now)
      .sort((a, b) => new Date(a.start_time) - new Date(b.start_time))[0] ?? null;
  })();

  // --- Live Sessions Carousel Slider State ---
  let liveSlideIndex = 0;
  let liveSlideTimer = null;
  let liveSwipeStartX = 0; // Touch swipe tracking

  $: {
    // Reset slide index if sessions change
    if (liveSlideIndex >= liveSessions.length) liveSlideIndex = 0;
  }

  $: if (liveSessions.length > 1) {
    // Auto-advance every 4 seconds
    if (liveSlideTimer) clearInterval(liveSlideTimer);
    liveSlideTimer = setInterval(() => {
      liveSlideIndex = (liveSlideIndex + 1) % liveSessions.length;
    }, 4000);
  } else {
    if (liveSlideTimer) { clearInterval(liveSlideTimer); liveSlideTimer = null; }
    liveSlideIndex = 0;
  }

  let timelineModalOpen = false;
  let editingTimelineItem = null;
  let timelineTitle = "";
  let timelineDescription = "";
  let timelineLocation = "";
  let timelineCategory = "general";
  let timelineStartDate = "";
  let timelineStartTimeVal = "09:00";
  let timelineEndDate = "";
  let timelineEndTimeVal = "10:00";
  let timelineSpeakerName = "";
  let timelineSpeakerRole = "";
  let timelineSpeakerAvatarUrl = "";
  let savingTimelineItem = false;
  let timelineError = "";
  let deletingTimelineItemId = null;

  function getNextFiveMinuteSlot(baseDate = new Date()) {
    const d = new Date(baseDate);
    const ms = 1000 * 60 * 5;
    const rounded = new Date(Math.ceil(d.getTime() / ms) * ms);
    if (rounded.getTime() <= d.getTime()) {
      rounded.setMinutes(rounded.getMinutes() + 5);
    }
    return rounded;
  }

  function openCreateTimelineModal() {
    editingTimelineItem = null;
    timelineTitle = "";
    timelineDescription = "";
    timelineLocation = "";
    timelineCategory = "general";
    
    const now = new Date();
    const nextSlot = getNextFiveMinuteSlot(now);

    timelineStartDate = getFormattedDateStr(nextSlot);
    const h = String(nextSlot.getHours()).padStart(2, '0');
    const m = String(nextSlot.getMinutes()).padStart(2, '0');
    timelineStartTimeVal = `${h}:${m}`;
    
    const defaultEnd = new Date(nextSlot.getTime() + 30 * 60 * 1000);
    timelineEndDate = getFormattedDateStr(defaultEnd);
    const endH = String(defaultEnd.getHours()).padStart(2, '0');
    const endM = String(defaultEnd.getMinutes()).padStart(2, '0');
    timelineEndTimeVal = `${endH}:${endM}`;
    
    timelineSpeakerName = "";
    timelineSpeakerRole = "";
    timelineSpeakerAvatarUrl = "";
    timelineError = "";
    timelineModalOpen = true;
  }

  function openEditTimelineModal(item) {
    editingTimelineItem = item;
    timelineTitle = item.title || "";
    timelineDescription = item.description || "";
    timelineLocation = item.location || "";
    timelineCategory = item.category || "general";
    
    if (item.start_time) {
      const dt = new Date(item.start_time);
      timelineStartDate = getFormattedDateStr(dt);
      timelineStartTimeVal = `${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;
    }
    if (item.end_time) {
      const dt = new Date(item.end_time);
      timelineEndDate = getFormattedDateStr(dt);
      timelineEndTimeVal = `${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;
    }
    
    timelineSpeakerName = item.speaker_name || "";
    timelineSpeakerRole = item.speaker_role || "";
    timelineSpeakerAvatarUrl = item.speaker_avatar_url || "";
    timelineError = "";
    timelineModalOpen = true;
  }

  const durationShortcuts = [
    { label: '5m', minutes: 5 },
    { label: '10m', minutes: 10 },
    { label: '15m', minutes: 15 },
    { label: '30m', minutes: 30 },
    { label: '45m', minutes: 45 },
    { label: '1h', minutes: 60 },
    { label: '1.5h', minutes: 90 },
    { label: '2h', minutes: 120 },
    { label: '3h', minutes: 180 }
  ];

  function applyDurationShortcut(minutes) {
    if (!timelineStartDate || !timelineStartTimeVal) return;
    const startDt = new Date(`${timelineStartDate}T${timelineStartTimeVal}`);
    if (isNaN(startDt.getTime())) return;

    const endDt = new Date(startDt.getTime() + minutes * 60 * 1000);
    timelineEndDate = getFormattedDateStr(endDt);
    const endH = String(endDt.getHours()).padStart(2, '0');
    const endM = String(endDt.getMinutes()).padStart(2, '0');
    timelineEndTimeVal = `${endH}:${endM}`;
  }

  function setTimelineStartToNow() {
    const now = new Date();
    const nextSlot = getNextFiveMinuteSlot(now);
    timelineStartDate = getFormattedDateStr(nextSlot);
    const h = String(nextSlot.getHours()).padStart(2, '0');
    const m = String(nextSlot.getMinutes()).padStart(2, '0');
    timelineStartTimeVal = `${h}:${m}`;
    applyDurationShortcut(30);
  }

  $: minAllowedStartTime = (() => {
    const now = new Date();
    const today = getFormattedDateStr(now);
    if (timelineStartDate === today) {
      const nextSlot = getNextFiveMinuteSlot(now);
      const h = String(nextSlot.getHours()).padStart(2, '0');
      const m = String(nextSlot.getMinutes()).padStart(2, '0');
      return `${h}:${m}`;
    }
    return undefined;
  })();

  $: minAllowedEndTime = (() => {
    if (timelineStartDate && timelineEndDate && timelineStartDate === timelineEndDate && timelineStartTimeVal) {
      return timelineStartTimeVal;
    }
    return undefined;
  })();

  $: calculatedDurationText = (() => {
    if (!timelineStartDate || !timelineStartTimeVal || !timelineEndDate || !timelineEndTimeVal) return null;
    const startDt = new Date(`${timelineStartDate}T${timelineStartTimeVal}`);
    const endDt = new Date(`${timelineEndDate}T${timelineEndTimeVal}`);
    if (isNaN(startDt.getTime()) || isNaN(endDt.getTime())) return null;
    const diffMins = Math.round((endDt.getTime() - startDt.getTime()) / (1000 * 60));
    if (diffMins <= 0) return "Invalid duration";
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    if (hours === 0) return `${mins} mins`;
    if (mins === 0) return `${hours} hr${hours > 1 ? 's' : ''}`;
    return `${hours}h ${mins}m`;
  })();

  $: isStartTimeInPast = (() => {
    if (!timelineStartDate || !timelineStartTimeVal) return false;
    const startDt = new Date(`${timelineStartDate}T${timelineStartTimeVal}`);
    if (isNaN(startDt.getTime())) return false;
    const now = new Date();
    return startDt < new Date(now.getTime() - 60 * 1000);
  })();

  $: isEndTimeBeforeStart = (() => {
    if (!timelineStartDate || !timelineStartTimeVal || !timelineEndDate || !timelineEndTimeVal) return false;
    const startDt = new Date(`${timelineStartDate}T${timelineStartTimeVal}`);
    const endDt = new Date(`${timelineEndDate}T${timelineEndTimeVal}`);
    if (isNaN(startDt.getTime()) || isNaN(endDt.getTime())) return false;
    return endDt <= startDt;
  })();

  async function saveTimelineItem() {
    timelineError = "";
    if (!timelineTitle.trim()) {
      timelineError = "Title is required.";
      return;
    }
    if (!timelineStartDate || !timelineStartTimeVal || !timelineEndDate || !timelineEndTimeVal) {
      timelineError = "Start and End times are required.";
      return;
    }

    const startDt = new Date(`${timelineStartDate}T${timelineStartTimeVal}`);
    const endDt = new Date(`${timelineEndDate}T${timelineEndTimeVal}`);
    const now = new Date();

    if (isNaN(startDt.getTime()) || isNaN(endDt.getTime())) {
      timelineError = "Invalid start or end date/time format.";
      return;
    }

    // Strict validation: block past start times
    if (startDt < new Date(now.getTime() - 60 * 1000)) {
      timelineError = "Session start time cannot be in the past.";
      return;
    }

    if (endDt <= startDt) {
      timelineError = "Session end time must be after start time.";
      return;
    }

    const startISO = startDt.toISOString();
    const endISO = endDt.toISOString();

    savingTimelineItem = true;
    try {
      const isEdit = Boolean(editingTimelineItem);
      const url = `/api/events/${currentEvent.id}/timeline`;
      const method = isEdit ? 'PUT' : 'POST';
      const bodyPayload = {
        title: timelineTitle,
        description: timelineDescription,
        location: timelineLocation,
        category: timelineCategory,
        start_time: startISO,
        end_time: endISO,
        speaker_name: timelineSpeakerName,
        speaker_role: timelineSpeakerRole,
        speaker_avatar_url: timelineSpeakerAvatarUrl
      };

      if (isEdit) {
        bodyPayload.id = editingTimelineItem.id;
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload)
      });

      const resData = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(resData.message || resData.error || 'Failed to save timeline item.');
      }

      if (isEdit) {
        timelineItems = timelineItems.map(it => it.id === resData.item.id ? resData.item : it);
        toast.success("Schedule session updated!");
      } else {
        timelineItems = [...timelineItems, resData.item];
        toast.success("Schedule session added!");
      }

      timelineItems.sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
      timelineModalOpen = false;
    } catch (err) {
      timelineError = err.message;
    } finally {
      savingTimelineItem = false;
    }
  }

  async function deleteTimelineItem(id) {
    if (deletingTimelineItemId) return;
    deletingTimelineItemId = id;
    try {
      const res = await fetch(`/api/events/${currentEvent.id}/timeline?id=${id}`, {
        method: 'DELETE'
      });
      if (!res.ok) {
        const resData = await res.json().catch(() => ({}));
        throw new Error(resData.message || 'Failed to delete timeline item.');
      }
      timelineItems = timelineItems.filter(it => it.id !== id);
      toast.success("Session removed from timeline.");
    } catch (err) {
      toast.error(err.message);
    } finally {
      deletingTimelineItemId = null;
    }
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
    const todayStr = getFormattedDateStr(now);
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = getFormattedDateStr(tomorrow);

    const startDateStr = getFormattedDateStr(startDate);
    const endDateStr = getFormattedDateStr(endDate);

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

    // Spans across different days (e.g. starts Today, ends Tomorrow)
    return `${startLabel}, ${startTimeStr} – ${endLabel}, ${endTimeStr}${durSuffix}`;
  }

  const categorySuggestions = [
    'Keynote',
    'Workshop',
    'Panel',
    'Networking',
    'Break',
    'Q&A',
    'Hackathon',
    'Demo',
    'General'
  ];

  function getCategoryColor(cat) {
    const cleaned = (cat || '').toLowerCase().trim();
    switch (cleaned) {
      case 'keynote': return { bg: 'bg-amber-400/15', text: 'text-amber-300', border: 'border-amber-400/30', dot: 'bg-amber-400' };
      case 'workshop': return { bg: 'bg-cyan-400/15', text: 'text-cyan-300', border: 'border-cyan-400/30', dot: 'bg-cyan-400' };
      case 'panel': case 'panel discussion': return { bg: 'bg-indigo-400/15', text: 'text-indigo-300', border: 'border-indigo-400/30', dot: 'bg-indigo-400' };
      case 'networking': return { bg: 'bg-emerald-400/15', text: 'text-emerald-300', border: 'border-emerald-400/30', dot: 'bg-emerald-400' };
      case 'break': case 'refreshments': return { bg: 'bg-slate-400/15', text: 'text-slate-300', border: 'border-slate-400/30', dot: 'bg-slate-400' };
      case 'hackathon': return { bg: 'bg-rose-400/15', text: 'text-rose-300', border: 'border-rose-400/30', dot: 'bg-rose-400' };
      case 'q&a': case 'qa': return { bg: 'bg-teal-400/15', text: 'text-teal-300', border: 'border-teal-400/30', dot: 'bg-teal-400' };
      case 'demo': case 'demo day': return { bg: 'bg-fuchsia-400/15', text: 'text-fuchsia-300', border: 'border-fuchsia-400/30', dot: 'bg-fuchsia-400' };
      default: return { bg: 'bg-violet-400/15', text: 'text-violet-300', border: 'border-violet-400/30', dot: 'bg-violet-400' };
    }
  }

  function jumpToVenueLocation(locationName) {
    if (!locationName) return;
    if (!currentEvent.is_venue_enabled) {
      toast.info(`Location: ${locationName}`);
      return;
    }

    activeTab.set('venue');

    const defaultZones = [
      { id: 'main-stage', name: 'Main Stage' },
      { id: 'coffee', name: 'Coffee Station' },
      { id: 'lounge', name: 'Networking Lounge' },
      { id: 'booth-a', name: 'Sponsor Booth A' },
      { id: 'booth-b', name: 'Sponsor Booth B' },
      { id: 'entrance', name: 'Entrance / Reg' }
    ];
    const zones = (currentEvent.venue_map && Array.isArray(currentEvent.venue_map) && currentEvent.venue_map.length > 0)
      ? currentEvent.venue_map
      : defaultZones;

    const locLower = locationName.toLowerCase().trim();
    const matchedZone = zones.find(z =>
      z.name.toLowerCase().trim() === locLower ||
      locLower.includes(z.name.toLowerCase().trim()) ||
      z.name.toLowerCase().trim().includes(locLower)
    );

    if (matchedZone) {
      venueLocation = matchedZone.id;
      toast.success(`Navigating to ${matchedZone.name} on Venue Map`);
    } else {
      toast.info(`Showing Venue Map for "${locationName}"`);
    }
  }

  $: mapZoneSuggestions = (currentEvent?.venue_map && Array.isArray(currentEvent.venue_map) && currentEvent.venue_map.length > 0)
    ? currentEvent.venue_map
    : [
        { id: 'main-stage', name: 'Main Stage' },
        { id: 'coffee', name: 'Coffee Station' },
        { id: 'lounge', name: 'Networking Lounge' },
        { id: 'booth-a', name: 'Sponsor Booth A' },
        { id: 'booth-b', name: 'Sponsor Booth B' },
        { id: 'entrance', name: 'Entrance / Reg' }
      ];

  // --- Event Settings Tab State & Handlers ---
  let settingsName = currentEvent?.name ?? '';
  let settingsDescription = currentEvent?.description ?? '';
  let settingsSlug = currentEvent?.slug ?? '';
  let settingsLocation = currentEvent?.location ?? '';
  let settingsGoogleMapUrl = currentEvent?.google_map_url ?? '';
  let settingsEventFormat = currentEvent?.event_format ?? 'offline';

  let settingsStartTime = currentEvent?.start_time ? formatDatetimeLocal(new Date(currentEvent.start_time)) : '';
  let settingsEndTime = currentEvent?.end_time ? formatDatetimeLocal(new Date(currentEvent.end_time)) : '';
  let settingsIsApprovalRequired = Boolean(currentEvent?.is_approval_required);
  let settingsIsVenueEnabled = currentEvent?.is_venue_enabled !== false;
  let settingsIsNetworkEnabled = Boolean(currentEvent?.is_network_enabled);

  $: if (currentEvent) {
    settingsName = currentEvent.name ?? '';
    settingsDescription = currentEvent.description ?? '';
    settingsSlug = currentEvent.slug ?? '';
    settingsLocation = currentEvent.location ?? '';
    settingsGoogleMapUrl = currentEvent.google_map_url ?? '';
    settingsEventFormat = currentEvent.event_format ?? 'offline';
    settingsStartTime = currentEvent.start_time ? formatDatetimeLocal(new Date(currentEvent.start_time)) : '';
    settingsEndTime = currentEvent.end_time ? formatDatetimeLocal(new Date(currentEvent.end_time)) : '';
    settingsIsApprovalRequired = Boolean(currentEvent.is_approval_required);
    settingsIsVenueEnabled = currentEvent.is_venue_enabled !== false;
    settingsIsNetworkEnabled = Boolean(currentEvent.is_network_enabled);
  }

  let settingsStartDate = settingsStartTime ? settingsStartTime.split('T')[0] : '';
  let settingsStartTimeVal = settingsStartTime ? settingsStartTime.split('T')[1]?.slice(0, 5) : '09:00';
  let settingsEndDate = settingsEndTime ? settingsEndTime.split('T')[0] : '';
  let settingsEndTimeVal = settingsEndTime ? settingsEndTime.split('T')[1]?.slice(0, 5) : '17:00';

  $: if (settingsStartDate && settingsStartTimeVal) {
    settingsStartTime = `${settingsStartDate}T${settingsStartTimeVal}`;
  } else if (!settingsStartDate) {
    settingsStartTime = '';
  }

  $: if (settingsEndDate && settingsEndTimeVal) {
    settingsEndTime = `${settingsEndDate}T${settingsEndTimeVal}`;
  } else if (!settingsEndDate) {
    settingsEndTime = '';
  }

  function getFormattedDateStr(dateObj) {
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const d = String(dateObj.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  const todayStr = getFormattedDateStr(new Date());

  function setStartDateQuick(type) {
    const d = new Date();
    if (type === 'tomorrow') d.setDate(d.getDate() + 1);
    else if (type === 'nextweek') d.setDate(d.getDate() + 7);
    settingsStartDate = getFormattedDateStr(d);
    if (!settingsEndDate || settingsEndDate < settingsStartDate) {
      settingsEndDate = settingsStartDate;
    }
  }

  function setEndDateQuick(type) {
    if (!settingsStartDate) setStartDateQuick('today');
    const d = new Date(settingsStartDate ? new Date(settingsStartDate) : new Date());
    if (type === 'sameday') {
      settingsEndDate = settingsStartDate;
    } else if (type === 'nextday') {
      d.setDate(d.getDate() + 1);
      settingsEndDate = getFormattedDateStr(d);
    }
  }

  function formatTime12h(timeStr) {
    if (!timeStr) return '12:00 PM';
    const [h, m] = timeStr.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const displayH = h % 12 || 12;
    const displayHStr = String(displayH).padStart(2, '0');
    const displayMStr = String(m || 0).padStart(2, '0');
    return `${displayHStr}:${displayMStr} ${period}`;
  }

  function formatDateHuman(dateInput) {
    if (!dateInput) return 'Select Date';
    if (typeof dateInput === 'string' && dateInput.includes('T')) {
      const parsedDate = new Date(dateInput);
      if (!isNaN(parsedDate.getTime())) {
        return parsedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      }
    }
    if (typeof dateInput === 'string' && dateInput.includes('-')) {
      const parts = dateInput.split('T')[0].split('-').map(Number);
      if (parts.length >= 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
        const dateObj = new Date(parts[0], parts[1] - 1, parts[2]);
        if (!isNaN(dateObj.getTime())) {
          return dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
        }
      }
    }
    const d = new Date(dateInput);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
    return String(dateInput);
  }

  let activeDatePicker = null;
  let viewMonth = new Date().getMonth();
  let viewYear = new Date().getFullYear();

  const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // --- Timeline Calendar & Clock Logic ---
  let activeTimelineDatePicker = null; // 'start' | 'end' | null
  function openTimelineCalendar(target) {
    activeTimelineDatePicker = target;
    const targetDateStr = target === 'start' ? timelineStartDate : timelineEndDate;
    if (targetDateStr && targetDateStr.includes('-')) {
      const parts = targetDateStr.split('-').map(Number);
      viewYear = parts[0];
      viewMonth = parts[1] - 1;
    } else {
      viewMonth = new Date().getMonth();
      viewYear = new Date().getFullYear();
    }
  }

  function selectTimelineCalendarDate(dateStr) {
    if (activeTimelineDatePicker === 'start') {
      timelineStartDate = dateStr;
      if (!timelineEndDate || timelineEndDate < timelineStartDate) {
        timelineEndDate = timelineStartDate;
      }
    } else if (activeTimelineDatePicker === 'end') {
      timelineEndDate = dateStr;
    }
    activeTimelineDatePicker = null;
  }

  let activeTimelineTimePicker = null; // 'start' | 'end' | null
  function openTimelineClock(target) {
    activeTimelineTimePicker = target;
    const timeVal = target === 'start' ? timelineStartTimeVal : timelineEndTimeVal;
    if (timeVal) {
      const [h24, m] = timeVal.split(':').map(Number);
      clockPeriod = h24 >= 12 ? 'PM' : 'AM';
      clockHour = h24 % 12 || 12;
      clockMinute = m || 0;
    } else {
      clockHour = 9;
      clockMinute = 0;
      clockPeriod = 'AM';
    }
  }

  function applyTimelineClockTime() {
    let h24 = clockHour % 12;
    if (clockPeriod === 'PM') h24 += 12;
    const hStr = String(h24).padStart(2, '0');
    const mStr = String(clockMinute).padStart(2, '0');
    const newTimeVal = `${hStr}:${mStr}`;

    if (activeTimelineTimePicker === 'start') {
      timelineStartTimeVal = newTimeVal;
      if (timelineStartDate === timelineEndDate && timelineEndTimeVal <= timelineStartTimeVal) {
        const nextH24 = (h24 + 1) % 24;
        timelineEndTimeVal = `${String(nextH24).padStart(2, '0')}:${mStr}`;
      }
    } else if (activeTimelineTimePicker === 'end') {
      timelineEndTimeVal = newTimeVal;
    }
    activeTimelineTimePicker = null;
  }

  function isTimelineTimeDisabled(h, m, period, target) {
    if (target !== 'start') return false;
    const now = new Date();
    const today = getFormattedDateStr(now);
    if (timelineStartDate !== today) return false;
    let h24 = h % 12;
    if (period === 'PM') h24 += 12;
    const selectedTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h24, m, 0, 0);
    return selectedTime <= now;
  }

  function openCalendar(target) {
    activeDatePicker = target;
    const targetDateStr = target === 'start' ? settingsStartDate : settingsEndDate;
    if (targetDateStr && targetDateStr.includes('-')) {
      const parts = targetDateStr.split('-').map(Number);
      viewYear = parts[0];
      viewMonth = parts[1] - 1;
    } else {
      viewMonth = new Date().getMonth();
      viewYear = new Date().getFullYear();
    }
  }

  function getCalendarGrid(year, month) {
    const numDays = new Date(year, month + 1, 0).getDate();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const grid = [];
    for (let i = 0; i < firstDayIndex; i++) {
      grid.push(null);
    }
    for (let d = 1; d <= numDays; d++) {
      const monthStr = String(month + 1).padStart(2, '0');
      const dayStr = String(d).padStart(2, '0');
      grid.push({ day: d, dateStr: `${year}-${monthStr}-${dayStr}` });
    }
    return grid;
  }

  function prevMonth() {
    if (viewMonth === 0) {
      viewMonth = 11;
      viewYear--;
    } else {
      viewMonth--;
    }
  }

  function nextMonth() {
    if (viewMonth === 11) {
      viewMonth = 0;
      viewYear++;
    } else {
      viewMonth++;
    }
  }

  function selectCalendarDate(dateStr) {
    if (activeDatePicker === 'start') {
      settingsStartDate = dateStr;
      if (!settingsEndDate || settingsEndDate < settingsStartDate) {
        settingsEndDate = settingsStartDate;
      }
    } else if (activeDatePicker === 'end') {
      settingsEndDate = dateStr;
    }
    activeDatePicker = null;
  }

  let activeTimePicker = null;
  let clockHour = 9;
  let clockMinute = 0;
  let clockPeriod = 'AM';

  function openClock(target) {
    activeTimePicker = target;
    const timeVal = target === 'start' ? settingsStartTimeVal : settingsEndTimeVal;
    if (timeVal) {
      const [h24, m] = timeVal.split(':').map(Number);
      clockPeriod = h24 >= 12 ? 'PM' : 'AM';
      clockHour = h24 % 12 || 12;
      clockMinute = m || 0;
    } else {
      clockHour = 9;
      clockMinute = 0;
      clockPeriod = 'AM';
    }
  }

  function applyClockTime() {
    let h24 = clockHour % 12;
    if (clockPeriod === 'PM') h24 += 12;
    const hStr = String(h24).padStart(2, '0');
    const mStr = String(clockMinute).padStart(2, '0');
    const newTimeVal = `${hStr}:${mStr}`;

    if (activeTimePicker === 'start') {
      settingsStartTimeVal = newTimeVal;
      if (settingsStartDate === settingsEndDate && settingsEndTimeVal <= settingsStartTimeVal) {
        const nextH24 = (h24 + 1) % 24;
        settingsEndTimeVal = `${String(nextH24).padStart(2, '0')}:${mStr}`;
      }
    } else if (activeTimePicker === 'end') {
      settingsEndTimeVal = newTimeVal;
    }
    activeTimePicker = null;
  }

  $: eventStart = currentEvent?.start_time ? new Date(currentEvent.start_time) : null;
  $: eventEnd = currentEvent?.end_time ? new Date(currentEvent.end_time) : null;
  $: isEventLive = Boolean(eventStart && eventStart <= currentTime && (!eventEnd || eventEnd >= currentTime));
  $: isEventEnded = Boolean(eventEnd && eventEnd < currentTime);

  $: isStartInPast = Boolean(!isEventLive && !isEventEnded && settingsStartDate && settingsStartDate < getFormattedDateStr(currentTime));
  $: isEndBeforeStart = Boolean(
    (settingsEndDate && settingsStartDate && settingsEndDate < settingsStartDate) ||
    (settingsStartDate && settingsEndDate && settingsStartDate === settingsEndDate && settingsStartTimeVal && settingsEndTimeVal && settingsEndTimeVal <= settingsStartTimeVal)
  );
  $: isTimeInvalid = isStartInPast || isEndBeforeStart;

  let savingTabSettings = false;
  let saveTabSettingsError = '';
  let saveTabSettingsSuccess = false;

  let settingsDeleteConfirmOpen = false;
  let settingsDeleteConfirmText = '';
  let settingsDeleting = false;

  let copiedSlug = false;
  function copySlugUrl() {
    if (typeof window === 'undefined') return;
    const fullUrl = `${window.location.origin}/event/${settingsSlug}`;
    navigator.clipboard.writeText(fullUrl);
    copiedSlug = true;
    toast.success('Event link copied to clipboard!');
    setTimeout(() => (copiedSlug = false), 2000);
  }

  async function saveTabSettings() {
    savingTabSettings = true;
    saveTabSettingsError = '';
    saveTabSettingsSuccess = false;

    try {
      const res = await fetch(`/api/events/${currentEvent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: settingsName,
          description: settingsDescription,
          slug: settingsSlug,
          location: settingsLocation,
          google_map_url: settingsGoogleMapUrl,
          event_format: settingsEventFormat,
          start_time: settingsStartTime ? new Date(settingsStartTime).toISOString() : null,
          end_time: settingsEndTime ? new Date(settingsEndTime).toISOString() : null,
          is_approval_required: settingsIsApprovalRequired,
          is_venue_enabled: settingsIsVenueEnabled,
          is_network_enabled: settingsIsNetworkEnabled,
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        saveTabSettingsError = json?.message ?? json?.error ?? 'Failed to save changes.';
        toast.error(saveTabSettingsError);
        return;
      }

      if (json?.event) {
        currentEvent = json.event;
      }

      saveTabSettingsSuccess = true;
      toast.success('Event settings updated successfully.');

      if (settingsSlug !== data.event.slug) {
        goto(`/event/${settingsSlug}`, { replaceState: true });
      }
    } catch (e) {
      saveTabSettingsError = e.message ?? 'Something went wrong.';
      toast.error(saveTabSettingsError);
    } finally {
      savingTabSettings = false;
    }
  }

  async function deleteEventInSettings() {
    settingsDeleting = true;
    try {
      const res = await fetch(`/api/events/${currentEvent.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        toast.error(json?.message ?? 'Failed to delete event.');
        return;
      }

      toast.success('Event deleted.');
      await goto('/events');
    } catch (e) {
      toast.error('Something went wrong.');
    } finally {
      settingsDeleting = false;
    }
  }

  function openEditModal() {
    editEventName = currentEvent.name || "";
    editEventSlug = currentEvent.slug || "";
    editEventDescription = currentEvent.description || "";
    editEventStartTime = currentEvent.start_time ? formatDatetimeLocal(new Date(currentEvent.start_time)) : "";
    editEventEndTime = currentEvent.end_time ? formatDatetimeLocal(new Date(currentEvent.end_time)) : "";
    editEventFormat = currentEvent.event_format || "offline";
    editEventLocation = currentEvent.location || "";
    editEventGoogleMapUrl = currentEvent.google_map_url || "";
    editEventApprovalRequired = Boolean(currentEvent.is_approval_required);
    editEventVenueEnabled = currentEvent.is_venue_enabled !== false;
    editEventError = "";
    editEventModalOpen = true;
  }

  async function saveEventUpdates() {
    editEventError = "";
    if (!editEventName.trim()) {
      editEventError = "Event name is required.";
      return;
    }
    if (!editEventSlug.trim()) {
      editEventError = "Slug is required.";
      return;
    }

    editingEvent = true;
    try {
      const res = await fetch(`/api/events/${currentEvent.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editEventName,
          slug: editEventSlug,
          description: editEventDescription,
          start_time: editEventStartTime ? new Date(editEventStartTime).toISOString() : undefined,
          end_time: editEventEndTime ? new Date(editEventEndTime).toISOString() : undefined,
          event_format: editEventFormat,
          location: editEventLocation,
          google_map_url: editEventGoogleMapUrl,
          is_approval_required: editEventApprovalRequired,
          is_venue_enabled: editEventVenueEnabled,
        }),
      });
      const resData = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          resData.message || resData.error || "Failed to update event",
        );
      }

      const oldSlug = currentEvent.slug;
      currentEvent = resData.event;
      toast.success("✅ Event updated successfully.");
      editEventModalOpen = false;

      if (resData.event.slug !== oldSlug) {
        goto(`/event/${resData.event.slug}`, { replaceState: true });
      }
    } catch (e) {
      editEventError = e.message;
    } finally {
      editingEvent = false;
    }
  }

  async function handleSaveMap(e) {
    const newZones = e.detail;
    try {
      const res = await fetch(`/api/events/${currentEvent.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: currentEvent.name,
          slug: currentEvent.slug,
          description: currentEvent.description,
          venue_map: newZones,
        }),
      });
      const resData = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          resData.message || resData.error || "Failed to update venue map",
        );
      }
      currentEvent = resData.event;
      toast.success("✅ Venue map updated successfully.");
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function confirmDeleteEvent() {
    deleteEventError = "";
    deletingEvent = true;
    try {
      const res = await fetch(`/api/events/${currentEvent.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const resData = await res.json().catch(() => ({}));
        throw new Error(
          resData.message || resData.error || "Failed to delete event",
        );
      }

      toast.success("🗑 Event deleted successfully.");
      deleteEventModalOpen = false;
      goto("/events");
    } catch (e) {
      deleteEventError = e.message;
      deletingEvent = false;
    }
  }

  let stage = "workspace";

  let ownerViewMode = data.isOrganizer ? "organizer" : "attendee";
  if (data.isOrganizer) {
    activeTab.set("analytics");
  }

  // Initialize matches store with server data
  matchesStore.set(data.suggestedMatches ?? []);

  $: analytics = data.analytics;
  $: analyticsMetricCards = analytics
    ? [
        { label: "Total Participants", value: analytics.totalParticipants },
        { label: "AI Matches Generated", value: analytics.aiMatchesGenerated },
        { label: "Connection Requests", value: analytics.connectionRequests },
        { label: "Accepted Connections", value: analytics.acceptedConnections },
        { label: "People Met", value: analytics.peopleMet },
        {
          label: "Connection Acceptance Rate",
          value: `${analytics.connectionAcceptanceRate}%`,
        },
        {
          label: "QR Meet Completion Rate",
          value: `${analytics.qrMeetCompletionRate}%`,
        },
      ]
    : [];
  $: maxFunnelValue = Math.max(
    ...(analytics?.networkingFunnel ?? []).map((item) => item.value),
    1,
  );

  function goToCreateEvent() {
    goto("/events/create");
  }

  async function fetchMatches() {
    refreshingMatches = true;
    try {
      const res = await fetch(
        `/api/recommendations?event_id=${data.event.id}`,
        {
          credentials: "include",
        },
      );
      if (!res.ok) {
        if (res.status === 429) {
          const errData = await res.json().catch(() => ({}));
          if (errData.error === "MONTHLY_AI_LIMIT_EXCEEDED") {
            aiCreditsStore.showExhaustedModal();
            return;
          }
          throw new Error(errData.message || "AI request limit reached");
        }
        throw new Error("Failed to fetch matches");
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      matchesStore.set([]); // Clear existing matches while streaming new ones
      let creditDeducted = false;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");

        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.trim()) {
            try {
              const match = JSON.parse(line);
              matchesStore.update((matches) => [...matches, match]);
              if (!creditDeducted) {
                aiCreditsStore.useCredit();
                creditDeducted = true;
              }
            } catch (e) {
              console.warn("Error parsing JSON from stream:", line, e);
            }
          }
        }
      }
    } catch (error) {
      toast.error(error.message || "Could not find matches");
    } finally {
      refreshingMatches = false;
    }
  }

  let refreshingFromDb = false;
  async function refreshFromDb() {
    refreshingFromDb = true;
    try {
      const res = await fetch(`/api/matches?event_id=${data.event.id}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to refresh matches from DB");
      const { matches: dbMatches } = await res.json();
      matchesStore.set(dbMatches || []);
      toast.success("Matches refreshed");
    } catch (error) {
      toast.error("Could not refresh matches");
    } finally {
      refreshingFromDb = false;
    }
  }

  let networkingProfile = {
    whoTheyAre: "",
    whatTheyDo: "",
    whoTheyWant: "",
    expectations: "",
  };
  // If server provided a network profile, use it as initial data
  if (data.networkProfile) {
    networkingProfile = { ...networkingProfile, ...data.networkProfile };
  }
  let profileFillMode = "ai"; // "ai" | "manual"
  $: hasCompletedProfile = Boolean(
    data.networkProfile ||
    (networkingProfile?.whatTheyDo?.trim()?.length >= 10 && networkingProfile?.whoTheyWant?.trim()?.length >= 10)
  );
  let loadingConnections = false;
  let connectionFilter = "received"; // received | sent | connected | met
  let networkFilter = "matches"; // matches | received | connected | sent | met
  let chatOpen = false;
  let venueLocation = null;
  let activeChatConnectionId = null;
  let prepModalOpen = false;
  let activePrepConnection = null;
  let connectingIds = [];

  function openMeetingPrep(connection) {
    activePrepConnection = connection;
    prepModalOpen = true;
  }

  // Reactive derived array for filtered connections
  $: filteredConnections = $connectionsStore.filter((conn) => {
    const isSender = conn.sender_user_id === data.user?.id;
    const isReceiver = conn.receiver_user_id === data.user?.id;

    if (connectionFilter === "received") {
      return isReceiver && conn.status === "pending";
    }
    if (connectionFilter === "sent") {
      return isSender && conn.status === "pending";
    }
    if (connectionFilter === "connected") {
      return (isSender || isReceiver) && conn.status === "accepted";
    }
    if (connectionFilter === "met") {
      return (
        (isSender || isReceiver) && conn.status === "accepted" && !!conn.met_at
      );
    }
    return false;
  });
  $: activeChatConnection = activeChatConnectionId
    ? ($connectionsStore.find((conn) => conn.id === activeChatConnectionId) ??
      null)
    : null;

  // Attendees state & handlers
  let attendeesList = [];
  let loadingAttendees = false;
  let attendeeSearchQuery = "";
  let attendeeSearchTimeout = null;

  async function fetchAttendees(query = attendeeSearchQuery) {
    const eventIdOrSlug = data.event?.id || data.event?.slug || "";
    if (!eventIdOrSlug) return;
    loadingAttendees = true;
    try {
      const q = encodeURIComponent(query.trim());
      const res = await fetch(`/api/attendees?event_id=${encodeURIComponent(eventIdOrSlug)}&q=${q}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch attendees");
      const { attendees } = await res.json();
      attendeesList = attendees || [];
    } catch (e) {
      toast.error("Could not load attendees");
    } finally {
      loadingAttendees = false;
    }
  }

  function handleAttendeeSearchInput(e) {
    attendeeSearchQuery = e.target.value;
    if (attendeeSearchTimeout) clearTimeout(attendeeSearchTimeout);
    attendeeSearchTimeout = setTimeout(() => {
      fetchAttendees(attendeeSearchQuery);
    }, 300);
  }

  async function handleConnectAttendee(attendee) {
    await connectUser({ user_id: attendee.user_id, is_dummy: attendee.is_dummy });
    attendeesList = attendeesList.map((a) =>
      a.user_id === attendee.user_id ? { ...a, connectionStatus: "sent" } : a
    );
  }

  async function handleAcceptAttendee(attendee) {
    if (attendee.connectionId) {
      await updateConnection(attendee.connectionId, "accepted");
      attendeesList = attendeesList.map((a) =>
        a.user_id === attendee.user_id ? { ...a, connectionStatus: "connected" } : a
      );
    }
  }

  $: if ($activeTab === "attendees" && !attendeesList.length && !loadingAttendees) {
    fetchAttendees();
  }

  // Auto-sync connections when Network tab is selected
  $: if ($activeTab === "network" && data.isParticipant && !loadingConnections) {
    fetchAllConnections();
  }

  // Redirect legacy tab values to network (only when networking is enabled)
  $: if (($activeTab === "matches" || $activeTab === "connections") && Boolean(currentEvent.is_network_enabled)) {
    activeTab.set("network");
  }

  let connectionsPage = 1;
  let connectionsHasMore = false;
  let loadingMoreConnections = false;

  async function fetchAllConnections() {
    loadingConnections = true;
    connectionsPage = 1;
    try {
      const res = await fetch(
        `/api/connections?event_id=${data.event.id}&filter=all&page=1&limit=50`,
        {
          credentials: "include",
        },
      );
      if (!res.ok) throw new Error("Failed to fetch connections");
      const { connections: conn, hasMore } = await res.json();
      connectionsStore.set(conn || []);
      connectionsHasMore = hasMore;
    } catch (e) {
      toast.error("Could not load connections");
    } finally {
      loadingConnections = false;
    }
  }

  async function loadMoreConnections() {
    if (loadingMoreConnections || !connectionsHasMore) return;
    loadingMoreConnections = true;
    try {
      const nextPage = connectionsPage + 1;
      const res = await fetch(
        `/api/connections?event_id=${data.event.id}&filter=all&page=${nextPage}&limit=50`,
        {
          credentials: "include",
        },
      );
      if (!res.ok) throw new Error("Failed to fetch more connections");
      const { connections: newConns, hasMore } = await res.json();
      connectionsStore.update((existing) => {
        // Deduplicate by ID
        const existingIds = new Set(existing.map((c) => c.id));
        const uniqueNewConns = newConns.filter((c) => !existingIds.has(c.id));
        return [...existing, ...uniqueNewConns];
      });
      connectionsHasMore = hasMore;
      connectionsPage = nextPage;
    } catch (e) {
      toast.error("Could not load more connections");
    } finally {
      loadingMoreConnections = false;
    }
  }

  async function updateConnection(connectionId, newStatus) {
    try {
      const res = await fetch(`/api/connections/${connectionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update connection");

      connectionsStore.update((conns) => {
        return conns.map((c) => {
          if (c.id === connectionId) {
            return {
              ...c,
              status: newStatus === "met" ? "accepted" : newStatus,
              met_at: newStatus === "met" ? new Date().toISOString() : c.met_at,
            };
          }
          return c;
        });
      });
      toast.success(`Connection ${newStatus}`);
    } catch (e) {
      toast.error("Could not update connection");
    }
  }

  function openChatForConnection(connection) {
    if (connection.status !== "accepted") {
      toast.error("Chat is only available for accepted connections.");
      return;
    }

    activeChatConnectionId = connection.id;
    chatOpen = true;
  }

  async function connectUser(match) {
    // Check if there's an existing pending connection - no need to duplicate
    const existingPending = $connectionsStore.find(
      (c) =>
        ((c.sender_user_id === data.user?.id &&
          c.receiver_user_id === match.user_id) ||
          (c.receiver_user_id === data.user?.id &&
            c.sender_user_id === match.user_id)) &&
        c.status === "pending",
    );

    if (existingPending) {
      toast.info("Connection request already sent.");
      return;
    }

    // If dummy user, show confirmation modal first
    if (match.is_dummy) {
      pendingDummyUserId = match.user_id;
      dummyConnectModalOpen = true;
      return;
    }

    await doConnect(match.user_id);
  }

  async function doConnect(matchUserId) {
    connectingIds = [...connectingIds, matchUserId];
    try {
      const res = await fetch(`/api/connections/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_id: data.event.id,
          receiver_user_id: matchUserId,
        }),
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
          err.message || err.error || "Failed to create connection request",
        );
      }
      const { connection } = await res.json();

      connectionsStore.update((conns) => {
        return [...conns, connection];
      });

      if (connection.status === "accepted") {
        toast.success("Connected!");
      } else {
        toast.success("Connection request sent");
      }
    } catch (e) {
      toast.error(e.message || "Could not send request");
    } finally {
      connectingIds = connectingIds.filter((id) => id !== matchUserId);
    }
  }

  async function signOut() {
    signingOut = true;
    await supabase.auth.signOut();
    signingOut = false;
    clearAllEventStores();
    clearAllChatStores();
    await goto("/");
  }

  async function signInWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error)
      toast.error("Google sign-in failed", { description: error.message });
  }

  async function joinEvent() {
    if (joining) return;
    joining = true;
    try {
      if (!data.user) {
        await signInWithGoogle();
        return;
      }

      if (!data.event.id) {
        toast.error("This is a demo event and cannot be joined.");
        return;
      }

      // Register the join in the database
      const res = await fetch("/api/events/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event_id: data.event.id }),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(
          errBody.message ||
            errBody.error ||
            "Failed to register event participation in database",
        );
      }

      stage = "workspace";
      editProfileOpen = false;
      toast.success("Joined event", {
        description: "Go to the Network tab to fill your profile & find AI matches.",
      });
    } catch (error) {
      toast.error("Could not join event", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      joining = false;
    }
  }

  async function saveProfile() {
    if (!data.user) {
      toast.error("Sign in first", {
        description:
          "You need a Google account before saving your networking profile.",
      });
      return;
    }
    savingProfile = true;
    try {
      // Step 1: Build texts for embeddings
      const aboutUserText =
        `What I do:\n${networkingProfile.whatTheyDo}` +
        (networkingProfile.expectations
          ? `\n\nAbout me:\n${networkingProfile.expectations}`
          : "");
      const lookingForText = `Looking for:\n${networkingProfile.whoTheyWant}`;

      // Step 2: Generate embeddings (parallel)
      const [aboutUserEmbed, lookingForEmbed] = await Promise.all([
        generateEmbedding(aboutUserText),
        generateEmbedding(lookingForText),
      ]);

      // Step 3: Save networking profile with embeddings
      const profileRes = await fetch("/api/network_profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        mode: "same-origin",
        body: JSON.stringify({
          profile: {
            ...networkingProfile,
            about_user_embed: aboutUserEmbed,
            looking_for_embed: lookingForEmbed,
          },
          event_id: data.event.id,
        }),
      });
      const profilePayload = await profileRes.json();
      if (!profileRes.ok) {
        throw new Error(
          profilePayload.error ?? "Failed to save networking profile",
        );
      }
      // Transform DB row to UI shape
      const normalizeProfile = (p) => {
        let lookingForStr = p.looking_for ?? "";
        try {
          const parsed = JSON.parse(lookingForStr);
          if (Array.isArray(parsed)) {
            lookingForStr = parsed.join(", ");
          }
        } catch (e) {}
        return {
          whoTheyAre: p.display_name,
          whatTheyDo: p.what_i_do,
          whoTheyWant: lookingForStr,
          expectations: p.about_me,
        };
      };
      if (profilePayload.profile) {
        data.networkProfile = profilePayload.profile;
        networkingProfile = {
          ...networkingProfile,
          ...normalizeProfile(profilePayload.profile),
        };
      }
      stage = "workspace";
      editProfileOpen = false;
      toast.success("Networking profile saved", {
        description: "Your event workspace is ready.",
      });
    } catch (error) {
      toast.error("Could not save profile", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      savingProfile = false;
    }
  }

  async function generateAiProfile() {
    aiGenerationError = "";
    if (!data.user) {
      aiGenerationError = "Please sign in before generating your profile.";
      return;
    }

    if (!aiProfileText.trim()) {
      aiGenerationError =
        "Paste a short bio, LinkedIn About section, or resume summary to continue.";
      return;
    }

    aiGenerating = true;
    try {
      const res = await fetch("/api/network_profiles/autofill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          text: aiProfileText,
          event_id: data.event.id,
        }),
      });

      const responseData = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 429) {
          if (responseData.error === "MONTHLY_AI_LIMIT_EXCEEDED") {
            aiCreditsStore.showExhaustedModal();
            return;
          }
          throw new Error(responseData.message || "AI limit reached");
        }
        throw new Error(
          responseData.error ?? "Could not generate your profile right now.",
        );
      }

      aiCreditsStore.useCredit();
      const generatedProfile = responseData.profile ?? {};
      networkingProfile = {
        ...networkingProfile,
        whoTheyAre: generatedProfile.displayName ?? "",
        whatTheyDo: generatedProfile.whatTheyDo ?? "",
        expectations: generatedProfile.aboutMe ?? "",
        whoTheyWant: generatedProfile.whoTheyWant ?? "",
      };
      profileFillMode = "manual";
      toast.success("Profile draft generated", {
        description: "Review the details before saving them.",
      });
    } catch (error) {
      aiGenerationError =
        error instanceof Error
          ? error.message
          : "Could not generate your profile.";
      toast.error("AI profile generation failed", {
        description: aiGenerationError,
      });
    } finally {
      aiGenerating = false;
    }
  }

  function skipAiGeneration() {
    aiGenerationError = "";
    profileFillMode = "manual";
  }

  // The second redundant onMount was removed during cleanup

  const profileFields = [
    {
      key: "whoTheyAre",
      label: "Display Name",
      placeholder:
        "Enter the name you'd like other attendees to see during networking.",
      id: "whoTheyAre",
      wsId: "ws-whoTheyAre",
    },
    {
      key: "whatTheyDo",
      label: "What do you do?",
      placeholder:
        "Tell us what you're currently working on. This could be your job, startup, side project, research, freelancing, or anything you're actively building.",
      id: "whatTheyDo",
      wsId: "ws-whatTheyDo",
      suggestions: ["AI Engineer", "Founder", "Product Designer", "Researcher"],
    },
    {
      key: "whoTheyWant",
      label: "Who are you looking to meet?",
      placeholder:
        "Describe the people you'd like to connect with and why. For example, you might be looking for a technical co-founder, investors, designers, developers, mentors, recruiters, or collaborators for a project.",
      id: "whoTheyWant",
      wsId: "ws-whoTheyWant",
      suggestions: [
        "Investors",
        "Co‑founders",
        "Mentors",
        "Strategic Partners",
      ],
    },
    {
      key: "expectations",
      label: "Tell others about yourself",
      placeholder:
        "Share a little about yourself, including your experience, interests, skills, achievements, or the kind of work you're passionate about. This helps others understand who you are and makes AI matching more accurate.",
      id: "expectations",
      wsId: "ws-expectations",
    },
  ];

  $: profileValid =
    (networkingProfile.whoTheyAre?.trim()?.length || 0) > 0 &&
    (networkingProfile.whatTheyDo?.trim()?.length || 0) >= 20 &&
    (networkingProfile.whoTheyWant?.trim()?.length || 0) >= 20 &&
    (networkingProfile.expectations?.trim()?.length || 0) >= 20;

  let dummyModalOpen = false;
  let creatingDummy = false;
  let findMatchesModalOpen = false;

  // Dummy connect confirmation modal
  let dummyConnectModalOpen = false;
  let pendingDummyUserId = null;

  async function createDummyUsers() {
    creatingDummy = true;
    try {
      const res = await fetch("/api/dummy_users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ event_id: data.event.id }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        if (res.status === 429) {
          if (err.error === "MONTHLY_AI_LIMIT_EXCEEDED") {
            aiCreditsStore.showExhaustedModal();
            return;
          }
          throw new Error(err.message || "AI limit reached");
        }
        throw new Error(err.error ?? "Failed to create simulation");
      }

      aiCreditsStore.useCredit();
      await fetchMatches();
      toast.success("Dummy users created");
      dummyModalOpen = false;
    } catch (e) {
      toast.error("Could not create simulation", { description: e.message });
    } finally {
      creatingDummy = false;
    }
  }
</script>

<svelte:head>
  <title>{data.event.name} | Evenai</title>
  <meta
    name="description"
    content="Join {data.event
      .name} on Evenai and get AI-powered networking matches."
  />
</svelte:head>

<PageShell>
  <Sidebar
    user={data.user}
    {signingOut}
    onSignOut={signOut}
    onSignIn={joinEvent}
  />

  <main class="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
    <div class="mb-6 animate-slide-up">
      <button
        onclick={() => goto("/events")}
        class="inline-flex items-center gap-2 text-sm font-semibold text-ink-500 transition hover:text-white"
      >
        <ArrowLeft size={16} />
        Back to events
      </button>
    </div>

    <!-- ─── PREVIEW STAGE ─── -->
    {#if stage === "preview"}
      <div
        class="grid gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-start animate-fade-in"
      >
        <!-- Left: Event info -->
        <div class="glass rounded-3xl border border-white/8 overflow-hidden">
          <div
            class="h-1 bg-gradient-to-r from-amber-400 via-amber-300/50 to-transparent"
          ></div>
          <div class="p-8 sm:p-10 space-y-8">
            <Badge
              variant="secondary"
              class="gap-2 border-amber-400/20 bg-amber-400/8 text-amber-200 text-xs font-bold uppercase tracking-widest px-3 py-1.5"
            >
              <Sparkles size={14} class="text-amber-400" />
              Event preview
            </Badge>

            <div>
              <h1
                class="text-4xl font-black tracking-tight text-white sm:text-6xl mb-4"
              >
                {currentEvent.name}
                {#if data.isParticipant}
                  <CheckCircle2
                    size={20}
                    class="inline-block text-amber-400 ml-2"
                  />
                {/if}
              </h1>
              <p class="text-lg leading-relaxed text-ink-300 max-w-2xl">
                {currentEvent.description}
              </p>
            </div>

            <div class="grid gap-4 sm:grid-cols-2 mt-4">
              <div
                class="glass rounded-2xl p-5 border border-white/6 flex flex-col justify-center"
              >
                <p class="text-xs uppercase tracking-widest text-ink-500 mb-2">
                  Event ID
                </p>
                <p class="text-base font-mono font-semibold text-white">
                  {currentEvent.slug}
                </p>
              </div>
              <div
                class="glass rounded-2xl p-5 border border-white/6 flex flex-col justify-center"
              >
                <p class="text-xs uppercase tracking-widest text-ink-500 mb-2">
                  Access Requirements
                </p>
                <p
                  class="text-base font-semibold text-white flex items-center gap-2"
                >
                  <LogIn size={16} class="text-ink-400" />
                  Google Sign-in
                </p>
              </div>
            </div>

            <div class="flex flex-wrap gap-4 pt-2">
              {#if !data.isParticipant}
                <Button
                  id="join-event-btn"
                  onclick={joinEvent}
                  disabled={joining}
                  class="h-12 px-6 gap-2 text-base shadow-[0_0_20px_rgba(251,191,36,0.3)] hover:shadow-[0_0_30px_rgba(251,191,36,0.5)] transition-all"
                >
                  {#if joining}
                    <LoaderCircle size={18} class="animate-spin" />
                    Redirecting…
                  {:else}
                    <LogIn size={18} />
                    {#if data.user}Join event{:else}Join with Google{/if}
                  {/if}
                </Button>
              {:else if data.isOrganizer}
                <div class="flex items-center gap-2 text-amber-400 font-semibold">
                  <Crown size={18} /> Hosting
                </div>
              {:else}
                <div class="flex items-center gap-2 text-emerald-400 font-semibold">
                  <CheckCheck size={18} /> Joined
                </div>
              {/if}
            </div>
          </div>
        </div>

        <!-- Right: What happens next -->
        <div class="glass rounded-3xl border border-white/8 p-8 sm:p-10">
          <div class="flex items-center gap-3 mb-8">
            <div
              class="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400/10 border border-cyan-400/20"
            >
              <Users size={20} class="text-cyan-300" />
            </div>
            <p
              class="text-sm font-bold uppercase tracking-widest text-cyan-300"
            >
              What happens next
            </p>
          </div>

          <ol class="space-y-6">
            {#each [{ icon: LogIn, title: "Sign in with Google", desc: "Confirm your attendance with a quick OAuth login." }, { icon: UserCircle2, title: "Fill your profile", desc: "A short networking profile so the AI understands your intent." }, { icon: Brain, title: "Review AI matches", desc: "See the most relevant people and why each match was made." }] as step, i}
              <li class="flex items-start gap-4">
                <div
                  class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/8 border border-white/10 text-sm font-bold text-ink-400 mt-0.5"
                >
                  {i + 1}
                </div>
                <div>
                  <p class="text-base font-semibold text-white mb-1">
                    {step.title}
                  </p>
                  <p class="text-sm leading-relaxed text-ink-400">
                    {step.desc}
                  </p>
                </div>
              </li>
            {/each}
          </ol>
        </div>
      </div>

      <!-- ─── PROFILE STAGE ─── -->
    {:else if stage === "profile"}
      <div class="mx-auto max-w-5xl animate-slide-up">
        <div
          class="glass rounded-3xl border border-violet-400/15 overflow-hidden"
        >
          <div
            class="h-1 bg-gradient-to-r from-violet-400 via-cyan-400/70 to-transparent"
          ></div>
          <div class="p-5 sm:p-6 space-y-4">
            <div class="space-y-2">
              <Badge
                variant="secondary"
                class="gap-2 border-violet-400/20 bg-violet-400/8 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-violet-200"
              >
                <Brain size={12} class="text-violet-300" />
                AI onboarding
              </Badge>
              <div class="space-y-2">
                <h1
                  class="text-2xl font-black tracking-tight text-white sm:text-3xl"
                >
                  ✨ Magic AI Profile Auto-Fill
                </h1>
                <p class="max-w-xl text-sm leading-6 text-ink-300">
                  Paste a short bio or LinkedIn blurb. The AI will turn it into
                  a networking profile for review.
                </p>
              </div>
            </div>

            <div class="mx-auto w-full max-w-2xl space-y-3">
              <div
                class="rounded-2xl border border-white/8 bg-white/4 px-3 py-2"
              >
                <p
                  class="text-[10px] font-bold uppercase tracking-widest text-cyan-300"
                >
                  Examples you can paste
                </p>
                <div
                  class="mt-2 flex flex-wrap gap-2 text-[11px] leading-5 text-ink-300"
                >
                  <span
                    class="rounded-full border border-white/8 bg-white/5 px-2.5 py-1"
                    >LinkedIn About</span
                  >
                  <span
                    class="rounded-full border border-white/8 bg-white/5 px-2.5 py-1"
                    >Resume summary</span
                  >
                  <span
                    class="rounded-full border border-white/8 bg-white/5 px-2.5 py-1"
                    >Startup bio</span
                  >
                  <span
                    class="rounded-full border border-white/8 bg-white/5 px-2.5 py-1"
                    >Goals + skills</span
                  >
                </div>
              </div>

              <Label
                for="ai-profile-input"
                class="text-[10px] font-semibold uppercase tracking-widest text-ink-400"
              >
                Your background
              </Label>
              <textarea
                id="ai-profile-input"
                bind:value={aiProfileText}
                placeholder={`Hi, I'm Ravi.\n\nI'm a Spring Boot developer with experience building SaaS products and AI applications.\n\nI'm currently building an AI healthcare startup and I'm attending this event to meet technical co-founders, investors and AI engineers.`}
                class="min-h-[180px] w-full rounded-2xl border border-white/10 bg-white/4 p-3 text-sm leading-6 text-white placeholder:text-ink-600 shadow-inner outline-none transition focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/15"
              ></textarea>

              {#if aiGenerating}
                <AmdAiLoading
                  message="AI is working..."
                  detail="Building your networking profile draft from your input."
                />
              {/if}

              {#if aiGenerationError}
                <div
                  class="rounded-2xl border border-amber-400/20 bg-amber-400/8 p-3 text-sm text-amber-100"
                >
                  <p class="font-semibold">Could not generate your profile.</p>
                  <p class="mt-1 leading-6 text-amber-100/85">
                    {aiGenerationError}
                  </p>
                  <div class="mt-3">
                    <Button
                      variant="outline"
                      class="h-9 border-amber-300/20 px-3 text-xs text-amber-100 hover:bg-amber-400/10"
                      onclick={generateAiProfile}
                      disabled={aiGenerating}
                    >
                      Retry
                    </Button>
                  </div>
                </div>
              {/if}

              <div class="flex flex-wrap items-center justify-between gap-2">
                <p class="text-[11px] text-ink-400">
                  The AI will generate a draft you can edit.
                </p>
                <span
                  class="text-[10px] uppercase tracking-widest text-ink-500"
                >
                  Review first
                </span>
              </div>

              <div class="flex flex-wrap justify-center gap-2 pt-1">
                <Button
                  id="generate-profile-btn"
                  onclick={generateAiProfile}
                  disabled={aiGenerating || !aiProfileText.trim()}
                  class="h-10 gap-2 px-4 text-sm"
                >
                  {#if aiGenerating}
                    <LoaderCircle size={15} class="animate-spin" />
                    Generating profile…
                  {:else}
                    <Sparkles size={15} />
                    Generate My Profile
                  {/if}
                </Button>
                <Button
                  variant="secondary"
                  onclick={skipAiGeneration}
                  class="h-10 gap-2 px-4 text-sm"
                >
                  Fill manually
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    {:else}
      <div class="space-y-8 animate-fade-in min-h-[800px]">
        <!-- Workspace header -->
        {#if pageLoading}
          <div
            class="glass rounded-3xl border border-emerald-400/15 bg-emerald-400/4 p-8 sm:p-10"
          >
            <div class="flex flex-col items-center gap-6 animate-pulse">
              <div class="h-8 w-48 bg-ink-400 rounded"></div>
              <div class="h-4 w-96 bg-ink-400 rounded"></div>
            </div>
          </div>
        {:else}
          <div
            class="glass rounded-3xl border border-emerald-400/15 bg-emerald-400/4 p-8 sm:p-10 relative"
          >
            <div class="flex flex-col items-center gap-6">
              <div class="space-y-3 text-center">
                <div class="flex flex-wrap items-center justify-center gap-2">
                  {#if data.isOrganizer}
                    <DropdownMenu.Root>
                      <DropdownMenu.Trigger
                        class="inline-flex items-center gap-2 rounded-xl bg-white/6 px-3.5 py-1.5 border border-white/10 text-xs font-bold shadow-lg transition-all hover:bg-white/10 hover:border-amber-400/40 focus-visible:outline-none"
                      >
                        {#if ownerViewMode === 'organizer'}
                          <Crown size={14} class="text-amber-400" />
                          <span class="text-amber-300">Host</span>
                        {:else}
                          <Eye size={14} class="text-cyan-400" />
                          <span class="text-cyan-300">Attendee</span>
                        {/if}
                        <ChevronDown size={14} class="text-ink-400 ml-0.5" />
                      </DropdownMenu.Trigger>

                      <DropdownMenu.Content class="w-40 mt-2 glass border border-white/10 shadow-2xl p-1 z-50">
                        <DropdownMenu.Label class="text-[10px] uppercase font-bold tracking-widest text-ink-400 px-3 py-1.5">
                          View Mode
                        </DropdownMenu.Label>
                        <DropdownMenu.Separator class="my-1 border-white/10" />
                        <DropdownMenu.Item
                          class="flex items-center gap-2 px-3 py-2 text-xs font-semibold cursor-pointer rounded-lg transition-colors {ownerViewMode === 'organizer' ? 'bg-amber-400/15 text-amber-200 font-bold' : 'text-ink-200 hover:text-white hover:bg-white/5'}"
                          onSelect={() => {
                            ownerViewMode = 'organizer';
                            activeTab.set('analytics');
                          }}
                        >
                          <Crown size={15} class="text-amber-400 shrink-0" />
                          <span>Host</span>
                        </DropdownMenu.Item>

                        <DropdownMenu.Item
                          class="flex items-center gap-2 px-3 py-2 text-xs font-semibold cursor-pointer rounded-lg transition-colors {ownerViewMode === 'attendee' ? 'bg-cyan-400/15 text-cyan-200 font-bold' : 'text-ink-200 hover:text-white hover:bg-white/5'}"
                          onSelect={() => {
                            ownerViewMode = 'attendee';
                            activeTab.set('details');
                          }}
                        >
                          <Eye size={15} class="text-cyan-400 shrink-0" />
                          <span>Attendee</span>
                        </DropdownMenu.Item>
                      </DropdownMenu.Content>
                    </DropdownMenu.Root>
                  {:else if data.isParticipant}
                    <Badge
                      variant="secondary"
                      class="gap-1.5 border-emerald-400/20 bg-emerald-400/8 text-emerald-200 text-xs font-bold uppercase tracking-wider px-3.5 py-1.5"
                    >
                      <CheckCheck size={14} class="text-emerald-400" />
                      Joined
                    </Badge>
                  {:else}
                    <!-- Join button moved below date & time block -->
                  {/if}

                  {#if currentEvent.event_format}
                    <Badge
                      variant="secondary"
                      class="gap-1.5 border-white/10 bg-white/5 text-ink-300 text-xs font-semibold capitalize px-3 py-1.5"
                    >
                      {#if currentEvent.event_format === 'online'}
                        <Globe size={14} class="text-cyan-400" /> Online
                      {:else if currentEvent.event_format === 'hybrid'}
                        <Globe size={14} class="text-amber-400" /> Hybrid
                      {:else}
                        <MapPin size={14} class="text-amber-400" /> Offline
                      {/if}
                    </Badge>
                  {/if}

                  {#if currentEvent.is_approval_required}
                    <Badge
                      variant="secondary"
                      class="gap-1.5 border-amber-400/20 bg-amber-400/8 text-amber-200 text-xs font-semibold px-3 py-1.5"
                    >
                      <Lock size={14} class="text-amber-400" /> Approval Required
                    </Badge>
                  {/if}
                </div>

                <h1
                  class="text-4xl sm:text-5xl font-black tracking-tight text-white"
                >
                  {currentEvent.name}
                </h1>

                {#if liveSessions.length > 0}
                  <div class="mt-4 w-full" transition:slide>
                    <!-- Desktop: left/right button carousel -->
                    <div class="hidden sm:flex items-center justify-center gap-3">
                      {#if liveSessions.length > 1}
                        <button
                          onclick={() => liveSlideIndex = (liveSlideIndex - 1 + liveSessions.length) % liveSessions.length}
                          class="flex h-8 w-8 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 transition-all flex-shrink-0"
                          aria-label="Previous live session"
                        >
                          <ChevronLeft size={16} />
                        </button>
                      {/if}

                      {#key liveSlideIndex}
                        {@const session = liveSessions[liveSlideIndex]}
                        <div class="inline-flex items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-2.5 backdrop-blur-md shadow-lg shadow-emerald-500/5 animate-fade-in max-w-sm">
                          <div class="relative flex h-3 w-3 items-center justify-center flex-shrink-0">
                            <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                            <span class="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
                          </div>
                          <div class="flex flex-col text-left min-w-0">
                            <div class="flex items-center gap-2">
                              <span class="text-[10px] font-bold uppercase tracking-widest text-emerald-400">Live Now</span>
                              {#if liveSessions.length > 1}
                                <span class="text-[10px] text-emerald-400/60 font-semibold">{liveSlideIndex + 1}/{liveSessions.length}</span>
                              {/if}
                            </div>
                            <span class="text-sm font-semibold text-white truncate">{session.title}</span>
                          </div>
                          {#if session.location && currentEvent.is_venue_enabled}
                            <div class="ml-2 pl-3 border-l border-emerald-500/20 flex flex-col items-start text-left flex-shrink-0">
                              <span class="text-[10px] font-bold uppercase tracking-widest text-emerald-400/70">Location</span>
                              <button
                                onclick={() => jumpToVenueLocation(session.location)}
                                class="text-xs font-semibold text-emerald-300 hover:text-emerald-200 hover:underline flex items-center gap-1 transition-colors"
                              >
                                <MapPin size={10} /> {session.location}
                              </button>
                            </div>
                          {:else if session.location}
                            <div class="ml-2 pl-3 border-l border-emerald-500/20 flex flex-col items-start text-left flex-shrink-0">
                              <span class="text-[10px] font-bold uppercase tracking-widest text-emerald-400/70">Location</span>
                              <span class="text-xs font-semibold text-emerald-300 flex items-center gap-1">
                                <MapPin size={10} /> {session.location}
                              </span>
                            </div>
                          {/if}
                        </div>
                      {/key}

                      {#if liveSessions.length > 1}
                        <button
                          onclick={() => liveSlideIndex = (liveSlideIndex + 1) % liveSessions.length}
                          class="flex h-8 w-8 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 transition-all flex-shrink-0"
                          aria-label="Next live session"
                        >
                          <ChevronRight size={16} />
                        </button>
                      {/if}
                    </div>

                    <!-- Mobile: swipeable card + dots below -->
                    <div
                      class="flex sm:hidden flex-col items-center gap-3"
                      role="region"
                      aria-label="Live sessions"
                      ontouchstart={(e) => { liveSwipeStartX = e.touches[0].clientX; }}
                      ontouchend={(e) => {
                        const dx = e.changedTouches[0].clientX - liveSwipeStartX;
                        if (Math.abs(dx) > 40) {
                          if (dx < 0) liveSlideIndex = (liveSlideIndex + 1) % liveSessions.length;
                          else liveSlideIndex = (liveSlideIndex - 1 + liveSessions.length) % liveSessions.length;
                        }
                      }}
                    >
                      {#key liveSlideIndex}
                        {@const session = liveSessions[liveSlideIndex]}
                        <div class="inline-flex items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-2.5 backdrop-blur-md shadow-lg shadow-emerald-500/5 animate-fade-in w-full max-w-sm">
                          <div class="relative flex h-3 w-3 items-center justify-center flex-shrink-0">
                            <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                            <span class="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
                          </div>
                          <div class="flex flex-col text-left min-w-0 flex-1">
                            <span class="text-[10px] font-bold uppercase tracking-widest text-emerald-400">Live Now</span>
                            <span class="text-sm font-semibold text-white truncate">{session.title}</span>
                            {#if session.location}
                              <span class="text-[11px] text-emerald-300/80 flex items-center gap-1 mt-0.5">
                                <MapPin size={9} /> {session.location}
                              </span>
                            {/if}
                          </div>
                        </div>
                      {/key}

                      {#if liveSessions.length > 1}
                        <div class="flex items-center gap-1.5">
                          {#each liveSessions as _, i}
                            <button
                              onclick={() => liveSlideIndex = i}
                              aria-label="Go to session {i + 1}"
                              class="h-1.5 rounded-full transition-all duration-300 {liveSlideIndex === i ? 'w-4 bg-emerald-400' : 'w-1.5 bg-emerald-400/30'}"
                            ></button>
                          {/each}
                        </div>
                      {/if}
                    </div>
                  </div>
                {/if}

                {#if nextSession}
                  <div class="flex justify-center mt-2 animate-fade-in" transition:slide>
                    <div class="inline-flex items-center gap-3 rounded-2xl border px-4 py-2 backdrop-blur-md shadow-lg
                      {isEndingSoon
                        ? 'border-orange-500/25 bg-orange-500/10 shadow-orange-500/5'
                        : 'border-amber-400/20 bg-amber-400/8 shadow-amber-400/5'}">
                      <div class="relative flex h-3 w-3 items-center justify-center">
                        {#if isEndingSoon}
                          <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-400 opacity-60"></span>
                          <span class="relative inline-flex h-2 w-2 rounded-full bg-orange-400"></span>
                        {:else}
                          <span class="relative inline-flex h-2 w-2 rounded-full bg-amber-400 opacity-80"></span>
                        {/if}
                      </div>
                      <div class="flex flex-col text-left">
                        <span class="text-[10px] font-bold uppercase tracking-widest {isEndingSoon ? 'text-orange-400' : 'text-amber-400'}">Coming Up Next</span>
                        <span class="text-sm font-semibold {isEndingSoon ? 'text-orange-200' : 'text-amber-200'}">{nextSession.title}</span>
                        <span class="text-[11px] {isEndingSoon ? 'text-orange-300/70' : 'text-amber-300/70'} flex items-center gap-1 mt-0.5">
                          <Clock size={9} />
                          {new Date(nextSession.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                          {#if nextSession.location}
                            <span class="opacity-50">·</span>
                            <MapPin size={9} /> {nextSession.location}
                          {/if}
                        </span>
                      </div>
                    </div>
                  </div>
                {/if}

                <!-- Join button below date & time block -->
                {#if !data.isOrganizer && !data.isParticipant}
                  <div class="flex justify-center pt-4">
                    <Button
                      id="join-event-btn"
                      onclick={joinEvent}
                      disabled={joining}
                      class="h-11 px-8 gap-2 text-sm font-bold bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-xl shadow-[0_0_20px_rgba(251,191,36,0.3)] hover:shadow-[0_0_30px_rgba(251,191,36,0.5)] transition-all"
                    >
                      {#if joining}
                        <LoaderCircle size={16} class="animate-spin" />
                        Joining…
                      {:else}
                        <LogIn size={16} />
                        {#if data.user}Join Event{:else}Join with Google{/if}
                      {/if}
                    </Button>
                  </div>
                {/if}
              </div>
            </div>
          </div>
        {/if}

        {#if data.isParticipant || data.isOrganizer}
        <Tabs.Root
          value={$activeTab}
          onValueChange={(v) => {
            activeTab.set(v);
          }}
        >
          <!-- Scrollable tabs wrapper -->
          <div
            class="flex items-center justify-between gap-3 overflow-x-auto overflow-y-hidden scrollbar-hide rounded-xl"
          >
            <Tabs.List
              class="glass rounded-xl flex min-w-max divide-x divide-white/10"
            >
              {#if data.isOrganizer && ownerViewMode === "organizer"}
                <!-- Host Mode Tabs -->
                <Tabs.Trigger
                  value="analytics"
                  class="flex items-center justify-center gap-1.5 py-2.5 px-5 text-xs sm:text-sm font-medium transition-colors duration-200 min-w-max data-[state=active]:bg-amber-400/15 data-[state=active]:text-amber-200 data-[state=inactive]:text-ink-500 hover:text-amber-200"
                >
                  <BarChart3 size={16} />
                  <span>Analytics</span>
                </Tabs.Trigger>

                <Tabs.Trigger
                  value="attendees"
                  class="flex items-center justify-center gap-1.5 py-2.5 px-5 text-xs sm:text-sm font-medium transition-colors duration-200 min-w-max data-[state=active]:bg-indigo-400/15 data-[state=active]:text-indigo-200 data-[state=inactive]:text-ink-500 hover:text-indigo-200"
                >
                  <Users size={16} />
                  <span class="flex items-center gap-1.5"
                    >Attendees {#if attendeesList.length || currentEvent.attendees_count}<span
                        class="rounded-full bg-indigo-400/20 px-1.5 py-0.5 text-[10px] font-bold text-indigo-300"
                        >{attendeesList.length || currentEvent.attendees_count}</span
                      >
                    {/if}</span
                  >
                </Tabs.Trigger>

                <Tabs.Trigger
                  value="timeline"
                  class="flex items-center justify-center gap-1.5 py-2.5 px-5 text-xs sm:text-sm font-medium transition-colors duration-200 min-w-max data-[state=active]:bg-amber-400/15 data-[state=active]:text-amber-200 data-[state=inactive]:text-ink-500 hover:text-amber-200"
                >
                  <CalendarClock size={16} />
                  <span>Timeline</span>
                </Tabs.Trigger>

                <Tabs.Trigger
                  value="announcements"
                  class="flex items-center justify-center gap-1.5 py-2.5 px-5 text-xs sm:text-sm font-medium transition-colors duration-200 min-w-max data-[state=active]:bg-rose-400/15 data-[state=active]:text-rose-200 data-[state=inactive]:text-ink-500 hover:text-rose-200"
                >
                  <Megaphone size={16} />
                  <span class="flex items-center gap-1.5">
                    Announcements
                    {#if announcementsList.length}
                      <span class="rounded-full bg-rose-400/20 px-1.5 py-0.5 text-[10px] font-bold text-rose-300">
                        {announcementsList.length}
                      </span>
                    {/if}
                  </span>
                </Tabs.Trigger>

                <Tabs.Trigger
                  value="settings"
                  class="flex items-center justify-center gap-1.5 py-2.5 px-5 text-xs sm:text-sm font-medium transition-colors duration-200 min-w-max data-[state=active]:bg-indigo-400/15 data-[state=active]:text-indigo-200 data-[state=inactive]:text-ink-500 hover:text-indigo-200"
                >
                  <Settings size={16} />
                  <span>Settings</span>
                </Tabs.Trigger>
              {:else}
                <!-- Attendee Mode Tabs -->
                <Tabs.Trigger
                  value="details"
                  class="flex items-center justify-center gap-1.5 py-2.5 px-5 text-xs sm:text-sm font-medium transition-colors duration-200 min-w-max data-[state=active]:bg-white/10 data-[state=active]:text-white data-[state=inactive]:text-ink-500 hover:text-white"
                >
                  <Info size={16} />
                  <span>Overview</span>
                </Tabs.Trigger>

                {#if Boolean(currentEvent.is_announcements_enabled ?? true)}
                  <Tabs.Trigger
                    value="announcements"
                    class="flex items-center justify-center gap-1.5 py-2.5 px-5 text-xs sm:text-sm font-medium transition-colors duration-200 min-w-max data-[state=active]:bg-rose-400/15 data-[state=active]:text-rose-200 data-[state=inactive]:text-ink-500 hover:text-rose-200"
                  >
                    <Megaphone size={16} />
                    <span class="flex items-center gap-1.5">
                      Announcements
                      {#if announcementsList.length}
                        <span class="rounded-full bg-rose-400/20 px-1.5 py-0.5 text-[10px] font-bold text-rose-300">
                          {announcementsList.length}
                        </span>
                      {/if}
                    </span>
                  </Tabs.Trigger>
                {/if}

                {#if Boolean(currentEvent.is_network_enabled)}
                  <Tabs.Trigger
                    value="network"
                    class="flex items-center justify-center gap-1.5 py-2.5 px-5 text-xs sm:text-sm font-medium transition-colors duration-200 min-w-max data-[state=active]:bg-violet-400/15 data-[state=active]:text-violet-200 data-[state=inactive]:text-ink-500 hover:text-violet-200"
                  >
                    <Network size={16} />
                    <span class="flex items-center gap-1.5"
                      >Network
                      {#if $matchesStore.length || $connectionsStore.filter(c => c.receiver_user_id === data.user?.id && c.status === 'pending').length}
                        <span class="rounded-full bg-violet-400/20 px-1.5 py-0.5 text-[10px] font-bold text-violet-300">
                          {$matchesStore.length + $connectionsStore.filter(c => c.receiver_user_id === data.user?.id && c.status === 'pending').length}
                        </span>
                      {/if}
                    </span>
                  </Tabs.Trigger>
                {/if}

                {#if Boolean(currentEvent.is_venue_enabled)}
                  <Tabs.Trigger
                    value="venue"
                    class="flex items-center justify-center gap-1.5 py-2.5 px-5 text-xs sm:text-sm font-medium transition-colors duration-200 min-w-max data-[state=active]:bg-emerald-400/15 data-[state=active]:text-emerald-200 data-[state=inactive]:text-ink-500 hover:text-emerald-200"
                  >
                    <MapPin size={16} />
                    <span>Venue</span>
                  </Tabs.Trigger>
                {/if}
              {/if}
            </Tabs.List>
          </div>

          <!-- Details tab — Premium Overview redesign -->
          <Tabs.Content value="details" class="mt-4">
            <div class="space-y-5 animate-fade-in">

              <!-- ── Hero Status Banner ── -->
              <div class="relative overflow-hidden rounded-3xl border border-white/8 bg-gradient-to-br from-white/5 via-white/2 to-transparent backdrop-blur-xl">
                <!-- Accent top bar -->
                <div class="h-[3px] w-full {isEventLive ? 'bg-gradient-to-r from-emerald-400 via-emerald-300/60 to-transparent' : isEventEnded ? 'bg-gradient-to-r from-slate-500 via-slate-400/40 to-transparent' : 'bg-gradient-to-r from-amber-400 via-amber-300/60 to-transparent'}"></div>

                <div class="p-6 sm:p-8 lg:p-10 space-y-5">
                  <!-- Status pill row -->
                  <div class="flex flex-wrap items-center gap-2">
                    {#if isEventLive}
                      <span class="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-emerald-300">
                        <span class="relative flex h-2 w-2">
                          <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                          <span class="relative inline-flex h-2 w-2 rounded-full bg-emerald-400"></span>
                        </span>
                        Live Now
                      </span>
                    {:else if isEventEnded}
                      <span class="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-ink-400">
                        <CheckCheck size={12} />
                        Event Ended
                      </span>
                    {:else if currentEvent.start_time}
                      <span class="inline-flex items-center gap-1.5 rounded-full border border-amber-400/25 bg-amber-400/8 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-amber-300">
                        <CalendarClock size={12} />
                        Upcoming
                      </span>
                    {/if}

                    {#if currentEvent.event_format}
                      <span class="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold capitalize text-ink-300">
                        {#if currentEvent.event_format === 'online'}
                          <Globe size={12} class="text-cyan-400" /> Online
                        {:else if currentEvent.event_format === 'hybrid'}
                          <Globe size={12} class="text-amber-400" /> Hybrid
                        {:else}
                          <MapPin size={12} class="text-amber-400" /> In-Person
                        {/if}
                      </span>
                    {/if}

                    {#if currentEvent.is_approval_required}
                      <span class="inline-flex items-center gap-1.5 rounded-full border border-amber-400/20 bg-amber-400/8 px-3 py-1 text-[11px] font-semibold text-amber-300">
                        <Lock size={12} /> Approval Required
                      </span>
                    {/if}
                  </div>

                  <!-- About section -->
                  {#if currentEvent.description}
                    <div>
                      <div class="flex items-center gap-2 mb-3">
                        <div class="h-5 w-0.5 rounded-full bg-gradient-to-b from-indigo-400 to-violet-400"></div>
                        <p class="text-[10px] font-black uppercase tracking-[0.15em] text-indigo-400">About this Event</p>
                      </div>
                      <p class="text-sm leading-7 text-ink-200 max-w-prose">{currentEvent.description}</p>
                    </div>
                  {/if}

                  <!-- Date / Location / Attendees row -->
                  <div class="flex flex-wrap gap-2">
                    {#if currentEvent.start_time}
                      <span class="inline-flex items-center gap-1.5 text-xs text-ink-300 bg-white/4 border border-white/8 px-3 py-1.5 rounded-lg">
                        <CalendarClock size={13} class="text-amber-400" />
                        {formatEventDateRange(currentEvent.start_time, currentEvent.end_time)}
                      </span>
                    {/if}

                    {#if currentEvent.location && currentEvent.event_format !== 'online'}
                      <a
                        href={currentEvent.google_map_url || `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(currentEvent.location)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        class="inline-flex items-center gap-1.5 text-xs text-ink-300 hover:text-white bg-white/4 hover:bg-white/8 border border-white/8 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        <MapPin size={13} class="text-amber-400" />
                        {currentEvent.location}
                      </a>
                    {/if}

                    {#if currentEvent.attendees_count > 0}
                      <span class="inline-flex items-center gap-1.5 text-xs text-ink-300 bg-white/4 border border-white/8 px-3 py-1.5 rounded-lg">
                        <Users size={13} class="text-cyan-400" />
                        {currentEvent.attendees_count} attendee{currentEvent.attendees_count === 1 ? '' : 's'}
                      </span>
                    {/if}
                  </div>
                </div>
              </div>

              <!-- ── Event Schedule & Agenda (redesigned) ── -->
              <div class="space-y-3 animate-slide-up-delay-1">
                <!-- Section Header -->
                <div class="flex items-center justify-between px-1">
                  <div class="flex items-center gap-3">
                    <div class="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-400/12 border border-amber-400/20">
                      <CalendarClock size={15} class="text-amber-400" />
                    </div>
                    <div>
                      <h3 class="text-base font-black text-white tracking-tight">Event Schedule</h3>
                      <p class="text-[11px] text-ink-500">{timelineItems.length} session{timelineItems.length === 1 ? '' : 's'} planned</p>
                    </div>
                  </div>

                  {#if timelineItems.length > 0}
                    <Badge variant="secondary" class="border-amber-400/20 bg-amber-400/8 text-amber-300 text-[10px] font-bold uppercase tracking-wider">
                      Agenda
                    </Badge>
                  {/if}
                </div>

                <!-- Timeline list or empty state -->
                {#if timelineItems.length === 0}
                  <div class="glass rounded-2xl border border-white/6 p-10 text-center space-y-4">
                    <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-white/8 bg-white/4">
                      <CalendarClock size={28} class="text-ink-600" />
                    </div>
                    <div>
                      <p class="text-sm font-bold text-ink-300">No schedule published yet</p>
                      <p class="text-xs text-ink-500 mt-1 max-w-xs mx-auto">The organizer hasn't added agenda sessions yet. Check back soon for the full event schedule.</p>
                    </div>
                  </div>
                {:else}
                  <!-- Timeline rail -->
                  <div class="relative">
                    <!-- Vertical rail line -->
                    <div class="absolute left-[27px] top-6 bottom-6 w-px bg-gradient-to-b from-white/15 via-white/8 to-transparent pointer-events-none"></div>

                    <div class="space-y-3">
                      {#each timelineItems as item, idx (item.id)}
                        {@const style = getCategoryColor(item.category)}
                        {@const isLiveNow = item.start_time && item.end_time && new Date(item.start_time) <= currentTime && new Date(item.end_time) >= currentTime}
                        {@const isPast = item.end_time && new Date(item.end_time) < currentTime}

                        <div
                          class="relative flex gap-4 group animate-slide-up"
                          style="animation-delay: {idx * 60}ms; animation-fill-mode: both;"
                        >
                          <!-- Timeline node -->
                          <div class="relative flex-shrink-0 flex flex-col items-center" style="width: 56px;">
                            <div class="relative flex h-14 w-14 items-center justify-center rounded-2xl border transition-all duration-300
                              {isLiveNow
                                ? 'bg-emerald-400/12 border-emerald-400/35 shadow-[0_0_16px_rgba(52,211,153,0.2)]'
                                : isPast
                                ? 'bg-white/3 border-white/6'
                                : 'bg-white/5 border-white/10 group-hover:border-white/20'}">

                              {#if isLiveNow}
                                <!-- Pulsing ring for live sessions -->
                                <span class="absolute inset-0 rounded-2xl animate-ping border border-emerald-400/40 opacity-50"></span>
                              {/if}

                              <!-- Category-colored dot -->
                              <div class="h-3 w-3 rounded-full {style.dot} {isLiveNow ? 'shadow-[0_0_8px_currentColor]' : ''} {isPast ? 'opacity-30' : ''}"></div>
                            </div>
                          </div>

                          <!-- Session card -->
                          <div class="flex-1 min-w-0 pb-1">
                            <div class="rounded-2xl border transition-all duration-200 p-4 sm:p-5
                              {isLiveNow
                                ? 'border-emerald-400/25 bg-emerald-400/5 hover:border-emerald-400/40'
                                : isPast
                                ? 'border-white/5 bg-white/2 opacity-60 hover:opacity-80'
                                : 'glass border-white/8 hover:border-white/18 hover:shadow-[0_4px_24px_rgba(0,0,0,0.3)] hover:-translate-y-0.5 transition-transform'}">

                              <!-- Top row: time + live badge + category -->
                              <div class="flex flex-wrap items-center gap-2 mb-2.5">
                                <span class="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-amber-300 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded-lg">
                                  <Clock size={11} />
                                  {formatTimelineTimeRange(item.start_time, item.end_time)}
                                </span>

                                {#if isLiveNow}
                                  <span class="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-300 bg-emerald-400/10 border border-emerald-400/25 px-2 py-0.5 rounded-full">
                                    <span class="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                    Live
                                  </span>
                                {:else if isPast}
                                  <span class="inline-flex items-center gap-1 text-[10px] font-semibold text-ink-600 px-2 py-0.5 rounded-full border border-white/5 bg-white/3">
                                    <CheckCheck size={10} /> Done
                                  </span>
                                {/if}

                                <span class="ml-auto text-[10px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full border {style.bg} {style.text} {style.border}">
                                  {item.category || 'General'}
                                </span>
                              </div>

                              <!-- Title -->
                              <h4 class="text-sm font-bold text-white leading-snug mb-1.5 {isPast ? 'text-ink-300' : ''}">{item.title}</h4>

                              <!-- Description -->
                              {#if item.description}
                                <p class="text-xs leading-relaxed text-ink-400 mb-3">{item.description}</p>
                              {/if}

                              <!-- Speaker + Location footer -->
                              {#if item.speaker_name || item.location}
                                <div class="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-white/6">
                                  {#if item.speaker_name}
                                    <div class="flex items-center gap-2.5">
                                      {#if item.speaker_avatar_url}
                                        <img
                                          src={item.speaker_avatar_url}
                                          alt={item.speaker_name}
                                          class="h-7 w-7 rounded-full object-cover border-2 border-white/15 shadow-md"
                                        />
                                      {:else}
                                        <div class="h-7 w-7 rounded-full {style.bg} border {style.border} flex items-center justify-center text-[11px] font-black {style.text}">
                                          {item.speaker_name.charAt(0).toUpperCase()}
                                        </div>
                                      {/if}
                                      <div class="leading-tight">
                                        <p class="text-xs font-bold text-white">{item.speaker_name}</p>
                                        {#if item.speaker_role}
                                          <p class="text-[10px] text-ink-500">{item.speaker_role}</p>
                                        {/if}
                                      </div>
                                    </div>
                                  {/if}

                                  {#if item.location}
                                    <button
                                      type="button"
                                      onclick={() => jumpToVenueLocation(item.location)}
                                      class="inline-flex items-center gap-1.5 text-[11px] font-semibold text-ink-300 bg-white/4 hover:bg-amber-400/12 hover:text-amber-300 hover:border-amber-400/25 transition-all px-2.5 py-1 rounded-lg border border-white/8 cursor-pointer"
                                      title={currentEvent.is_venue_enabled ? `View ${item.location} on Venue Map` : item.location}
                                    >
                                      <MapPin size={11} class="text-amber-400" />
                                      {item.location}
                                    </button>
                                  {/if}
                                </div>
                              {/if}
                            </div>
                          </div>
                        </div>
                      {/each}
                    </div>
                  </div>
                {/if}
              </div>

            </div>
          </Tabs.Content>

          <!-- Attendees Tab -->
          <Tabs.Content value="attendees" class="mt-4">
            <div class="space-y-6">
              <!-- Attendees Header with Search and Refresh -->
              <div
                class="glass rounded-2xl border border-white/8 p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              >
                <div>
                  <div class="flex items-center gap-2 mb-1">
                    <Users size={18} class="text-indigo-400" />
                    <h2 class="text-xl font-bold text-white">Joined Attendees</h2>
                  </div>
                  <p class="text-xs text-ink-400">
                    Explore all members who have joined {currentEvent.name} and build your network.
                  </p>
                </div>

                <div class="flex items-center gap-3 w-full sm:w-auto">
                  <div class="relative flex-1 sm:w-64">
                    <Search
                      size={15}
                      class="absolute left-3 top-1/2 -translate-y-1/2 text-ink-500"
                    />
                    <Input
                      type="search"
                      placeholder="Search by name, role, bio..."
                      value={attendeeSearchQuery}
                      oninput={handleAttendeeSearchInput}
                      class="pl-9 bg-white/5 border-white/10 text-white placeholder:text-ink-500 h-9 text-xs focus:border-indigo-400/50 focus:ring-indigo-400/20"
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    class="h-9 w-9 border-white/10 text-ink-300 hover:text-white hover:bg-white/10 shrink-0"
                    onclick={() => fetchAttendees()}
                    disabled={loadingAttendees}
                    title="Refresh Attendees"
                  >
                    <RefreshCw
                      size={15}
                      class={loadingAttendees ? "animate-spin" : ""}
                    />
                  </Button>
                </div>
              </div>

              <!-- Attendees Grid / Skeleton / Empty state -->
              {#if loadingAttendees && !attendeesList.length}
                <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {#each Array(6) as _}
                    <div
                      class="glass rounded-2xl border border-white/8 p-5 space-y-4 animate-pulse"
                    >
                      <div class="flex items-center gap-3">
                        <div class="h-12 w-12 rounded-full bg-white/10"></div>
                        <div class="space-y-2 flex-1">
                          <div class="h-4 w-28 rounded bg-white/10"></div>
                          <div class="h-3 w-20 rounded bg-white/10"></div>
                        </div>
                      </div>
                      <div class="h-12 rounded bg-white/5"></div>
                      <div class="h-9 rounded bg-white/10 w-full"></div>
                    </div>
                  {/each}
                </div>
              {:else if attendeesList.length === 0}
                <div
                  class="glass rounded-2xl border border-white/8 p-12 text-center flex flex-col items-center justify-center"
                >
                  <div
                    class="h-16 w-16 bg-white/5 rounded-full flex items-center justify-center mb-4"
                  >
                    <Ghost size={28} class="text-ink-500" />
                  </div>
                  <h3 class="text-white font-bold mb-1">No attendees found</h3>
                  <p class="text-sm text-ink-400 max-w-sm mb-4">
                    {#if attendeeSearchQuery}
                      No participants match "{attendeeSearchQuery}". Try a different search term.
                    {:else}
                      No joined attendees yet. Share this event link to get participants to join!
                    {/if}
                  </p>
                  {#if attendeeSearchQuery}
                    <Button
                      variant="outline"
                      size="sm"
                      onclick={() => {
                        attendeeSearchQuery = "";
                        fetchAttendees("");
                      }}
                    >
                      Clear Search
                    </Button>
                  {/if}
                </div>
              {:else}
                <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {#each attendeesList as attendee (attendee.user_id)}
                    <div
                      class="glass card-hover rounded-2xl border border-white/8 p-5 flex flex-col justify-between space-y-4 relative overflow-hidden"
                    >
                      <!-- Header: Avatar + Info -->
                      <div class="flex items-start gap-3">
                        <div
                          class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500/20 via-purple-500/20 to-pink-500/20 border border-indigo-400/30 text-indigo-200 font-bold text-lg shadow-inner"
                        >
                          {attendee.name ? attendee.name.charAt(0).toUpperCase() : "A"}
                        </div>
                        <div class="flex-1 min-w-0">
                          <div class="flex items-center gap-2 flex-wrap">
                            <h3 class="text-base font-bold text-white truncate">
                              {attendee.name}
                            </h3>
                            {#if attendee.is_host}
                              <Badge
                                variant="secondary"
                                class="gap-1 border-amber-400/30 bg-amber-400/10 text-amber-300 text-[10px] font-bold px-2 py-0.5"
                              >
                                <Crown size={11} /> Host
                              </Badge>
                            {/if}
                            {#if attendee.is_current_user}
                              <Badge
                                variant="secondary"
                                class="border-indigo-400/30 bg-indigo-400/10 text-indigo-300 text-[10px] font-bold px-2 py-0.5"
                              >
                                You
                              </Badge>
                            {/if}
                          </div>
                          <p class="text-xs text-indigo-300 font-medium truncate mt-0.5">
                            {attendee.role || "Participant"}
                          </p>
                        </div>
                      </div>

                      <!-- Bio & Looking For -->
                      <div class="space-y-2 flex-1">
                        {#if attendee.about}
                          <p
                            class="text-xs text-ink-300 line-clamp-3 leading-relaxed bg-white/4 p-2.5 rounded-xl border border-white/5"
                          >
                            {attendee.about}
                          </p>
                        {/if}

                        {#if attendee.looking_for}
                          <div class="pt-1">
                            <p
                              class="text-[10px] uppercase tracking-wider font-semibold text-ink-500 mb-1"
                            >
                              Looking For
                            </p>
                            <p
                              class="text-xs text-ink-300 bg-indigo-400/5 border border-indigo-400/15 p-2 rounded-lg line-clamp-2"
                            >
                              {attendee.looking_for}
                            </p>
                          </div>
                        {/if}
                      </div>

                      <!-- Action Button -->
                      <div class="pt-2 border-t border-white/6">
                        {#if attendee.is_current_user}
                          <Badge
                            variant="outline"
                            class="w-full justify-center py-2 text-ink-400 border-white/10 text-xs"
                          >
                            Your Profile
                          </Badge>
                        {:else if attendee.connectionStatus === "connected" || attendee.connectionStatus === "met"}
                          <Button
                            variant="secondary"
                            size="sm"
                            class="w-full gap-2 border-emerald-400/30 bg-emerald-400/10 text-emerald-300 hover:bg-emerald-400/20"
                            onclick={() => {
                              networkFilter = "connected";
                              activeTab.set("network");
                            }}
                          >
                            <CheckCheck size={14} /> Connected
                          </Button>
                        {:else if attendee.connectionStatus === "sent"}
                          <Button
                            variant="outline"
                            size="sm"
                            disabled
                            class="w-full gap-2 border-amber-400/30 bg-amber-400/10 text-amber-300 opacity-90 cursor-not-allowed"
                          >
                            <Clock size={14} /> Request Sent
                          </Button>
                        {:else if attendee.connectionStatus === "received"}
                          <Button
                            size="sm"
                            class="w-full gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:opacity-90 shadow-md"
                            onclick={() => handleAcceptAttendee(attendee)}
                          >
                            <UserCheck size={14} /> Accept Request
                          </Button>
                        {:else}
                          <Button
                            size="sm"
                            class="w-full gap-2 bg-indigo-600 text-white hover:bg-indigo-500 shadow-md"
                            disabled={connectingIds.includes(attendee.user_id)}
                            onclick={() => handleConnectAttendee(attendee)}
                          >
                            {#if connectingIds.includes(attendee.user_id)}
                              <LoaderCircle size={14} class="animate-spin" /> Connecting…
                            {:else}
                              <UserPlus size={14} /> Connect
                            {/if}
                          </Button>
                        {/if}
                      </div>
                    </div>
                  {/each}
                </div>
              {/if}
            </div>
          </Tabs.Content>

          <!-- Analytics tab -->
          <Tabs.Content value="analytics" class="mt-4">
            {#if data.isOrganizer && analytics}
              <div class="space-y-5">
                <div class="glass rounded-2xl border border-white/8 p-6">
                  <div
                    class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
                  >
                    <div>
                      <div class="flex items-center gap-2 mb-2">
                        <BarChart3 size={18} class="text-cyan-300" />
                        <p
                          class="text-xs font-bold uppercase tracking-widest text-cyan-300"
                        >
                          Organizer Analytics
                        </p>
                      </div>
                      <h2 class="text-2xl font-black text-white">
                        Event performance dashboard
                      </h2>
                      <p class="mt-2 max-w-2xl text-sm leading-6 text-ink-400">
                        Monitor participant engagement, AI match activity,
                        connection momentum, and QR meet completion for this
                        event.
                      </p>
                    </div>
                    <div
                      class="rounded-xl border border-amber-400/20 bg-amber-400/8 px-4 py-3 text-right"
                    >
                      <p
                        class="text-[10px] font-bold uppercase tracking-widest text-amber-300"
                      >
                        Live insight
                      </p>
                      <p class="mt-1 text-2xl font-black text-white">
                        {analytics.connectionAcceptanceRate}%
                      </p>
                      <p class="text-xs text-ink-400">acceptance rate</p>
                    </div>
                  </div>
                </div>

                <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {#each analyticsMetricCards as metric}
                    <div
                      class="glass card-hover rounded-2xl border border-white/8 p-5"
                    >
                      <p
                        class="text-[10px] font-bold uppercase tracking-widest text-ink-500"
                      >
                        {metric.label}
                      </p>
                      <p class="mt-3 text-3xl font-black text-white">
                        {metric.value}
                      </p>
                    </div>
                  {/each}
                </div>

                <div class="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
                  <div class="glass rounded-2xl border border-white/8 p-6">
                    <div class="mb-5 flex items-center gap-2">
                      <Network size={17} class="text-amber-300" />
                      <h3 class="text-lg font-bold text-white">
                        Networking Funnel
                      </h3>
                    </div>
                    <div class="space-y-4">
                      {#each analytics.networkingFunnel as step}
                        <div>
                          <div
                            class="mb-1.5 flex items-center justify-between gap-3"
                          >
                            <p class="text-sm font-semibold text-ink-200">
                              {step.label}
                            </p>
                            <p class="text-sm font-bold text-white">
                              {step.value}
                            </p>
                          </div>
                          <div
                            class="h-2 overflow-hidden rounded-full bg-white/8"
                          >
                            <div
                              class="h-full rounded-full bg-gradient-to-r from-amber-400 via-emerald-400 to-cyan-400"
                              style="width: {Math.max(
                                (step.value / maxFunnelValue) * 100,
                                step.value ? 8 : 2,
                              )}%"
                            ></div>
                          </div>
                        </div>
                      {/each}
                    </div>
                  </div>

                  <div class="glass rounded-2xl border border-white/8 p-6">
                    <div class="mb-5 flex items-center gap-2">
                      <TrendingUp size={17} class="text-emerald-300" />
                      <h3 class="text-lg font-bold text-white">
                        AI Organizer Summary
                      </h3>
                    </div>
                    <p class="text-sm leading-6 text-ink-300">
                      {analytics.organizerSummary}
                    </p>
                  </div>
                </div>

                <div class="grid gap-5 lg:grid-cols-2">
                  <div class="glass rounded-2xl border border-white/8 p-6">
                    <div class="mb-5 flex items-center gap-2">
                      <PieChart size={17} class="text-purple-300" />
                      <h3 class="text-lg font-bold text-white">Top Skills</h3>
                    </div>
                    <div class="space-y-3">
                      {#each analytics.topSkills as skill}
                        <div
                          class="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-white/4 px-4 py-3"
                        >
                          <p class="text-sm font-semibold text-white">
                            {skill.label}
                          </p>
                          <span
                            class="rounded-full bg-purple-400/15 px-2.5 py-1 text-[11px] font-bold text-purple-200"
                          >
                            {skill.count
                              ? `${skill.count} profile${skill.count === 1 ? "" : "s"}`
                              : "Waiting"}
                          </span>
                        </div>
                      {/each}
                    </div>
                  </div>

                  <div class="glass rounded-2xl border border-white/8 p-6">
                    <div class="mb-5 flex items-center gap-2">
                      <Target size={17} class="text-cyan-300" />
                      <h3 class="text-lg font-bold text-white">
                        Most Requested Networking Goals
                      </h3>
                    </div>
                    <div class="space-y-3">
                      {#each analytics.topGoals as goal}
                        <div
                          class="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-white/4 px-4 py-3"
                        >
                          <p class="text-sm font-semibold text-white">
                            {goal.label}
                          </p>
                          <span
                            class="rounded-full bg-cyan-400/15 px-2.5 py-1 text-[11px] font-bold text-cyan-200"
                          >
                            {goal.count
                              ? `${goal.count} mention${goal.count === 1 ? "" : "s"}`
                              : "Waiting"}
                          </span>
                        </div>
                      {/each}
                    </div>
                  </div>
                </div>
              </div>
            {:else}
              <div class="glass rounded-2xl border border-white/8 p-8 sm:p-10">
                <div
                  class="mx-auto grid max-w-4xl gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center"
                >
                  <div class="relative mx-auto h-56 w-full max-w-xs">
                    <div
                      class="absolute inset-0 rounded-2xl border border-cyan-400/20 bg-cyan-400/8"
                    ></div>
                    <div
                      class="absolute left-6 right-6 top-8 rounded-xl border border-white/10 bg-ink-950/70 p-4 shadow-glow-cyan"
                    >
                      <div class="mb-4 flex items-center justify-between">
                        <div class="flex items-center gap-2">
                          <BarChart3 size={17} class="text-cyan-300" />
                          <span
                            class="text-xs font-bold uppercase tracking-widest text-cyan-200"
                            >Analytics</span
                          >
                        </div>
                        <span class="h-2 w-2 rounded-full bg-emerald-300"
                        ></span>
                      </div>
                      <div class="space-y-3">
                        <div
                          class="h-2 w-3/4 rounded-full bg-amber-300/80"
                        ></div>
                        <div
                          class="h-2 w-full rounded-full bg-cyan-300/70"
                        ></div>
                        <div
                          class="h-2 w-1/2 rounded-full bg-emerald-300/70"
                        ></div>
                      </div>
                    </div>
                    <div
                      class="absolute bottom-7 left-10 flex h-20 w-20 items-center justify-center rounded-2xl border border-amber-400/20 bg-amber-400/10"
                    >
                      <LineChart size={34} class="text-amber-300" />
                    </div>
                    <div
                      class="absolute bottom-8 right-8 flex h-16 w-16 items-center justify-center rounded-2xl border border-purple-400/20 bg-purple-400/10"
                    >
                      <PieChart size={28} class="text-purple-300" />
                    </div>
                  </div>

                  <div class="text-center lg:text-left">
                    <p
                      class="mb-2 text-xs font-bold uppercase tracking-widest text-cyan-300"
                    >
                      Event insights
                    </p>
                    <h2 class="text-2xl font-black text-white">
                      Organizer Analytics
                    </h2>
                    <p
                      class="mx-auto mt-4 max-w-xl whitespace-pre-line text-sm leading-6 text-ink-300 lg:mx-0"
                    >
                      Detailed event analytics are only available to the event
                      organizer. Create your own event to unlock organizer
                      analytics and monitor participant engagement, AI matches,
                      networking activity, and event insights.
                    </p>
                    <Button onclick={goToCreateEvent} class="mt-6 gap-2">
                      <Plus size={16} />
                      Create Event
                    </Button>
                  </div>
                </div>
              </div>
            {/if}
          </Tabs.Content>

          <!-- Announcements tab -->
          <Tabs.Content value="announcements" class="mt-4">
            <div class="space-y-6 animate-fade-in">
              <!-- Action & Search Bar -->
              <div class="glass rounded-2xl border border-white/8 p-4 sm:p-5 relative overflow-hidden">
                <div class="absolute top-0 left-0 h-[2px] w-full bg-gradient-to-r from-rose-500 via-pink-400 to-amber-400"></div>

                <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <!-- Search input -->
                  <div class="relative flex-1">
                    <Search size={15} class="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
                    <Input
                      bind:value={announcementSearchQuery}
                      placeholder="Search announcements..."
                      class="pl-9 bg-white/5 border-white/10 text-white placeholder:text-ink-500 focus:border-rose-400/50 rounded-xl h-10 text-xs sm:text-sm"
                    />
                    {#if announcementSearchQuery}
                      <button
                        onclick={() => (announcementSearchQuery = "")}
                        class="absolute right-3 top-1/2 -translate-y-1/2 text-ink-500 hover:text-white"
                      >
                        <X size={14} />
                      </button>
                    {/if}
                  </div>

                  {#if data.isOrganizer && ownerViewMode === "organizer"}
                    <Button
                      onclick={openNewAnnouncementModal}
                      class="gap-1.5 bg-gradient-to-r from-rose-500 via-pink-500 to-rose-600 hover:from-rose-600 hover:to-pink-600 text-white font-semibold text-xs shadow-lg shadow-rose-500/20 shrink-0 h-10 px-4 rounded-xl border border-rose-400/30"
                    >
                      <Plus size={15} />
                      New Announcement
                    </Button>
                  {/if}
                </div>
              </div>

              <!-- Pinned Announcements Carousel (At Top, Max 3) -->
              {#if pinnedAnnouncements.length > 0 && !announcementSearchQuery}
                <div class="space-y-2">
                  <div class="flex items-center justify-between px-1">
                    <div class="flex items-center gap-2">
                      <Pin size={13} class="text-amber-400 rotate-45" />
                      <span class="text-xs font-bold uppercase tracking-widest text-amber-300">
                        Pinned Updates ({pinnedAnnouncements.length}/3)
                      </span>
                    </div>

                    <!-- Desktop Carousel Controls -->
                    {#if pinnedAnnouncements.length > 1}
                      <div class="hidden sm:flex items-center gap-1.5">
                        <button
                          onclick={() => pinnedSlideIndex = (pinnedSlideIndex - 1 + pinnedAnnouncements.length) % pinnedAnnouncements.length}
                          class="flex h-7 w-7 items-center justify-center rounded-lg border border-amber-400/30 bg-amber-400/10 hover:bg-amber-400/20 text-amber-300 transition-all"
                          aria-label="Previous pinned announcement"
                        >
                          <ChevronLeft size={14} />
                        </button>
                        <span class="text-[11px] font-semibold text-amber-300/80 px-1">
                          {pinnedSlideIndex + 1}/{pinnedAnnouncements.length}
                        </span>
                        <button
                          onclick={() => pinnedSlideIndex = (pinnedSlideIndex + 1) % pinnedAnnouncements.length}
                          class="flex h-7 w-7 items-center justify-center rounded-lg border border-amber-400/30 bg-amber-400/10 hover:bg-amber-400/20 text-amber-300 transition-all"
                          aria-label="Next pinned announcement"
                        >
                          <ChevronRight size={14} />
                        </button>
                      </div>
                    {/if}
                  </div>

                  <!-- Desktop Slide -->
                  <div class="hidden sm:block">
                    {#key pinnedSlideIndex}
                      {@const item = pinnedAnnouncements[pinnedSlideIndex || 0] || pinnedAnnouncements[0]}
                      <div in:slide={{ duration: 250 }} out:fade={{ duration: 150 }} class="relative overflow-hidden rounded-2xl border border-amber-400/40 bg-amber-400/5 p-4 sm:p-5 backdrop-blur-md">
                        <div class="flex items-start justify-between gap-4">
                          <div class="space-y-1 min-w-0 flex-1">
                            <div class="flex items-center gap-2 mb-1">
                              <span class="inline-flex items-center gap-1 rounded-full border border-amber-400/40 bg-amber-400/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-300">
                                <Pin size={9} class="rotate-45" /> Pinned
                              </span>
                              {#if item.priority === 'urgent'}
                                <span class="rounded-full border border-rose-500/40 bg-rose-500/15 px-2 py-0.5 text-[10px] font-bold uppercase text-rose-300">Urgent</span>
                              {:else if item.priority === 'high'}
                                <span class="rounded-full border border-amber-500/40 bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-300">High Priority</span>
                              {/if}
                              <span class="text-[11px] text-ink-400 flex items-center gap-1 ml-auto sm:ml-0">
                                <Clock size={10} /> {formatDateHuman(item.created_at)}
                              </span>
                            </div>
                            <!-- Title -->
                            <h4 class="text-base font-bold text-white truncate line-clamp-1">
                              {item.title}
                            </h4>
                            <!-- One line description -->
                            <p class="text-xs text-ink-300 line-clamp-1 truncate">
                              {item.content}
                            </p>
                          </div>

                          {#if data.isOrganizer && ownerViewMode === "organizer"}
                            <div class="flex items-center gap-1 shrink-0 bg-white/5 border border-white/10 rounded-xl p-1">
                              <button
                                onclick={() => togglePinAnnouncement(item)}
                                title="Unpin announcement"
                                class="p-1.5 rounded-lg text-amber-400 hover:bg-white/10 transition-colors"
                              >
                                <PinOff size={14} />
                              </button>
                              <button
                                onclick={() => openEditAnnouncementModal(item)}
                                title="Edit announcement"
                                class="p-1.5 rounded-lg text-ink-400 hover:text-indigo-300 hover:bg-white/10 transition-colors"
                              >
                                <Pencil size={14} />
                              </button>
                              <button
                                onclick={() => handleDeleteAnnouncement(item.id)}
                                disabled={deletingAnnouncementId === item.id}
                                title="Delete announcement"
                                class="p-1.5 rounded-lg text-ink-400 hover:text-rose-400 hover:bg-rose-500/15 transition-colors disabled:opacity-50"
                              >
                                {#if deletingAnnouncementId === item.id}
                                  <LoaderCircle size={14} class="animate-spin text-rose-400" />
                                {:else}
                                  <Trash2 size={14} />
                                {/if}
                              </button>
                            </div>
                          {/if}
                        </div>
                      </div>
                    {/key}
                  </div>

                  <!-- Mobile Slide + Touch Swipe + Dots -->
                  <div
                    class="flex sm:hidden flex-col gap-2.5"
                    role="region"
                    aria-label="Pinned announcements"
                    ontouchstart={(e) => { pinnedSwipeStartX = e.touches[0].clientX; }}
                    ontouchend={(e) => {
                      const dx = e.changedTouches[0].clientX - pinnedSwipeStartX;
                      if (Math.abs(dx) > 40 && pinnedAnnouncements.length > 1) {
                        if (dx < 0) pinnedSlideIndex = (pinnedSlideIndex + 1) % pinnedAnnouncements.length;
                        else pinnedSlideIndex = (pinnedSlideIndex - 1 + pinnedAnnouncements.length) % pinnedAnnouncements.length;
                      }
                    }}
                  >
                    {#key pinnedSlideIndex}
                      {@const item = pinnedAnnouncements[pinnedSlideIndex || 0] || pinnedAnnouncements[0]}
                      <div in:slide={{ duration: 200 }} out:fade={{ duration: 150 }} class="relative overflow-hidden rounded-2xl border border-amber-400/40 bg-amber-400/5 p-4 backdrop-blur-md w-full">
                        <div class="flex flex-col gap-1.5">
                          <div class="flex items-center justify-between gap-2">
                            <div class="flex items-center gap-1.5">
                              <span class="inline-flex items-center gap-1 rounded-full border border-amber-400/40 bg-amber-400/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-300">
                                <Pin size={9} class="rotate-45" /> Pinned
                              </span>
                              {#if item.priority === 'urgent'}
                                <span class="rounded-full border border-rose-500/40 bg-rose-500/15 px-2 py-0.5 text-[10px] font-bold uppercase text-rose-300">Urgent</span>
                              {/if}
                            </div>
                            {#if data.isOrganizer && ownerViewMode === "organizer"}
                              <div class="flex items-center gap-1 shrink-0">
                                <button
                                  onclick={() => togglePinAnnouncement(item)}
                                  class="p-1 text-amber-400"
                                >
                                  <PinOff size={13} />
                                </button>
                                <button
                                  onclick={() => openEditAnnouncementModal(item)}
                                  class="p-1 text-ink-400 hover:text-white"
                                >
                                  <Pencil size={13} />
                                </button>
                              </div>
                            {/if}
                          </div>
                          <!-- Title -->
                          <h4 class="text-sm font-bold text-white truncate line-clamp-1">
                            {item.title}
                          </h4>
                          <!-- One line description -->
                          <p class="text-xs text-ink-300 line-clamp-1 truncate">
                            {item.content}
                          </p>
                        </div>
                      </div>
                    {/key}

                    <!-- Dots indicator -->
                    {#if pinnedAnnouncements.length > 1}
                      <div class="flex items-center justify-center gap-1.5 pt-1">
                        {#each pinnedAnnouncements as _, i}
                          <button
                            onclick={() => pinnedSlideIndex = i}
                            aria-label="Go to pinned announcement {i + 1}"
                            class="h-1.5 rounded-full transition-all duration-300 {pinnedSlideIndex === i ? 'w-4 bg-amber-400' : 'w-1.5 bg-amber-400/30'}"
                          ></button>
                        {/each}
                      </div>
                    {/if}
                  </div>
                </div>
              {/if}

              <!-- Announcements Cards Feed -->
              {#if filteredAnnouncements.length === 0}
                <div class="glass rounded-2xl border border-white/8 p-12 text-center space-y-4">
                  <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
                    <Megaphone size={24} />
                  </div>
                  <div class="space-y-1">
                    <h3 class="text-base font-bold text-white">
                      {#if announcementSearchQuery}
                        No matching announcements found
                      {:else}
                        No announcements yet
                      {/if}
                    </h3>
                    <p class="text-xs text-ink-400 max-w-md mx-auto">
                      {#if announcementSearchQuery}
                        Try adjusting your search query.
                      {:else}
                        Organizers haven't posted any announcements for this event yet. Check back soon for updates!
                      {/if}
                    </p>
                  </div>
                  {#if data.isOrganizer && ownerViewMode === "organizer" && !announcementSearchQuery}
                    <Button onclick={openNewAnnouncementModal} variant="outline" class="gap-2 border-rose-500/30 text-rose-300 hover:bg-rose-500/10 mt-2 text-xs">
                      <Plus size={14} />
                      Post First Announcement
                    </Button>
                  {/if}
                </div>
              {:else}
                <div class="space-y-4">
                  {#each filteredAnnouncements as item (item.id)}
                    <div
                      class="relative overflow-hidden rounded-2xl border transition-all duration-200 {getPriorityBorderClass(item.priority)}"
                    >
                      <div class="p-5 sm:p-6 space-y-3">
                        <!-- Header Row -->
                        <div class="flex flex-wrap items-start justify-between gap-3">
                          <div class="space-y-1.5 flex-1 min-w-[240px]">
                            <div class="flex flex-wrap items-center gap-2">
                              {#if item.is_pinned}
                                <span class="inline-flex items-center gap-1 rounded-full border border-amber-400/40 bg-amber-400/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-300">
                                  <Pin size={10} class="rotate-45" /> Pinned
                                </span>
                              {/if}

                              <!-- Priority Pill -->
                              {#if item.priority === 'urgent'}
                                <span class="inline-flex items-center gap-1 rounded-full border border-rose-500/40 bg-rose-500/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-rose-300">
                                  Urgent
                                </span>
                              {:else if item.priority === 'high'}
                                <span class="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-300">
                                  High Priority
                                </span>
                              {:else if item.priority === 'low'}
                                <span class="inline-flex items-center gap-1 rounded-full border border-slate-500/30 bg-slate-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                  Low Priority
                                </span>
                              {/if}

                              <span class="text-[11px] font-medium text-ink-400 flex items-center gap-1">
                                <Clock size={11} class="text-ink-500" />
                                {formatDateHuman(item.created_at)}
                              </span>
                            </div>

                            <h3 class="text-lg sm:text-xl font-bold text-white tracking-tight leading-snug">
                              {item.title}
                            </h3>
                          </div>

                          <!-- Organizer Action Buttons -->
                          {#if data.isOrganizer && ownerViewMode === "organizer"}
                            <div class="flex items-center gap-1.5 shrink-0 bg-white/5 border border-white/8 rounded-xl p-1">
                              <button
                                onclick={() => togglePinAnnouncement(item)}
                                title={item.is_pinned ? "Unpin announcement" : "Pin announcement to top (max 3)"}
                                class="p-2 rounded-lg text-ink-400 hover:text-amber-300 hover:bg-white/10 transition-colors"
                              >
                                {#if item.is_pinned}
                                  <PinOff size={14} class="text-amber-400" />
                                {:else}
                                  <Pin size={14} class="rotate-45" />
                                {/if}
                              </button>
                              <button
                                onclick={() => openEditAnnouncementModal(item)}
                                title="Edit announcement"
                                class="p-2 rounded-lg text-ink-400 hover:text-indigo-300 hover:bg-white/10 transition-colors"
                              >
                                <Pencil size={14} />
                              </button>
                              <button
                                onclick={() => handleDeleteAnnouncement(item.id)}
                                disabled={deletingAnnouncementId === item.id}
                                title="Delete announcement"
                                class="p-2 rounded-lg text-ink-400 hover:text-rose-400 hover:bg-rose-500/15 transition-colors disabled:opacity-50"
                              >
                                {#if deletingAnnouncementId === item.id}
                                  <LoaderCircle size={14} class="animate-spin text-rose-400" />
                                {:else}
                                  <Trash2 size={14} />
                                {/if}
                              </button>
                            </div>
                          {/if}
                        </div>

                        <!-- Content Text -->
                        <div class="text-sm leading-relaxed text-ink-200 whitespace-pre-wrap font-normal">
                          {item.content}
                        </div>
                      </div>
                    </div>
                  {/each}
                </div>
              {/if}
            </div>
          </Tabs.Content>

          <!-- Networking profile dialog (portaled outside) -->
          <Dialog.Root bind:open={editProfileOpen}>
            <Dialog.Content
              class="sm:max-w-2xl bg-[#0f0f11] border border-white/10 text-white max-h-[90vh] overflow-y-auto"
            >
              <Dialog.Header class="hidden">
                <Dialog.Title>Edit networking profile</Dialog.Title>
              </Dialog.Header>
              <div class="flex items-center gap-2 mb-5">
                <UserCircle2 size={15} class="text-white" />
                <p
                  class="text-xs font-bold uppercase tracking-widest text-white"
                >
                  Edit networking profile
                </p>
              </div>

              <!-- AI Auto-fill section in Edit Modal -->
              <div
                class="rounded-xl border border-cyan-400/20 bg-cyan-400/5 p-4 mb-5"
              >
                <p
                  class="text-[10px] font-bold uppercase tracking-widest text-cyan-300 mb-2 flex items-center gap-1.5"
                >
                  <Brain size={12} /> Magic AI Auto-Fill
                </p>
                <textarea
                  bind:value={aiProfileText}
                  placeholder="Paste your LinkedIn About section or a short bio here..."
                  class="min-h-[80px] w-full rounded-xl border border-white/10 bg-white/4 p-3 text-xs leading-5 text-white placeholder:text-ink-600 shadow-inner outline-none transition focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/15 mb-3"
                ></textarea>
                <div class="relative group w-full">
                  <Button
                    variant="outline"
                    onclick={generateAiProfile}
                    disabled={aiGenerating || !aiProfileText.trim()}
                    class="w-full h-8 text-xs border-cyan-400/20 text-cyan-300 hover:bg-cyan-400/10"
                  >
                    {#if aiGenerating}
                      <LoaderCircle size={12} class="animate-spin mr-2" />
                      Generating fields...
                    {:else}
                      <Sparkles size={12} class="mr-2" />
                      Auto-fill below fields
                    {/if}
                  </Button>
                  <div
                    class="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 transition-opacity group-hover:opacity-100 flex items-center justify-center rounded-lg bg-white/10 backdrop-blur-md border border-white/20 px-3 py-1.5 text-[10px] font-bold text-white shadow-[0_0_15px_rgba(255,255,255,0.1)] whitespace-nowrap z-50"
                  >
                    Uses 1 AI credit
                  </div>
                </div>
                {#if aiGenerationError}
                  <p class="mt-2 text-[10px] text-amber-400">
                    {aiGenerationError}
                  </p>
                {/if}
              </div>
              <div class="grid gap-4 sm:grid-cols-2 mb-5">
                {#each profileFields as field}
                  <div class="space-y-1.5">
                    <Label
                      for={field.wsId}
                      class="text-xs font-semibold uppercase tracking-widest text-ink-400"
                    >
                      {field.label}
                    </Label>
                    {#if field.key === "whoTheyAre"}
                      <Input
                        id={field.wsId}
                        bind:value={networkingProfile[field.key]}
                        class="bg-white/4 border-white/10 text-white focus:border-amber-400/50 focus:ring-amber-400/20"
                      />
                    {:else}
                      <textarea
                        id={field.wsId}
                        bind:value={networkingProfile[field.key]}
                        class="bg-white/4 border-white/10 text-white placeholder:text-ink-600 focus:border-amber-400/50 focus:ring-amber-400/20 w-full rounded-md p-2"
                        rows="4"
                        maxlength="500"
                      ></textarea>
                      <div class="flex justify-between mt-1">
                        <span class="text-[10px] text-amber-500/80"
                          >{(networkingProfile[field.key]?.length || 0) < 20
                            ? "Minimum 20 characters required"
                            : ""}</span
                        >
                        <span class="text-[10px] text-ink-500 text-right"
                          >{networkingProfile[field.key]?.length || 0} / 500</span
                        >
                      </div>
                    {/if}
                  </div>
                {/each}
              </div>
              <div class="flex flex-wrap gap-3">
                <Button
                  onclick={saveProfile}
                  disabled={savingProfile || !profileValid}
                  class="gap-2"
                >
                  {#if savingProfile}
                    <LoaderCircle size={15} class="animate-spin" />
                    Saving…
                  {:else}
                    <CheckCircle2 size={15} />
                    Save changes
                  {/if}
                </Button>
              </div>

              {#if savingProfile}
                <AmdAiLoading
                  message="AI is working..."
                  detail="Generating embeddings and saving your networking profile."
                  class="mt-4"
                />
              {/if}
            </Dialog.Content>
          </Dialog.Root>

{#if Boolean(currentEvent.is_network_enabled)}
          <!-- Network tab (unified Matches + Connections) -->
          <Tabs.Content value="network" class="mt-4">
            {#if !hasCompletedProfile}
              <!-- ─── PROFILE STAGE IN NETWORK TAB ─── -->
              <div class="mx-auto max-w-5xl animate-slide-up my-4">
                <div
                  class="glass rounded-3xl border border-violet-400/15 overflow-hidden"
                >
                  <div
                    class="h-1 bg-gradient-to-r from-violet-400 via-cyan-400/70 to-transparent"
                  ></div>
                  <div class="p-5 sm:p-6 space-y-4">
                    {#if profileFillMode === "ai"}
                      <!-- ── AI Auto-Fill Mode ── -->
                      <div class="space-y-2">
                        <Badge
                          variant="secondary"
                          class="gap-2 border-violet-400/20 bg-violet-400/8 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-violet-200"
                        >
                          <Brain size={12} class="text-violet-300" />
                          AI onboarding
                        </Badge>
                        <div class="space-y-2">
                          <h1
                            class="text-2xl font-black tracking-tight text-white sm:text-3xl"
                          >
                            ✨ Magic AI Profile Auto-Fill
                          </h1>
                          <p class="max-w-xl text-sm leading-6 text-ink-300">
                            Paste a short bio or LinkedIn blurb. The AI will turn it into
                            a networking profile for review.
                          </p>
                        </div>
                      </div>

                      <div class="mx-auto w-full max-w-2xl space-y-3">
                        <div
                          class="rounded-2xl border border-white/8 bg-white/4 px-3 py-2"
                        >
                          <p
                            class="text-[10px] font-bold uppercase tracking-widest text-cyan-300"
                          >
                            Examples you can paste
                          </p>
                          <div
                            class="mt-2 flex flex-wrap gap-2 text-[11px] leading-5 text-ink-300"
                          >
                            <span
                              class="rounded-full border border-white/8 bg-white/5 px-2.5 py-1"
                              >LinkedIn About</span
                            >
                            <span
                              class="rounded-full border border-white/8 bg-white/5 px-2.5 py-1"
                              >Resume summary</span
                            >
                            <span
                              class="rounded-full border border-white/8 bg-white/5 px-2.5 py-1"
                              >Startup bio</span
                            >
                            <span
                              class="rounded-full border border-white/8 bg-white/5 px-2.5 py-1"
                              >Goals + skills</span
                            >
                          </div>
                        </div>

                        <Label
                          for="ai-profile-input"
                          class="text-[10px] font-semibold uppercase tracking-widest text-ink-400"
                        >
                          Your background
                        </Label>
                        <textarea
                          id="ai-profile-input"
                          bind:value={aiProfileText}
                          placeholder={`Hi, I'm Ravi.\n\nI'm a Spring Boot developer with experience building SaaS products and AI applications.\n\nI'm currently building an AI healthcare startup and I'm attending this event to meet technical co-founders, investors and AI engineers.`}
                          class="min-h-[180px] w-full rounded-2xl border border-white/10 bg-white/4 p-3 text-sm leading-6 text-white placeholder:text-ink-600 shadow-inner outline-none transition focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/15"
                        ></textarea>

                        {#if aiGenerating}
                          <AmdAiLoading
                            message="AI is working..."
                            detail="Building your networking profile draft from your input."
                          />
                        {/if}

                        {#if aiGenerationError}
                          <div
                            class="rounded-2xl border border-amber-400/20 bg-amber-400/8 p-3 text-sm text-amber-100"
                          >
                            <p class="font-semibold">Could not generate your profile.</p>
                            <p class="mt-1 leading-6 text-amber-100/85">
                              {aiGenerationError}
                            </p>
                            <div class="mt-3">
                              <Button
                                variant="outline"
                                class="h-9 border-amber-300/20 px-3 text-xs text-amber-100 hover:bg-amber-400/10"
                                onclick={generateAiProfile}
                                disabled={aiGenerating}
                              >
                                Retry
                              </Button>
                            </div>
                          </div>
                        {/if}

                        <div class="flex flex-wrap items-center justify-between gap-2">
                          <p class="text-[11px] text-ink-400">
                            The AI will generate a draft you can edit.
                          </p>
                          <span
                            class="text-[10px] uppercase tracking-widest text-ink-500"
                          >
                            Review first
                          </span>
                        </div>

                        <div class="flex flex-wrap justify-center gap-2 pt-1">
                          <Button
                            id="generate-profile-btn"
                            onclick={generateAiProfile}
                            disabled={aiGenerating || !aiProfileText.trim()}
                            class="h-10 gap-2 px-4 text-sm"
                          >
                            {#if aiGenerating}
                              <LoaderCircle size={15} class="animate-spin" />
                              Generating profile…
                            {:else}
                              <Sparkles size={15} />
                              Generate My Profile
                            {/if}
                          </Button>
                          <Button
                            variant="secondary"
                            onclick={skipAiGeneration}
                            class="h-10 gap-2 px-4 text-sm"
                          >
                            Fill manually
                          </Button>
                        </div>
                      </div>
                    {:else}
                      <!-- ── AI ONBOARDING MANUAL FORM MODE ── -->
                      <div class="space-y-2">
                        <div class="flex items-center justify-between">
                          <Badge
                            variant="secondary"
                            class="gap-2 border-violet-400/20 bg-violet-400/8 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-violet-200"
                          >
                            <Brain size={12} class="text-violet-300" />
                            AI onboarding
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            class="h-8 text-xs text-cyan-300 hover:bg-cyan-400/10 gap-1.5 font-semibold"
                            onclick={() => (profileFillMode = "ai")}
                          >
                            <Sparkles size={13} />
                            ✨ Use AI Auto-Fill
                          </Button>
                        </div>
                        <div class="space-y-2">
                          <h1
                            class="text-2xl font-black tracking-tight text-white sm:text-3xl"
                          >
                            📝 Fill Networking Profile
                          </h1>
                          <p class="max-w-xl text-sm leading-6 text-ink-300">
                            Enter your details manually. The AI will use these details to find your matches.
                          </p>
                        </div>
                      </div>

                      <div class="mx-auto w-full max-w-2xl space-y-4 pt-2">
                        <div class="grid gap-4 sm:grid-cols-2">
                          {#each profileFields as field}
                            <div class="space-y-1.5">
                              <Label
                                for={field.wsId}
                                class="text-[10px] font-semibold uppercase tracking-widest text-ink-400"
                              >
                                {field.label}
                              </Label>
                              {#if field.key === "whoTheyAre"}
                                <Input
                                  id={field.wsId}
                                  bind:value={networkingProfile[field.key]}
                                  placeholder="Your name or headline"
                                  class="rounded-xl border border-white/10 bg-white/4 p-3 text-sm text-white placeholder:text-ink-600 focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/15"
                                />
                              {:else}
                                <textarea
                                  id={field.wsId}
                                  bind:value={networkingProfile[field.key]}
                                  placeholder={field.key === 'whatTheyDo' ? 'Describe your skills, background and experience (min 20 chars)...' : field.key === 'whoTheyWant' ? 'Describe who you want to meet at this event (min 20 chars)...' : 'Share any extra background or goals...'}
                                  class="min-h-[100px] w-full rounded-2xl border border-white/10 bg-white/4 p-3 text-xs leading-5 text-white placeholder:text-ink-600 outline-none transition focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/15"
                                  rows="3"
                                  maxlength="500"
                                ></textarea>
                                <div class="flex justify-between mt-1">
                                  <span class="text-[10px] text-amber-400/90 font-medium"
                                    >{(networkingProfile[field.key]?.length || 0) < 20
                                      ? "Minimum 20 characters required"
                                      : ""}</span
                                  >
                                  <span class="text-[10px] text-ink-500 text-right"
                                    >{networkingProfile[field.key]?.length || 0} / 500</span
                                  >
                                </div>
                              {/if}
                            </div>
                          {/each}
                        </div>

                        <div class="flex flex-wrap justify-center gap-3 pt-3">
                          <Button
                            onclick={saveProfile}
                            disabled={savingProfile || !profileValid}
                            class="h-10 px-6 gap-2 text-sm font-bold bg-gradient-to-r from-violet-500 to-cyan-500 hover:from-violet-600 hover:to-cyan-600 text-white shadow-lg shadow-violet-500/20"
                          >
                            {#if savingProfile}
                              <LoaderCircle size={15} class="animate-spin" />
                              Saving Profile…
                            {:else}
                              <CheckCircle2 size={15} />
                              Save Profile
                            {/if}
                          </Button>
                        </div>

                        {#if savingProfile}
                          <AmdAiLoading
                            message="AI is working..."
                            detail="Generating embeddings and saving your networking profile."
                            class="mt-4"
                          />
                        {/if}
                      </div>
                    {/if}
                  </div>
                </div>
              </div>
            {:else}
            <!-- Network Header -->
            <div class="glass rounded-2xl border border-white/8 p-4 sm:p-5 mb-5">
              <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div class="flex items-center gap-3">
                  <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-400/10 border border-violet-400/20">
                    <Network size={18} class="text-violet-300" />
                  </div>
                  <div>
                    <h2 class="text-base font-bold text-white">Network</h2>
                    <p class="text-xs text-ink-400">Discover matches & manage your connections</p>
                  </div>
                </div>

                <div class="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    class="gap-1.5 border-white/10 text-ink-300 hover:text-white hover:bg-white/10 h-8 text-xs"
                    onclick={() => (editProfileOpen = true)}
                  >
                    <UserCircle2 size={14} /> Edit Profile
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    class="gap-1.5 border-white/10 text-ink-300 hover:text-white hover:bg-white/10 h-8 text-xs"
                    onclick={refreshFromDb}
                    disabled={refreshingFromDb}
                    title="Refresh matches from database"
                  >
                    {#if refreshingFromDb}<LoaderCircle size={13} class="animate-spin" />{:else}<RefreshCcw size={13} />{/if}
                    Refresh
                  </Button>
                  <Button
                    size="sm"
                    class="gap-1.5 h-8 text-xs"
                    onclick={() => (findMatchesModalOpen = true)}
                    disabled={refreshingMatches}
                  >
                    {#if refreshingMatches}<LoaderCircle size={13} class="animate-spin" />{:else}<Sparkles size={13} />{/if}
                    {refreshingMatches ? "Finding…" : "Find Matches"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    class="gap-1.5 border-white/10 text-ink-300 hover:text-white hover:bg-white/10 h-8 text-xs"
                    onclick={() => (dummyModalOpen = true)}
                  >
                    <Users size={13} /> Simulation
                  </Button>
                </div>
              </div>
            </div>

            <!-- Sub-filter pill navigation -->
            <div class="flex flex-wrap items-center gap-2 mb-5">
              {#each [
                { value: "matches", label: "✨ AI Matches", count: $matchesStore.length, color: "amber" },
                { value: "received", label: "📥 Received", count: $connectionsStore.filter(c => c.receiver_user_id === data.user?.id && c.status === 'pending').length, color: "violet" },
                { value: "connected", label: "🤝 Connected", count: $connectionsStore.filter(c => (c.sender_user_id === data.user?.id || c.receiver_user_id === data.user?.id) && c.status === 'accepted').length, color: "emerald" },
                { value: "sent", label: "📤 Sent", count: $connectionsStore.filter(c => c.sender_user_id === data.user?.id && c.status === 'pending').length, color: "cyan" },
                { value: "met", label: "📍 Met", count: $connectionsStore.filter(c => (c.sender_user_id === data.user?.id || c.receiver_user_id === data.user?.id) && c.status === 'accepted' && !!c.met_at).length, color: "teal" },
              ] as pill}
                <button
                  onclick={() => { networkFilter = pill.value; if (pill.value !== 'matches') connectionFilter = pill.value; }}
                  class="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all border
                    {networkFilter === pill.value
                      ? 'bg-violet-400/20 border-violet-400/40 text-violet-200 shadow-[0_0_12px_rgba(167,139,250,0.2)]'
                      : 'bg-white/4 border-white/8 text-ink-400 hover:text-white hover:border-white/20'}"
                >
                  {pill.label}
                  {#if pill.count > 0}
                    <span class="rounded-full px-1.5 py-0.5 text-[10px] font-bold
                      {networkFilter === pill.value ? 'bg-violet-400/30 text-violet-100' : 'bg-white/10 text-ink-300'}"
                    >{pill.count}</span>
                  {/if}
                </button>
              {/each}

              <!-- Refresh connections -->
              <button
                onclick={fetchAllConnections}
                disabled={loadingConnections}
                class="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border border-white/8 bg-white/4 text-ink-400 hover:text-white hover:border-white/20 transition-all"
              >
                <RefreshCw size={13} class={loadingConnections ? 'animate-spin' : ''} />
                Sync
              </button>
            </div>

            <!-- ── AI MATCHES view ── -->
            {#if networkFilter === "matches"}
              {#if refreshingMatches}
                <AmdAiLoading
                  message="AI is working..."
                  detail="Finding your best networking matches."
                  class="mb-6"
                />
                <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {#each Array(3) as _}
                    <div class="glass card-hover rounded-2xl border border-white/8 h-[350px] animate-pulse bg-white/5"></div>
                  {/each}
                </div>
              {:else if refreshingFromDb}
                <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {#each Array(3) as _}
                    <div class="glass card-hover rounded-2xl border border-white/8 h-[350px] animate-pulse bg-white/5"></div>
                  {/each}
                </div>
              {:else if $matchesStore.length}
                <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {#each $matchesStore as match, i}
                    {@const conn = $connectionsStore.find(
                      (c) =>
                        c.sender_user_id === match.user_id ||
                        c.receiver_user_id === match.user_id,
                    )}
                    <div
                      class="glass card-hover rounded-2xl border border-white/8 overflow-hidden"
                    >
                      <!-- Match strength bar -->
                      <div
                        class="h-0.5 bg-gradient-to-r from-amber-400 to-cyan-400"
                        style="width: {match.matchPercentage ?? 50}%"
                      ></div>

                      <div class="flex-1 flex flex-col p-5">
                        <Tabs.Root
                          value="ai-insights"
                          class="flex-1 flex flex-col"
                        >
                          <Tabs.List
                            class="grid w-full grid-cols-2 mb-4 bg-white/5 border border-white/10 rounded-xl p-1"
                          >
                            <Tabs.Trigger
                              value="ai-insights"
                              class="rounded-lg text-xs font-semibold data-[state=active]:bg-cyan-400/20 data-[state=active]:text-cyan-300"
                            >
                              🤖 AI Insights
                            </Tabs.Trigger>
                            <Tabs.Trigger
                              value="profile"
                              class="rounded-lg text-xs font-semibold data-[state=active]:bg-white/10 data-[state=active]:text-white"
                            >
                              👤 Profile
                            </Tabs.Trigger>
                          </Tabs.List>

                          <!-- AI Insights Tab -->
                          <Tabs.Content
                            value="ai-insights"
                            class="flex-1 space-y-4 outline-none m-0"
                          >
                            <div
                              class="flex items-start justify-between gap-3 mb-2"
                            >
                              <div>
                                <h3 class="text-base font-bold text-white">
                                  {match.name}
                                </h3>
                                <p class="mt-0.5 text-xs text-ink-400">
                                  AI Match Analysis
                                </p>
                              </div>
                              <span
                                class="shrink-0 rounded-full border border-amber-400/25 bg-amber-400/8 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-amber-300"
                              >
                                {match.matchPercentage ?? "—"}% Match
                              </span>
                            </div>

                            {#if match.explanation}
                              <div
                                class="rounded-xl border border-cyan-400/15 bg-cyan-400/6 p-4"
                              >
                                <p
                                  class="text-[10px] font-bold uppercase tracking-widest text-cyan-300 mb-2"
                                >
                                  Why this match
                                </p>
                                <p class="text-sm leading-6 text-ink-300">
                                  {match.explanation}
                                </p>
                              </div>
                            {:else}
                              <div
                                class="rounded-xl border border-white/5 bg-white/5 p-4 text-center"
                              >
                                <p class="text-xs text-ink-400">
                                  No detailed AI insights available for this
                                  match.
                                </p>
                              </div>
                            {/if}
                          </Tabs.Content>

                          <!-- Profile Tab -->
                          <Tabs.Content
                            value="profile"
                            class="flex-1 space-y-4 outline-none m-0"
                          >
                            <div
                              class="flex items-start justify-between gap-3 mb-2"
                            >
                              <div>
                                <h3 class="text-base font-bold text-white">
                                  {match.name}
                                </h3>
                                <p class="mt-0.5 text-xs text-ink-400">
                                  {match.role}{match.company
                                    ? ` · ${match.company}`
                                    : ""}
                                </p>
                              </div>
                            </div>

                            <div class="space-y-3">
                              <div>
                                <p
                                  class="text-[10px] font-bold uppercase tracking-widest text-ink-500 mb-1"
                                >
                                  About Me
                                </p>
                                <p class="text-xs leading-5 text-ink-300">
                                  {match.about}
                                </p>
                              </div>
                            </div>

                            {#if match.tags?.length}
                              <div class="flex flex-wrap gap-1.5 pt-2">
                                {#each match.tags.slice(0, 4) as tag}
                                  <span
                                    class="rounded-full border border-white/8 bg-white/4 px-2.5 py-1 text-[10px] text-ink-400"
                                  >
                                    #{tag}
                                  </span>
                                {/each}
                              </div>
                            {/if}
                          </Tabs.Content>
                        </Tabs.Root>
                        <!-- Connect Button -->
                        <div class="pt-4 mt-auto">
                          {#if !conn || conn.status === "cancelled"}
                            <Button
                              class="w-full bg-white text-black hover:bg-white/90 gap-2"
                              disabled={connectingIds.includes(match.user_id)}
                              onclick={() => connectUser(match)}
                            >
                              {#if connectingIds.includes(match.user_id)}
                                <LoaderCircle size={16} class="animate-spin" /> Connecting...
                              {:else}
                                <Users size={16} /> Connect
                              {/if}
                            </Button>
                          {:else if conn.status === "pending" && conn.sender_user_id === data.user?.id}
                            <Button
                              variant="outline"
                              class="w-full gap-2 text-ink-300 border-ink-600 hover:text-white"
                              onclick={() =>
                                updateConnection(conn.id, "cancelled")}
                            >
                              Cancel Request
                            </Button>
                          {:else if conn.status === "pending" && conn.receiver_user_id === data.user?.id}
                            <Button
                              variant="outline"
                              class="w-full gap-2 text-amber-300 border-amber-600/50"
                              disabled
                            >
                              Pending Response
                            </Button>
                          {:else if conn.status === "accepted"}
                            <Button
                              variant="secondary"
                              class="w-full gap-2 bg-purple-500/20 text-purple-300 border border-purple-500/30"
                              disabled
                            >
                              <CheckCircle2 size={16} /> Connected
                            </Button>
                          {:else if conn.status === "rejected"}
                            <Button
                              variant="outline"
                              class="w-full gap-2 text-red-400 border-red-500/30"
                              disabled
                            >
                              Rejected
                            </Button>
                          {/if}
                        </div>
                      </div>
                    </div>
                  {/each}
                </div>
              {:else}
                <div
                  class="glass rounded-2xl border border-white/8 border-dashed p-12 text-center"
                >
                  <div
                    class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-400/10 border border-amber-400/20"
                  >
                    <Brain size={22} class="text-amber-300" />
                  </div>
                  <h3 class="text-lg font-bold text-white mb-2">
                    No matches yet
                  </h3>
                  <p class="text-sm text-ink-400 max-w-xs mx-auto mb-5">
                    Save your networking profile to generate AI-powered
                    recommendations.
                  </p>
                </div>
              {/if}

            <!-- ── CONNECTIONS views (received / sent / connected / met) ── -->
            {:else}
              {#if loadingConnections}
                <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {#each Array(3) as _}
                    <div
                      class="glass card-hover rounded-2xl border border-white/8 h-[350px] animate-pulse bg-white/5"
                    ></div>
                  {/each}
                </div>
              {:else if filteredConnections.length}
                <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {#each filteredConnections as conn (conn.id)}
                    <div
                      transition:slide
                      class="glass card-hover rounded-2xl border border-white/8 overflow-hidden"
                    >
                      <div
                        class="h-0.5 bg-gradient-to-r from-violet-400 to-pink-400"
                        style="width: {conn.matchPercentage ?? 50}%"
                      ></div>
                      <div class="p-5 flex flex-col gap-2">
                        <h3 class="text-base font-bold text-white">
                          {conn.profile?.display_name || "Unknown"}
                        </h3>
                        <span
                          class="rounded-full bg-violet-400/20 px-2 py-0.5 text-[10px] font-bold uppercase text-violet-300"
                          >{conn.matchPercentage ?? "—"}% Match</span
                        >
                        {#if conn.explanation}
                          <div
                            class="rounded-xl border border-pink-400/15 bg-pink-400/6 p-3 text-sm text-ink-300"
                          >
                            {conn.explanation}
                          </div>
                        {/if}
                        {#if conn.status === "accepted"}
                          <div class="flex gap-2 mt-2">
                            <Button
                              variant="secondary"
                              class="flex-1 gap-2 border border-cyan-400/20 bg-cyan-400/12 text-cyan-200 hover:bg-cyan-400/18"
                              onclick={() => openChatForConnection(conn)}
                            >
                              <MessageCircle size={16} />
                              Chat
                            </Button>
                            <Button
                              variant="secondary"
                              class="flex-1 gap-2 border border-amber-400/20 bg-amber-400/12 text-amber-200 hover:bg-amber-400/18"
                              onclick={() => openMeetingPrep(conn)}
                            >
                              ✨ AI Meeting Prep
                            </Button>
                          </div>
                        {/if}
                        <!-- Action buttons based on status -->
                        {#if conn.status === "pending" && conn.receiver_user_id === data.user?.id}
                          <div class="flex gap-2 mt-2">
                            <Button
                              class="flex-1"
                              onclick={() =>
                                updateConnection(conn.id, "accepted")}
                              >Accept</Button
                            >
                            <Button
                              variant="destructive"
                              class="flex-1"
                              onclick={() =>
                                updateConnection(conn.id, "rejected")}
                              >Reject</Button
                            >
                          </div>
                        {:else if conn.status === "pending" && conn.sender_user_id === data.user?.id}
                          <Button
                            variant="outline"
                            class="mt-2 w-full"
                            onclick={() => updateConnection(conn.id, "cancelled")}
                            >Cancel Request</Button
                          >
                        {:else if conn.status === "accepted" && !conn.met_at}
                          <Button
                            variant="outline"
                            class="mt-2 w-full"
                            onclick={() => updateConnection(conn.id, "met")}
                            >Mark as Met</Button
                          >
                        {:else if conn.status === "accepted" && conn.met_at}
                          <span
                            class="mt-2 text-xs text-emerald-400 font-semibold"
                            >✓ Met</span
                          >
                        {/if}
                      </div>
                    </div>
                  {/each}
                </div>

                {#if connectionsHasMore}
                  <div class="mt-6 flex justify-center">
                    <Button
                      variant="outline"
                      onclick={loadMoreConnections}
                      disabled={loadingMoreConnections}
                    >
                      {#if loadingMoreConnections}
                        <LoaderCircle size={16} class="animate-spin mr-2" />
                        Loading...
                      {:else}
                        Load More
                      {/if}
                    </Button>
                  </div>
                {/if}
              {:else}
                <div
                  in:fade
                  class="flex flex-col items-center justify-center p-12 text-center glass rounded-2xl border border-white/5"
                >
                  <div
                    class="h-16 w-16 bg-white/5 rounded-full flex items-center justify-center mb-4"
                  >
                    <Ghost size={28} class="text-ink-500" />
                  </div>
                  <h3 class="text-white font-bold mb-1">No connections yet</h3>
                  <p class="text-sm text-ink-400 max-w-sm">
                    {#if networkFilter === "received"}
                      You have no pending incoming requests. Check back later.
                    {:else if networkFilter === "sent"}
                      No outgoing requests. Head to AI Matches to find people to connect with.
                    {:else if networkFilter === "connected"}
                      No accepted connections yet. Browse AI Matches to get started.
                    {:else if networkFilter === "met"}
                      No one marked as met yet. Accept connections and meet people!
                    {/if}
                  </p>
                  <button
                    class="mt-4 text-xs text-violet-400 hover:text-violet-300 underline underline-offset-2"
                    onclick={() => { networkFilter = "matches"; }}
                  >Browse AI Matches →</button>
                </div>
              {/if}
            {/if}

            <!-- Chat & Meeting Prep Modals (moved into Network tab) -->
            <ConnectionChatModal
              bind:open={chatOpen}
              connection={activeChatConnection}
              currentUserId={data.user?.id}
            />
            <AiMeetingPrepModal
              bind:open={prepModalOpen}
              connection={activePrepConnection}
            />

            <!-- Create Dummy Users confirmation modal -->
            <Dialog.Root bind:open={dummyModalOpen}>
              <Dialog.Content
                class="sm:max-w-lg bg-[#0f0f11] border border-white/10 text-white"
              >
                <Dialog.Header>
                  <Dialog.Title
                    class="text-xl font-bold text-white flex items-center gap-2"
                  >
                    <Users size={20} class="text-cyan-400" />
                    Create Simulation
                  </Dialog.Title>
                </Dialog.Header>
                <p class="text-sm leading-6 text-ink-300 mt-2">
                  This action will create 5 dummy participants with unique dummy
                  email addresses. Each participant will automatically join this
                  event and generate a realistic networking profile designed to
                  be relevant to your profile, allowing you to test the AI
                  matchmaking experience.
                </p>
                <div
                  class="mt-4 rounded-xl border border-cyan-400/20 bg-cyan-400/5 p-4 flex items-start gap-3"
                >
                  <div class="mt-0.5 rounded-full bg-cyan-400/10 p-1">
                    <Sparkles size={14} class="text-cyan-300" />
                  </div>
                  <div>
                    <p class="text-sm font-semibold text-cyan-100">
                      Uses 1 AI credit
                    </p>
                    <p class="mt-1 text-xs text-ink-400">
                      Generating the 5 realistic participant profiles consumes a
                      single AI credit.
                    </p>
                  </div>
                </div>
                {#if creatingDummy}
                  <AmdAiLoading
                    message="AI is working..."
                    detail="Generating realistic simulation profiles."
                    class="mt-4"
                  />
                {/if}
                <div class="flex justify-end gap-3 mt-6">
                  <Button
                    variant="outline"
                    class="border-white/10 text-white hover:bg-white/10"
                    onclick={() => (dummyModalOpen = false)}
                    disabled={creatingDummy}
                  >
                    Cancel
                  </Button>
                  <Button
                    class="gap-2"
                    onclick={createDummyUsers}
                    disabled={creatingDummy}
                  >
                    {#if creatingDummy}
                      <LoaderCircle size={15} class="animate-spin" />
                      Creating…
                    {:else}
                      Continue
                    {/if}
                  </Button>
                </div>
              </Dialog.Content>
            </Dialog.Root>

            <!-- Find Matches Modal -->
            <Dialog.Root bind:open={findMatchesModalOpen}>
              <Dialog.Content
                class="sm:max-w-lg bg-[#0f0f11] border border-white/10 text-white"
              >
                <Dialog.Header>
                  <Dialog.Title
                    class="text-xl font-bold text-white flex items-center gap-2"
                  >
                    <Sparkles size={20} class="text-amber-400" />
                    AI Matchmaking
                  </Dialog.Title>
                </Dialog.Header>
                <div class="space-y-4 mt-2">
                  <p class="text-sm leading-6 text-ink-300">
                    Our AI analyzes your networking profile—what you do, who you
                    want to meet, and your expectations—and compares it against
                    every other participant in the event to find the most
                    synergetic connections.
                  </p>
                  <ul class="space-y-3">
                    <li
                      class="flex items-start gap-3 bg-white/5 rounded-xl p-3 border border-white/5"
                    >
                      <span class="text-amber-400 mt-0.5">•</span>
                      <span class="text-sm text-ink-200 leading-relaxed"
                        >Generates a compatibility score for each attendee.</span
                      >
                    </li>
                    <li
                      class="flex items-start gap-3 bg-white/5 rounded-xl p-3 border border-white/5"
                    >
                      <span class="text-amber-400 mt-0.5">•</span>
                      <span class="text-sm text-ink-200 leading-relaxed"
                        >Provides a detailed explanation of exactly why you
                        should connect with them.</span
                      >
                    </li>
                  </ul>
                  <div
                    class="mt-4 rounded-xl border border-amber-400/20 bg-amber-400/5 p-4 flex items-start gap-3"
                  >
                    <div class="mt-0.5 rounded-full bg-amber-400/10 p-1">
                      <Sparkles size={14} class="text-amber-300" />
                    </div>
                    <div>
                      <p class="text-sm font-semibold text-amber-100">
                        Uses 1 AI credit
                      </p>
                      <p class="mt-1 text-xs text-ink-400">
                        Running the matchmaking algorithm against the attendee
                        list consumes a single AI credit.
                      </p>
                    </div>
                  </div>
                </div>
                <div class="flex justify-end gap-3 mt-6">
                  <Button
                    variant="outline"
                    class="border-white/10 text-white hover:bg-white/10"
                    onclick={() => (findMatchesModalOpen = false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    class="gap-2 bg-amber-500 text-black hover:bg-amber-600 font-bold"
                    onclick={() => {
                      findMatchesModalOpen = false;
                      fetchMatches();
                    }}
                  >
                    <Sparkles size={15} />
                    Find My Matches
                  </Button>
                </div>
              </Dialog.Content>
            </Dialog.Root>

            <!-- Dummy user connect confirmation modal -->
            <Dialog.Root bind:open={dummyConnectModalOpen}>
              <Dialog.Content
                class="sm:max-w-md bg-[#0f0f11] border border-white/10 text-white"
              >
                <Dialog.Header>
                  <Dialog.Title
                    class="text-xl font-bold text-white flex items-center gap-2"
                  >
                    <span class="text-amber-400">⚠</span> Dummy User
                  </Dialog.Title>
                </Dialog.Header>
                <p class="text-sm leading-6 text-ink-300 mt-2">
                  This is a dummy user created for testing. The connection request
                  will be automatically accepted.
                </p>
                <div class="flex gap-3 mt-4">
                  <Button
                    variant="outline"
                    class="flex-1 border-white/10 text-white hover:bg-white/10"
                    onclick={() => {
                      dummyConnectModalOpen = false;
                      pendingDummyUserId = null;
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    class="flex-1"
                    onclick={async () => {
                      dummyConnectModalOpen = false;
                      if (pendingDummyUserId) {
                        await doConnect(pendingDummyUserId);
                        pendingDummyUserId = null;
                      }
                    }}
                  >
                    Continue
                  </Button>
                </div>
              </Dialog.Content>
            </Dialog.Root>
            {/if}
          </Tabs.Content>
{/if}

          <!-- [OLD matches tab placeholder — keep for reference; content moved above] -->
          <!-- Matches tab -->
          <Tabs.Content value="matches" class="mt-4">
            <div
              class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6"
            >
              <div class="flex items-center gap-2">
                <Users size={18} class="text-white" />
                <h2 class="text-lg font-bold text-white">Your Matches</h2>
              </div>
              <div class="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  class="flex-1 sm:flex-none border-white/10 text-white hover:bg-white/10"
                  onclick={() => (editProfileOpen = true)}
                >
                  <UserCircle2 size={15} class="mr-2" />
                  <span class="hidden sm:inline">Edit profile</span>
                  <span class="sm:hidden">Edit</span>
                </Button>
                <Button
                  variant="outline"
                  class="flex-1 sm:flex-none border-white/10 text-white hover:bg-white/10 gap-2"
                  onclick={refreshFromDb}
                  disabled={refreshingFromDb}
                >
                  {#if refreshingFromDb}
                    <LoaderCircle size={15} class="animate-spin" />
                  {:else}
                    <RefreshCcw size={15} />
                  {/if}
                  <span class="hidden sm:inline">Refresh</span>
                </Button>
                <div class="flex-1 sm:flex-none w-full sm:w-auto">
                  <Button
                    class="w-full gap-2"
                    onclick={() => (findMatchesModalOpen = true)}
                    disabled={refreshingMatches}
                  >
                    {#if refreshingMatches}
                      <LoaderCircle size={15} class="animate-spin" />
                      Finding…
                    {:else}
                      <Sparkles size={15} />
                      Find matches
                    {/if}
                  </Button>
                </div>

                <div class="flex-1 sm:flex-none w-full sm:w-auto">
                  <Button
                    variant="outline"
                    class="w-full gap-2 border-white/10 text-white hover:bg-white/10"
                    onclick={() => (dummyModalOpen = true)}
                  >
                    <Users size={15} />
                    Simulation
                  </Button>
                </div>
              </div>
            </div>
            {#if refreshingMatches}
              <AmdAiLoading
                message="AI is working..."
                detail="Finding your best networking matches."
                class="mb-6"
              />
              <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {#each Array(3) as _}
                  <div
                    class="glass card-hover rounded-2xl border border-white/8 h-[350px] animate-pulse bg-white/5"
                  ></div>
                {/each}
              </div>
            {:else if refreshingFromDb}
              <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {#each Array(3) as _}
                  <div
                    class="glass card-hover rounded-2xl border border-white/8 h-[350px] animate-pulse bg-white/5"
                  ></div>
                {/each}
              </div>
            {:else if $matchesStore.length}
              <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {#each $matchesStore as match, i}
                  {@const conn = $connectionsStore.find(
                    (c) =>
                      c.sender_user_id === match.user_id ||
                      c.receiver_user_id === match.user_id,
                  )}
                  <div
                    class="glass card-hover rounded-2xl border border-white/8 overflow-hidden"
                  >
                    <!-- Match strength bar -->
                    <div
                      class="h-0.5 bg-gradient-to-r from-amber-400 to-cyan-400"
                      style="width: {match.matchPercentage ?? 50}%"
                    ></div>

                    <div class="flex-1 flex flex-col p-5">
                      <Tabs.Root
                        value="ai-insights"
                        class="flex-1 flex flex-col"
                      >
                        <Tabs.List
                          class="grid w-full grid-cols-2 mb-4 bg-white/5 border border-white/10 rounded-xl p-1"
                        >
                          <Tabs.Trigger
                            value="ai-insights"
                            class="rounded-lg text-xs font-semibold data-[state=active]:bg-cyan-400/20 data-[state=active]:text-cyan-300"
                          >
                            🤖 AI Insights
                          </Tabs.Trigger>
                          <Tabs.Trigger
                            value="profile"
                            class="rounded-lg text-xs font-semibold data-[state=active]:bg-white/10 data-[state=active]:text-white"
                          >
                            👤 Profile
                          </Tabs.Trigger>
                        </Tabs.List>

                        <!-- AI Insights Tab -->
                        <Tabs.Content
                          value="ai-insights"
                          class="flex-1 space-y-4 outline-none m-0"
                        >
                          <div
                            class="flex items-start justify-between gap-3 mb-2"
                          >
                            <div>
                              <h3 class="text-base font-bold text-white">
                                {match.name}
                              </h3>
                              <p class="mt-0.5 text-xs text-ink-400">
                                AI Match Analysis
                              </p>
                            </div>
                            <span
                              class="shrink-0 rounded-full border border-amber-400/25 bg-amber-400/8 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-amber-300"
                            >
                              {match.matchPercentage ?? "—"}% Match
                            </span>
                          </div>

                          {#if match.explanation}
                            <div
                              class="rounded-xl border border-cyan-400/15 bg-cyan-400/6 p-4"
                            >
                              <p
                                class="text-[10px] font-bold uppercase tracking-widest text-cyan-300 mb-2"
                              >
                                Why this match
                              </p>
                              <p class="text-sm leading-6 text-ink-300">
                                {match.explanation}
                              </p>
                            </div>
                          {:else}
                            <div
                              class="rounded-xl border border-white/5 bg-white/5 p-4 text-center"
                            >
                              <p class="text-xs text-ink-400">
                                No detailed AI insights available for this
                                match.
                              </p>
                            </div>
                          {/if}
                        </Tabs.Content>

                        <!-- Profile Tab -->
                        <Tabs.Content
                          value="profile"
                          class="flex-1 space-y-4 outline-none m-0"
                        >
                          <div
                            class="flex items-start justify-between gap-3 mb-2"
                          >
                            <div>
                              <h3 class="text-base font-bold text-white">
                                {match.name}
                              </h3>
                              <p class="mt-0.5 text-xs text-ink-400">
                                {match.role}{match.company
                                  ? ` · ${match.company}`
                                  : ""}
                              </p>
                            </div>
                          </div>

                          <div class="space-y-3">
                            <div>
                              <p
                                class="text-[10px] font-bold uppercase tracking-widest text-ink-500 mb-1"
                              >
                                About Me
                              </p>
                              <p class="text-xs leading-5 text-ink-300">
                                {match.about}
                              </p>
                            </div>
                          </div>

                          {#if match.tags?.length}
                            <div class="flex flex-wrap gap-1.5 pt-2">
                              {#each match.tags.slice(0, 4) as tag}
                                <span
                                  class="rounded-full border border-white/8 bg-white/4 px-2.5 py-1 text-[10px] text-ink-400"
                                >
                                  #{tag}
                                </span>
                              {/each}
                            </div>
                          {/if}
                        </Tabs.Content>
                      </Tabs.Root>
                      <!-- Connect Button -->
                      <div class="pt-4 mt-auto">
                        {#if !conn || conn.status === "cancelled"}
                          <Button
                            class="w-full bg-white text-black hover:bg-white/90 gap-2"
                            disabled={connectingIds.includes(match.user_id)}
                            onclick={() => connectUser(match)}
                          >
                            {#if connectingIds.includes(match.user_id)}
                              <LoaderCircle size={16} class="animate-spin" /> Connecting...
                            {:else}
                              <Users size={16} /> Connect
                            {/if}
                          </Button>
                        {:else if conn.status === "pending" && conn.sender_user_id === data.user?.id}
                          <Button
                            variant="outline"
                            class="w-full gap-2 text-ink-300 border-ink-600 hover:text-white"
                            onclick={() =>
                              updateConnection(conn.id, "cancelled")}
                          >
                            Cancel Request
                          </Button>
                        {:else if conn.status === "pending" && conn.receiver_user_id === data.user?.id}
                          <Button
                            variant="outline"
                            class="w-full gap-2 text-amber-300 border-amber-600/50"
                            disabled
                          >
                            Pending Response
                          </Button>
                        {:else if conn.status === "accepted"}
                          <Button
                            variant="secondary"
                            class="w-full gap-2 bg-purple-500/20 text-purple-300 border border-purple-500/30"
                            disabled
                          >
                            <CheckCircle2 size={16} /> Connected
                          </Button>
                        {:else if conn.status === "rejected"}
                          <Button
                            variant="outline"
                            class="w-full gap-2 text-red-400 border-red-500/30"
                            disabled
                          >
                            Rejected
                          </Button>
                        {/if}
                      </div>
                    </div>
                  </div>
                {/each}
              </div>
            {:else}
              <div
                class="glass rounded-2xl border border-white/8 border-dashed p-12 text-center"
              >
                <div
                  class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-400/10 border border-amber-400/20"
                >
                  <Brain size={22} class="text-amber-300" />
                </div>
                <h3 class="text-lg font-bold text-white mb-2">
                  No matches yet
                </h3>
                <p class="text-sm text-ink-400 max-w-xs mx-auto mb-5">
                  Save your networking profile to generate AI-powered
                  recommendations.
                </p>
              </div>
            {/if}

            <!-- Create Dummy Users confirmation modal -->
            <Dialog.Root bind:open={dummyModalOpen}>
              <Dialog.Content
                class="sm:max-w-lg bg-[#0f0f11] border border-white/10 text-white"
              >
                <Dialog.Header>
                  <Dialog.Title
                    class="text-xl font-bold text-white flex items-center gap-2"
                  >
                    <Users size={20} class="text-cyan-400" />
                    Create Simulation
                  </Dialog.Title>
                </Dialog.Header>
                <p class="text-sm leading-6 text-ink-300 mt-2">
                  This action will create 5 dummy participants with unique dummy
                  email addresses. Each participant will automatically join this
                  event and generate a realistic networking profile designed to
                  be relevant to your profile, allowing you to test the AI
                  matchmaking experience.
                </p>
                <div
                  class="mt-4 rounded-xl border border-cyan-400/20 bg-cyan-400/5 p-4 flex items-start gap-3"
                >
                  <div class="mt-0.5 rounded-full bg-cyan-400/10 p-1">
                    <Sparkles size={14} class="text-cyan-300" />
                  </div>
                  <div>
                    <p class="text-sm font-semibold text-cyan-100">
                      Uses 1 AI credit
                    </p>
                    <p class="mt-1 text-xs text-ink-400">
                      Generating the 5 realistic participant profiles consumes a
                      single AI credit.
                    </p>
                  </div>
                </div>
                {#if creatingDummy}
                  <AmdAiLoading
                    message="AI is working..."
                    detail="Generating realistic simulation profiles."
                    class="mt-4"
                  />
                {/if}
                <div class="flex justify-end gap-3 mt-6">
                  <Button
                    variant="outline"
                    class="border-white/10 text-white hover:bg-white/10"
                    onclick={() => (dummyModalOpen = false)}
                    disabled={creatingDummy}
                  >
                    Cancel
                  </Button>
                  <Button
                    class="gap-2"
                    onclick={createDummyUsers}
                    disabled={creatingDummy}
                  >
                    {#if creatingDummy}
                      <LoaderCircle size={15} class="animate-spin" />
                      Creating…
                    {:else}
                      Continue
                    {/if}
                  </Button>
                </div>
              </Dialog.Content>
            </Dialog.Root>

            <!-- Find Matches Modal -->
            <Dialog.Root bind:open={findMatchesModalOpen}>
              <Dialog.Content
                class="sm:max-w-lg bg-[#0f0f11] border border-white/10 text-white"
              >
                <Dialog.Header>
                  <Dialog.Title
                    class="text-xl font-bold text-white flex items-center gap-2"
                  >
                    <Sparkles size={20} class="text-amber-400" />
                    AI Matchmaking
                  </Dialog.Title>
                </Dialog.Header>
                <div class="space-y-4 mt-2">
                  <p class="text-sm leading-6 text-ink-300">
                    Our AI analyzes your networking profile—what you do, who you
                    want to meet, and your expectations—and compares it against
                    every other participant in the event to find the most
                    synergetic connections.
                  </p>
                  <ul class="space-y-3">
                    <li
                      class="flex items-start gap-3 bg-white/5 rounded-xl p-3 border border-white/5"
                    >
                      <span class="text-amber-400 mt-0.5">•</span>
                      <span class="text-sm text-ink-200 leading-relaxed"
                        >Generates a compatibility score for each attendee.</span
                      >
                    </li>
                    <li
                      class="flex items-start gap-3 bg-white/5 rounded-xl p-3 border border-white/5"
                    >
                      <span class="text-amber-400 mt-0.5">•</span>
                      <span class="text-sm text-ink-200 leading-relaxed"
                        >Provides a detailed explanation of exactly why you
                        should connect with them.</span
                      >
                    </li>
                  </ul>
                  <div
                    class="mt-4 rounded-xl border border-amber-400/20 bg-amber-400/5 p-4 flex items-start gap-3"
                  >
                    <div class="mt-0.5 rounded-full bg-amber-400/10 p-1">
                      <Sparkles size={14} class="text-amber-300" />
                    </div>
                    <div>
                      <p class="text-sm font-semibold text-amber-100">
                        Uses 1 AI credit
                      </p>
                      <p class="mt-1 text-xs text-ink-400">
                        Running the matchmaking algorithm against the attendee
                        list consumes a single AI credit.
                      </p>
                    </div>
                  </div>
                </div>
                <div class="flex justify-end gap-3 mt-6">
                  <Button
                    variant="outline"
                    class="border-white/10 text-white hover:bg-white/10"
                    onclick={() => (findMatchesModalOpen = false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    class="gap-2 bg-amber-500 text-black hover:bg-amber-600 font-bold"
                    onclick={() => {
                      findMatchesModalOpen = false;
                      fetchMatches();
                    }}
                  >
                    <Sparkles size={15} />
                    Find My Matches
                  </Button>
                </div>
              </Dialog.Content>
            </Dialog.Root>
          </Tabs.Content>

          <!-- Dummy user connect confirmation modal -->
          <Dialog.Root bind:open={dummyConnectModalOpen}>
            <Dialog.Content
              class="sm:max-w-md bg-[#0f0f11] border border-white/10 text-white"
            >
              <Dialog.Header>
                <Dialog.Title
                  class="text-xl font-bold text-white flex items-center gap-2"
                >
                  <span class="text-amber-400">⚠</span> Dummy User
                </Dialog.Title>
              </Dialog.Header>
              <p class="text-sm leading-6 text-ink-300 mt-2">
                This is a dummy user created for testing. The connection request
                will be automatically accepted.
              </p>
              <div class="flex gap-3 mt-4">
                <Button
                  variant="outline"
                  class="flex-1 border-white/10 text-white hover:bg-white/10"
                  onclick={() => {
                    dummyConnectModalOpen = false;
                    pendingDummyUserId = null;
                  }}
                >
                  Cancel
                </Button>
                <Button
                  class="flex-1"
                  onclick={async () => {
                    dummyConnectModalOpen = false;
                    if (pendingDummyUserId) {
                      await doConnect(pendingDummyUserId);
                      pendingDummyUserId = null;
                    }
                  }}
                >
                  Continue
                </Button>
              </div>
            </Dialog.Content>
          </Dialog.Root>

          <!-- Connections tab -->
          <Tabs.Content value="connections" class="mt-4">
            <!-- Filter tabs + Refresh -->
            <div class="flex flex-wrap items-center gap-2 mb-4">
              {#each ["received", "sent", "connected", "met"] as f}
                <Button
                  variant={connectionFilter === f ? "default" : "outline"}
                  class="capitalize"
                  onclick={() => {
                    connectionFilter = f;
                  }}>{f}</Button
                >
              {/each}
              <Button
                variant="outline"
                class="ml-auto gap-2 text-ink-300 border-white/10 hover:bg-white/10"
                onclick={fetchAllConnections}
                disabled={loadingConnections}
              >
                <RefreshCw
                  size={16}
                  class={loadingConnections ? "animate-spin" : ""}
                />
                Refresh
              </Button>
            </div>

            {#if loadingConnections}
              <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {#each Array(3) as _}
                  <div
                    class="glass card-hover rounded-2xl border border-white/8 h-[350px] animate-pulse bg-white/5"
                  ></div>
                {/each}
              </div>
            {:else if filteredConnections.length}
              <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {#each filteredConnections as conn (conn.id)}
                  <div
                    transition:slide
                    class="glass card-hover rounded-2xl border border-white/8 overflow-hidden"
                  >
                    <div
                      class="h-0.5 bg-gradient-to-r from-purple-400 to-pink-400"
                      style="width: {conn.matchPercentage ?? 50}%"
                    ></div>
                    <div class="p-5 flex flex-col gap-2">
                      <h3 class="text-base font-bold text-white">
                        {conn.profile?.display_name || "Unknown"}
                      </h3>
                      <span
                        class="rounded-full bg-purple-400/20 px-2 py-0.5 text-[10px] font-bold uppercase text-purple-300"
                        >{conn.matchPercentage ?? "—"}% Match</span
                      >
                      {#if conn.explanation}
                        <div
                          class="rounded-xl border border-pink-400/15 bg-pink-400/6 p-3 text-sm text-ink-300"
                        >
                          {conn.explanation}
                        </div>
                      {/if}
                      {#if conn.status === "accepted"}
                        <div class="flex gap-2 mt-2">
                          <Button
                            variant="secondary"
                            class="flex-1 gap-2 border border-cyan-400/20 bg-cyan-400/12 text-cyan-200 hover:bg-cyan-400/18"
                            onclick={() => openChatForConnection(conn)}
                          >
                            <MessageCircle size={16} />
                            Chat
                          </Button>
                          <Button
                            variant="secondary"
                            class="flex-1 gap-2 border border-amber-400/20 bg-amber-400/12 text-amber-200 hover:bg-amber-400/18"
                            onclick={() => openMeetingPrep(conn)}
                          >
                            ✨ AI Meeting Prep
                          </Button>
                        </div>
                      {/if}
                      <!-- Action buttons based on status -->
                      {#if conn.status === "pending" && conn.receiver_user_id === data.user?.id}
                        <div class="flex gap-2 mt-2">
                          <Button
                            class="flex-1"
                            onclick={() =>
                              updateConnection(conn.id, "accepted")}
                            >Accept</Button
                          >
                          <Button
                            variant="destructive"
                            class="flex-1"
                            onclick={() =>
                              updateConnection(conn.id, "rejected")}
                            >Reject</Button
                          >
                        </div>
                      {:else if conn.status === "pending" && conn.sender_user_id === data.user?.id}
                        <Button
                          variant="outline"
                          class="mt-2 w-full"
                          onclick={() => updateConnection(conn.id, "cancelled")}
                          >Cancel Request</Button
                        >
                      {:else if conn.status === "accepted" && !conn.met_at}
                        <Button
                          variant="outline"
                          class="mt-2 w-full"
                          onclick={() => updateConnection(conn.id, "met")}
                          >Mark as Met</Button
                        >
                      {:else if conn.status === "accepted" && conn.met_at}
                        <span
                          class="mt-2 text-xs text-emerald-400 font-semibold"
                          >✓ Met</span
                        >
                      {/if}
                    </div>
                  </div>
                {/each}
              </div>

              {#if connectionsHasMore}
                <div class="mt-6 flex justify-center">
                  <Button
                    variant="outline"
                    onclick={loadMoreConnections}
                    disabled={loadingMoreConnections}
                  >
                    {#if loadingMoreConnections}
                      <LoaderCircle size={16} class="animate-spin mr-2" />
                      Loading...
                    {:else}
                      Load More
                    {/if}
                  </Button>
                </div>
              {/if}
            {:else}
              <div
                in:fade
                class="flex flex-col items-center justify-center p-12 text-center glass rounded-2xl border border-white/5"
              >
                <div
                  class="h-16 w-16 bg-white/5 rounded-full flex items-center justify-center mb-4"
                >
                  <Ghost size={28} class="text-ink-500" />
                </div>
                <h3 class="text-white font-bold mb-1">No connections yet</h3>
                <p class="text-sm text-ink-400 max-w-sm">
                  We couldn't find any connections matching this filter.
                </p>
              </div>
            {/if}
          </Tabs.Content>

          <!-- Venue Map tab -->
          <Tabs.Content value="venue" class="mt-4 space-y-4">
            {#if Boolean(currentEvent.is_venue_enabled)}
              {@const isEventEnded = Boolean(currentEvent?.end_time && new Date(currentEvent.end_time) < new Date())}
              <VenueMap
                isOrganizer={data.isOrganizer && !isEventEnded}
                initialZones={currentEvent.venue_map}
                currentLocation={venueLocation}
                schedule={timelineItems}
                on:locationChange={(e) => {
                  venueLocation = e.detail;
                }}
                on:saveMap={handleSaveMap}
              />
            {:else}
              <div
                class="glass rounded-2xl border border-white/8 p-12 text-center flex flex-col items-center justify-center"
              >
                <div
                  class="h-16 w-16 bg-white/5 rounded-full flex items-center justify-center mb-4"
                >
                  <MapPinOff size={28} class="text-ink-500" />
                </div>
                <h3 class="text-white font-bold text-lg mb-1">Venue Map Disabled</h3>
                <p class="text-sm text-ink-400 max-w-md">
                  The organizer has disabled the venue map for this event.
                </p>
              </div>
            {/if}
          </Tabs.Content>

          <!-- Settings tab -->
          {#if data.isOrganizer}
            <Tabs.Content value="settings" class="mt-4 space-y-6">
              <!-- Live or Ended Event Status Banner -->
              {#if isEventEnded}
                <div class="flex items-start gap-3 bg-red-500/10 border border-red-500/20 rounded-2xl p-4 text-red-300 text-xs">
                  <AlertTriangle size={18} class="shrink-0 text-red-400 mt-0.5" />
                  <div>
                    <p class="font-bold text-sm text-red-400">📁 Event Ended — Read-Only Mode</p>
                    <p class="text-ink-400 mt-0.5 leading-relaxed">
                      This event has ended. Settings are locked to preserve historical records. You can still delete the event below if needed.
                    </p>
                  </div>
                </div>
              {:else if isEventLive}
                <div class="flex items-start gap-3 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl p-4 text-indigo-300 text-xs">
                  <Clock size={18} class="shrink-0 text-indigo-400 mt-0.5" />
                  <div>
                    <p class="font-bold text-sm text-indigo-300">🔴 Event is Currently Live</p>
                    <p class="text-ink-400 mt-0.5 leading-relaxed">
                      Start time is locked while the event is live, but you can update location, end time, venue map, and details.
                    </p>
                  </div>
                </div>
              {/if}

              <!-- Edit Settings Form -->
              <div class="glass rounded-2xl border border-white/8 p-6 sm:p-8 space-y-8 shadow-2xl {isEventEnded ? 'opacity-75 pointer-events-none' : ''}">
                <div class="border-b border-white/8 pb-4 mb-2">
                  <h2 class="text-base font-bold text-white">General Settings</h2>
                  <p class="text-xs text-ink-500 mt-0.5">Basic information about your event.</p>
                </div>

                <!-- Name -->
                <div class="space-y-2">
                  <Label class="text-xs font-semibold uppercase tracking-widest text-ink-400">Event Name</Label>
                  <Input
                    bind:value={settingsName}
                    disabled={isEventEnded}
                    placeholder="My Awesome Event"
                    class="bg-white/5 border-white/10 text-white placeholder:text-ink-600 focus:border-indigo-400/50"
                  />
                </div>

                <!-- Description -->
                <div class="space-y-2">
                  <Label class="text-xs font-semibold uppercase tracking-widest text-ink-400">Description</Label>
                  <textarea
                    bind:value={settingsDescription}
                    disabled={isEventEnded}
                    rows="4"
                    placeholder="What is this event about?"
                    class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-ink-600 focus:border-indigo-400/50 focus:outline-none focus:ring-1 focus:ring-indigo-400/20 resize-none disabled:opacity-50"
                  ></textarea>
                </div>

                <!-- Slug -->
                <div class="space-y-2">
                  <Label class="text-xs font-semibold uppercase tracking-widest text-ink-400">Slug (URL ID)</Label>
                  <div class="flex items-center gap-2">
                    <span class="text-xs text-ink-500 shrink-0">/event/</span>
                    <Input
                      bind:value={settingsSlug}
                      disabled={isEventEnded}
                      placeholder="my-awesome-event"
                      class="bg-white/5 border-white/10 text-white placeholder:text-ink-600 focus:border-indigo-400/50 font-mono flex-1"
                    />
                    <button
                      type="button"
                      onclick={copySlugUrl}
                      class="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-ink-300 hover:text-white transition-colors shrink-0"
                      title="Copy full event link"
                    >
                      {#if copiedSlug}
                        <Check size={14} class="text-emerald-400" />
                        <span class="text-emerald-400">Copied</span>
                      {:else}
                        <Copy size={14} />
                        <span>Copy Link</span>
                      {/if}
                    </button>
                  </div>
                  <p class="text-[11px] text-ink-500">Changing the slug will redirect to the new URL.</p>
                </div>

                <!-- Format -->
                <div class="space-y-2">
                  <Label class="text-xs font-semibold uppercase tracking-widest text-ink-400">Event Format</Label>
                  <div class="grid grid-cols-3 gap-2">
                    {#each ['online', 'offline', 'hybrid'] as fmt}
                      <button
                        type="button"
                        disabled={isEventEnded}
                        onclick={() => (settingsEventFormat = fmt)}
                        class="py-2.5 rounded-xl border text-sm font-semibold capitalize transition-all {settingsEventFormat === fmt
                          ? 'bg-indigo-500/20 border-indigo-400/50 text-indigo-300'
                          : 'bg-white/4 border-white/10 text-ink-400 hover:text-white hover:border-white/20'} disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {fmt}
                      </button>
                    {/each}
                  </div>
                </div>

                <!-- Date & Time Controls -->
                <div class="space-y-4 border-t border-white/6 pt-4">
                  <div>
                    <h3 class="text-sm font-bold text-white mb-0.5">Date & Time Schedule</h3>
                    <p class="text-xs text-ink-500">Set event start and end schedule.</p>
                  </div>

                  <div class="grid gap-4 sm:grid-cols-2">
                    <!-- Start Date & Time -->
                    <div class="p-4 rounded-xl bg-white/3 border border-white/6 space-y-3 {isEventLive || isEventEnded ? 'opacity-60' : ''}">
                      <div class="flex items-center justify-between">
                        <Label class="text-xs font-semibold uppercase tracking-widest text-indigo-400 flex items-center gap-1.5">
                          <CalendarClock size={14} /> Start Schedule
                          {#if isEventLive}
                            <span class="text-[10px] text-amber-400 font-bold ml-1">(Locked - Live)</span>
                          {/if}
                        </Label>
                        {#if !isEventLive && !isEventEnded}
                          <div class="flex gap-1.5 text-[11px]">
                            <button type="button" onclick={() => setStartDateQuick('today')} class="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-indigo-300 transition-colors">Today</button>
                            <button type="button" onclick={() => setStartDateQuick('tomorrow')} class="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-indigo-300 transition-colors">Tomorrow</button>
                          </div>
                        {/if}
                      </div>

                      <div>
                        <span class="text-[11px] text-ink-500 block mb-1">Start Date</span>
                        <button
                          type="button"
                          disabled={isEventLive || isEventEnded}
                          onclick={() => openCalendar('start')}
                          class="w-full flex items-center justify-between bg-white/5 hover:bg-white/8 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white transition-colors disabled:cursor-not-allowed"
                        >
                          <span class="flex items-center gap-2">
                            <Calendar size={15} class="text-indigo-400" />
                            {formatDateHuman(settingsStartDate)}
                          </span>
                          {#if !isEventLive && !isEventEnded}
                            <span class="text-xs text-indigo-400 font-medium">Pick Date</span>
                          {/if}
                        </button>
                      </div>

                      <div>
                        <span class="text-[11px] text-ink-500 block mb-1">Start Time</span>
                        <button
                          type="button"
                          disabled={isEventLive || isEventEnded}
                          onclick={() => openClock('start')}
                          class="w-full flex items-center justify-between bg-white/5 hover:bg-white/8 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white transition-colors disabled:cursor-not-allowed"
                        >
                          <span class="flex items-center gap-2">
                            <Clock size={15} class="text-indigo-400" />
                            {formatTime12h(settingsStartTimeVal)}
                          </span>
                          {#if !isEventLive && !isEventEnded}
                            <span class="text-xs text-indigo-400 font-medium">Pick Time</span>
                          {/if}
                        </button>
                      </div>
                    </div>

                    <!-- End Date & Time -->
                    <div class="p-4 rounded-xl bg-white/3 border border-white/6 space-y-3">
                      <div class="flex items-center justify-between">
                        <Label class="text-xs font-semibold uppercase tracking-widest text-indigo-400 flex items-center gap-1.5">
                          <CalendarClock size={14} /> End Schedule
                        </Label>
                        {#if !isEventEnded}
                          <div class="flex gap-1.5 text-[11px]">
                            <button type="button" onclick={() => setEndDateQuick('sameday')} class="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-indigo-300 transition-colors">Same Day</button>
                            <button type="button" onclick={() => setEndDateQuick('nextday')} class="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-indigo-300 transition-colors">Next Day</button>
                          </div>
                        {/if}
                      </div>

                      <div>
                        <span class="text-[11px] text-ink-500 block mb-1">End Date</span>
                        <button
                          type="button"
                          disabled={isEventEnded}
                          onclick={() => openCalendar('end')}
                          class="w-full flex items-center justify-between bg-white/5 hover:bg-white/8 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white transition-colors disabled:cursor-not-allowed"
                        >
                          <span class="flex items-center gap-2">
                            <Calendar size={15} class="text-indigo-400" />
                            {formatDateHuman(settingsEndDate)}
                          </span>
                          {#if !isEventEnded}
                            <span class="text-xs text-indigo-400 font-medium">Pick Date</span>
                          {/if}
                        </button>
                      </div>

                      <div>
                        <span class="text-[11px] text-ink-500 block mb-1">End Time</span>
                        <button
                          type="button"
                          disabled={isEventEnded}
                          onclick={() => openClock('end')}
                          class="w-full flex items-center justify-between bg-white/5 hover:bg-white/8 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white transition-colors disabled:cursor-not-allowed"
                        >
                          <span class="flex items-center gap-2">
                            <Clock size={15} class="text-indigo-400" />
                            {formatTime12h(settingsEndTimeVal)}
                          </span>
                          {#if !isEventEnded}
                            <span class="text-xs text-indigo-400 font-medium">Pick Time</span>
                          {/if}
                        </button>
                      </div>
                    </div>
                  </div>

                  {#if isStartInPast}
                    <div class="flex items-center gap-2 text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5">
                      <AlertTriangle size={14} class="shrink-0" />
                      Start date cannot be in the past.
                    </div>
                  {:else if isEndBeforeStart}
                    <div class="flex items-center gap-2 text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5">
                      <AlertTriangle size={14} class="shrink-0" />
                      End time must be greater than start time.
                    </div>
                  {/if}
                </div>

                <!-- Location & Venue Map -->
                {#if settingsEventFormat !== 'online'}
                  <div class="space-y-4 pt-2 border-t border-white/6">
                    <div>
                      <h3 class="text-sm font-bold text-white mb-0.5">Location & Venue</h3>
                      <p class="text-xs text-ink-500">Venue details for offline and hybrid events.</p>
                    </div>
                    <div class="space-y-2">
                      <Label class="text-xs font-semibold uppercase tracking-widest text-ink-400">
                        <MapPin size={12} class="inline mr-1 text-amber-400" />Address
                      </Label>
                      <textarea
                        bind:value={settingsLocation}
                        disabled={isEventEnded}
                        rows="3"
                        placeholder="123 Main St, City, Country"
                        class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-ink-600 focus:border-indigo-400/50 focus:outline-none focus:ring-1 focus:ring-indigo-400/20 resize-none disabled:opacity-50"
                      ></textarea>
                    </div>
                    <div class="space-y-2">
                      <Label class="text-xs font-semibold uppercase tracking-widest text-ink-400">
                        <Globe size={12} class="inline mr-1 text-amber-400" />Google Maps URL
                      </Label>
                      <Input
                        bind:value={settingsGoogleMapUrl}
                        disabled={isEventEnded}
                        placeholder="https://maps.google.com/..."
                        class="bg-white/5 border-white/10 text-white placeholder:text-ink-600 focus:border-indigo-400/50"
                      />
                    </div>
                  </div>
                {/if}

                <!-- Options Toggles -->
                <div class="space-y-4 pt-2 border-t border-white/6">
                  <h3 class="text-sm font-bold text-white">Options</h3>

                  <!-- Enable Networking -->
                  <div class="flex items-center justify-between gap-4 p-4 rounded-xl bg-white/3 border border-white/6">
                    <div class="flex items-start gap-3">
                      <Network size={16} class="text-violet-400 mt-0.5 shrink-0" />
                      <div>
                        <p class="text-sm font-semibold text-white">Enable Networking</p>
                        <p class="text-xs text-ink-500 mt-0.5">Show the Network tab with AI matches and connections.</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={isEventEnded}
                      onclick={() => (settingsIsNetworkEnabled = !settingsIsNetworkEnabled)}
                      class="relative shrink-0 w-11 h-6 rounded-full transition-colors duration-200 {settingsIsNetworkEnabled ? 'bg-violet-500' : 'bg-white/10'} disabled:opacity-50"
                      role="switch"
                      aria-checked={settingsIsNetworkEnabled}
                      aria-label="Enable Networking"
                    >
                      <span
                        class="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 {settingsIsNetworkEnabled ? 'translate-x-5' : 'translate-x-0'}"
                      ></span>
                    </button>
                  </div>

                  <!-- Enable Venue Map -->
                  {#if settingsEventFormat !== 'online'}
                    <div class="flex items-center justify-between gap-4 p-4 rounded-xl bg-white/3 border border-white/6">
                      <div class="flex items-start gap-3">
                        <MapPin size={16} class="text-cyan-400 mt-0.5 shrink-0" />
                        <div>
                          <p class="text-sm font-semibold text-white">Enable Venue Map</p>
                          <p class="text-xs text-ink-500 mt-0.5">Show the interactive venue map tab to attendees.</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={isEventEnded}
                        onclick={() => (settingsIsVenueEnabled = !settingsIsVenueEnabled)}
                        class="relative shrink-0 w-11 h-6 rounded-full transition-colors duration-200 {settingsIsVenueEnabled ? 'bg-cyan-500' : 'bg-white/10'} disabled:opacity-50"
                        role="switch"
                        aria-checked={settingsIsVenueEnabled}
                        aria-label="Enable Venue Map"
                      >
                        <span
                          class="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 {settingsIsVenueEnabled ? 'translate-x-5' : 'translate-x-0'}"
                        ></span>
                      </button>
                    </div>
                  {/if}

                  <!-- Approval Required -->
                  <div class="flex items-center justify-between gap-4 p-4 rounded-xl bg-white/3 border border-white/6">
                    <div class="flex items-start gap-3">
                      <Lock size={16} class="text-amber-400 mt-0.5 shrink-0" />
                      <div>
                        <p class="text-sm font-semibold text-white">Approval Required</p>
                        <p class="text-xs text-ink-500 mt-0.5">New attendees must be approved before joining.</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={isEventEnded}
                      onclick={() => (settingsIsApprovalRequired = !settingsIsApprovalRequired)}
                      class="relative shrink-0 w-11 h-6 rounded-full transition-colors duration-200 {settingsIsApprovalRequired ? 'bg-amber-500' : 'bg-white/10'} disabled:opacity-50"
                      role="switch"
                      aria-checked={settingsIsApprovalRequired}
                      aria-label="Approval Required"
                    >
                      <span
                        class="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 {settingsIsApprovalRequired ? 'translate-x-5' : 'translate-x-0'}"
                      ></span>
                    </button>
                  </div>
                </div>

                {#if saveTabSettingsError}
                  <div class="flex items-start gap-2 text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-3">
                    <AlertTriangle size={15} class="shrink-0 mt-0.5" />
                    {saveTabSettingsError}
                  </div>
                {/if}

                {#if saveTabSettingsSuccess}
                  <div class="flex items-center gap-2 text-emerald-400 text-sm bg-emerald-400/10 border border-emerald-400/20 rounded-xl px-4 py-3">
                    <CheckCircle2 size={15} class="shrink-0" />
                    Settings saved successfully.
                  </div>
                {/if}

                <Button
                  onclick={saveTabSettings}
                  disabled={savingTabSettings || isTimeInvalid || isEventEnded}
                  class="w-full gap-2 h-11 text-sm font-semibold"
                >
                  {#if savingTabSettings}
                    <LoaderCircle size={15} class="animate-spin" />
                    Saving…
                  {:else}
                    <Save size={15} />
                    {isEventEnded ? 'Settings Locked (Event Ended)' : 'Save Changes'}
                  {/if}
                </Button>
              </div>

              <!-- Danger Zone Card -->
              <div class="glass rounded-2xl border border-red-500/20 p-6 sm:p-8">
                <h2 class="text-base font-bold text-red-400 mb-1">Danger Zone</h2>
                <p class="text-xs text-ink-500 mb-6">Permanently delete this event and all associated data. This cannot be undone.</p>

                {#if !settingsDeleteConfirmOpen}
                  <Button
                    variant="destructive"
                    class="gap-2 bg-red-600/20 hover:bg-red-600/40 text-red-400 border border-red-500/30"
                    onclick={() => (settingsDeleteConfirmOpen = true)}
                  >
                    <Trash2 size={14} />
                    Delete Event
                  </Button>
                {:else}
                  <div class="space-y-4">
                    <p class="text-sm text-ink-300">
                      Type <span class="font-mono font-bold text-red-400">{currentEvent.slug}</span> to confirm deletion:
                    </p>
                    <Input
                      bind:value={settingsDeleteConfirmText}
                      placeholder={currentEvent.slug}
                      class="bg-white/5 border-red-500/30 text-white placeholder:text-ink-600 focus:border-red-400/50 font-mono max-w-md"
                    />
                    <div class="flex gap-3">
                      <Button
                        variant="destructive"
                        class="gap-2 bg-red-600 hover:bg-red-700 text-white"
                        disabled={settingsDeleteConfirmText !== currentEvent.slug || settingsDeleting}
                        onclick={deleteEventInSettings}
                      >
                        {#if settingsDeleting}
                          <LoaderCircle size={14} class="animate-spin" />
                          Deleting…
                        {:else}
                          <Trash2 size={14} />
                          Confirm Delete
                        {/if}
                      </Button>
                      <Button
                        variant="ghost"
                        class="text-ink-400 hover:text-white"
                        onclick={() => { settingsDeleteConfirmOpen = false; settingsDeleteConfirmText = ''; }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                {/if}
              </div>
            </Tabs.Content>

            <!-- Host Timeline Tab -->
            <Tabs.Content value="timeline" class="mt-4 space-y-6">
              <!-- Header Card -->
              <div class="glass rounded-2xl border border-white/8 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <div class="flex items-center gap-2 mb-1">
                    <CalendarClock size={20} class="text-amber-400" />
                    <h2 class="text-xl font-bold text-white">Event Timeline &amp; Schedule</h2>
                  </div>
                  <p class="text-xs text-ink-400">
                    Manage sessions, keynote talks, workshops, and agenda for your event attendees.
                  </p>
                </div>

                <Button
                  onclick={openCreateTimelineModal}
                  class="gap-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold px-4 py-2 text-xs rounded-xl shadow-[0_0_15px_rgba(251,191,36,0.3)] transition-all"
                >
                  <Plus size={16} />
                  Add Session
                </Button>
              </div>

              <!-- Sessions List -->
              {#if timelineItems.length === 0}
                <div class="glass rounded-2xl border border-white/8 p-12 text-center space-y-4">
                  <div class="mx-auto h-12 w-12 rounded-2xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-amber-400">
                    <CalendarClock size={24} />
                  </div>
                  <div>
                    <h3 class="text-base font-bold text-white mb-1">No Schedule Sessions Yet</h3>
                    <p class="text-xs text-ink-400 max-w-sm mx-auto">
                      Add keynote talks, breakouts, panel discussions, and breaks so attendees can view the official agenda.
                    </p>
                  </div>
                  <Button
                    onclick={openCreateTimelineModal}
                    variant="outline"
                    class="gap-2 border-amber-400/30 text-amber-300 hover:bg-amber-400/10"
                  >
                    <Plus size={14} />
                    Add First Session
                  </Button>
                </div>
              {:else}
                <div class="space-y-4">
                  {#each timelineItems as item (item.id)}
                    {@const style = getCategoryColor(item.category)}
                    <div class="glass rounded-2xl border border-white/8 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-white/15 transition-all">
                      <div class="space-y-2 flex-1">
                        <div class="flex flex-wrap items-center gap-2">
                          <span class="inline-flex items-center gap-1 text-xs font-mono font-bold text-amber-300 bg-amber-400/10 border border-amber-400/20 px-2.5 py-0.5 rounded-md">
                            <Clock size={12} />
                            {formatTimelineTimeRange(item.start_time, item.end_time)}
                          </span>
                          <span class="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border {style.bg} {style.text} {style.border}">
                            {item.category || 'General'}
                          </span>
                          {#if item.location}
                            <button
                              type="button"
                              onclick={() => jumpToVenueLocation(item.location)}
                              class="inline-flex items-center gap-1 text-xs text-ink-300 bg-white/4 hover:bg-amber-400/15 hover:text-amber-300 hover:border-amber-400/30 transition-colors px-2 py-0.5 rounded-md border border-white/6 cursor-pointer"
                              title={currentEvent.is_venue_enabled ? `Click to view ${item.location} on Venue Map` : item.location}
                            >
                              <MapPin size={12} class="text-amber-400" />
                              {item.location}
                            </button>
                          {/if}
                        </div>

                        <h4 class="text-base font-bold text-white">{item.title}</h4>

                        {#if item.description}
                          <p class="text-xs text-ink-300 line-clamp-2">{item.description}</p>
                        {/if}

                        {#if item.speaker_name}
                          <div class="flex items-center gap-2 pt-1 text-xs text-ink-400">
                            <UserCircle2 size={14} class="text-indigo-400" />
                            <span class="font-medium text-white">{item.speaker_name}</span>
                            {#if item.speaker_role}
                              <span class="text-ink-500">({item.speaker_role})</span>
                            {/if}
                          </div>
                        {/if}
                      </div>

                      <div class="flex items-center gap-2 shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0 border-white/6">
                        <Button
                          variant="outline"
                          size="sm"
                          onclick={() => openEditTimelineModal(item)}
                          class="gap-1 text-xs border-white/10 text-white hover:bg-white/10"
                        >
                          <Pencil size={13} />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={deletingTimelineItemId === item.id}
                          onclick={() => deleteTimelineItem(item.id)}
                          class="gap-1 text-xs border-red-500/20 text-red-400 hover:bg-red-500/10"
                        >
                          {#if deletingTimelineItemId === item.id}
                            <LoaderCircle size={13} class="animate-spin" />
                          {:else}
                            <Trash2 size={13} />
                          {/if}
                          Delete
                        </Button>
                      </div>
                    </div>
                  {/each}
                </div>
              {/if}
            </Tabs.Content>
          {/if}
        </Tabs.Root>
        {/if}

        <!-- Create / Edit Timeline Session Modal -->
        {#if timelineModalOpen}
          <div class="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-fade-in">
            <div class="glass rounded-2xl border border-white/10 p-5 sm:p-7 max-w-xl sm:max-w-2xl w-full max-h-[88vh] flex flex-col shadow-2xl bg-neutral-950/95 overflow-hidden">
              <!-- Fixed Header -->
              <div class="flex items-center justify-between border-b border-white/10 pb-4 shrink-0">
                <div class="flex items-center gap-3">
                  <div class="h-9 w-9 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-amber-400 shrink-0">
                    <CalendarClock size={20} />
                  </div>
                  <div>
                    <h3 class="text-base font-bold text-white leading-tight">
                      {editingTimelineItem ? 'Edit Schedule Session' : 'Add Schedule Session'}
                    </h3>
                    <p class="text-xs text-ink-400 mt-0.5">Configure timing, location, speaker, and session details</p>
                  </div>
                </div>
                <button type="button" onclick={() => (timelineModalOpen = false)} class="text-ink-400 hover:text-white p-2 rounded-xl hover:bg-white/5 transition-colors">
                  <X size={18} />
                </button>
              </div>

              {#if timelineError}
                <div class="flex items-center gap-2.5 text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mt-4 shrink-0">
                  <AlertTriangle size={14} class="shrink-0" />
                  <span>{timelineError}</span>
                </div>
              {/if}

              <!-- Inner Scrollable Form Content -->
              <div class="flex-1 overflow-y-auto py-5 pl-1 pr-4 sm:pr-5 space-y-5 text-left scrollbar-thin">
                <!-- Title -->
                <div class="space-y-2">
                  <Label class="text-sm font-semibold text-white">Session Title *</Label>
                  <Input
                    bind:value={timelineTitle}
                    placeholder="e.g., Keynote: The Future of AI in Networking"
                    class="bg-white/5 border-white/10 text-sm text-white placeholder:text-ink-500 focus:border-amber-400/50 h-10 w-full"
                  />
                </div>

                <!-- Category & Location -->
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <!-- Category -->
                  <div class="space-y-2">
                    <Label class="text-sm font-semibold text-white">Category</Label>
                    <Input
                      bind:value={timelineCategory}
                      placeholder="e.g. Fireside Chat, Workshop..."
                      class="bg-white/5 border-white/10 text-sm text-white placeholder:text-ink-500 focus:border-amber-400/50 h-10 w-full"
                    />
                    <PillScroller label="Suggestions:" class="pt-1">
                      {#each categorySuggestions as sug}
                        <button
                          type="button"
                          onclick={() => (timelineCategory = sug)}
                          class="text-xs px-2.5 py-0.5 rounded-full border transition-all whitespace-nowrap shrink-0 cursor-pointer {timelineCategory?.toLowerCase().trim() === sug.toLowerCase().trim() ? 'bg-amber-400/20 border-amber-400/50 text-amber-300 font-semibold' : 'bg-white/5 border-white/10 text-ink-400 hover:text-white hover:bg-white/10'}"
                        >{sug}</button>
                      {/each}
                    </PillScroller>
                  </div>

                  <!-- Location / Stage -->
                  <div class="space-y-2">
                    <Label class="text-sm font-semibold text-white">Location / Stage</Label>
                    <Input
                      bind:value={timelineLocation}
                      placeholder="e.g., Main Stage, Hall A, Room 302"
                      class="bg-white/5 border-white/10 text-sm text-white placeholder:text-ink-500 focus:border-amber-400/50 h-10 w-full"
                    />
                    {#if mapZoneSuggestions.length > 0}
                      <PillScroller label="Map Zones:" class="pt-1">
                        {#each mapZoneSuggestions as z}
                          <button
                            type="button"
                            onclick={() => (timelineLocation = z.name)}
                            class="text-xs px-2.5 py-0.5 rounded-full border transition-all whitespace-nowrap shrink-0 cursor-pointer {timelineLocation?.toLowerCase().trim() === z.name.toLowerCase().trim() ? 'bg-amber-400/20 border-amber-400/50 text-amber-300 font-semibold' : 'bg-white/5 border-white/10 text-ink-400 hover:text-white hover:bg-white/10'}"
                          >📍 {z.name}</button>
                        {/each}
                      </PillScroller>
                    {/if}
                  </div>
                </div>

                <!-- Venue Map Sync Note -->
                <div class="flex items-start gap-3 px-4 py-3.5 rounded-xl bg-blue-500/8 border border-blue-500/20">
                  <svg class="w-4 h-4 mt-0.5 shrink-0 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                  <p class="text-xs text-blue-300 leading-relaxed">
                    <span class="font-semibold text-blue-200">Venue Map Sync:</span> Set the <span class="font-semibold text-blue-200">Location / Stage</span> to exactly match a zone name from your Venue Map — this session will automatically appear inside that block on the map, so attendees can see what's happening at each location.
                  </p>
                </div>

                <!-- Session Timing -->
                <div class="space-y-4 p-4 sm:p-5 bg-white/[0.03] rounded-xl border border-white/10">
                  <div class="flex items-center justify-between gap-2">
                    <div class="flex items-center gap-2">
                      <span class="text-xs font-bold uppercase tracking-wider text-amber-400">Session Timing</span>
                      {#if calculatedDurationText}
                        <span class="text-xs font-mono font-semibold px-2 py-0.5 rounded-md bg-amber-400/15 border border-amber-400/30 text-amber-300">
                          ⏱️ {calculatedDurationText}
                        </span>
                      {/if}
                    </div>
                    <button
                      type="button"
                      onclick={setTimelineStartToNow}
                      class="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-amber-400/10 hover:bg-amber-400/20 text-amber-300 border border-amber-400/20 transition-colors shrink-0 cursor-pointer"
                    >⚡ Next Available Slot</button>
                  </div>

                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <!-- Start Date & Time -->
                    <div class="space-y-1.5">
                      <div class="text-xs text-ink-300 font-medium flex items-center justify-between">
                        <span>Start Date & Time</span>
                        <span class="text-[10px] text-ink-400 font-mono">5m interval</span>
                      </div>
                      <div class="grid grid-cols-2 gap-2">
                        <!-- Custom Date Button -->
                        <button
                          type="button"
                          onclick={() => openTimelineCalendar('start')}
                          class="w-full flex items-center justify-between bg-white/5 hover:bg-white/8 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white transition-colors"
                        >
                          <span class="flex items-center gap-2">
                            <Calendar size={14} class="text-amber-400" />
                            {formatDateHuman(timelineStartDate)}
                          </span>
                        </button>
                        <!-- Custom Clock Time Button -->
                        <button
                          type="button"
                          onclick={() => openTimelineClock('start')}
                          class="w-full flex items-center justify-between bg-white/5 hover:bg-white/8 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white transition-colors {isStartTimeInPast ? 'border-red-500/60 bg-red-500/10 text-red-300' : ''}"
                        >
                          <span class="flex items-center gap-2">
                            <Clock size={14} class="text-amber-400" />
                            {formatTime12h(timelineStartTimeVal)}
                          </span>
                        </button>
                      </div>
                      {#if isStartTimeInPast}
                        <p class="text-[11px] text-red-400 flex items-center gap-1 font-medium pt-0.5">
                          ⚠️ Start time cannot be in the past.
                        </p>
                      {/if}
                    </div>

                    <!-- End Date & Time -->
                    <div class="space-y-1.5">
                      <div class="text-xs text-ink-300 font-medium block">End Date & Time</div>
                      <div class="grid grid-cols-2 gap-2">
                        <!-- Custom Date Button -->
                        <button
                          type="button"
                          onclick={() => openTimelineCalendar('end')}
                          class="w-full flex items-center justify-between bg-white/5 hover:bg-white/8 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white transition-colors"
                        >
                          <span class="flex items-center gap-2">
                            <Calendar size={14} class="text-amber-400" />
                            {formatDateHuman(timelineEndDate)}
                          </span>
                        </button>
                        <!-- Custom Clock Time Button -->
                        <button
                          type="button"
                          onclick={() => openTimelineClock('end')}
                          class="w-full flex items-center justify-between bg-white/5 hover:bg-white/8 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white transition-colors {isEndTimeBeforeStart ? 'border-red-500/60 bg-red-500/10 text-red-300' : ''}"
                        >
                          <span class="flex items-center gap-2">
                            <Clock size={14} class="text-amber-400" />
                            {formatTime12h(timelineEndTimeVal)}
                          </span>
                        </button>
                      </div>
                      {#if isEndTimeBeforeStart}
                        <p class="text-[11px] text-red-400 flex items-center gap-1 font-medium pt-0.5">
                          ⚠️ End time must be after start time.
                        </p>
                      {/if}
                    </div>
                  </div>

                  <!-- Quick Duration Shortcuts -->
                  <div class="pt-3 border-t border-white/8">
                    <PillScroller label="Quick Duration:">
                      {#each durationShortcuts as dur}
                        <button
                          type="button"
                          onclick={() => applyDurationShortcut(dur.minutes)}
                          class="text-xs px-2.5 py-1 rounded-lg border bg-white/5 hover:bg-amber-400/15 hover:text-amber-300 hover:border-amber-400/30 text-ink-300 border-white/10 transition-colors font-mono whitespace-nowrap shrink-0 cursor-pointer"
                        >+{dur.label}</button>
                      {/each}
                    </PillScroller>
                  </div>
                </div>

                <!-- Description -->
                <div class="space-y-2">
                  <Label class="text-sm font-semibold text-white">Description</Label>
                  <textarea
                    bind:value={timelineDescription}
                    rows="3"
                    placeholder="Provide details about what will happen in this session..."
                    class="w-full rounded-xl bg-white/5 border border-white/10 px-3.5 py-3 text-sm text-white placeholder:text-ink-500 focus:outline-none focus:border-amber-400/50 resize-none leading-relaxed"
                  ></textarea>
                </div>

                <!-- Speaker Details -->
                <div class="space-y-4 pt-4 border-t border-white/8">
                  <span class="text-xs font-bold uppercase tracking-wider text-indigo-400">Speaker Information <span class="normal-case font-normal text-ink-500">(Optional)</span></span>

                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div class="space-y-2">
                      <Label class="text-sm text-ink-300">Speaker Name</Label>
                      <Input
                        bind:value={timelineSpeakerName}
                        placeholder="e.g., Dr. Sarah Connor"
                        class="bg-white/5 border-white/10 text-sm text-white placeholder:text-ink-500 h-10 w-full"
                      />
                    </div>

                    <div class="space-y-2">
                      <Label class="text-sm text-ink-300">Speaker Title / Role</Label>
                      <Input
                        bind:value={timelineSpeakerRole}
                        placeholder="e.g., VP of Engineering, OpenTech"
                        class="bg-white/5 border-white/10 text-sm text-white placeholder:text-ink-500 h-10 w-full"
                      />
                    </div>
                  </div>

                  <div class="space-y-2">
                    <Label class="text-sm text-ink-300">Speaker Avatar URL</Label>
                    <Input
                      bind:value={timelineSpeakerAvatarUrl}
                      placeholder="https://..."
                      class="bg-white/5 border-white/10 text-sm text-white placeholder:text-ink-500 h-10 w-full"
                    />
                  </div>
                </div>
              </div>

              <!-- Footer -->
              <div class="flex items-center justify-end gap-3 pt-4 border-t border-white/10 shrink-0">
                <Button
                  variant="ghost"
                  onclick={() => (timelineModalOpen = false)}
                  class="text-ink-300 hover:text-white text-sm h-10 px-5 rounded-xl"
                >
                  Cancel
                </Button>

                <Button
                  onclick={saveTimelineItem}
                  disabled={savingTimelineItem || isStartTimeInPast || isEndTimeBeforeStart}
                  class="gap-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold px-5 h-10 text-sm rounded-xl shadow-[0_0_14px_rgba(251,191,36,0.25)] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {#if savingTimelineItem}
                    <LoaderCircle size={15} class="animate-spin" />
                    Saving…
                  {:else}
                    <Save size={15} />
                    {editingTimelineItem ? 'Update Session' : 'Save Session'}
                  {/if}
                </Button>
              </div>
            </div>
          </div>
        {/if}

        <!-- Timeline Date Calendar Popover Modal -->
        {#if activeTimelineDatePicker}
          <div class="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
            <div class="glass rounded-2xl border border-white/10 p-6 max-w-sm w-full space-y-4 shadow-2xl bg-neutral-950/95">
              <div class="flex items-center justify-between">
                <h3 class="text-sm font-bold text-white uppercase tracking-wider">
                  {activeTimelineDatePicker === 'start' ? 'Select Start Date' : 'Select End Date'}
                </h3>
                <button type="button" onclick={() => (activeTimelineDatePicker = null)} class="text-ink-400 hover:text-white">
                  <X size={16} />
                </button>
              </div>

              <div class="flex items-center justify-between bg-white/5 rounded-xl px-3 py-2">
                <button type="button" onclick={prevMonth} class="text-ink-400 hover:text-white p-1">
                  <ArrowLeft size={16} />
                </button>
                <span class="text-sm font-semibold text-white">
                  {MONTH_NAMES[viewMonth]} {viewYear}
                </span>
                <button type="button" onclick={nextMonth} class="text-ink-400 hover:text-white p-1">
                  <ArrowRight size={16} />
                </button>
              </div>

              <div class="grid grid-cols-7 gap-1 text-center">
                {#each ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'] as dayHead}
                  <span class="text-[11px] font-bold text-ink-500 py-1">{dayHead}</span>
                {/each}

                {#each getCalendarGrid(viewYear, viewMonth) as item}
                  {#if !item}
                    <div></div>
                  {:else}
                    {@const minAllowed = activeTimelineDatePicker === 'start' ? todayStr : (timelineStartDate || todayStr)}
                    {@const isDisabled = item.dateStr < minAllowed}
                    {@const isSelected = item.dateStr === (activeTimelineDatePicker === 'start' ? timelineStartDate : timelineEndDate)}
                    <button
                      type="button"
                      disabled={isDisabled}
                      onclick={() => selectTimelineCalendarDate(item.dateStr)}
                      class="h-9 w-9 mx-auto rounded-xl text-xs font-semibold flex items-center justify-center transition-all {isSelected
                        ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30'
                        : isDisabled
                        ? 'text-white/20 cursor-not-allowed opacity-30'
                        : 'text-ink-300 hover:bg-white/10 hover:text-white'}"
                    >
                      {item.day}
                    </button>
                  {/if}
                {/each}
              </div>

              <div class="text-[11px] text-ink-500 text-center pt-1 border-t border-white/6">
                Dates prior to {activeTimelineDatePicker === 'start' ? 'today' : 'start date'} are blocked.
              </div>
            </div>
          </div>
        {/if}

        <!-- Timeline Clock Time Picker Popover Modal -->
        {#if activeTimelineTimePicker}
          <div class="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
            <div class="glass rounded-2xl border border-white/10 p-6 max-w-sm w-full space-y-5 shadow-2xl bg-neutral-950/95">
              <div class="flex items-center justify-between">
                <h3 class="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Clock size={16} class="text-amber-400" />
                  {activeTimelineTimePicker === 'start' ? 'Set Start Time' : 'Set End Time'}
                </h3>
                <button type="button" onclick={() => (activeTimelineTimePicker = null)} class="text-ink-400 hover:text-white">
                  <X size={16} />
                </button>
              </div>

              <!-- Clock Display -->
              <div class="flex items-center justify-center gap-3 bg-white/5 rounded-2xl p-4 border border-white/8">
                <div class="text-3xl font-black font-mono text-white tracking-wider">
                  {String(clockHour).padStart(2, '0')}:{String(clockMinute).padStart(2, '0')}
                </div>
                <div class="flex flex-col gap-1">
                  <button
                    type="button"
                    onclick={() => (clockPeriod = 'AM')}
                    class="px-2.5 py-1 text-xs font-bold rounded-lg transition-all {clockPeriod === 'AM' ? 'bg-amber-500 text-white' : 'bg-white/5 text-ink-400 hover:text-white'}"
                  >
                    AM
                  </button>
                  <button
                    type="button"
                    onclick={() => (clockPeriod = 'PM')}
                    class="px-2.5 py-1 text-xs font-bold rounded-lg transition-all {clockPeriod === 'PM' ? 'bg-amber-500 text-white' : 'bg-white/5 text-ink-400 hover:text-white'}"
                  >
                    PM
                  </button>
                </div>
              </div>

              <!-- Hours Selection Grid -->
              <div class="space-y-1.5">
                <span class="text-[11px] font-bold uppercase tracking-wider text-ink-400">Hour</span>
                <div class="grid grid-cols-6 gap-1.5">
                  {#each [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] as h}
                    <button
                      type="button"
                      onclick={() => (clockHour = h)}
                      class="py-2 rounded-xl text-xs font-semibold transition-all {clockHour === h
                        ? 'bg-amber-500/30 border border-amber-400/50 text-amber-300 font-bold'
                        : 'bg-white/5 border-white/10 text-ink-300 hover:text-white hover:bg-white/10'}"
                    >
                      {h}
                    </button>
                  {/each}
                </div>
              </div>

              <!-- Minutes Selection Grid -->
              <div class="space-y-1.5">
                <span class="text-[11px] font-bold uppercase tracking-wider text-ink-400 flex items-center justify-between">
                  <span>Minute</span>
                  <span class="text-[9px] text-ink-500 font-normal normal-case">5m steps</span>
                </span>
                <div class="grid grid-cols-6 gap-1.5">
                  {#each [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55] as m}
                    {@const isDisabled = isTimelineTimeDisabled(clockHour, m, clockPeriod, activeTimelineTimePicker)}
                    <button
                      type="button"
                      disabled={isDisabled}
                      onclick={() => (clockMinute = m)}
                      class="py-2 rounded-xl text-xs font-semibold transition-all {clockMinute === m
                        ? 'bg-amber-500/30 border border-amber-400/50 text-amber-300 font-bold'
                        : isDisabled
                        ? 'text-white/20 cursor-not-allowed opacity-30'
                        : 'bg-white/5 border-white/10 text-ink-300 hover:text-white hover:bg-white/10'}"
                    >
                      {String(m).padStart(2, '0')}
                    </button>
                  {/each}
                </div>
              </div>

              <!-- Action Buttons -->
              <div class="pt-2 flex flex-col gap-2">
                {#if isTimelineTimeDisabled(clockHour, clockMinute, clockPeriod, activeTimelineTimePicker)}
                  <p class="text-[11px] text-red-400 text-center font-medium">Selected time is in the past.</p>
                {/if}
                <Button
                  onclick={applyTimelineClockTime}
                  disabled={isTimelineTimeDisabled(clockHour, clockMinute, clockPeriod, activeTimelineTimePicker)}
                  class="w-full gap-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold disabled:opacity-50"
                >
                  <Check size={16} />
                  Apply Time
                </Button>
              </div>
            </div>
          </div>
        {/if}

        <!-- Settings Date Calendar Popover Modal -->
        {#if activeDatePicker}
          <div class="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
            <div class="glass rounded-2xl border border-white/10 p-6 max-w-sm w-full space-y-4 shadow-2xl bg-neutral-950/95">
              <div class="flex items-center justify-between">
                <h3 class="text-sm font-bold text-white uppercase tracking-wider">
                  {activeDatePicker === 'start' ? 'Select Start Date' : 'Select End Date'}
                </h3>
                <button type="button" onclick={() => (activeDatePicker = null)} class="text-ink-400 hover:text-white">
                  <X size={16} />
                </button>
              </div>

              <div class="flex items-center justify-between bg-white/5 rounded-xl px-3 py-2">
                <button type="button" onclick={prevMonth} class="text-ink-400 hover:text-white p-1">
                  <ArrowLeft size={16} />
                </button>
                <span class="text-sm font-semibold text-white">
                  {MONTH_NAMES[viewMonth]} {viewYear}
                </span>
                <button type="button" onclick={nextMonth} class="text-ink-400 hover:text-white p-1">
                  <ArrowRight size={16} />
                </button>
              </div>

              <div class="grid grid-cols-7 gap-1 text-center">
                {#each ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'] as dayHead}
                  <span class="text-[11px] font-bold text-ink-500 py-1">{dayHead}</span>
                {/each}

                {#each getCalendarGrid(viewYear, viewMonth) as item}
                  {#if !item}
                    <div></div>
                  {:else}
                    {@const minAllowed = activeDatePicker === 'start' ? todayStr : (settingsStartDate || todayStr)}
                    {@const isDisabled = item.dateStr < minAllowed}
                    {@const isSelected = item.dateStr === (activeDatePicker === 'start' ? settingsStartDate : settingsEndDate)}
                    <button
                      type="button"
                      disabled={isDisabled}
                      onclick={() => selectCalendarDate(item.dateStr)}
                      class="h-9 w-9 mx-auto rounded-xl text-xs font-semibold flex items-center justify-center transition-all {isSelected
                        ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30'
                        : isDisabled
                        ? 'text-white/20 cursor-not-allowed opacity-30'
                        : 'text-ink-300 hover:bg-white/10 hover:text-white'}"
                    >
                      {item.day}
                    </button>
                  {/if}
                {/each}
              </div>

              <div class="text-[11px] text-ink-500 text-center pt-1 border-t border-white/6">
                Dates prior to {activeDatePicker === 'start' ? 'today' : 'start date'} are blocked.
              </div>
            </div>
          </div>
        {/if}

        <!-- Settings Clock Time Picker Popover Modal -->
        {#if activeTimePicker}
          <div class="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
            <div class="glass rounded-2xl border border-white/10 p-6 max-w-sm w-full space-y-5 shadow-2xl bg-neutral-950/95">
              <div class="flex items-center justify-between">
                <h3 class="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Clock size={16} class="text-indigo-400" />
                  {activeTimePicker === 'start' ? 'Set Start Time' : 'Set End Time'}
                </h3>
                <button type="button" onclick={() => (activeTimePicker = null)} class="text-ink-400 hover:text-white">
                  <X size={16} />
                </button>
              </div>

              <div class="flex items-center justify-center gap-3 bg-white/5 rounded-2xl p-4 border border-white/8">
                <div class="text-3xl font-black font-mono text-white tracking-wider">
                  {String(clockHour).padStart(2, '0')}:{String(clockMinute).padStart(2, '0')}
                </div>
                <div class="flex flex-col gap-1">
                  <button
                    type="button"
                    onclick={() => (clockPeriod = 'AM')}
                    class="px-2.5 py-1 text-xs font-bold rounded-lg transition-all {clockPeriod === 'AM' ? 'bg-indigo-500 text-white' : 'bg-white/5 text-ink-400 hover:text-white'}"
                  >
                    AM
                  </button>
                  <button
                    type="button"
                    onclick={() => (clockPeriod = 'PM')}
                    class="px-2.5 py-1 text-xs font-bold rounded-lg transition-all {clockPeriod === 'PM' ? 'bg-indigo-500 text-white' : 'bg-white/5 text-ink-400 hover:text-white'}"
                  >
                    PM
                  </button>
                </div>
              </div>

              <div class="space-y-1.5">
                <span class="text-[11px] font-bold uppercase tracking-wider text-ink-400">Hour</span>
                <div class="grid grid-cols-6 gap-1.5">
                  {#each [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] as h}
                    <button
                      type="button"
                      onclick={() => (clockHour = h)}
                      class="py-2 rounded-xl text-xs font-semibold transition-all {clockHour === h
                        ? 'bg-indigo-500/30 border border-indigo-400/50 text-indigo-300 font-bold'
                        : 'bg-white/4 border border-white/6 text-ink-300 hover:bg-white/10 hover:text-white'}"
                    >
                      {h}
                    </button>
                  {/each}
                </div>
              </div>

              <div class="space-y-1.5">
                <span class="text-[11px] font-bold uppercase tracking-wider text-ink-400">Minute</span>
                <div class="grid grid-cols-4 gap-2">
                  {#each [0, 15, 30, 45] as m}
                    <button
                      type="button"
                      onclick={() => (clockMinute = m)}
                      class="py-2 rounded-xl text-xs font-semibold transition-all {clockMinute === m
                        ? 'bg-indigo-500/30 border border-indigo-400/50 text-indigo-300 font-bold'
                        : 'bg-white/4 border border-white/6 text-ink-300 hover:bg-white/10 hover:text-white'}"
                    >
                      :{String(m).padStart(2, '0')}
                    </button>
                  {/each}
                </div>
              </div>

              <Button onclick={applyClockTime} class="w-full font-semibold">
                Apply Time
              </Button>
            </div>
          </div>
        {/if}
      </div>
    {/if}


    <!-- Edit Event Modal -->
    <Dialog.Root bind:open={editEventModalOpen}>
      <Dialog.Content
        class="sm:max-w-lg bg-[#0f0f11] border border-white/10 text-white max-h-[90vh] overflow-y-auto"
      >
        <Dialog.Header>
          <Dialog.Title class="text-xl font-bold">Edit Event</Dialog.Title>
        </Dialog.Header>
        <div class="grid gap-4 py-4">
          <div class="space-y-1.5">
            <Label
              for="edit-name"
              class="text-xs uppercase tracking-widest text-ink-400 font-semibold"
              >Event Name *</Label
            >
            <Input
              id="edit-name"
              bind:value={editEventName}
              class="bg-white/5 border-white/10 text-white focus:border-amber-400/50 focus:ring-amber-400/20"
            />
          </div>

          <div class="space-y-1.5">
            <Label class="text-xs uppercase tracking-widest text-ink-400 font-semibold">
              Event Format
            </Label>
            <div class="grid grid-cols-3 gap-2">
              <button
                type="button"
                class="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg border text-xs font-semibold transition {editEventFormat === 'offline' ? 'bg-amber-400/15 border-amber-400/40 text-amber-300' : 'bg-white/4 border-white/8 text-ink-400 hover:text-white'}"
                onclick={() => editEventFormat = 'offline'}
              >
                <MapPin size={13} /> Offline
              </button>
              <button
                type="button"
                class="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg border text-xs font-semibold transition {editEventFormat === 'online' ? 'bg-amber-400/15 border-amber-400/40 text-amber-300' : 'bg-white/4 border-white/8 text-ink-400 hover:text-white'}"
                onclick={() => editEventFormat = 'online'}
              >
                <Globe size={13} /> Online
              </button>
              <button
                type="button"
                class="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg border text-xs font-semibold transition {editEventFormat === 'hybrid' ? 'bg-amber-400/15 border-amber-400/40 text-amber-300' : 'bg-white/4 border-white/8 text-ink-400 hover:text-white'}"
                onclick={() => editEventFormat = 'hybrid'}
              >
                <Globe size={13} /> Hybrid
              </button>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div class="space-y-1.5">
              <Label
                for="edit-start-time"
                class="text-xs uppercase tracking-widest text-ink-400 font-semibold"
                >Start Time</Label
              >
              <Input
                id="edit-start-time"
                type="datetime-local"
                bind:value={editEventStartTime}
                class="bg-white/5 border-white/10 text-white focus:border-amber-400/50 focus:ring-amber-400/20 color-scheme-dark"
              />
            </div>
            <div class="space-y-1.5">
              <Label
                for="edit-end-time"
                class="text-xs uppercase tracking-widest text-ink-400 font-semibold"
                >End Time</Label
              >
              <Input
                id="edit-end-time"
                type="datetime-local"
                bind:value={editEventEndTime}
                class="bg-white/5 border-white/10 text-white focus:border-amber-400/50 focus:ring-amber-400/20 color-scheme-dark"
              />
            </div>
          </div>

          <div class="space-y-1.5">
            <Label
              for="edit-location"
              class="text-xs uppercase tracking-widest text-ink-400 font-semibold"
              >{editEventFormat === 'online' ? 'Meeting Link' : 'Location / Venue Address'}</Label
            >
            <Input
              id="edit-location"
              bind:value={editEventLocation}
              placeholder={editEventFormat === 'online' ? 'https://meet.google.com/xyz' : 'Venue address'}
              class="bg-white/5 border-white/10 text-white focus:border-amber-400/50 focus:ring-amber-400/20"
            />
          </div>

          {#if editEventFormat !== 'online'}
            <div class="space-y-1.5">
              <Label
                for="edit-map-url"
                class="text-xs uppercase tracking-widest text-ink-400 font-semibold"
                >Google Map Link</Label
              >
              <Input
                id="edit-map-url"
                type="url"
                bind:value={editEventGoogleMapUrl}
                placeholder="https://maps.app.goo.gl/..."
                class="bg-white/5 border-white/10 text-white focus:border-amber-400/50 focus:ring-amber-400/20 font-mono text-xs"
              />
            </div>
          {/if}

          <div class="space-y-1.5">
            <Label
              for="edit-slug"
              class="text-xs uppercase tracking-widest text-ink-400 font-semibold"
              >Event ID (Slug) *</Label
            >
            <Input
              id="edit-slug"
              bind:value={editEventSlug}
              class="bg-white/5 border-white/10 text-white focus:border-amber-400/50 focus:ring-amber-400/20 font-mono"
            />
          </div>

          <div class="space-y-1.5">
            <Label
              for="edit-desc"
              class="text-xs uppercase tracking-widest text-ink-400 font-semibold"
              >Description</Label
            >
            <textarea
              id="edit-desc"
              bind:value={editEventDescription}
              rows="3"
              class="w-full bg-white/5 border border-white/10 text-white rounded-md p-2.5 text-sm focus:border-amber-400/50 focus:ring-amber-400/20 outline-none resize-none"
            ></textarea>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div class="flex items-center justify-between p-3 rounded-xl border border-white/8 bg-white/4">
              <span class="text-xs font-semibold text-white flex items-center gap-1.5">
                <Lock size={13} class="text-amber-400" />
                Require Host Approval
              </span>
              <input
                type="checkbox"
                bind:checked={editEventApprovalRequired}
                class="h-4 w-4 rounded border-white/20 bg-white/10 text-amber-400 focus:ring-amber-400/30 accent-amber-400 cursor-pointer"
              />
            </div>
          </div>

          {#if editEventError}
            <p class="text-red-400 text-sm">{editEventError}</p>
          {/if}
        </div>
        <div class="flex justify-end gap-3 mt-2">
          <Button
            variant="ghost"
            onclick={() => (editEventModalOpen = false)}
            disabled={editingEvent}>Cancel</Button
          >
          <Button
            onclick={saveEventUpdates}
            disabled={editingEvent}
            class="gap-2"
          >
            {#if editingEvent}<LoaderCircle
                size={15}
                class="animate-spin"
              />{/if}
            Save Changes
          </Button>
        </div>
      </Dialog.Content>
    </Dialog.Root>

    <!-- Delete Event Modal -->
    <Dialog.Root bind:open={deleteEventModalOpen}>
      <Dialog.Content
        class="sm:max-w-md bg-[#0f0f11] border border-red-500/20 text-white"
      >
        <Dialog.Header>
          <Dialog.Title class="text-xl font-bold text-red-400"
            >Delete Event</Dialog.Title
          >
        </Dialog.Header>
        <div class="py-4 space-y-4 text-sm text-ink-300">
          <p class="font-semibold text-white">
            Are you sure you want to delete this event?
          </p>
          <p>
            This action cannot be undone. Deleting this event will permanently
            remove:
          </p>
          <ul class="list-disc pl-5 space-y-1 text-ink-400">
            <li>Event details</li>
            <li>Participants</li>
            <li>Network profiles</li>
            <li>AI matches</li>
            <li>Connections</li>
            <li>Messages</li>
          </ul>
          <p class="text-red-400 font-semibold mt-2">
            This action is irreversible.
          </p>
          {#if deleteEventError}
            <p class="text-red-400 text-sm mt-2">{deleteEventError}</p>
          {/if}
        </div>
        <div class="flex justify-end gap-3 mt-2">
          <Button
            variant="ghost"
            onclick={() => (deleteEventModalOpen = false)}
            disabled={deletingEvent}>Cancel</Button
          >
          <Button
            variant="destructive"
            onclick={confirmDeleteEvent}
            disabled={deletingEvent}
            class="gap-2 bg-red-500 hover:bg-red-600 text-white"
          >
            {#if deletingEvent}<LoaderCircle
                size={15}
                class="animate-spin"
              />{/if}
            Delete Event
          </Button>
        </div>
      </Dialog.Content>
    </Dialog.Root>

    <!-- Announcement Create/Edit Modal -->
    <Dialog.Root bind:open={showAnnouncementModal}>
      <Dialog.Content class="sm:max-w-xl bg-[#0f0f11] border border-white/10 text-white p-6 sm:p-8">
        <Dialog.Header class="space-y-1.5 mb-5">
          <div class="flex items-center gap-2">
            <Megaphone size={18} class="text-rose-400" />
            <Dialog.Title class="text-lg font-bold text-white">
              {editingAnnouncement ? "Edit Announcement" : "Create Announcement"}
            </Dialog.Title>
          </div>
          <Dialog.Description class="text-xs text-ink-400">
            {editingAnnouncement ? "Modify this event update broadcast for attendees." : "Broadcast an official update or notice to all event attendees."}
          </Dialog.Description>
        </Dialog.Header>

        <form onsubmit={(e) => { e.preventDefault(); handleSaveAnnouncement(); }} class="space-y-4">
          <!-- Title -->
          <div class="space-y-2">
            <Label class="text-xs font-semibold uppercase tracking-wider text-ink-300">
              Title <span class="text-rose-400">*</span>
            </Label>
            <Input
              bind:value={announcementTitle}
              placeholder="e.g. Schedule Change: Keynote pushed by 30 mins"
              class="bg-white/5 border-white/10 text-white placeholder:text-ink-600 focus:border-rose-400/50 text-sm"
              required
            />
          </div>

          <!-- Content -->
          <div class="space-y-2">
            <Label class="text-xs font-semibold uppercase tracking-wider text-ink-300">
              Content / Notice Details <span class="text-rose-400">*</span>
            </Label>
            <textarea
              bind:value={announcementContent}
              rows="5"
              placeholder="Write the details of your announcement here..."
              class="w-full bg-white/5 border border-white/10 rounded-xl p-3.5 text-sm text-white placeholder:text-ink-600 focus:border-rose-400/50 focus:outline-none focus:ring-1 focus:ring-rose-400/20 resize-y"
              required
            ></textarea>
          </div>

          <!-- Priority & Pin Row -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <!-- Priority selector -->
            <div class="space-y-2">
              <Label class="text-xs font-semibold uppercase tracking-wider text-ink-300">
                Priority Level
              </Label>
              <select
                bind:value={announcementPriority}
                class="w-full bg-[#18181b] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-white focus:border-rose-400/50 focus:outline-none"
              >
                <option value="normal" class="bg-[#18181b] text-white">Normal</option>
                <option value="high" class="bg-[#18181b] text-amber-300">High Priority</option>
                <option value="urgent" class="bg-[#18181b] text-rose-400">Urgent</option>
                <option value="low" class="bg-[#18181b] text-ink-400">Low Priority</option>
              </select>
            </div>

            <!-- Pin Toggle -->
            <div class="space-y-2">
              <Label class="text-xs font-semibold uppercase tracking-wider text-ink-300">
                Pin to Top
              </Label>
              <button
                type="button"
                onclick={() => (announcementIsPinned = !announcementIsPinned)}
                class="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border border-white/10 bg-white/4 hover:bg-white/8 transition-colors"
              >
                <span class="text-xs font-semibold text-white flex items-center gap-1.5">
                  <Pin size={13} class="text-amber-400 rotate-45" />
                  {announcementIsPinned ? "Pinned" : "Normal Position"}
                </span>
                <div class="w-8 h-4.5 rounded-full transition-colors relative {announcementIsPinned ? 'bg-amber-500' : 'bg-white/15'}">
                  <div class="w-3.5 h-3.5 rounded-full bg-white absolute top-0.5 left-0.5 transition-transform {announcementIsPinned ? 'translate-x-3.5' : 'translate-x-0'}"></div>
                </div>
              </button>
            </div>
          </div>

          <!-- Buttons -->
          <div class="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
            <Button
              type="button"
              variant="ghost"
              onclick={() => (showAnnouncementModal = false)}
              class="text-ink-400 hover:text-white text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={savingAnnouncement || !announcementTitle.trim() || !announcementContent.trim()}
              class="gap-2 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white font-semibold text-xs px-5 h-9"
            >
              {#if savingAnnouncement}
                <LoaderCircle size={14} class="animate-spin" /> Saving…
              {:else}
                <Megaphone size={14} />
                {editingAnnouncement ? "Update Announcement" : "Post Announcement"}
              {/if}
            </Button>
          </div>
        </form>
      </Dialog.Content>
    </Dialog.Root>

    <!-- AI Credits Exhausted Modal -->
    <AICreditsExhausted />
  </main>
</PageShell>
