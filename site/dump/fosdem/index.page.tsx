import * as fosdem from "./_fosdem.tsx";

const FIRST_FOSDEM = 2012;
const LAST_FOSDEM = 2026;

const years = Array.from(
  { length: LAST_FOSDEM - FIRST_FOSDEM + 1 },
  (_, i) => FIRST_FOSDEM + i,
);

export default async function* () {
  const pages = await Promise.all(
    years.map(async (year) => ({
      url: `/dump/fosdem/${year}/`,
      layout: "",
      skipProcessing: true,
      content: await fosdem.generate({ year, first: FIRST_FOSDEM, last: LAST_FOSDEM }),
    })),
  );
  yield* pages;
}
