import lume from "lume/mod.ts";
import extract_date from "lume/plugins/extract_date.ts";
import code_highlight from "lume/plugins/code_highlight.ts";
import redirects from "lume/plugins/redirects.ts";
import tailwindcss from "lume/plugins/tailwindcss.ts";
import resolve_urls from "lume/plugins/resolve_urls.ts";
import slugify_urls from "lume/plugins/slugify_urls.ts";
import check_urls from "lume/plugins/check_urls.ts";
import inline from "lume/plugins/inline.ts";
import feed from "lume/plugins/feed.ts";
import sitemap from "lume/plugins/sitemap.ts";
import minify_html from "lume/plugins/minify_html.ts";

const site_name = "RGBCube";
const site_description =
  "The home directory and journal of RGBCube and his work.";

const author = "RGBCube";
const color = "#00FFFF";

const path_assets = "/assets";

const site = lume({
  src: "./site",

  server: {
    debugBar: false,
  },
});

site.data("layout", "default.vto");

site.data("site_name", site_name);
site.data("title", site_name);
site.data("description", site_description);
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
  });
});

site.use(extract_date());
site.use(redirects());

site.use(tailwindcss());
site.use(code_highlight());

site.use(resolve_urls());
site.use(slugify_urls({
  extensions: "*",
}));
site.use(check_urls({
  strict: true,
  throw: true,
}));

site.use(feed({
  output: ["/blog.rss", "/blog.json"],

  query: "type=article",
  sort: "date=asc",
  limit: Infinity,

  info: {
    title: site_name,
    description: site_description,
    authorName: author,

    image: `${path_assets}/icons/icon.webp`,
    icon: `${path_assets}/icons/icon.webp`,

    color,

    generator: false,
  },

  items: {
    content: "$ .article-content",
  },
}));

site.use(sitemap({
  items: {
    // @ts-ignore: We don't want lastmods.
    lastmod: null,
  },
}));

site.use(inline());

site.use(minify_html({
  options: {
    // TODO: This breaks tailwind.
    // minify_css: true,
    minify_js: true,
  },
}));

export default site;
