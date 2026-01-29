// Good enough for now. It was cleaned up from vibe coded slop anyway.

import * as xml from "xml";

// SCHEMA

type OneOrMany<T> = T | T[];
type XmlText = string | { "#text": string };

type XmlPerson = XmlText & {
  "@id": string;
  "@guid"?: string;
};

type XmlAttachment = XmlText & {
  "@type": string;
  "@href": string;
};

type XmlLink = XmlText & {
  "@href": string;
  "@type"?: string;
  "@service"?: string;
};

type XmlRecording = {
  license?: string;
  optout?: string;
};

type XmlEvent = {
  "@id": string;
  "@guid"?: string;
  "@code"?: string;
  date?: string;
  start: string;
  duration: string;
  room: string;
  slug: string;
  url?: string;
  logo?: string;
  title: string;
  subtitle?: string;
  track: XmlText & { "@slug"?: string };
  type: string;
  language?: string;
  abstract?: string;
  description?: string;
  feedback_url?: string;
  video_download_url?: string;
  origin_url?: string;
  recording?: XmlRecording;
  persons?: { person: OneOrMany<XmlPerson> };
  attachments?: { attachment: OneOrMany<XmlAttachment> };
  links?: { link: OneOrMany<XmlLink> };
};

type XmlRoom = {
  "@name": string;
  "@slug"?: string;
  "@guid"?: string;
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
  logo?: string;
  url?: string;
  time_zone_name?: string;
  color?: string;
};

type XmlTrack = XmlText & { "@online_qa"?: string; "@slug"?: string };

type XmlSchedule = {
  generator?: { "@name"?: string; "@version"?: string };
  url?: string;
  version: string;
  conference: XmlConference;
  tracks?: { track: OneOrMany<XmlTrack> };
  day: OneOrMany<XmlDay>;
};

const wrap = <T,>(value: T | T[]): T[] =>
  Array.isArray(value) ? value : [value];

const range = (from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, index) => from + index);

const minutes = (time: Temporal.PlainTime) => time.hour * 60 + time.minute;

const xmlText = (value: XmlText): string =>
  typeof value === "string" ? value : value["#text"];

type Event = ReturnType<typeof Event>;
const Event = (raw: XmlEvent, room: string, year: number) => ({
  raw,
  room,
  get title(): string {
    return raw.title;
  },
  get url(): string {
    return raw.url ||
      (year <= 2012
        ? `https://fosdem.org/${year}/schedule/event/${raw.slug}.html`
        : `https://fosdem.org/${year}/schedule/event/${raw.slug}/`);
  },
  get start(): Temporal.PlainTime {
    return Temporal.PlainTime.from(raw.start);
  },
  get duration(): Temporal.Duration {
    const time = Temporal.PlainTime.from(raw.duration);
    return Temporal.Duration.from({ hours: time.hour, minutes: time.minute });
  },
  get end(): Temporal.PlainTime {
    return this.start.add(this.duration);
  },
  get track(): string {
    return xmlText(raw.track);
  },
  get color(): [string, string] {
    return color(this.track);
  },
  get persons(): string[] {
    return raw.persons?.person
      ? wrap(raw.persons.person).map(xmlText).filter(Boolean)
      : [];
  },
});

type Day = ReturnType<typeof Day>;
const Day = (raw: XmlDay, year: number) => ({
  raw,
  get index(): number {
    return raw["@index"];
  },
  get date(): Temporal.PlainDate {
    return Temporal.PlainDate.from(raw["@date"]);
  },
  get rooms(): Record<string, Event[]> {
    return Object.fromEntries(
      wrap(raw.room)
        .map((room) => [
          room["@name"],
          wrap(room.event || [])
            .map((event) => Event(event, room["@name"], year))
            .toSorted((left, right) =>
              Temporal.PlainTime.compare(left.start, right.start)
            ),
        ]),
    );
  },
  get tracks(): string[] {
    return [...new Set(this.events.map((event) => event.track))];
  },
  get events(): Event[] {
    return Object.values(this.rooms).flat();
  },
  get earliestStart(): Temporal.PlainTime {
    return this.events
      .map((event) => event.start)
      .reduce((a, b) => Temporal.PlainTime.compare(a, b) <= 0 ? a : b);
  },
  get latestEnd(): Temporal.PlainTime {
    return this.events
      .map((event) => event.end)
      .reduce((a, b) => Temporal.PlainTime.compare(a, b) >= 0 ? a : b);
  },
});

type Conference = ReturnType<typeof Conference>;
const Conference = (raw: XmlConference) => ({
  raw,
  get title(): string {
    return raw.title;
  },
  get venue(): string {
    return raw.venue;
  },
  get city(): string {
    return raw.city;
  },
  get start(): Temporal.PlainDate {
    return Temporal.PlainDate.from(raw.start);
  },
  get end(): Temporal.PlainDate {
    return Temporal.PlainDate.from(raw.end);
  },
  get timezone(): string {
    return raw.time_zone_name || "Europe/Brussels";
  },
});

const schedule = async (year: number) => {
  const url = `https://fosdem.org/${year}/schedule/xml`;
  console.error(`Fetching ${url}...`);

  const response = await fetch(url);
  const text = await response.text();

  console.error(`Fetched ${(text.length / 1024).toFixed(0)}KB of XML`);

  const { schedule }: { schedule: XmlSchedule } = xml.parse(text);
  const conference = Conference(schedule.conference);
  const days = wrap(schedule.day).map((day) => Day(day, year));

  console.error(
    `Parsed ${conference.title}: ${days.length} days, ${
      days
        .flatMap((day) => Object.values(day.rooms))
        .reduce((sum, events) => sum + events.length, 0)
    } events`,
  );

  return { conference, days };
};

const color = (string: string): [string, string] => {
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

  const hash = [...string].reduce(
    (acc, char) => ((acc << 5) - acc + char.charCodeAt(0)) | 0,
    0,
  );

  return PALETTE[Math.abs(hash) % PALETTE.length];
};

const REM_PER_MINUTE_DEFAULT = 0.1125;

const MIN_VISUAL_MINUTES = 1.75 / REM_PER_MINUTE_DEFAULT;

const assignColumns = (events: Event[]): { event: Event; column: number }[] => {
  const ends: number[] = []; // visual end time per column

  return events.map((event) => {
    const start = minutes(event.start);

    const visualEnd = start +
      Math.max(event.duration.total("minutes"), MIN_VISUAL_MINUTES);

    let column = ends.findIndex((end) => end <= start);
    if (column === -1) column = ends.length;
    ends[column] = visualEnd;

    return { event, column };
  });
};

const EventBlock = (
  { event, column, columnStart }: {
    event: Event;
    column: number;
    columnStart: Temporal.PlainTime;
  },
) => {
  const [background, foreground] = event.color;

  const top = `calc(${
    event.start.since(columnStart).total("minutes")
  } * var(--rem-per-minute))`;

  const height = `max(calc(${
    event.duration.total("minutes")
  } * var(--rem-per-minute)), 1.75rem)`;

  const startStr = event.start.toString({ smallestUnit: "minute" });
  const endStr = event.end.toString({ smallestUnit: "minute" });

  return (
    <a
      class="ev group"
      href={event.url}
      target="_blank"
      style={`--h:${height};top:${top};min-height:${height};background:${background};color:${foreground};${
        column > 0
          ? `left:calc(0.1875rem + ${column} * 0.75rem);z-index:${column};`
          : ""
      }`}
      data-track={event.track}
      title={`${event.title}\n${startStr}\u2013${endStr} (${
        event.duration.total("minutes")
      }min)\n${event.track} \u00b7 ${event.room}${
        event.persons.length ? "\n" + event.persons.join(", ") : ""
      }`}
    >
      <span class="ev-time">
        {startStr}&#8211;{endStr}
      </span>
      <span class="ev-title">
        {event.title}
      </span>
    </a>
  );
};

const RoomColumn = (
  { name, events, totalHeight, start, end }: {
    name: string;
    events: Event[];
    totalHeight: string;
    start: Temporal.PlainTime;
    end: Temporal.PlainTime;
  },
) => {
  const columns = assignColumns(events);
  return (
    <div class="room-col">
      <div class="room-hdr">{name}</div>
      <div class="relative" style={`height:${totalHeight}`}>
        {range(start.hour, end.hour).map((hour) => {
          const time = Temporal.PlainTime.from({ hour, minute: 0 });
          return (
            <div
              class="hour-rule"
              style={`top:calc(${
                time.since(start).total("minutes")
              } * var(--rem-per-minute))`}
            />
          );
        })}
        {columns.map(({ event, column }) => (
          <EventBlock
            key={event.url}
            event={event}
            column={column}
            columnStart={start}
          />
        ))}
      </div>
    </div>
  );
};

const DaySection = ({ day }: { day: Day }) => {
  const start = day.events.length
    ? day.earliestStart
    : Temporal.PlainTime.from({ hour: 0, minute: 0 });
  const end = day.events.length
    ? Temporal.PlainTime.from({
      hour: day.latestEnd.hour + (day.latestEnd.minute > 0 ? 2 : 1),
      minute: 0,
    })
    : Temporal.PlainTime.from({ hour: 0, minute: 0 });
  const totalHeight = `calc(${
    end.since(start).total("minutes")
  } * var(--rem-per-minute) + 1rem)`;
  const rooms = day.rooms;

  return (
    <section
      id={`day-${day.index}`}
      class="day mb-10"
      data-day={day.index}
      data-start-hour={start.hour}
      data-end-hour={end.hour}
    >
      <h2 class="text-xl text-text-bright mb-2.5 pb-1.5 border-b border-border-dim flex flex-wrap items-baseline gap-x-2.5">
        Day {day.index} &mdash; {day.date}
        <span class="text-text-muted text-xs font-normal">
          {rooms.length} rooms &middot; {day.events.length} events
        </span>
      </h2>

      <div class="flex flex-wrap gap-1 mb-3 items-center">
        <button type="button" class="fbtn ctrl-btn" onclick="selectAll(this)">
          Select all
        </button>
        <button type="button" class="fbtn ctrl-btn" onclick="unselectAll(this)">
          Unselect all
        </button>
        {day.tracks.map((track) => {
          const [background, foreground] = color(track);
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

      <div class="grid-scroll relative flex overflow-x-auto overflow-y-hidden border border-border-dim rounded-lg bg-surface">
        <div class="w-[3.25rem] min-w-[3.25rem] bg-surface-alt border-r border-border">
          <div
            class={`px-1.5 py-1 text-[0.72rem] border-b border-border after:content-['\\00a0']`}
          />
          <div class="relative" style={`height:${totalHeight}`}>
            {range(start.hour, end.hour).map((hour) => {
              const time = Temporal.PlainTime.from({ hour, minute: 0 });
              return (
                <div
                  class="hour-label"
                  style={`top:calc(${
                    time.since(start).total("minutes")
                  } * var(--rem-per-minute))`}
                >
                  {String(hour).padStart(2, "0")}:00
                </div>
              );
            })}
          </div>
        </div>
        {Object.entries(rooms).map(([name, events]) => (
          <RoomColumn
            name={name}
            events={events}
            totalHeight={totalHeight}
            start={start}
            end={end}
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
    <nav class="flex gap-2 items-center ml-auto">
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
      <title>{conference.title} Schedule</title>
      <link href="/assets/css/fosdem.css" rel="stylesheet" inline />
    </head>
    <body
      class="font-sans bg-surface text-text min-h-screen overflow-x-hidden"
      style={`--rem-per-minute:${REM_PER_MINUTE_DEFAULT}rem`}
      data-tz={conference.timezone}
      data-year={year}
    >
      <header class="bg-surface-alt border-b border-border px-6 py-5">
        <div class="flex flex-wrap items-start justify-between gap-4 mb-2.5">
          <div>
            <h1 class="text-[1.4rem] text-accent mb-0.5">
              {conference.title} Schedule
            </h1>
            <p class="text-text-muted text-sm">
              {conference.venue}, {conference.city} &mdash; {conference.start}
              {" "}
              &ndash; {conference.end} &mdash; All times in{" "}
              {conference.timezone}
            </p>
          </div>
          <div class="flex flex-col items-end gap-0.5">
            <label class="flex items-center gap-1.5 text-text-muted text-[0.72rem]">
              Zoom
              <input
                id="zoom"
                type="range"
                min="0.04"
                max="0.3"
                step="0.005"
                value={String(REM_PER_MINUTE_DEFAULT)}
                class="w-24 accent-accent"
              />
            </label>
            <span class="text-text-muted text-[0.6rem] opacity-60">
              or {"\u2318"}/Ctrl + scroll in schedule
            </span>
          </div>
        </div>
        <nav class="flex flex-wrap gap-2 items-center">
          {days.map((day) => (
            <a
              class="text-accent no-underline px-2.5 py-1 border border-border rounded-md text-[0.82rem] transition-colors duration-150 hover:bg-[#1e2028]"
              href={`#day-${day.index}`}
            >
              Day {day.index} ({day.date})
            </a>
          ))}
          <YearNav year={year} first={first} last={last} />
        </nav>
      </header>
      <main class="p-5">
        {days.map((day) => <DaySection key={day.index} day={day} />)}
      </main>
      <footer class="text-text-muted text-xs text-center py-4">
        Snapshot generated on{" "}
        <time>
          {Temporal.Now.zonedDateTimeISO(conference.timezone).toPlainDateTime()
            .toString({ smallestUnit: "minute" }).replace("T", " ")}
        </time>{" "}
        and will be updated every once in a while.
      </footer>
      <script dangerouslySetInnerHTML={{ __html: JS }} />
    </body>
  </html>
);

const JS = `
const storageKey = (suffix) => 'fosdem-' + document.body.dataset.year + '-' + suffix;

const zoom = document.getElementById('zoom');
const savedZoom = localStorage.getItem(storageKey('zoom'));
if (savedZoom != null) zoom.value = savedZoom;

const setRemPerMinute = (value) => {
  const clamped = Math.min(+zoom.max, Math.max(+zoom.min, value));
  zoom.value = clamped;
  document.body.style.setProperty('--rem-per-minute', clamped + 'rem');
  localStorage.setItem(storageKey('zoom'), clamped);
};
setRemPerMinute(+zoom.value);
zoom.addEventListener('input', (event) => setRemPerMinute(+event.target.value));

document.querySelectorAll('.day').forEach((day) => {
  day.addEventListener('wheel', (event) => {
    if (!event.ctrlKey && !event.metaKey) return;
    event.preventDefault();
    setRemPerMinute(+zoom.value - event.deltaY * 0.0005);
  }, { passive: false });
});

const saveFilters = (container) => {
  const dayIndex = container.dataset.day;
  const inactive = [...container.querySelectorAll('.fbtn[data-track]:not(.active)')].map((btn) => btn.dataset.track);
  localStorage.setItem(storageKey('filters-' + dayIndex), JSON.stringify(inactive));
};

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
  saveFilters(container);
};

const restoreFilters = (container) => {
  const dayIndex = container.dataset.day;
  const saved = localStorage.getItem(storageKey('filters-' + dayIndex));
  if (!saved) return;
  const inactive = new Set(JSON.parse(saved));
  container.querySelectorAll('.fbtn[data-track]').forEach((btn) => {
    btn.classList.toggle('active', !inactive.has(btn.dataset.track));
  });
  applyFilters(container);
};

document.querySelectorAll('.day').forEach(restoreFilters);

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

/* Live "now" line */
(() => {
  const timezone = document.body.dataset.tz;
  const getNowMinutes = () => {
    const parts = new Intl.DateTimeFormat('en-CA', {
      hour: '2-digit', minute: '2-digit', hour12: false, timeZone: timezone,
    }).formatToParts(new Date());
    const get = (type) => +parts.find((part) => part.type === type).value;
    return get('hour') * 60 + get('minute');
  };

  const update = () => {
    const now = getNowMinutes();
    document.querySelectorAll('.day').forEach((day) => {
      const startHour = +day.dataset.startHour;
      const endHour = +day.dataset.endHour;
      const scroll = day.querySelector('.grid-scroll');
      let line = scroll.querySelector('.now-line');
      if (now < startHour * 60 || now > endHour * 60) {
        if (line) line.remove();
        return;
      }
      if (!line) {
        line = document.createElement('div');
        line.className = 'now-line';
        scroll.appendChild(line);
      }
      const hdr = scroll.querySelector('.room-hdr');
      const hdrHeight = hdr ? hdr.offsetHeight : 0;
      const top = 'calc(' + hdrHeight + 'px + ' + (now - startHour * 60) + ' * var(--rem-per-minute))';
      line.style.top = top;
    });
  };

  update();
  setInterval(update, 30000);
})();
`;

export const generate = async (
  { year, first, last }: { year: number; first: number; last: number },
) => {
  const { conference, days } = await schedule(year);
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
