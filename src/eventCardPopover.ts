import type { EventCardDetails } from "./eventCardDetails";

const HOVER_DELAY_MS = 200;

export type EventCardLookup = (eventname: string) => EventCardDetails | null;

export interface EventCardPopoverController {
  attach(trigger: HTMLElement, eventname: string): void;
  dismiss(): void;
  destroy(): void;
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function hoverDelayMs(): number {
  return prefersReducedMotion() ? 0 : HOVER_DELAY_MS;
}

function renderCardContent(details: EventCardDetails, titleId: string): HTMLElement {
  const dialog = document.createElement("div");
  dialog.className = "event-card";
  dialog.setAttribute("role", "dialog");
  dialog.setAttribute("aria-modal", "false");
  dialog.setAttribute("aria-labelledby", titleId);

  const header = document.createElement("div");
  header.className = "event-card__header";
  const title = document.createElement("h3");
  title.id = titleId;
  title.className = "event-card__title";
  title.textContent = details.title;
  header.appendChild(title);

  const close = document.createElement("button");
  close.type = "button";
  close.className = "event-card__close";
  close.setAttribute("aria-label", "Close event details");
  close.textContent = "×";
  header.appendChild(close);
  dialog.appendChild(header);

  const dl = document.createElement("dl");
  dl.className = "event-card__fields";

  const addRow = (label: string, value: string): void => {
    const dt = document.createElement("dt");
    dt.textContent = label;
    const dd = document.createElement("dd");
    dd.textContent = value;
    dl.appendChild(dt);
    dl.appendChild(dd);
  };

  if (details.shortName) {
    addRow("Short name", details.shortName);
  }
  if (details.localisedName) {
    addRow("Localised name", details.localisedName);
  }
  if (details.location) {
    addRow("Location", details.location);
  }
  if (details.seriesLabel) {
    addRow("Series", details.seriesLabel);
  }
  if (details.latitude !== null && details.longitude !== null) {
    addRow("Coordinates", `${details.latitude}, ${details.longitude}`);
  }
  dialog.appendChild(dl);

  const actions = document.createElement("div");
  actions.className = "event-card__actions";

  const externalLink = (href: string, label: string): HTMLAnchorElement => {
    const a = document.createElement("a");
    a.href = href;
    a.textContent = label;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    return a;
  };

  if (details.mapUrl) {
    actions.appendChild(externalLink(details.mapUrl, "Open map"));
  }
  if (details.eventPageUrl) {
    actions.appendChild(externalLink(details.eventPageUrl, "Event page"));
  }
  if (actions.childElementCount > 0) {
    dialog.appendChild(actions);
  }

  return dialog;
}

function positionCard(card: HTMLElement, trigger: HTMLElement): void {
  const rect = trigger.getBoundingClientRect();
  const margin = 8;
  const top = Math.min(rect.bottom + margin, window.innerHeight - card.offsetHeight - margin);
  let left = rect.left;
  const maxLeft = window.innerWidth - card.offsetWidth - margin;
  if (left > maxLeft) {
    left = Math.max(margin, maxLeft);
  }
  card.style.top = `${Math.max(margin, top)}px`;
  card.style.left = `${Math.max(margin, left)}px`;
}

export function createEventCardPopoverController(
  lookup: EventCardLookup
): EventCardPopoverController {
  let openCard: HTMLElement | null = null;
  let openTrigger: HTMLElement | null = null;
  let titleSeq = 0;
  let openTimer: number | undefined;
  let closeTimer: number | undefined;

  const clearTimers = (): void => {
    window.clearTimeout(openTimer);
    window.clearTimeout(closeTimer);
    openTimer = undefined;
    closeTimer = undefined;
  };

  const dismiss = (): void => {
    clearTimers();
    if (openCard) {
      openCard.remove();
      openCard = null;
    }
    if (openTrigger) {
      openTrigger.setAttribute("aria-expanded", "false");
      openTrigger.removeAttribute("aria-controls");
      openTrigger = null;
    }
  };

  const openFor = (trigger: HTMLElement, eventname: string, moveFocus: boolean): void => {
    const details = lookup(eventname);
    if (!details) {
      return;
    }
    dismiss();
    titleSeq += 1;
    const titleId = `event-card-title-${titleSeq}`;
    const card = renderCardContent(details, titleId);
    card.id = `event-card-${titleSeq}`;
    card.tabIndex = -1;
    document.body.appendChild(card);
    positionCard(card, trigger);
    trigger.setAttribute("aria-expanded", "true");
    trigger.setAttribute("aria-controls", card.id);
    openCard = card;
    openTrigger = trigger;

    card.addEventListener("pointerenter", () => {
      clearTimers();
    });
    card.addEventListener("pointerleave", () => {
      clearTimers();
      closeTimer = window.setTimeout(() => {
        dismiss();
      }, hoverDelayMs());
    });

    const closeBtn = card.querySelector(".event-card__close");
    if (closeBtn instanceof HTMLElement) {
      closeBtn.addEventListener("click", () => {
        const restore = openTrigger;
        dismiss();
        restore?.focus();
      });
    }

    if (moveFocus) {
      const focusTarget =
        card.querySelector<HTMLElement>(".event-card__close") ??
        card.querySelector<HTMLElement>("a") ??
        card;
      focusTarget.focus();
    }
  };

  const onDocumentPointerDown = (event: Event): void => {
    if (!openCard || !openTrigger) {
      return;
    }
    const target = event.target;
    if (!(target instanceof Node)) {
      return;
    }
    if (openCard.contains(target) || openTrigger.contains(target)) {
      return;
    }
    dismiss();
  };

  const onDocumentKeyDown = (event: KeyboardEvent): void => {
    if (event.key === "Escape" && openCard) {
      const restore = openTrigger;
      dismiss();
      restore?.focus();
    }
  };

  document.addEventListener("pointerdown", onDocumentPointerDown);
  document.addEventListener("keydown", onDocumentKeyDown);

  return {
    attach(trigger: HTMLElement, eventname: string): void {
      trigger.setAttribute("aria-haspopup", "dialog");
      trigger.setAttribute("aria-expanded", "false");

      trigger.addEventListener("pointerenter", () => {
        clearTimers();
        openTimer = window.setTimeout(() => {
          openFor(trigger, eventname, false);
        }, hoverDelayMs());
      });
      trigger.addEventListener("pointerleave", () => {
        clearTimers();
        closeTimer = window.setTimeout(() => {
          if (openTrigger === trigger) {
            dismiss();
          }
        }, hoverDelayMs());
      });
      trigger.addEventListener("focus", () => {
        /* keyboard users open via Enter/Space */
      });
      trigger.addEventListener("click", (event) => {
        event.preventDefault();
        if (openTrigger === trigger && openCard) {
          dismiss();
          return;
        }
        openFor(trigger, eventname, true);
      });
      trigger.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          if (openTrigger === trigger && openCard) {
            const restore = openTrigger;
            dismiss();
            restore?.focus();
            return;
          }
          openFor(trigger, eventname, true);
        }
      });
    },
    dismiss,
    destroy(): void {
      dismiss();
      document.removeEventListener("pointerdown", onDocumentPointerDown);
      document.removeEventListener("keydown", onDocumentKeyDown);
    },
  };
}
