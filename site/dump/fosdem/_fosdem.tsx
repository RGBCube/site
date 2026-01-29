// Good enough for now. It was cleaned up from vibe coded slop anyway.

import * as xml from "xml";

// SCHEMA

type OneOrMany<T> = T | T[];
type XmlText = string | { "#text": string };

type XmlPerson = XmlText & { "@id": string };
type XmlAttachment = XmlText & { "@type": string; "@href": string };
type XmlLink = XmlText & { "@href": string };

type XmlEvent = {
  "@guid"?: string;
  "@id": string;
  date?: string;
  start: string;
  duration: string;
  room: string;
  slug: string;
  url?: string;
  title: string;
  subtitle?: string;
  track: XmlText & { "@slug"?: string };
  type: string;
  language?: string;
  abstract?: string;
  description?: string;
  feedback_url?: string;
  persons?: { person: OneOrMany<XmlPerson> };
  attachments?: { attachment: OneOrMany<XmlAttachment> };
  links?: { link: OneOrMany<XmlLink> };
};

type XmlRoom = {
  "@name": string;
  "@slug"?: string;
  event?: OneOrMany<XmlEvent>;
};

type XmlDay = {
  "@index": number;
  "@date": string;
  "@start"?: string;
  "@end"?: string;
  room: OneOrMany<XmlRoom>;
};

type XmlConference = {
  acronym?: string;
  title: string;
  subtitle?: string;
  venue: string;
  city: string;
  start: string;
  end: string;
  days: string;
  day_change?: string;
  timeslot_duration?: string;
  base_url?: string;
  time_zone_name?: string;
};

type XmlTrack = XmlText & { "@online_qa"?: string; "@slug"?: string };

type XmlSchedule = {
  schedule: {
    version: string;
    conference: XmlConference;
    tracks?: { track: OneOrMany<XmlTrack> };
    day: OneOrMany<XmlDay>;
  };
};

const wrap = <T,>(value: T | T[]): T[] =>
  Array.isArray(value) ? value : [value];

const parseTime = (str: string) =>
  str.split(":").map(Number).reduce((hours, mins) => hours * 60 + mins);

const formatTime = (minutes: number) =>
  [Math.floor(minutes / 60), minutes % 60]
    .map((part) => String(part).padStart(2, "0"))
    .join(":");

const formatLocalTime = (date: Date, tz?: string) => {
  const opts: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    ...(tz && { timeZone: tz }),
  };
  const parts = new Intl.DateTimeFormat("en-CA", opts).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)!.value;
  return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${
    get("minute")
  }`;
};

const range = (from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, index) => from + index);

const xmlText = (value: XmlText): string =>
  typeof value === "string" ? value : value["#text"];

type Event = ReturnType<typeof Event>;
const Event = (raw: XmlEvent, room: string, year: number) => ({
  raw,
  room,
  title: () => raw.title,
  url: () =>
    raw.url ||
    (year <= 2012
      ? `https://fosdem.org/${year}/schedule/event/${raw.slug}.html`
      : `https://fosdem.org/${year}/schedule/event/${raw.slug}/`),
  start: () => raw.start,
  track: () => xmlText(raw.track),
  startMinutes: () => parseTime(raw.start),
  durationMinutes: () => parseTime(raw.duration),
  endMinutes: () => parseTime(raw.start) + parseTime(raw.duration),
  endTime: () => formatTime(parseTime(raw.start) + parseTime(raw.duration)),
  color: () => trackColor(xmlText(raw.track)),
  persons: () =>
    raw.persons?.person
      ? wrap(raw.persons.person).map(xmlText).filter(Boolean)
      : [],
});

type Day = ReturnType<typeof Day>;
const Day = (raw: XmlDay, year: number) => {
  const rooms = () =>
    new Map(
      wrap(raw.room)
        .filter((room) => room.event)
        .map((room) => [
          room["@name"],
          wrap(room.event!)
            .map((event) => Event(event, room["@name"], year))
            .toSorted((left, right) =>
              left.startMinutes() - right.startMinutes()
            ),
        ]),
    );
  const allEvents = () => [...rooms().values()].flat();
  const earliestStart = () =>
    allEvents().reduce(
      (min, event) => Math.min(min, event.startMinutes()),
      Infinity,
    );
  const startHour = () =>
    Math.floor(
      (Number.isFinite(earliestStart()) ? earliestStart() : 0) / 60,
    );
  const endHour = () => {
    const latestEnd = allEvents().reduce(
      (max, event) => Math.max(max, event.endMinutes()),
      earliestStart(),
    );
    return Math.ceil(latestEnd / 60) + 1;
  };

  return {
    raw,
    index: () => raw["@index"],
    date: () => raw["@date"],
    rooms,
    allEvents,
    startHour,
    endHour,
    sortedRooms: () =>
      [...rooms().entries()].toSorted(([left], [right]) =>
        left.localeCompare(right)
      ),
    sortedTracks: () =>
      [...new Set(allEvents().map((event) => event.track()))].sort(),
    eventCount: () =>
      [...rooms().values()].reduce((sum, events) => sum + events.length, 0),
  };
};

type Conference = ReturnType<typeof Conference>;
const Conference = (raw: XmlConference) => ({
  raw,
  title: () => raw.title,
  venue: () => raw.venue,
  city: () => raw.city,
  start: () => raw.start,
  end: () => raw.end,
  dateRange: () => `${raw.start} \u2013 ${raw.end}`,
  timezone: () => raw.time_zone_name || "Europe/Brussels",
});

const fetchSchedule = async (year: number) => {
  const url = `https://fosdem.org/${year}/schedule/xml`;
  console.error(`Fetching ${url}...`);

  const response = await fetch(url);
  const text = await response.text();

  console.error(`Fetched ${(text.length / 1024).toFixed(0)}KB of XML`);

  const { schedule } = xml.parse(text) as XmlSchedule;
  const conference = Conference(schedule.conference);
  const days = wrap(schedule.day).map((day) => Day(day, year));

  const total = days
    .flatMap((day) => [...day.rooms().values()])
    .reduce((sum, events) => sum + events.length, 0);
  console.error(
    `Parsed ${conference.title()}: ${days.length} days, ${total} events`,
  );

  return { conference, days };
};

const PALETTE: [string, string][] = [
  ["#3b2f4a", "#d4bfff"],
  ["#2f3b4a", "#bfe0ff"],
  ["#2f4a3b", "#bfffd4"],
  ["#4a3b2f", "#ffd4bf"],
  ["#4a2f3b", "#ffbfd4"],
  ["#3b4a2f", "#d4ffbf"],
  ["#2f4a4a", "#bffffa"],
  ["#4a4a2f", "#fffabf"],
  ["#3b2f3b", "#e0bfe0"],
  ["#2f3b3b", "#bfe0e0"],
  ["#4a3b3b", "#ffd4d4"],
  ["#3b3b2f", "#e0e0bf"],
  ["#402f4a", "#d9bfff"],
  ["#2f404a", "#bfd9ff"],
  ["#2f4a40", "#bfffd9"],
  ["#4a402f", "#ffd9bf"],
];

const trackColor = (track: string): [string, string] => {
  const hash = [...track].reduce(
    (acc, char) => ((acc << 5) - acc + char.charCodeAt(0)) | 0,
    0,
  );
  return PALETTE[Math.abs(hash) % PALETTE.length];
};

const REM_PER_MIN = 0.1125;

const timeToRem = (
  { minutes, startHour }: { minutes: number; startHour: number },
) => (minutes - startHour * 60) * REM_PER_MIN;

const durationToRem = (duration: number) =>
  Math.max(duration * REM_PER_MIN, 1.75);

const EventBlock = (
  { event, startHour }: { event: Event; startHour: number },
) => {
  const [background, foreground] = event.color();
  const height = durationToRem(event.durationMinutes());

  return (
    <a
      class="ev group"
      href={event.url()}
      target="_blank"
      style={`--h:${height}rem;top:${
        timeToRem({ minutes: event.startMinutes(), startHour })
      }rem;min-height:${height}rem;background:${background};color:${foreground};`}
      data-track={event.track()}
      title={`${event.title()}\n${event.start()}\u2013${event.endTime()} (${event.durationMinutes()}min)\n${event.track()} \u00b7 ${event.room}${
        event.persons().length ? "\n" + event.persons().join(", ") : ""
      }`}
    >
      <span class="ev-time">
        {event.start()}&#8211;{event.endTime()}
      </span>
      <span class="ev-title">
        {event.title()}
      </span>
    </a>
  );
};

const RoomColumn = (
  { name, events, totalHeight, startHour, endHour }: {
    name: string;
    events: Event[];
    totalHeight: number;
    startHour: number;
    endHour: number;
  },
) => (
  <div class="room-col">
    <div class="room-hdr">{name}</div>
    <div class="relative" style={`height:${totalHeight}rem`}>
      {range(startHour, endHour).map((hour) => (
        <div
          class="hour-rule"
          style={`top:${timeToRem({ minutes: hour * 60, startHour })}rem`}
        />
      ))}
      {events.map((event) => (
        <EventBlock key={event.url()} event={event} startHour={startHour} />
      ))}
    </div>
  </div>
);

const DaySection = ({ day }: { day: Day }) => {
  const startHour = day.startHour();
  const endHour = day.endHour();
  const totalHeight = timeToRem({ minutes: endHour * 60, startHour }) + 1;
  const rooms = day.sortedRooms();

  return (
    <section id={`day-${day.index()}`} class="day mb-10">
      <h2 class="text-xl text-text-bright mb-2.5 pb-1.5 border-b border-border-dim flex flex-wrap items-baseline gap-x-2.5">
        Day {day.index()} &mdash; {day.date()}
        <span class="text-text-muted text-xs font-normal">
          {rooms.length} rooms &middot; {day.eventCount()} events
        </span>
      </h2>

      <div class="flex flex-wrap gap-1 mb-3 items-center">
        <button type="button" class="fbtn ctrl-btn" onclick="selectAll(this)">
          Select all
        </button>
        <button type="button" class="fbtn ctrl-btn" onclick="unselectAll(this)">
          Unselect all
        </button>
        {day.sortedTracks().map((track) => {
          const [background, foreground] = trackColor(track);
          return (
            <button
              type="button"
              class="fbtn track-btn active"
              data-track={track}
              onclick="toggleTrack(this)"
              style={`background:${background};color:${foreground};`}
            >
              {track}
            </button>
          );
        })}
      </div>

      <div class="flex overflow-x-auto overflow-y-hidden border border-border-dim rounded-lg bg-surface">
        <div class="w-[3.25rem] min-w-[3.25rem] bg-surface-alt border-r border-border">
          <div
            class={`px-1.5 py-1 text-[0.72rem] border-b border-border after:content-['\\00a0']`}
          />
          <div class="relative" style={`height:${totalHeight}rem`}>
            {range(startHour, endHour).map((hour) => (
              <div
                class="hour-label"
                style={`top:${timeToRem({ minutes: hour * 60, startHour })}rem`}
              >
                {String(hour).padStart(2, "0")}:00
              </div>
            ))}
          </div>
        </div>
        {rooms.map(([name, events]) => (
          <RoomColumn
            name={name}
            events={events}
            totalHeight={totalHeight}
            startHour={startHour}
            endHour={endHour}
          />
        ))}
      </div>
    </section>
  );
};

const YearNav = (
  { year, first, last }: { year: number; first: number; last: number },
) => {
  const hasPrev = year > first;
  const hasNext = year < last;
  const cls =
    "no-underline px-2.5 py-1 border border-border rounded-md text-[0.82rem] transition-colors duration-150";
  return (
    <nav class="flex gap-2 items-center">
      {hasPrev
        ? (
          <a
            class={`${cls} text-accent hover:bg-[#1e2028]`}
            href={`/dump/fosdem/${year - 1}/`}
          >
            &larr; {year - 1}
          </a>
        )
        : (
          <span class={`${cls} text-text-muted opacity-40 cursor-default`}>
            &larr; {year - 1}
          </span>
        )}
      {hasNext
        ? (
          <a
            class={`${cls} text-accent hover:bg-[#1e2028]`}
            href={`/dump/fosdem/${year + 1}/`}
          >
            {year + 1} &rarr;
          </a>
        )
        : (
          <span class={`${cls} text-text-muted opacity-40 cursor-default`}>
            {year + 1} &rarr;
          </span>
        )}
    </nav>
  );
};

const Page = (
  { conference, days, year, first, last }: {
    conference: Conference;
    days: Day[];
    year: number;
    first: number;
    last: number;
  },
) => (
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>{conference.title()} Schedule</title>
      <link href="/assets/css/fosdem.css" rel="stylesheet" inline />
    </head>
    <body class="font-sans bg-surface text-text min-h-screen overflow-x-hidden">
      <header class="bg-surface-alt border-b border-border px-6 py-5">
        <div class="flex flex-wrap items-start justify-between gap-4 mb-2.5">
          <div>
            <h1 class="text-[1.4rem] text-accent mb-0.5">
              {conference.title()} Schedule
            </h1>
            <p class="text-text-muted text-sm">
              {conference.venue()}, {conference.city()} &mdash;{" "}
              {conference.dateRange()} &mdash; All times in{" "}
              {conference.timezone()}
            </p>
          </div>
          <YearNav year={year} first={first} last={last} />
        </div>
        <nav class="flex flex-wrap gap-2">
          {days.map((day) => (
            <a
              class="text-accent no-underline px-2.5 py-1 border border-border rounded-md text-[0.82rem] transition-colors duration-150 hover:bg-[#1e2028]"
              href={`#day-${day.index()}`}
            >
              Day {day.index()} ({day.date()})
            </a>
          ))}
        </nav>
      </header>
      <main class="p-5">
        {days.map((day) => <DaySection key={day.index()} day={day} />)}
      </main>
      <footer class="text-text-muted text-xs text-center py-4">
        Snapshot generated on{" "}
        <time>{formatLocalTime(new Date(), conference.timezone())}</time>{" "}
        and will be updated every once in a while.
      </footer>
      <script dangerouslySetInnerHTML={{ __html: JS }} />
    </body>
  </html>
);

const JS = `
const applyFilters = (container) => {
  const all = container.querySelectorAll('.fbtn[data-track]');
  const active = new Set(
    [...all].filter((btn) => btn.classList.contains('active')).map((btn) => btn.dataset.track)
  );
  const allSelected = active.size === all.length;
  container.querySelectorAll('.ev').forEach((el) => {
    el.classList.toggle('dimmed', !allSelected && !active.has(el.dataset.track));
  });
  container.querySelectorAll('.fbtn[data-track]').forEach((btn) => {
    btn.classList.toggle('inactive', !btn.classList.contains('active'));
  });
  container.querySelectorAll('.room-col').forEach((col) => {
    if (allSelected) {
      col.classList.remove('hidden');
    } else if (active.size === 0) {
      col.classList.add('hidden');
    } else {
      const selector = [...active].map((track) => '.ev[data-track="' + track + '"]').join(',');
      col.classList.toggle('hidden', !col.querySelector(selector));
    }
  });
};

const toggleTrack = (btn) => {
  btn.classList.toggle('active');
  applyFilters(btn.closest('.day'));
};

const selectAll = (btn) => {
  const container = btn.closest('.day');
  container.querySelectorAll('.fbtn[data-track]').forEach((btn) => btn.classList.add('active'));
  applyFilters(container);
};

const unselectAll = (btn) => {
  const container = btn.closest('.day');
  container.querySelectorAll('.fbtn[data-track]').forEach((btn) => btn.classList.remove('active'));
  applyFilters(container);
};

document.querySelectorAll('.ev').forEach((el) => {
  for (const [event, method] of [['mouseenter', 'add'], ['mouseleave', 'remove']]) {
    el.addEventListener(event, () => {
      const btn = el.closest('.day').querySelector('.fbtn[data-track="' + el.dataset.track + '"]');
      if (btn) btn.classList[method]('highlight');
    });
  }
});

document.querySelectorAll('.fbtn[data-track]').forEach((btn) => {
  for (const [event, method] of [['mouseenter', 'add'], ['mouseleave', 'remove']]) {
    btn.addEventListener(event, () => {
      btn.closest('.day').querySelectorAll('.ev[data-track="' + btn.dataset.track + '"]').forEach((ev) => {
        ev.classList[method]('highlight');
      });
    });
  }
});
`;

export const generate = async (
  { year, first, last }: { year: number; first: number; last: number },
) => {
  const { conference, days } = await fetchSchedule(year);
  return (
    <Page
      conference={conference}
      days={days}
      year={year}
      first={first}
      last={last}
    />
  );
};
