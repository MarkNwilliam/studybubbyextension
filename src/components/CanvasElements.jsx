import { Line, Rect, Circle, Text } from 'react-konva';

const CanvasElements = ({ lines, shapes, texts }) => {
  return (
    <>
      {lines.map((line, i) => (
        <Line
          key={i}
          points={line.points}
          stroke={line.stroke}
          strokeWidth={line.strokeWidth}
          tension={0.5}
          lineCap="round"
          lineJoin="round"
        />
      ))}

      {shapes.map((shape, i) => {
        if (shape.type === 'rectangle') {
          return (
            <Rect
              key={i}
              x={shape.x}
              y={shape.y}
              width={shape.width}
              height={shape.height}
              fill={shape.fill}
              stroke={shape.stroke}
              strokeWidth={shape.strokeWidth}
              draggable
            />
          );
        }
        if (shape.type === 'circle') {
          return (
            <Circle
              key={i}
              x={shape.x}
              y={shape.y}
              radius={shape.radius}
              fill={shape.fill}
              stroke={shape.stroke}
              strokeWidth={shape.strokeWidth}
              draggable
            />
          );
        }
        return null;
      })}

      {texts.map((textItem, i) => (
        <Text
          key={i}
          x={textItem.x}
          y={textItem.y}
          text={textItem.text}
          fontSize={textItem.fontSize}
          fill={textItem.fill}
          draggable={textItem.draggable}
        />
      ))}
    </>
  );
};

export default CanvasElements;
