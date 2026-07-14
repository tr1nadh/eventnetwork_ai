import fs from 'fs';

const oldCode = fs.readFileSync('old_page.svelte', 'utf8');
const newCode = fs.readFileSync('src/routes/+page.svelte', 'utf8');

// Find where to insert Venue (before Organizers)
const organizersIndex = newCode.indexOf('<!-- ORGANIZER SECTION -->');

const venueSection = `
      <!-- VENUE SECTION -->
      <section id="venue" class="w-full max-w-7xl mx-auto px-6 py-32 border-t border-white/5" data-section="venue">
        <div class="grid md:grid-cols-2 gap-16 items-center">
          <div class="space-y-8" class:opacity-0={!isVisible('venue')} class:animate-fade-in-up={isVisible('venue')}>
            <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cyan-500/20 bg-cyan-500/10 text-cyan-400 text-xs font-medium">
              <MapPinned size={14} /> Interactive 2D Venue
            </div>
            <h2 class="text-3xl md:text-5xl font-bold tracking-tight text-white">Design the room, then help people move through it.</h2>
            <p class="text-slate-400 text-lg">
              Organizers can customize venue layouts, booths, stages, lounges, and meeting points while attendees easily navigate the networking spaces around them.
            </p>
            <div class="flex flex-wrap gap-3 mt-6">
              {#each ['Custom zones', 'Attendee location', 'Booths and stages', 'Meeting areas'] as item}
                <span class="rounded-full border border-white/10 bg-[#111] px-4 py-2 text-xs font-semibold text-slate-300 shadow-sm">{item}</span>
              {/each}
            </div>
          </div>

          <div class="relative p-6 rounded-3xl border border-white/10 bg-[#111] shadow-2xl" class:opacity-0={!isVisible('venue')} class:animate-fade-in-up={isVisible('venue')} style="animation-delay: 200ms; animation-fill-mode: forwards;">
            <div class="rounded-2xl border border-white/5 bg-[#0a0a0a] p-5">
              <div class="mb-5 flex items-center justify-between">
                <div>
                  <p class="text-xs font-bold uppercase tracking-[0.2em] text-amber-400">Venue Editor</p>
                  <p class="mt-1 text-sm text-slate-400">Hackathon floor layout</p>
                </div>
                <Route size={20} class="text-cyan-400" />
              </div>

              <div class="venue-grid">
                <div class="venue-zone zone-stage">Main Stage</div>
                <div class="venue-zone zone-booths">Sponsor Booths</div>
                <div class="venue-zone zone-lounge">Networking Lounge</div>
                <div class="venue-zone zone-mentor">Mentor Hub</div>
                <div class="venue-zone zone-food">Cafe</div>
                <div class="venue-path"></div>
                <div class="venue-pin pin-a"></div>
                <div class="venue-pin pin-b"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

`;

const whyIndex = newCode.indexOf('<!-- WHY EVENTNETWORK -->');
const testimonialsIndex = newCode.indexOf('<!-- CTA -->');

const testimonialsSection = `
      <!-- TESTIMONIALS -->
      <section class="w-full max-w-7xl mx-auto px-6 py-32 border-t border-white/5" data-section="testimonials">
        <div class="text-center mb-20" class:opacity-0={!isVisible('testimonials')} class:animate-fade-in-up={isVisible('testimonials')}>
          <h2 class="text-3xl md:text-5xl font-bold tracking-tight text-white">Built for the people in the room</h2>
          <p class="mt-4 text-slate-400 max-w-2xl mx-auto text-lg">What attendees and organizers are saying about their event experiences.</p>
        </div>

        <div class="grid gap-6 md:grid-cols-3">
          {#each testimonials as testimonial, i}
            <div class="relative group p-8 rounded-3xl bg-[#111] border border-white/5 overflow-hidden flex flex-col transition-all duration-300 hover:-translate-y-1 hover:border-amber-500/20" class:opacity-0={!isVisible('testimonials')} class:animate-fade-in-up={isVisible('testimonials')} style="animation-delay: {i * 100}ms; animation-fill-mode: forwards;">
              <div class="flex items-center gap-4 mb-6">
                <div class="flex h-12 w-12 items-center justify-center rounded-full border border-amber-500/20 bg-amber-500/10 text-sm font-black text-amber-400">
                  {testimonial.initials}
                </div>
                <div>
                  <p class="font-bold text-white">{testimonial.name}</p>
                  <p class="text-xs text-slate-500">{testimonial.role}</p>
                </div>
              </div>
              <blockquote class="text-sm leading-relaxed text-slate-400">"{testimonial.quote}"</blockquote>
            </div>
          {/each}
        </div>
      </section>

`;

const cssAdditions = `
  .venue-grid {
    position: relative;
    display: grid;
    min-height: 360px;
    grid-template-columns: 1fr 0.7fr 1fr;
    grid-template-rows: 1fr 0.9fr 0.8fr;
    gap: 0.75rem;
  }

  .venue-zone {
    position: relative;
    z-index: 2;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 1rem;
    border: 1px solid rgba(255, 255, 255, 0.05);
    padding: 0.75rem;
    text-align: center;
    font-size: 0.76rem;
    font-weight: 800;
    color: #f8fafc;
    transition: transform 0.3s ease;
  }
  .venue-zone:hover {
    transform: scale(1.02);
  }

  .zone-stage { grid-column: 1 / 3; background: rgba(251, 191, 36, 0.05); border-color: rgba(251, 191, 36, 0.15); }
  .zone-booths { grid-column: 3; grid-row: 1 / 3; background: rgba(34, 211, 238, 0.05); border-color: rgba(34, 211, 238, 0.15); }
  .zone-lounge { grid-column: 1; grid-row: 2 / 4; background: rgba(52, 211, 153, 0.05); border-color: rgba(52, 211, 153, 0.15); }
  .zone-mentor { grid-column: 2; grid-row: 2; background: rgba(167, 139, 250, 0.05); border-color: rgba(167, 139, 250, 0.15); }
  .zone-food { grid-column: 2 / 4; grid-row: 3; background: rgba(244, 114, 182, 0.05); border-color: rgba(244, 114, 182, 0.15); }

  .venue-path {
    position: absolute;
    left: 19%;
    right: 16%;
    top: 48%;
    z-index: 1;
    height: 2px;
    background: linear-gradient(90deg, rgba(251, 191, 36, 0.5), rgba(34, 211, 238, 0.45));
    transform: rotate(10deg);
    opacity: 0.75;
  }

  .venue-pin {
    position: absolute;
    z-index: 3;
    height: 12px;
    width: 12px;
    border-radius: 999px;
    background: #fbbf24;
    box-shadow: 0 0 0 6px rgba(251, 191, 36, 0.16), 0 0 22px rgba(251, 191, 36, 0.65);
    animation: pin-pulse 1.8s ease-in-out infinite;
  }

  .pin-a { left: 29%; top: 56%; }
  .pin-b { right: 20%; top: 40%; animation-delay: -0.7s; background: #22d3ee; box-shadow: 0 0 0 6px rgba(34, 211, 238, 0.16), 0 0 22px rgba(34, 211, 238, 0.65); }

  @keyframes pin-pulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.18); }
  }
`;

let resultCode = newCode.slice(0, organizersIndex) + venueSection + newCode.slice(organizersIndex, testimonialsIndex) + testimonialsSection + newCode.slice(testimonialsIndex);
resultCode = resultCode.replace('</style>', cssAdditions + '\n</style>');

fs.writeFileSync('src/routes/+page.svelte', resultCode);
console.log('Restored venue and testimonials sections');
