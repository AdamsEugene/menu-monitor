import MenuMonitor, { MenuMonitorType } from "./MenuMonitor";

declare global {
  interface Window {
    MenuMonitor: MenuMonitorType;
  }
}

window.MenuMonitor = new MenuMonitor();


window.MenuMonitor.init()