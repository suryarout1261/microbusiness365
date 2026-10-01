type Listener = () => void;

let desktopExpanded = true;
let mobileExpanded = false;
const listeners = new Set<Listener>();

// Initialize from localStorage on browser load
if (typeof window !== 'undefined') {
  try {
    const saved = localStorage.getItem('mb365_sidebar_expanded');
    if (saved !== null) {
      desktopExpanded = saved === 'true';
    }
  } catch (e) {}
}

function notify() {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch (e) {
      console.error(e);
    }
  });
}

export const sidebarStore = {
  isDesktopExpanded() {
    return desktopExpanded;
  },
  isMobileExpanded() {
    return mobileExpanded;
  },
  toggleDesktop() {
    desktopExpanded = !desktopExpanded;
    try {
      localStorage.setItem('mb365_sidebar_expanded', String(desktopExpanded));
    } catch (e) {}
    notify();
  },
  toggleMobile() {
    mobileExpanded = !mobileExpanded;
    notify();
  },
  setMobileExpanded(val: boolean) {
    mobileExpanded = val;
    notify();
  },
  subscribe(listener: Listener) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }
};
