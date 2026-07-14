import fs from 'fs';

let code = fs.readFileSync('src/routes/+page.svelte', 'utf8');

// Replace all occurrences of class:opacity-0={...}
code = code.replace(/class:opacity-0=\{[^}]+\}/g, '');

// Also, the animate classes may not work correctly without opacity-0 because the animation starts from opacity 0 and animates to 1.
// Actually, if we just let the animation run, they will pop in beautifully.
// Or we can just remove the visibility conditionals from the animations too to just let them animate on load:
code = code.replace(/class:animate-fade-in-up=\{[^}]+\}/g, 'class="animate-fade-in-up"');
code = code.replace(/class:animate-fade-in=\{[^}]+\}/g, 'class="animate-fade-in"');

// Some classes were combined with group or other classes, so `class="animate-fade-in-up"` might result in dual class attributes.
// Let's just fix dual class attributes generically:
while (code.match(/class="([^"]*)"\s+class="([^"]*)"/)) {
  code = code.replace(/class="([^"]*)"\s+class="([^"]*)"/g, 'class="$1 $2"');
}

fs.writeFileSync('src/routes/+page.svelte', code);
