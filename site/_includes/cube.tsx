interface CubeProps {
  front?: Node;
  back?: Node;
  left?: Node;
  right?: Node;
  top?: Node;
  bottom?: Node;
}

const Cube = (props: CubeProps) => (
  <>
    <style
      dangerouslySetInnerHTML={{
        __html: `
      html {
        font-size: min(9vw, 9vh, 4.5rem);
        overscroll-behavior: none;
      }

      a {
        color: black;
        font-weight: bold;
      }

      .frame {
        background-color: white;

        width: min-content;

        padding: 0 0.3rem;
        border-radius: 1rem;

        user-select: none;
      }

      .frame:hover {
        background-color: var(--link);
      }

      .scene {
        height: 100dvh;
        width: 100dvw;
        perspective: 15rem;

        display: flex;

        align-items: center;
        justify-content: center;
      }

      .cube {
        height: 5rem;
        width: 5rem;

        position: relative;

        transform: translateZ(-calc(2.5rem - 1px));
        transform-style: preserve-3d;
      }

      .face {
        width: 5rem;
        height: 5rem;

        display: flex;

        align-items: center;
        justify-content: center;

        position: absolute;
      }

      .front {
        transform: rotateY(0deg) translateZ(calc(2.5rem - 1px));
      }

      .top {
        /* Guess what? Yeah, you guessed right. Safari can't render shit. */
        transform: rotateX(89.99999999999999deg) translateZ(calc(2.5rem - 1px));
      }

      .back {
        transform: rotateY(180deg) translateZ(calc(2.5rem - 1px));
      }

      .bottom {
        transform: rotateX(-89.99999999999999deg) translateZ(calc(2.5rem - 1px));
      }

      .right {
        transform: rotateY(89.99999999999999deg) translateZ(calc(2.5rem - 1px));
      }

      .left {
        transform: rotateY(-89.99999999999999deg) translateZ(calc(2.5rem - 1px));
      }
    `,
      }}
    >
    </style>

    <div className="scene">
      <div className="cube">
        <div className="face front">{props.front}</div>
        <div className="face back">{props.back}</div>
        <div className="face left">{props.left}</div>
        <div className="face right">{props.right}</div>
        <div className="face top">{props.top}</div>
        <div className="face bottom">{props.bottom}</div>
      </div>
    </div>

    <script src="/assets/cube.js"></script>
  </>
);

export default Cube;
