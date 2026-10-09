/** Runs once when the server starts. Node-only work is imported behind the runtime check. */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startServerWatch } = await import("@/lib/serverWatch");
    startServerWatch();
  }
}
