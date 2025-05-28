import Cube from "./_includes/cube.tsx";

export const title = "404";
export const viewportFixed = true;

export default (_data: Lume.Data, helpers: Lume.Helpers) => {
  const face = (
    <>
      <div className="frame">
        <a href={helpers.url("/", true)}>
          404
        </a>
      </div>
      <div className="square black"></div>
      <div className="square magenta"></div>
      <div className="square magenta"></div>
      <div className="square black"></div>
    </>
  );

  return (
    <>
      <Cube
        front={face}
        back={face}
        left={face}
        right={face}
        top={face}
        bottom={face}
      />

      <style
        dangerouslySetInnerHTML={{
          __html: `
      .face {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        grid-template-rows: repeat(2, 1fr);
        box-shadow: 0 0 10px var(--foreground);
      }

      .square {
        width: 100%;
        height: 100%;
      }

      .black {
        background-color: black;
      }

      .magenta {
        background-color: magenta;
      }

      .frame {
        position: absolute;
        z-index: 99999;

        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);

        color: black;
      }
        `,
        }}
      >
      </style>
    </>
  );
};
