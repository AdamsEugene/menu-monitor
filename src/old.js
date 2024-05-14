class MenuMonitor {
  constructor(debugMode = false) {
    this.hoverTimer = null;
    this.hoverElement = null;
    this.hoverDuration = 3000; // 3 seconds
    this.mutations = [];
    this.previousMutations = [];
    this.isRecording = false;
    this.clonedElements = new Map();
    this.previousClonedElements = new Map();
    this.debugMode = debugMode;
    this.menuName = "unknown";
    this.hiddenElements = new Map();
    this.displayChangedElements = new Map();
    this.originalDisplayValues = new Map();

    const header = document.querySelector("header");
    if (!header) {
      console.error("Error: No header element found.");
      return;
    }

    let currentElement = header;
    let parentElement = currentElement.parentElement;

    while (
      parentElement &&
      this.hasSamePositionAndSize(currentElement, parentElement)
    ) {
      currentElement = parentElement;
      parentElement = currentElement.parentElement;
    }

    this.headerElement = currentElement;

    this.init();
  }

  hasSamePositionAndSize(element1, element2) {
    const rect1 = element1.getBoundingClientRect();
    const rect2 = element2.getBoundingClientRect();

    return (
      rect1.top === rect2.top &&
      rect1.right === rect2.right &&
      rect1.bottom === rect2.bottom &&
      rect1.left === rect2.left
    );
  }

  init() {
    this.attachMutationObserver();
    this.attachHoverListener();
    this.attachReopenMenuListener();
    const navElement = this.headerElement.querySelector("nav");
    if (navElement) {
      this.createHiddenElementsMap(navElement);
    }
  }

  createHiddenElementsMap(navElement) {
    const elements = navElement.querySelectorAll("*");
    elements.forEach((element) => {
      if (window.getComputedStyle(element).display === "none") {
        this.hiddenElements.set(element, true);
      }
    });
  }

  attachMutationObserver() {
    const mutationObserver = new MutationObserver(
      this.handleMutations.bind(this)
    );
    const observerConfig = {
      attributes: true,
      childList: true,
      subtree: true,
      characterData: true,
    };
    mutationObserver.observe(this.headerElement, observerConfig);
  }

  attachHoverListener() {
    this.headerElement.addEventListener(
      "mouseover",
      this.handleMouseOver.bind(this)
    );
    this.headerElement.addEventListener(
      "mouseout",
      this.handleMouseOut.bind(this)
    );
  }

  attachReopenMenuListener() {
    document.addEventListener("reopen-menu", this.handleReopenMenu.bind(this));
    document.addEventListener("close-menu", this.handleCloseMenu.bind(this));
  }

  isMenuOpen(classList) {
    return classList.contains("is-active") || classList.contains("is-expanded");
  }
  handleMutations(mutationsList) {
    for (const mutation of mutationsList) {
      const targetElement = mutation.target;

      if (
        !this.isRecording &&
        mutation.type === "attributes" &&
        mutation.attributeName === "class" &&
        this.isMenuOpen(mutation.target.classList) &&
        this.headerElement.contains(targetElement)
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
          console.log(mutation.target.classList);
          console.log(
            "-------------------------------------------------------------------------------------------------------------------------------"
          );
        }
      } else if (
        this.isRecording &&
        this.headerElement.contains(targetElement)
      ) {
        if (
          mutation.type === "attributes" &&
          mutation.attributeName === "class" &&
          this.isMenuOpen(targetElement.classList) &&
          !this.isMenuOpen(mutation.target.classList)
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
            console.log(mutation.target.classList);
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
            console.log(mutation.target.classList);
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

  handleMouseOver(event) {
    const target = event.target;
    if (this.headerElement.contains(target)) {
      this.hoverElement = target;
      this.startHoverTimer();
    }
  }

  recordDisplayChanges() {
    this.hiddenElements.forEach((value, element) => {
      const currentDisplay = window.getComputedStyle(element).display;
      if (currentDisplay !== "none") {
        this.displayChangedElements.set(element, currentDisplay);
      }
    });
  }

  handleMouseOut() {
    this.stopHoverTimer();
    this.hoverElement = null;
  }

  startHoverTimer() {
    this.stopHoverTimer();
    this.hoverTimer = setTimeout(() => {
      if (this.hoverElement) {
        this.recordDisplayChanges();
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

  stopHoverTimer() {
    if (this.hoverTimer) {
      clearTimeout(this.hoverTimer);
      this.hoverTimer = null;
    }
  }

  dispatchMenuOpenEvent() {
    const menuOpenEvent = new CustomEvent("menu-open", {
      detail: {
        mutations: this.mutations,
      },
    });
    document.dispatchEvent(menuOpenEvent);
    this.isRecording = false;
  }

  dispatchMenuCloseRequiredEvent() {
    const menuOpenEvent = new CustomEvent("menu-close-required", {
      detail: {
        mutations: this.mutations,
      },
    });
    console.log("dispatchMenuCloseRequiredEvent");
    document.dispatchEvent(menuOpenEvent);
    this.isRecording = false;
  }

  dispatchHideCloseEvent() {
    const menuOpenEvent = new CustomEvent("hide-close-menu", {
      detail: {
        mutations: this.mutations,
      },
    });
    console.log("dispatchMenuCloseRequiredEvent");
    document.dispatchEvent(menuOpenEvent);
    this.isRecording = false;
  }

  handleReopenMenu() {
    if (!this.hoverElement) {
      this.reapplyMutations();
    }
  }
  handleCloseMenu() {
    this.hiddenElements.forEach((value, element) => {
      element.style.removeProperty("display");
    });
    this.displayChangedElements.clear();
    this.dispatchHideCloseEvent();
  }
  reapplyMutations() {
    for (const mutation of this.previousMutations) {
      const targetElement = mutation.target;
      const clonedElement = this.previousClonedElements.get(targetElement);
      if (clonedElement) {
        switch (mutation.type) {
          case "attributes":
            const attrib = clonedElement.getAttribute(mutation.attributeName);
            if (this.debugMode) {
              console.log(
                "attribute: ",
                mutation.attributeName,
                " val: ",
                attrib
              );
              console.log(targetElement);
            }
            targetElement.setAttribute(mutation.attributeName, attrib);
            break;
          case "childList":
            mutation.addedNodes.forEach((node) => {
              const clonedNode = clonedElement.querySelector(
                `[data-node-id="${node.getAttribute("data-node-id")}"]`
              );
              if (clonedNode) {
                targetElement.appendChild(clonedNode.cloneNode(true));
              }
            });
            mutation.removedNodes.forEach((node) => {
              const removedNode = targetElement.querySelector(
                `[data-node-id="${node.getAttribute("data-node-id")}"]`
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
  }
  reapplyDisplayChanges() {
    var manualCloseRequired = false;
    this.displayChangedElements.forEach((displayValue, element) => {
      element.style.display = displayValue;
      manualCloseRequired = true;
    });
    if (manualCloseRequired) {
      this.dispatchMenuCloseRequiredEvent();
    }
  }
}
