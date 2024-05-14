class MenuMonitor {
  private hoverTimer: NodeJS.Timeout | null = null;
  private hoverElement: HTMLElement | null = null;
  private hoverDuration: number = 3000; // 3 seconds
  private mutations: MutationRecord[] = [];
  private previousMutations: MutationRecord[] = [];
  private isRecording: boolean = false;
  private clonedElements: Map<HTMLElement, Node> = new Map();
  private previousClonedElements: Map<HTMLElement, Node> = new Map();
  private debugMode: boolean;
  private menuName: string = "unknown";
  private hiddenElements: Map<HTMLElement, boolean> = new Map();
  private detailsElements: Map<HTMLElement, boolean> = new Map();
  private displayChangedElements: Map<Element, string> = new Map();
  private detailChangedElements: Map<Element, boolean> = new Map();
  // private originalDisplayValues: Map<Element, string> = new Map();
  private headerElement: HTMLElement | null = null;

  constructor(debugMode: boolean = false) {
    this.debugMode = debugMode;
  }

  private hasSamePositionAndSize(
    element1: HTMLElement,
    element2: HTMLElement
  ): boolean {
    const rect1 = element1.getBoundingClientRect();
    const rect2 = element2.getBoundingClientRect();

    return (
      rect1.top === rect2.top &&
      rect1.right === rect2.right &&
      rect1.bottom === rect2.bottom &&
      rect1.left === rect2.left
    );
  }

  init(debugMode: boolean = false): void {
    this.debugMode = debugMode;

    let dom: Document | undefined = document;

    const iframe = document.getElementById(
      "recordingPlayer"
    ) as HTMLIFrameElement | null;

    if (iframe) {
      dom = iframe.contentWindow?.document;
    }

    const header = dom?.querySelector("header");
    if (!header) {
      console.error("Error: No header element found.");
      return;
    }

    let currentElement: HTMLElement = header;
    let parentElement: HTMLElement | null = currentElement.parentElement;

    while (
      parentElement &&
      this.hasSamePositionAndSize(currentElement, parentElement)
    ) {
      currentElement = parentElement;
      parentElement = currentElement.parentElement;
    }

    this.headerElement = currentElement;

    this.attachMutationObserver();
    this.attachHoverListener();
    this.attachReopenMenuListener();
    const navElement = this.headerElement?.querySelector("nav");
    const detailsElements = this.headerElement?.querySelectorAll("details");

    if (navElement) {
      this.createHiddenElementsMap(navElement);
    }
    if (detailsElements.length > 0) {
      this.createDetailsElementMap(detailsElements);
    }
  }

  private createDetailsElementMap(
    detailsElements: NodeListOf<HTMLDetailsElement>
  ): void {
    detailsElements.forEach((element) => {
      if (!element.open) {
        this.detailsElements.set(element, element.open);
      }
    });
  }

  private createHiddenElementsMap(navElement: HTMLElement): void {
    const elements = navElement.querySelectorAll("*");
    elements.forEach((element) => {
      if (window.getComputedStyle(element).display === "none") {
        this.hiddenElements.set(element as HTMLElement, true);
      }
    });
  }

  private attachMutationObserver(): void {
    const mutationObserver = new MutationObserver(
      this.handleMutations.bind(this)
    );
    const observerConfig = {
      attributes: true,
      childList: true,
      subtree: true,
      characterData: true,
    };
    if (this.headerElement)
      mutationObserver.observe(this.headerElement, observerConfig);
  }

  private attachHoverListener(): void {
    this.headerElement?.addEventListener(
      "mouseover",
      this.handleMouseOver.bind(this)
    );
    this.headerElement?.addEventListener(
      "mouseout",
      this.handleMouseOut.bind(this)
    );
  }

  private attachReopenMenuListener(): void {
    document.addEventListener("reopen-menu", this.handleReopenMenu.bind(this));
    document.addEventListener("close-menu", this.handleCloseMenu.bind(this));
  }

  private isMenuOpen(classList: DOMTokenList): boolean {
    return classList.contains("is-active") || classList.contains("is-expanded");
  }

  private handleMutations(mutationsList: MutationRecord[]): void {
    for (const mutation of mutationsList) {
      const targetElement = mutation.target as HTMLElement;

      if (
        !this.isRecording &&
        mutation.type === "attributes" &&
        mutation.attributeName === "class" &&
        this.isMenuOpen((mutation.target as any).classList) &&
        this.headerElement?.contains(targetElement)
      ) {
        this.isRecording = true;
        this.mutations = [];
        this.clonedElements.clear();
        this.clonedElements.set(targetElement, targetElement.cloneNode(true));
        this.mutations.push(mutation);
        if (this.debugMode) {
          console.log(
            "-------------------------------------------------------------------------------------------------------------------------------"
          );
          console.log("set className - start recording");
          console.log(
            "-------------------------------------------------------------------------------------------------------------------------------"
          );
          console.log(mutation.target);
          console.log((mutation.target as any).classList);
          console.log(
            "-------------------------------------------------------------------------------------------------------------------------------"
          );
        }
      } else if (
        this.isRecording &&
        this.headerElement?.contains(targetElement)
      ) {
        if (
          mutation.type === "attributes" &&
          mutation.attributeName === "class" &&
          this.isMenuOpen(targetElement.classList) &&
          !this.isMenuOpen((mutation.target as any).classList)
        ) {
          if (this.debugMode) {
            console.log(
              "-------------------------------------------------------------------------------------------------------------------------------"
            );
            console.log("set className - stop recording");
            console.log(
              "-------------------------------------------------------------------------------------------------------------------------------"
            );
            console.log(mutation.target);
            console.log((mutation.target as any).classList);
            console.log(
              "-------------------------------------------------------------------------------------------------------------------------------"
            );
          }
          this.isRecording = false;
          break;
        }
        if (mutation.attributeName === "class") {
          if (this.debugMode) {
            console.log(
              "-------------------------------------------------------------------------------------------------------------------------------"
            );
            console.log("set className ");
            console.log(
              "-------------------------------------------------------------------------------------------------------------------------------"
            );
            console.log(mutation.target);
            console.log((mutation.target as any).classList);
            console.log(
              "-------------------------------------------------------------------------------------------------------------------------------"
            );
          }
        } else {
          if (this.debugMode) {
            console.log(
              "-------------------------------------------------------------------------------------------------------------------------------"
            );
            console.log("other mutation ", mutation.attributeName);
            console.log(
              "-------------------------------------------------------------------------------------------------------------------------------"
            );
            console.log("target: ", mutation.target);
            console.log(mutation);
            console.log(
              "-------------------------------------------------------------------------------------------------------------------------------"
            );
          }
        }
        this.clonedElements.set(targetElement, targetElement.cloneNode(true));
        this.mutations.push(mutation);
      }
    }
  }

  private handleMouseOver(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (this.headerElement?.contains(target)) {
      this.hoverElement = target;
      this.startHoverTimer();
    }
  }

  private recordDisplayChanges(): void {
    this.hiddenElements.forEach((value, element) => {
      const currentDisplay = window.getComputedStyle(element).display;
      if (currentDisplay !== "none") {
        this.displayChangedElements.clear();
        this.displayChangedElements.set(element, currentDisplay);
      }
    });
  }

  private recordDetailsChanges(): void {
    this.detailsElements.forEach((value, element) => {
      if (!value) {
        this.detailChangedElements.clear();
        this.detailChangedElements.set(element, !value);
      }
    });
  }

  private handleMouseOut(): void {
    this.stopHoverTimer();
    this.hoverElement = null;
  }

  private startHoverTimer(): void {
    this.stopHoverTimer();
    this.hoverTimer = setTimeout(() => {
      if (this.hoverElement) {
        this.recordDisplayChanges();
        this.recordDetailsChanges();
      }
      if (this.hoverElement) {
        if (this.hoverElement && this.hoverElement.innerText) {
          this.menuName = this.hoverElement.innerText;
        } else {
          this.menuName = "selected";
        }
        console.log("Capturing mutations now for " + this.menuName + " menu");
        this.dispatchMenuOpenEvent();
        this.previousMutations = [...this.mutations];
        this.previousClonedElements = new Map(this.clonedElements); // Update previousClonedElements only when the hover timer completes
      }
      this.hoverTimer = null;
      this.isRecording = false;
    }, this.hoverDuration);
  }

  private stopHoverTimer(): void {
    if (this.hoverTimer) {
      clearTimeout(this.hoverTimer);
      this.hoverTimer = null;
    }
  }

  private dispatchMenuOpenEvent(): void {
    const menuOpenEvent = new CustomEvent("menu-open", {
      detail: {
        mutations: this.mutations,
      },
    });
    document.dispatchEvent(menuOpenEvent);
    this.isRecording = false;
    console.log('listen to this event "menu-open"');
  }

  private dispatchMenuCloseRequiredEvent(): void {
    const menuOpenEvent = new CustomEvent("menu-close-required", {
      detail: {
        mutations: this.mutations,
      },
    });
    console.log("dispatchMenuCloseRequiredEvent");
    document.dispatchEvent(menuOpenEvent);
    this.isRecording = false;
    console.log('listen to this event "menu-close-required"');
  }

  private dispatchHideCloseEvent(): void {
    const menuOpenEvent = new CustomEvent("hide-close-menu", {
      detail: {
        mutations: this.mutations,
      },
    });
    console.log("dispatchMenuCloseRequiredEvent");
    document.dispatchEvent(menuOpenEvent);
    this.isRecording = false;
    console.log('listen to this event "hide-close-menu"');
  }

  private handleReopenMenu(): void {
    if (!this.hoverElement) {
      this.reapplyMutations();
    }
  }

  private handleCloseMenu(): void {
    this.hiddenElements.forEach((value, element) => {
      element.style.removeProperty("display");
    });

    this.headerElement?.querySelectorAll("details")?.forEach((element) => {
      element.removeAttribute("open");
    });

    this.displayChangedElements.clear();
    this.detailChangedElements.clear();
    this.dispatchHideCloseEvent();
  }

  private reapplyMutations(): void {
    for (const mutation of this.previousMutations) {
      const targetElement = mutation.target as HTMLElement;
      const clonedElement = this.previousClonedElements.get(
        targetElement
      ) as HTMLElement;
      if (clonedElement) {
        switch (mutation.type) {
          case "attributes":
            const attrib = clonedElement.getAttribute(mutation.attributeName!);
            if (this.debugMode) {
              console.log(
                "attribute: ",
                mutation.attributeName,
                " val: ",
                attrib
              );
              console.log(targetElement);
            }
            targetElement.setAttribute(mutation.attributeName!, attrib!);
            break;
          case "childList":
            mutation.addedNodes.forEach((node) => {
              const clonedNode = clonedElement.querySelector(
                `[data-node-id="${(node as HTMLElement).getAttribute(
                  "data-node-id"
                )}"]`
              );
              if (clonedNode) {
                targetElement.appendChild(clonedNode.cloneNode(true));
              }
            });
            mutation.removedNodes.forEach((node) => {
              const removedNode = targetElement.querySelector(
                `[data-node-id="${(node as HTMLElement).getAttribute(
                  "data-node-id"
                )}"]`
              );
              if (removedNode) {
                targetElement.removeChild(removedNode);
              }
            });
            break;
          case "characterData":
            targetElement.textContent = clonedElement.textContent;
            break;
        }
      }
    }
    this.reapplyDisplayChanges();
    this.reapplyDetailsChanges();
  }

  private reapplyDisplayChanges(): void {
    let manualCloseRequired = false;
    this.displayChangedElements.forEach((displayValue, element) => {
      (element as HTMLElement).style.display = displayValue;
      manualCloseRequired = true;
    });
    if (manualCloseRequired) {
      this.dispatchMenuCloseRequiredEvent();
    }
  }

  private reapplyDetailsChanges(): void {
    let manualCloseRequired = false;
    this.detailChangedElements.forEach((open, element) => {
      (element as HTMLElement).setAttribute("open", `${open}`);
      (element as HTMLElement).setAttribute("aria-expanded", `${open}`);
      manualCloseRequired = true;
    });
    if (manualCloseRequired) {
      this.dispatchMenuCloseRequiredEvent();
    }
  }

  private removeIsActiveClass(): void {
    const activeOrExpandedElements = this.headerElement?.querySelectorAll(
      ".is-active, .is-expanded"
    );
    activeOrExpandedElements?.forEach((element) => {
      element.classList.remove("is-active", "is-expanded");
    });
  }

  reopenMenu(): void {
    console.log(this.clonedElements);
    document.dispatchEvent(new CustomEvent("reopen-menu", { detail: true }));
  }
  closeMenu(): void {
    document.dispatchEvent(new CustomEvent("close-menu", { detail: true }));
  }
  closeActiveMenu(): void {
    this.removeIsActiveClass();
    this.handleCloseMenu();
  }
}

function createInstance<T>(constructor: { new (): T }): T {
  return new constructor();
}

const myClassInstance: MenuMonitor = createInstance(MenuMonitor);

export type MenuMonitorType = typeof myClassInstance;

export default MenuMonitor;
