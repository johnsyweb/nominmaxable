import type { EventCardPopoverController } from "./eventCardPopover";

export interface NamedEventRef {
  name: string;
  eventname: string | null;
}

export function appendEventNameList(
  cell: HTMLTableCellElement,
  events: NamedEventRef[],
  popover: EventCardPopoverController | null
): void {
  if (events.length === 0) {
    cell.textContent = "—";
    return;
  }
  const ul = document.createElement("ul");
  ul.className = "name-list";
  for (const event of events) {
    const li = document.createElement("li");
    if (popover && event.eventname) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "event-name-trigger";
      button.textContent = event.name;
      popover.attach(button, event.eventname);
      li.appendChild(button);
    } else {
      li.textContent = event.name;
    }
    ul.appendChild(li);
  }
  cell.appendChild(ul);
}
