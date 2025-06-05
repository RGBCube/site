import lume from "lume/mod.ts";
import extractDate from "lume/plugins/extract_date.ts";
import codeHighlight from "lume/plugins/code_highlight.ts";
import redirects from "lume/plugins/redirects.ts";
import tailwindcss from "lume/plugins/tailwindcss.ts";
import lightningcss from "lume/plugins/lightningcss.ts";
import resolveUrls from "lume/plugins/resolve_urls.ts";
import slugifyUrls from "lume/plugins/slugify_urls.ts";
import checkUrls from "lume/plugins/check_urls.ts";
import inline from "lume/plugins/inline.ts";
import feed from "lume/plugins/feed.ts";
import sitemap from "lume/plugins/sitemap.ts";
import minifyHtml from "lume/plugins/minify_html.ts";

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

site.data("layout", "default.vto");

site.data("site_name", siteName);
site.data("title", siteName);
site.data("description", siteDescription);
site.data("author", author);
site.data("color", color);

site.add(".");

site.process([".html"], (pages) => {
  pages.forEach((page) => {
    const document = page.document;

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
          counter++;
          textUnique = `${textNormalized}-${counter}`;
        }

        header.id = textUnique;

        const link = document.createElement("a");
        link.setAttribute("href", "#" + textUnique);

        header.parentNode!.insertBefore(link, header);
        link.appendChild(header);
      });
  });
});

site.use(extractDate());
site.use(redirects());

site.use(tailwindcss());
site.use(codeHighlight());

site.use(resolveUrls());
site.use(slugifyUrls({
  extensions: "*",
}));
site.use(checkUrls({
  strict: true,
  throw: true,
}));

site.use(feed({
  output: ["/blog.rss", "/blog.json"],

  query: "type=article",
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

site.use(lightningcss()); // TODO: LightningCSS doesn't handle inline styles.
site.use(inline());

// site.use(minifyHtml({
//   options: {
//     // TODO: This breaks tailwind.
//     // minify_css: true,
//     minify_js: true,
//   },
// }));

export default site;
