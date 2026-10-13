// Preloaded into the Next.js server so it exits when the launcher dies, even if the
// launcher is force-killed (Windows does not stop child processes on its own).
process.on("disconnect", () => process.exit(0));
