import { useState } from "react";
import { ReferenceArea } from "recharts";

export function ZoomAndPan() {
  const [zoom, setZoom] = useState({ left: 0, right: 0 });
  const [drag, setDrag] = useState<{
    startX: number | null;
    endX: number | null;
  }>({
    startX: null,
    endX: null,
  });

  const onMouseDown = (e: any) => {
    if (e && e.activeLabel != null) {
      setDrag({ startX: e.activeLabel, endX: null });
    }
  };

  const onMouseMove = (e: any) => {
    if (drag.startX != null && e && e.activeLabel != null) {
      setDrag((d) => ({ ...d, endX: e.activeLabel }));
    }
  };

  const onMouseUp = () => {
    if (drag.startX != null && drag.endX != null) {
      const [left, right] =
        drag.startX < drag.endX
          ? [drag.startX, drag.endX]
          : [drag.endX, drag.startX];
      setZoom({ left, right });
    }
    setDrag({ startX: null, endX: null });
  };

  const clearZoom = () => setZoom({ left: 0, right: 0 });

  return (
    <>
      {drag.startX && drag.endX && (
        <ReferenceArea x1={drag.startX} x2={drag.endX} strokeOpacity={0.3} />
      )}
      {zoom.left !== zoom.right && (
        <ReferenceArea
          x1={zoom.left}
          x2={zoom.right}
          fill="rgba(37,99,235,0.1)"
          stroke="rgba(37,99,235,0.3)"
        />
      )}
      <rect
        x="0"
        y="0"
        width="100%"
        height="100%"
        fill="transparent"
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onDoubleClick={clearZoom}
      />
    </>
  );
}
