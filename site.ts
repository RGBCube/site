import lume from "lume/mod.ts";
import checkUrls from "lume/plugins/check_urls.ts";
import codeHighlight from "lume/plugins/code_highlight.ts";
import extractDate from "lume/plugins/extract_date.ts";
import feed from "lume/plugins/feed.ts";
import inline from "lume/plugins/inline.ts";
import jsx from "lume/plugins/jsx.ts";
import lightningcss from "lume/plugins/lightningcss.ts";
// import minifyHtml from "lume/plugins/minify_html.ts";
import nav from "lume/plugins/nav.ts";
import resolveUrls from "lume/plugins/resolve_urls.ts";
import sitemap from "lume/plugins/sitemap.ts";
import slugifyUrls from "lume/plugins/slugify_urls.ts";
import tailwindcss from "lume/plugins/tailwindcss.ts";

const siteName = "RGBCube";
const siteDescription =
  "The home directory and journal of RGBCube and his work.";

const author = "RGBCube";
const color = "#00FFFF";

const pathAssets = "/assets";

const site = lume({
  src: "./site",

  server: {
    debugBar: false,
  },
});

// DATA
site.data("layout", "default.vto");

site.data("site_name", siteName);
site.data("title", siteName);
site.data("description", siteDescription);
site.data("author", author);
site.data("color", color);

site.use(nav());

// TEMPLATS
site.use(jsx());

// FILES
site.add(".");

// URLs
site.use(resolveUrls());
site.use(extractDate());
site.use(slugifyUrls({
  extensions: "*",
}));

site.preprocess([".html"], (pages) =>
  pages.forEach((page) => {
    page.data.title = page.data.title ??
      page.data.basename
        .replace(/-/g, " ")
        .replace(/\b\w/g, (char) => char.toUpperCase());
  }));

// CSS
site.use(tailwindcss());
site.use(lightningcss()); // TODO: LightningCSS doesn't handle inline styles.
site.use(inline());

// CODEBLOCK CSS
site.use(codeHighlight({
  options: {
    classPrefix: "token-",
    noHighlightRe: /^no-highlight$/,
  },
}));
site.process([".html"], (pages) =>
  pages.forEach((page) => {
    if (page.data.skipProcessing) return;

    const { document } = page;

    document.querySelectorAll("pre code").forEach((code) => {
      const matches = code.innerHTML.match(/\{\[\([^\)]+\)\]\}/g);
      if (!matches) return;

      let newHTML = code.innerHTML;

      matches.forEach((match) => {
        newHTML = newHTML.replace(
          match,
          `<span class="callout">${match.replaceAll(/[^\d]/g, "")}</span>`,
        );
      });

      code.innerHTML = newHTML;
    });
  }));

// CONTENT
site.process([".html"], (pages) =>
  pages.forEach((page) => {
    if (page.data.skipProcessing) return;

    const { document } = page;

    document.querySelectorAll("table").forEach((element) => {
      const wrapper = document.createElement("div");

      element.classList.add("transform-[rotateX(180deg)]");
      wrapper.classList.add(
        "transform-[rotateX(180deg)]",
        "overflow-x-auto",
      );

      element.parentNode!.insertBefore(wrapper, element);
      wrapper.appendChild(element);
    });

    document.querySelectorAll("pre code").forEach((code) => {
      const element = code.parentElement!;
      const wrapper = document.createElement("div");

      element.classList.add("transform-[rotateX(180deg)]");
      wrapper.classList.add(
        "transform-[rotateX(180deg)]",
        "overflow-x-auto",
      );

      element.parentNode!.insertBefore(wrapper, element);
      wrapper.appendChild(element);
    });

    document
      .querySelectorAll(".text-content :where(h1, h2, h3, h4, h5, h6)")
      .forEach((header) => {
        if (header.id || header.closest("a") || header.querySelector("a")) {
          return;
        }

        const textNormalized = header
          .textContent!
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, "")
          .replace(/\s+/g, "-")
          .replace(/-+/g, "-")
          .trim();

        let textUnique = textNormalized;
        let counter = 1;

        while (document.getElementById(textUnique)) {
          counter += 1;
          textUnique = `${textNormalized}-${counter}`;
        }

        header.id = textUnique;

        const link = document.createElement("a");
        link.setAttribute("href", "#" + textUnique);

        header.parentNode!.insertBefore(link, header);
        link.appendChild(header);
      });

    const footnotes = document.querySelector("#footnotes");
    if (footnotes) {
      let counter = 0;

      document.querySelectorAll("p").forEach((paragraph) => {
        const matches = paragraph.innerHTML.match(/\[\^([^\]]*)\]/g);
        if (!matches) return;

        let newHTML = paragraph.innerHTML;

        matches.forEach((match) => {
          const footnoteText = match.slice(2, -1);

          let number;
          let addFooter;

          if (footnoteText.match(/^[1-9]+$/g)) {
            number = parseInt(footnoteText);
            addFooter = false;
          } else {
            counter += 1;
            number = counter;
            addFooter = true;
          }

          const anchorId = `ref:${counter}`;
          const footnoteId = `fn:${counter}`;

          const link =
            `<sup><a id="${anchorId}" href="#${footnoteId}">^${number}</a></sup>`;
          newHTML = newHTML.replace(match, link);

          if (addFooter) {
            const hr = document.createElement("hr");

            const li = document.createElement("li");
            li.id = footnoteId;
            li.innerHTML =
              `${footnoteText}<sub><a href="#${anchorId}">..?</a></sub>`;

            footnotes.appendChild(hr);
            footnotes.appendChild(li);
          }
        });

        paragraph.innerHTML = newHTML;
      });

      if (counter === 0) {
        footnotes.remove();
      }
    }
  }));

site.use(feed({
  output: ["/blog.rss", "/blog.json"],

  query: "url^=/blog/ url!=/blog/ unlisted!=true",
  sort: "date=asc",
  limit: Infinity,

  info: {
    title: siteName,
    description: siteDescription,
    authorName: author,

    image: `${pathAssets}/icons/icon.webp`,
    icon: `${pathAssets}/icons/icon.webp`,

    color,

    generator: false,
  },

  items: {
    content: "$ .text-content",
  },
}));

site.use(sitemap({
  items: {
    // @ts-ignore: We don't want lastmods.
    lastmod: null,
  },
}));

site.use(checkUrls({
  strict: true,
  throw: true,
}));

// site.use(minifyHtml({
//   options: {
//     // TODO: This breaks tailwind.
//     // minify_css: true,
//     minify_js: true,
//   },
// }));

export default site;
