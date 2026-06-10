type MemoDraftGuard = () => boolean | Promise<boolean>;

let activeGuard: MemoDraftGuard | null = null;

export function registerMemoDraftGuard(guard: MemoDraftGuard) {
  activeGuard = guard;

  return () => {
    if (activeGuard === guard) {
      activeGuard = null;
    }
  };
}

export async function saveMemoDraftBeforeLeave(): Promise<boolean> {
  if (!activeGuard) {
    return true;
  }

  return activeGuard();
}
