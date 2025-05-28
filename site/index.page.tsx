import Cube from "./_includes/cube.tsx";

export const title = "RGBCube";
export const viewportFixed = true;

export default (
  <>
    <Cube
      front={
        <a href="/about">
          <div className="frame">about</div>
        </a>
      }
      top={
        <a href="https://github.com/RGBCube">
          <div className="frame">github</div>
        </a>
      }
      right={
        <a href="/contact">
          <div className="frame">contact</div>
        </a>
      }
      left={
        <a href="/blog">
          <div className="frame">blog</div>
        </a>
      }
    />

    <style
      dangerouslySetInnerHTML={{
        __html: `
      .face::after {
        z-index: -1;

        content: "";

        height: inherit;
        width: inherit;

        position: absolute;
      }

      /* I do not regret writing this. It's beautiful. */

      .front {
        background: linear-gradient(to bottom, cyan, blue);
      }

      .front::after {
        background: linear-gradient(to bottom, white, magenta);
        mask-image: linear-gradient(to left, magenta, transparent);
      }

      .top {
        background: linear-gradient(to bottom, lime, cyan);
      }

      .top::after {
        background: linear-gradient(to bottom, yellow, white);
        mask-image: linear-gradient(to left, white, transparent);
      }

      .back {
        background: linear-gradient(to bottom, yellow, red);
      }

      .back::after {
        background: linear-gradient(to bottom, lime, black);
        mask-image: linear-gradient(to left, black, transparent);
      }

      .bottom {
        background: linear-gradient(to bottom, blue, black);
      }

      .bottom::after {
        background: linear-gradient(to bottom, magenta, red);
        mask-image: linear-gradient(to left, red, transparent);
      }

      .right {
        background: linear-gradient(to bottom, white, magenta);
      }

      .right::after {
        background: linear-gradient(to bottom, yellow, red);
        mask-image: linear-gradient(to left, red, transparent);
      }

      .left {
        background: linear-gradient(to bottom, lime, black);
      }

      .left::after {
        background: linear-gradient(to bottom, cyan, blue);
        mask-image: linear-gradient(to left, blue, transparent);
      }
      `,
      }}
    >
    </style>
  </>
);
